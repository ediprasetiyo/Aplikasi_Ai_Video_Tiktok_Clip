/**
 * Validates the first bytes of an uploaded video file actually match the
 * claimed content type. Prevents disguised payloads (e.g. .exe renamed .mp4
 * uploaded with content-type spoofed to video/mp4).
 *
 * Read the first 32 bytes via Range GET and pass them here.
 */
export function isValidVideoMagic(prefix: Buffer, claimedMime: string): boolean {
  switch (claimedMime) {
    case 'video/mp4':
    case 'video/quicktime':
      // ISO Base Media: bytes 4..7 = "ftyp"
      return (
        prefix.length >= 8 &&
        prefix[4] === 0x66 &&
        prefix[5] === 0x74 &&
        prefix[6] === 0x79 &&
        prefix[7] === 0x70
      );
    case 'video/x-matroska':
    case 'video/webm':
      // EBML magic: 1A 45 DF A3
      return (
        prefix.length >= 4 &&
        prefix[0] === 0x1a &&
        prefix[1] === 0x45 &&
        prefix[2] === 0xdf &&
        prefix[3] === 0xa3
      );
    default:
      return false;
  }
}

export const MAGIC_PREFIX_BYTES = 32;
