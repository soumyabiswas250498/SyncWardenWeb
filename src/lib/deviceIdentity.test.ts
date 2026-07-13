import { beforeEach, describe, expect, it } from "vitest";
import {
  clearDeviceKeys,
  createDpopProof,
  generateDeviceKeys,
  getDeviceKeys,
} from "./deviceIdentity";

const decodeSegment = (segment: string | undefined): Record<string, unknown> => {
  const padded = (segment ?? "").replaceAll("-", "+").replaceAll("_", "/");
  return JSON.parse(atob(padded)) as Record<string, unknown>;
};

const base64UrlToBytes = (segment: string | undefined): Uint8Array<ArrayBuffer> => {
  const binary = atob((segment ?? "").replaceAll("-", "+").replaceAll("_", "/"));
  const buffer = new ArrayBuffer(binary.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i += 1) {
    view[i] = binary.charCodeAt(i);
  }
  return view;
};

describe("deviceIdentity", () => {
  beforeEach(async () => {
    await clearDeviceKeys();
  });

  it("round-trips the key pair through IndexedDB", async () => {
    const generated = await generateDeviceKeys();
    const loaded = await getDeviceKeys();

    expect(loaded).not.toBeNull();
    expect(loaded?.publicJwk).toEqual(generated.publicJwk);
    expect(loaded?.publicJwk.kty).toBe("EC");
    expect(loaded?.publicJwk.crv).toBe("P-256");
    // The stored value is a live CryptoKey, not serialized bytes.
    expect(loaded?.privateKey).toBeInstanceOf(CryptoKey);
  });

  it("stores a non-extractable private key", async () => {
    const { privateKey } = await generateDeviceKeys();
    expect(privateKey.extractable).toBe(false);
    await expect(crypto.subtle.exportKey("jwk", privateKey)).rejects.toBeTruthy();
  });

  it("builds a proof with the correct header and payload shape", async () => {
    const { publicJwk } = await generateDeviceKeys();
    const proof = await createDpopProof("post", "https://api.test/devices/register");
    const [headerSeg, payloadSeg, sigSeg] = proof.split(".");

    const header = decodeSegment(headerSeg);
    expect(header.typ).toBe("dpop+jwt");
    expect(header.alg).toBe("ES256");
    expect(header.jwk).toEqual(publicJwk);

    const payload = decodeSegment(payloadSeg);
    expect(payload.htm).toBe("POST");
    expect(payload.htu).toBe("https://api.test/devices/register");
    expect(typeof payload.iat).toBe("number");
    expect(typeof payload.jti).toBe("string");
    expect((sigSeg ?? "").length).toBeGreaterThan(0);
  });

  it("strips query and fragment from htu", async () => {
    await generateDeviceKeys();
    const proof = await createDpopProof(
      "GET",
      "https://api.test/devices?page=2&sort=name#section",
    );
    const payload = decodeSegment(proof.split(".")[1]);
    expect(payload.htu).toBe("https://api.test/devices");
  });

  it("mints a unique jti per call", async () => {
    await generateDeviceKeys();
    const first = decodeSegment((await createDpopProof("GET", "https://api.test/devices")).split(".")[1]);
    const second = decodeSegment((await createDpopProof("GET", "https://api.test/devices")).split(".")[1]);
    expect(first.jti).not.toBe(second.jti);
  });

  it("produces a signature that verifies with the public key", async () => {
    const { publicJwk } = await generateDeviceKeys();
    const proof = await createDpopProof("POST", "https://api.test/devices/register");
    const [headerSeg, payloadSeg, sigSeg] = proof.split(".");

    const publicKey = await crypto.subtle.importKey(
      "jwk",
      { ...publicJwk, ext: true },
      { name: "ECDSA", namedCurve: "P-256" },
      true,
      ["verify"],
    );

    const verified = await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      publicKey,
      base64UrlToBytes(sigSeg),
      new TextEncoder().encode(`${headerSeg}.${payloadSeg}`),
    );
    expect(verified).toBe(true);
  });

  it("throws when no device identity exists", async () => {
    await expect(createDpopProof("GET", "https://api.test/devices")).rejects.toThrow(
      /no device identity/i,
    );
  });
});
