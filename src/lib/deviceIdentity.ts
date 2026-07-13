/**
 * Device identity + DPoP proof generation (RFC 9449).
 *
 * A browser proves it is a registered device by holding a non-extractable
 * ECDSA P-256 private key. The public JWK is exported once at generation
 * time and sent to the backend; every request with a device-scoped token
 * carries a fresh single-use DPoP proof signed by the private key. The key,
 * public JWK, device id, and device-scoped refresh token all live together
 * in one IndexedDB record (see device-db.ts).
 */
import {
  deleteDeviceRecord,
  getDeviceRecord,
  putDeviceRecord,
  type DeviceIdentityRecord,
} from "@/lib/device-db";
import type { DevicePlatform, EcPublicJwk } from "@/features/devices/types";

const encoder = new TextEncoder();

const base64UrlEncode = (bytes: ArrayBuffer | Uint8Array): string => {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (const byte of view) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
};

const ECDSA_PARAMS: EcKeyGenParams = { name: "ECDSA", namedCurve: "P-256" };
const SIGN_PARAMS: EcdsaParams = { name: "ECDSA", hash: "SHA-256" };

/**
 * Generate a fresh, non-extractable device key pair and persist it. The
 * public JWK is exported now — the private key can never be exported again.
 */
export const generateDeviceKeys = async (): Promise<DeviceIdentityRecord> => {
  const pair = await crypto.subtle.generateKey(ECDSA_PARAMS, false, ["sign", "verify"]);
  const exported = await crypto.subtle.exportKey("jwk", pair.publicKey);

  const publicJwk: EcPublicJwk = {
    kty: "EC",
    crv: "P-256",
    x: exported.x ?? "",
    y: exported.y ?? "",
  };

  const record: DeviceIdentityRecord = { privateKey: pair.privateKey, publicJwk };
  await putDeviceRecord(record);
  await requestPersistentStorage();
  return record;
};

/** Ask the browser to keep our storage from being evicted. Never blocks. */
const requestPersistentStorage = async (): Promise<void> => {
  try {
    const granted = await navigator.storage?.persist?.();
    if (granted === false) {
      console.warn(
        "[deviceIdentity] Persistent storage was denied; device identity may be evicted under storage pressure.",
      );
    }
  } catch (error) {
    console.warn("[deviceIdentity] Could not request persistent storage:", error);
  }
};

/** The stored device identity record, or null if this browser has none. */
export const getDeviceKeys = (): Promise<DeviceIdentityRecord | null> => getDeviceRecord();

/** Wipe the device identity — used for "unregister this browser" / key reset. */
export const clearDeviceKeys = (): Promise<void> => deleteDeviceRecord();

/** Persist the device id + device-scoped refresh token alongside the keys. */
export const saveDeviceSession = async (session: {
  deviceId: string;
  refreshToken: string;
}): Promise<void> => {
  const record = await getDeviceRecord();
  if (!record) {
    throw new Error("Cannot save device session before generating device keys");
  }
  await putDeviceRecord({ ...record, ...session });
};

export const getDeviceSession = async (): Promise<{
  deviceId: string;
  refreshToken: string;
} | null> => {
  const record = await getDeviceRecord();
  if (!record?.deviceId || !record.refreshToken) {
    return null;
  }
  return { deviceId: record.deviceId, refreshToken: record.refreshToken };
};

/** Drop the device session (id + refresh token) but keep the key pair. */
export const clearDeviceSession = async (): Promise<void> => {
  const record = await getDeviceRecord();
  if (!record) return;
  const { privateKey, publicJwk } = record;
  await putDeviceRecord({ privateKey, publicJwk });
};

/**
 * Build a single-use DPoP proof (compact ES256 JWS) for one request.
 * The htu is canonicalized to scheme://host/path — query and fragment are
 * stripped to match the backend's canonicalization. Each call mints a new
 * jti, so a proof can never be reused (including on retries).
 */
export const createDpopProof = async (method: string, url: string): Promise<string> => {
  const record = await getDeviceRecord();
  if (!record) {
    throw new Error("No device identity available to sign a DPoP proof");
  }

  const target = new URL(url);
  const htu = `${target.protocol}//${target.host}${target.pathname}`;

  const header = { typ: "dpop+jwt", alg: "ES256", jwk: record.publicJwk };
  const payload = {
    htm: method.toUpperCase(),
    htu,
    iat: Math.floor(Date.now() / 1000),
    jti: crypto.randomUUID(),
  };

  const signingInput = `${base64UrlEncode(encoder.encode(JSON.stringify(header)))}.${base64UrlEncode(
    encoder.encode(JSON.stringify(payload)),
  )}`;

  // WebCrypto emits the raw r||s (IEEE P1363) signature the backend expects —
  // no DER conversion.
  const signature = await crypto.subtle.sign(
    SIGN_PARAMS,
    record.privateKey,
    encoder.encode(signingInput),
  );

  return `${signingInput}.${base64UrlEncode(signature)}`;
};

export interface DeviceDefaults {
  name: string;
  platform: DevicePlatform;
}

/**
 * Suggest a device name from the user agent for the registration form.
 * Web clients register under the `chrome_extension` platform (the backend's
 * enum has no dedicated web value).
 */
export const detectDeviceDefaults = (): DeviceDefaults => {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";

  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /Chrome\//.test(ua)
      ? "Chrome"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Safari\//.test(ua)
          ? "Safari"
          : "Browser";

  const os = /Windows/.test(ua)
    ? "Windows"
    : /Mac OS X|Macintosh/.test(ua)
      ? "macOS"
      : /Android/.test(ua)
        ? "Android"
        : /Linux/.test(ua)
          ? "Linux"
          : /iPhone|iPad/.test(ua)
            ? "iOS"
            : "";

  return {
    name: os ? `${browser} on ${os}` : browser,
    platform: "chrome_extension",
  };
};
