export type DevicePlatform = "chrome_extension" | "android" | "ios";
export type DeviceKind = "permanent" | "temporary";
export type DeviceStatus = "red" | "yellow" | "green";
export type PushProvider = "fcm" | "apns" | "webpush";

/** EC P-256 public key, exactly as the backend's `publicKey` field expects. */
export interface EcPublicJwk {
  kty: "EC";
  crv: "P-256";
  x: string;
  y: string;
}

export interface DeviceMetadata {
  osVersion?: string;
  appVersion?: string;
  model?: string;
}

export interface Device {
  id: string;
  name: string;
  platform: DevicePlatform;
  kind: DeviceKind;
  /** Static icon code mapped to the app's bundled icon set. Omitted when unset. */
  iconCode?: string;
  /** Uploaded custom icon File id (paid plans). Omitted when unset. */
  icon?: string;
  pushToken?: string;
  pushProvider?: PushProvider;
  expiresAt?: string;
  lastSeenAt?: string;
  lastKnownStatus?: DeviceStatus;
  lastKnownIp?: string;
  localIp?: string;
  isRevoked: boolean;
  revokedAt?: string;
  isActive: boolean;
  isExpired: boolean;
  metadata?: DeviceMetadata;
  createdAt: string;
}

export interface RegisterDevicePayload {
  name: string;
  platform: DevicePlatform;
  kind: DeviceKind;
  iconCode: string;
  durationHours?: number;
  metadata?: DeviceMetadata;
  publicKey: EcPublicJwk;
}

/** PATCH /devices/{id} body — at least one key required; `iconCode: null` clears it. */
export interface UpdateDevicePayload {
  name?: string;
  iconCode?: string | null;
}

export interface RegisterDeviceResponse {
  device: Device;
  accessToken: string;
  refreshToken: string;
}

export interface DeviceListResponse {
  devices: Device[];
}

export interface DeviceResponse {
  device: Device;
}

export interface HeartbeatPayload {
  status: DeviceStatus;
  localIp?: string;
}
