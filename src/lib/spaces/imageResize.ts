const MAX_DIMENSION = 960;
const JPEG_QUALITY = 0.55;

/**
 * Resizes an image file client-side (canvas) and returns a compressed JPEG
 * data URL. There's no upload backend in this prototype, so photos are
 * persisted directly as data URLs in the venue record. Base64 (+33%) and
 * localStorage's UTF-16 string storage (commonly ~2 bytes/char) mean the
 * stored cost of a photo runs 2-3x its raw JPEG byte size, so these
 * dimension/quality values are kept low enough that a full listing (7+
 * photos) still fits inside localStorage's per-origin quota (~5–10MB).
 */
export function resizeImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error(`Could not load ${file.name}`));
      img.onload = () => {
        const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
        const width = Math.round(img.width * scale);
        const height = Math.round(img.height * scale);

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas is not supported in this browser"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", JPEG_QUALITY));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export interface ResizeBatchResult {
  photos: string[];
  /** File names that failed to process (unreadable file, unsupported format, etc). */
  failedFileNames: string[];
}

/**
 * Resizes a batch of files independently so one bad file (corrupt, unreadable,
 * unsupported format) doesn't drop the rest of a multi-select upload.
 */
export async function resizeImageFiles(files: File[]): Promise<ResizeBatchResult> {
  const results = await Promise.allSettled(files.map(resizeImageFile));
  const photos: string[] = [];
  const failedFileNames: string[] = [];
  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      photos.push(result.value);
    } else {
      failedFileNames.push(files[index].name);
    }
  });
  return { photos, failedFileNames };
}
