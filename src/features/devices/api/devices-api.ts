import { api } from "@/lib/axios";
import { createDpopProof } from "@/lib/deviceIdentity";
import type { ApiSuccessResponse } from "@/types/api";
import type {
  Device,
  DeviceListResponse,
  DeviceResponse,
  HeartbeatPayload,
  RegisterDevicePayload,
  RegisterDeviceResponse,
  UpdateDevicePayload,
} from "../types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

/**
 * Register this browser as a device. Called while the session is still
 * user-scoped, so the request interceptor won't add a DPoP proof — we build
 * one explicitly here, signed by the freshly generated key that matches the
 * `publicKey` in the body.
 */
export const registerDevice = async (
  payload: RegisterDevicePayload,
): Promise<RegisterDeviceResponse> => {
  const dpop = await createDpopProof("POST", `${API_BASE_URL}/devices/register`);
  const response = await api.post<ApiSuccessResponse<RegisterDeviceResponse>>(
    "/devices/register",
    payload,
    { headers: { DPoP: dpop } },
  );
  return response.data.data;
};

export const listDevices = async (): Promise<Device[]> => {
  const response = await api.get<ApiSuccessResponse<DeviceListResponse>>("/devices");
  return response.data.data.devices;
};

/** Update name and/or iconCode. The backend requires at least one key. */
export const updateDevice = async (id: string, payload: UpdateDevicePayload): Promise<Device> => {
  const response = await api.patch<ApiSuccessResponse<DeviceResponse>>(`/devices/${id}`, payload);
  return response.data.data.device;
};

export const revokeDevice = async (id: string): Promise<Device> => {
  const response = await api.delete<ApiSuccessResponse<DeviceResponse>>(`/devices/${id}`);
  return response.data.data.device;
};

export const sendHeartbeat = async (id: string, payload: HeartbeatPayload): Promise<Device> => {
  const response = await api.post<ApiSuccessResponse<DeviceResponse>>(
    `/devices/${id}/heartbeat`,
    payload,
  );
  return response.data.data.device;
};
