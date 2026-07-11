const DEFAULT_ICE_SERVERS: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];

export interface PeerConnectionHandlers {
  onIceCandidate: (candidate: RTCIceCandidate) => void;
  onDataChannel?: (channel: RTCDataChannel) => void;
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
}

/**
 * Green-mode P2P transport. File chunks flow only through the returned
 * RTCDataChannel -- never through the backend, which is signaling-only.
 */
export const createPeerConnection = (
  handlers: PeerConnectionHandlers,
  iceServers: RTCIceServer[] = DEFAULT_ICE_SERVERS,
): RTCPeerConnection => {
  const connection = new RTCPeerConnection({ iceServers });

  connection.onicecandidate = (event) => {
    if (event.candidate) {
      handlers.onIceCandidate(event.candidate);
    }
  };

  connection.ondatachannel = (event) => {
    handlers.onDataChannel?.(event.channel);
  };

  connection.onconnectionstatechange = () => {
    handlers.onConnectionStateChange?.(connection.connectionState);
  };

  return connection;
};

export const createDataChannel = (
  connection: RTCPeerConnection,
  label = "file-transfer",
): RTCDataChannel => {
  const channel = connection.createDataChannel(label, { ordered: true });
  channel.binaryType = "arraybuffer";
  return channel;
};

export const createOffer = async (
  connection: RTCPeerConnection,
): Promise<RTCSessionDescriptionInit> => {
  const offer = await connection.createOffer();
  await connection.setLocalDescription(offer);
  return offer;
};

export const createAnswer = async (
  connection: RTCPeerConnection,
  offer: RTCSessionDescriptionInit,
): Promise<RTCSessionDescriptionInit> => {
  await connection.setRemoteDescription(offer);
  const answer = await connection.createAnswer();
  await connection.setLocalDescription(answer);
  return answer;
};

export const applyRemoteAnswer = async (
  connection: RTCPeerConnection,
  answer: RTCSessionDescriptionInit,
): Promise<void> => {
  await connection.setRemoteDescription(answer);
};

export const addRemoteIceCandidate = async (
  connection: RTCPeerConnection,
  candidate: RTCIceCandidateInit,
): Promise<void> => {
  await connection.addIceCandidate(candidate);
};
