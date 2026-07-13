/**
 * DPoP smoke test against the live backend.
 *
 * Mirrors the browser's createDpopProof logic (WebCrypto ES256, raw r||s
 * signature, htu without query/fragment) end-to-end:
 *   register user -> verify OTP -> login -> register device (publicKey+proof)
 *   -> assert cnf.jkt on tokens -> GET /devices -> heartbeat -> refresh.
 *
 * Two-phase so it works with a dev-mode backend that does not echo the OTP:
 *   Phase 1 (register):  node scripts/smoke-dpop.mjs
 *       -> prints the throwaway email; read the OTP from the backend console
 *          line "[auth] OTP for <email> (email_verification): <otp>".
 *   Phase 2 (complete):  node scripts/smoke-dpop.mjs --email <email> --otp <otp>
 *
 * If the backend echoes the OTP (NODE_ENV=test) a single run does everything.
 *
 * Optional base URL: SMOKE_BASE_URL env (default http://localhost:5001/api/v1).
 */

const BASE_URL = process.env.SMOKE_BASE_URL ?? "http://localhost:5001/api/v1";

const argOf = (name) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const ARG_EMAIL = argOf("--email");
const ARG_OTP = argOf("--otp");

const b64url = (buf) =>
  Buffer.from(buf).toString("base64url");

const decodeJwtPayload = (jwt) =>
  JSON.parse(Buffer.from(jwt.split(".")[1], "base64url").toString("utf8"));

const createDpopProof = async (privateKey, publicJwk, method, url) => {
  const u = new URL(url);
  const htu = `${u.protocol}//${u.host}${u.pathname}`;
  const encoder = new TextEncoder();
  const header = { typ: "dpop+jwt", alg: "ES256", jwk: publicJwk };
  const payload = {
    htm: method.toUpperCase(),
    htu,
    iat: Math.floor(Date.now() / 1000),
    jti: crypto.randomUUID(),
  };
  const signingInput = `${b64url(encoder.encode(JSON.stringify(header)))}.${b64url(
    encoder.encode(JSON.stringify(payload)),
  )}`;
  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    encoder.encode(signingInput),
  );
  return `${signingInput}.${b64url(sig)}`;
};

let step = "";
const request = async (method, path, { token, dpop, body } = {}) => {
  const url = `${BASE_URL}${path}`;
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (dpop) headers.DPoP = dpop;
  const res = await fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
};

const assert = (cond, message, extra) => {
  if (!cond) {
    console.error(`FAIL [${step}] ${message}`);
    if (extra !== undefined) console.error(JSON.stringify(extra, null, 2));
    process.exit(1);
  }
  console.log(`  ok: ${message}`);
};

const PASSWORD = "SmokeDpop123!";

// Phase 1: register a throwaway user and stop so the operator can read the
// OTP from the dev backend console.
const phaseRegister = async () => {
  const stamp = Date.now();
  const email = `smoke-dpop-${stamp}@example.com`;
  step = "register";
  console.log(`\n[1/8] POST /auth/register (${email})`);
  const reg = await request("POST", "/auth/register", {
    body: { email, password: PASSWORD, name: "DPoP Smoke", phone: `+1555${String(stamp).slice(-7)}` },
  });
  assert(reg.status === 201, `201 from register (got ${reg.status})`, reg.json);
  const otp = reg.json.data?.otp;
  if (typeof otp === "string") {
    // Backend is in test mode and echoed the OTP: run everything in one go.
    return completeFlow(email, otp);
  }
  console.log(
    `\nBackend did not echo the OTP (dev mode). Read it from the backend console:\n` +
      `  [auth] OTP for ${email} (email_verification): <otp>\n\n` +
      `Then run:\n  node scripts/smoke-dpop.mjs --email ${email} --otp <otp>\n`,
  );
};

const completeFlow = async (email, otp) => {
  const password = PASSWORD;

  step = "verify-otp";
  console.log("[2/8] POST /auth/verify-otp");
  const verify = await request("POST", "/auth/verify-otp", {
    body: { email, purpose: "email_verification", otp },
  });
  assert([200, 201].includes(verify.status), `OTP verified (got ${verify.status})`, verify.json);

  step = "login";
  console.log("[3/8] POST /auth/login");
  const login = await request("POST", "/auth/login", { body: { email, password } });
  assert(login.status === 200, `login ok (got ${login.status})`, login.json);
  const userAccess = login.json.data.accessToken;
  assert(!decodeJwtPayload(userAccess).cnf, "user access token has no cnf claim");

  step = "keygen";
  console.log("[4/8] generate ECDSA P-256 key pair");
  const pair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign", "verify"],
  );
  const jwkFull = await crypto.subtle.exportKey("jwk", pair.publicKey);
  const publicJwk = { kty: jwkFull.kty, crv: jwkFull.crv, x: jwkFull.x, y: jwkFull.y };
  assert(publicJwk.kty === "EC" && publicJwk.crv === "P-256", "public JWK shape");

  step = "device-register";
  console.log("[5/8] POST /devices/register with publicKey + DPoP proof");
  const regUrl = `${BASE_URL}/devices/register`;
  const devReg = await request("POST", "/devices/register", {
    token: userAccess,
    dpop: await createDpopProof(pair.privateKey, publicJwk, "POST", `${regUrl}?smoke=1#frag`),
    body: { name: "Smoke Device", platform: "chrome_extension", kind: "permanent", publicKey: publicJwk },
  });
  assert(devReg.status === 201, `device registered (got ${devReg.status})`, devReg.json);
  const { device, accessToken: devAccess, refreshToken: devRefresh } = devReg.json.data;
  const cnf = decodeJwtPayload(devAccess).cnf;
  assert(cnf?.jkt, "device access token carries cnf.jkt", decodeJwtPayload(devAccess));
  assert(decodeJwtPayload(devRefresh).cnf?.jkt === cnf.jkt, "refresh token carries same cnf.jkt");

  step = "list-devices";
  console.log("[6/8] GET /devices with device token + fresh proof");
  const list = await request("GET", "/devices", {
    token: devAccess,
    dpop: await createDpopProof(pair.privateKey, publicJwk, "GET", `${BASE_URL}/devices`),
  });
  assert(list.status === 200, `device list ok (got ${list.status})`, list.json);
  assert(
    list.json.data.devices.some((d) => d.id === device.id),
    "registered device present in list",
  );

  step = "heartbeat";
  console.log("[7/8] POST /devices/:id/heartbeat");
  const hbUrl = `${BASE_URL}/devices/${device.id}/heartbeat`;
  const hb = await request("POST", `/devices/${device.id}/heartbeat`, {
    token: devAccess,
    dpop: await createDpopProof(pair.privateKey, publicJwk, "POST", hbUrl),
    body: { status: "yellow" },
  });
  assert(hb.status === 200, `heartbeat ok (got ${hb.status})`, hb.json);
  assert(hb.json.data.device.lastKnownStatus === "yellow", "lastKnownStatus updated");

  step = "refresh";
  console.log("[8/8] POST /auth/refresh-token with device refresh token + proof");
  const refresh = await request("POST", "/auth/refresh-token", {
    dpop: await createDpopProof(pair.privateKey, publicJwk, "POST", `${BASE_URL}/auth/refresh-token`),
    body: { refreshToken: devRefresh },
  });
  assert(refresh.status === 200, `refresh ok (got ${refresh.status})`, refresh.json);
  const newAccess = refresh.json.data.accessToken;
  assert(decodeJwtPayload(newAccess).cnf?.jkt === cnf.jkt, "refreshed access token re-mints cnf.jkt");
  assert(refresh.json.data.refreshToken === undefined, "no refresh-token rotation (accessToken only)");

  console.log("\nAll DPoP smoke checks passed.");
};

const main = async () => {
  if (ARG_EMAIL && ARG_OTP) {
    return completeFlow(ARG_EMAIL.trim().toLowerCase(), ARG_OTP.trim());
  }
  return phaseRegister();
};

main().catch((err) => {
  console.error(`FAIL [${step}]`, err);
  process.exit(1);
});
