import { io, type Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "./types";

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: AppSocket | null = null;

/**
 * Connects to the (not yet implemented) backend signaling namespace.
 * Auth handshake shape { token, deviceId } matches the backend's documented plan.
 */
export const connectSocket = (token: string, deviceId: string): AppSocket => {
  socket?.disconnect();

  socket = io(import.meta.env.VITE_WS_URL, {
    auth: { token, deviceId },
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10_000,
  });

  return socket;
};

export const disconnectSocket = (): void => {
  socket?.disconnect();
  socket = null;
};

export const getSocket = (): AppSocket | null => socket;
