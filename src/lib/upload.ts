import { API_BASE_URL } from './config';
import { ApiError } from './api-client';
import { authService } from './auth';

/** Types the backend upload accepts (routes/v1/owner/upload.ts). */
export const UPLOAD_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const toBlob = (canvas: HTMLCanvasElement, type: string, quality: number) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

/**
 * Downscales to `maxSide` and re-encodes as WebP in the browser, so the backend
 * (which stores bytes as-is) never keeps a 4MB screenshot. GIFs pass through
 * (re-encoding drops animation); the original wins when it's already smaller.
 */
// ponytail: single size, no srcset/thumbnails - add Cloudflare Images on /media if needed.
export async function compressImage(file: File, maxSide = 2560, quality = 0.82) {
    const bitmap = await createImageBitmap(file);
    const original = { file, width: bitmap.width, height: bitmap.height };
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    if (file.type === 'image/gif') { bitmap.close(); return original; }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    // Browsers that can't encode WebP silently return PNG - fall back to JPEG then.
    let blob = await toBlob(canvas, 'image/webp', quality);
    if (blob?.type !== 'image/webp') blob = await toBlob(canvas, 'image/jpeg', quality);
    if (!blob || blob.size >= file.size) return original;

    const ext = blob.type === 'image/webp' ? 'webp' : 'jpg';
    const name = file.name.replace(/\.[^.]+$/, '') + '.' + ext;
    return { file: new File([blob], name, { type: blob.type }), width, height };
}

export async function uploadImage(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);

    const send = () => fetch(`${API_BASE_URL}/owner/upload`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
    });
    // Same one-shot refresh ApiClient does for JSON calls - an expired access
    // token shouldn't fail an upload the user just waited on.
    let response = await send();
    if (response.status === 401 && (await authService.tryRefresh())) response = await send();

    const json = await response.json().catch(() => ({}));

    if (!response.ok) {
        const message = json?.error || json?.message || `Upload failed: ${response.status}`;
        throw new ApiError(message, response.status, json);
    }

    if (!json?.success || !json?.data?.url) {
        throw new ApiError(json?.error || 'Upload response missing URL', response.status, json);
    }

    return json.data.url as string;
}
