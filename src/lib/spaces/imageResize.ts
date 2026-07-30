const MAX_DIMENSION = 1280;
const JPEG_QUALITY = 0.72;

/**
 * Resizes an image file client-side (canvas) and returns a compressed JPEG
 * data URL. There's no upload backend in this prototype, so photos are
 * persisted directly as data URLs in the venue record — resizing keeps each
 * one small enough that a handful of them still fit inside localStorage's
 * per-origin quota (~5–10MB).
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

export function resizeImageFiles(files: File[]): Promise<string[]> {
  return Promise.all(files.map(resizeImageFile));
}
