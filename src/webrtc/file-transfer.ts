const CHUNK_SIZE = 16 * 1024; // 16 KiB, safe under the ~256 KiB RTCDataChannel buffer limit
const BUFFERED_AMOUNT_LOW_THRESHOLD = 1024 * 1024; // 1 MiB backpressure watermark

export interface FileMetadata {
  name: string;
  size: number;
  mimeType: string;
}

export interface TransferProgress {
  bytesTransferred: number;
  totalBytes: number;
}

const waitForDrain = (channel: RTCDataChannel): Promise<void> =>
  new Promise((resolve) => {
    channel.bufferedAmountLowThreshold = BUFFERED_AMOUNT_LOW_THRESHOLD;
    channel.addEventListener("bufferedamountlow", () => resolve(), { once: true });
  });

/**
 * Streams a File over an already-open RTCDataChannel in fixed-size chunks,
 * applying backpressure so we never outrun the channel's send buffer.
 * Sends a JSON metadata frame first, then raw ArrayBuffer chunks.
 */
export const sendFile = async (
  channel: RTCDataChannel,
  file: File,
  onProgress?: (progress: TransferProgress) => void,
): Promise<void> => {
  const metadata: FileMetadata = { name: file.name, size: file.size, mimeType: file.type };
  channel.send(JSON.stringify(metadata));

  let offset = 0;

  while (offset < file.size) {
    if (channel.bufferedAmount > BUFFERED_AMOUNT_LOW_THRESHOLD) {
      await waitForDrain(channel);
    }

    const slice = file.slice(offset, offset + CHUNK_SIZE);
    const buffer = await slice.arrayBuffer();
    channel.send(buffer);

    offset += buffer.byteLength;
    onProgress?.({ bytesTransferred: offset, totalBytes: file.size });
  }
};

/**
 * Reassembles a file streamed via `sendFile` on the receiving end of the
 * same RTCDataChannel. Resolves with a Blob once all bytes have arrived.
 */
export const receiveFile = (
  channel: RTCDataChannel,
  onProgress?: (progress: TransferProgress) => void,
): Promise<{ metadata: FileMetadata; blob: Blob }> =>
  new Promise((resolve, reject) => {
    let metadata: FileMetadata | null = null;
    let bytesReceived = 0;
    const chunks: ArrayBuffer[] = [];

    const handleMessage = (event: MessageEvent<string | ArrayBuffer>) => {
      try {
        if (typeof event.data === "string") {
          metadata = JSON.parse(event.data) as FileMetadata;
          return;
        }

        if (!metadata) {
          throw new Error("Received a chunk before file metadata");
        }

        chunks.push(event.data);
        bytesReceived += event.data.byteLength;
        onProgress?.({ bytesTransferred: bytesReceived, totalBytes: metadata.size });

        if (bytesReceived >= metadata.size) {
          channel.removeEventListener("message", handleMessage);
          resolve({ metadata, blob: new Blob(chunks, { type: metadata.mimeType }) });
        }
      } catch (error) {
        channel.removeEventListener("message", handleMessage);
        reject(error instanceof Error ? error : new Error("File transfer failed"));
      }
    };

    channel.addEventListener("message", handleMessage);
  });
