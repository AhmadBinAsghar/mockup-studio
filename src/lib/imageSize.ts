const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];
const PNG_HEADER_BYTES = 24;

export interface ImageSize {
  width: number;
  height: number;
}

export const PNG_HEADER_LENGTH = PNG_HEADER_BYTES;

export function readPngSize(header: Uint8Array): ImageSize | null {
  if (header.length < PNG_HEADER_BYTES) return null;
  if (!PNG_SIGNATURE.every((byte, i) => header[i] === byte)) return null;
  const view = new DataView(header.buffer, header.byteOffset, header.byteLength);
  const width = view.getUint32(16);
  const height = view.getUint32(20);
  return width > 0 && height > 0 ? { width, height } : null;
}
