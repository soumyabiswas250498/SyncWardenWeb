/**
 * Signaling contract. Mirrors the backend's planned Socket.IO signaling module
 * (not implemented server-side yet): auth handshake { token, deviceId }, and
 * signal:send / signal:receive events carrying one of the payloads below.
 */

export type SignalType =
  | "transfer-request"
  | "transfer-accept"
  | "transfer-reject"
  | "webrtc-offer"
  | "webrtc-answer"
  | "ice-candidate"
  | "transfer-cancel"
  | "transfer-pause"
  | "transfer-resume"
  | "resume-from"
  | "ping";

interface SignalBase {
  fromDeviceId: string;
  toDeviceId: string;
}

export interface TransferRequestSignal extends SignalBase {
  type: "transfer-request";
  transferId: string;
  fileName: string;
  fileSize: number;
}

export interface TransferAcceptSignal extends SignalBase {
  type: "transfer-accept";
  transferId: string;
}

export interface TransferRejectSignal extends SignalBase {
  type: "transfer-reject";
  transferId: string;
  reason?: string;
}

export interface WebrtcOfferSignal extends SignalBase {
  type: "webrtc-offer";
  transferId: string;
  sdp: RTCSessionDescriptionInit;
}

export interface WebrtcAnswerSignal extends SignalBase {
  type: "webrtc-answer";
  transferId: string;
  sdp: RTCSessionDescriptionInit;
}

export interface IceCandidateSignal extends SignalBase {
  type: "ice-candidate";
  transferId: string;
  candidate: RTCIceCandidateInit;
}

export interface TransferCancelSignal extends SignalBase {
  type: "transfer-cancel";
  transferId: string;
}

export interface TransferPauseSignal extends SignalBase {
  type: "transfer-pause";
  transferId: string;
}

export interface TransferResumeSignal extends SignalBase {
  type: "transfer-resume";
  transferId: string;
}

export interface ResumeFromSignal extends SignalBase {
  type: "resume-from";
  transferId: string;
  byteOffset: number;
}

export interface PingSignal extends SignalBase {
  type: "ping";
}

export type Signal =
  | TransferRequestSignal
  | TransferAcceptSignal
  | TransferRejectSignal
  | WebrtcOfferSignal
  | WebrtcAnswerSignal
  | IceCandidateSignal
  | TransferCancelSignal
  | TransferPauseSignal
  | TransferResumeSignal
  | ResumeFromSignal
  | PingSignal;

export interface DevicePresence {
  deviceId: string;
  status: "red" | "yellow" | "green";
}

export interface ServerToClientEvents {
  "signal:receive": (signal: Signal) => void;
  "device:presence": (presence: DevicePresence) => void;
}

export interface ClientToServerEvents {
  "signal:send": (signal: Signal) => void;
}

export interface SocketAuthHandshake {
  token: string;
  deviceId: string;
}
