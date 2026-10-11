import { deflateSync, inflateSync, strToU8, strFromU8 } from 'fflate';
import type { VirtualFile } from './templateEngine';

export interface ProjectSharePayload {
  v: 1;
  files: Array<{ n: string; c: string }>;
  title?: string;
}

export interface ShareUrlStats {
  url: string;
  totalLines: number;
  totalChars: number;
  compressedBytes: number;
  urlLength: number;
  isSafeForMessengers: boolean; // <= 4000 chars
  isSafeForBrowser: boolean;    // <= 20000 chars
  compressionRatio: number;     // e.g. 3.5x
}

/**
 * Конвертирует Uint8Array в url-safe base64 строку
 */
function uint8ArrayToUrlSafeBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  // Делаем url-safe: заменяем +, / и обрезаем padding =
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Конвертирует url-safe base64 строку обратно в Uint8Array
 */
function urlSafeBase64ToUint8Array(base64Str: string): Uint8Array {
  let base64 = base64Str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Упаковывает и сжимает проект через fflate (Deflate с максимальным сжатием level 9)
 * в компактную ссылку для шаринга в URL хэш `#project=...`
 */
export function compressProjectToUrl(
  files: VirtualFile[],
  baseUrl: string = window.location.origin + window.location.pathname,
  title?: string
): ShareUrlStats {
  const payload: ProjectSharePayload = {
    v: 1,
    files: files.map((f) => ({ n: f.name, c: f.content })),
    title,
  };

  const jsonStr = JSON.stringify(payload);
  const uncompressedBytes = strToU8(jsonStr);

  // Сжатие Deflate с максимальным качеством level: 9
  const compressedBytes = deflateSync(uncompressedBytes, { level: 9 });
  const base64Hash = uint8ArrayToUrlSafeBase64(compressedBytes);

  const cleanBaseUrl = baseUrl.split('#')[0];
  const fullUrl = `${cleanBaseUrl}#project=${base64Hash}`;

  const totalLines = files.reduce((acc, f) => acc + (f.content ? f.content.split('\n').length : 0), 0);
  const totalChars = files.reduce((acc, f) => acc + (f.content ? f.content.length : 0), 0);
  const urlLength = fullUrl.length;
  const compressionRatio = Number((uncompressedBytes.length / (compressedBytes.length || 1)).toFixed(1));

  return {
    url: fullUrl,
    totalLines,
    totalChars,
    compressedBytes: compressedBytes.length,
    urlLength,
    isSafeForMessengers: urlLength <= 4000,
    isSafeForBrowser: urlLength <= 20000,
    compressionRatio,
  };
}

/**
 * Извлекает и распаковывает проект из hash строки (#project=...)
 */
export function decompressProjectFromUrl(hash: string = window.location.hash): {
  files: VirtualFile[];
  title?: string;
} | null {
  if (!hash) return null;

  // Ищем параметр project= в хеше или query
  const cleanHash = hash.startsWith('#') ? hash.slice(1) : hash;
  const params = new URLSearchParams(cleanHash);
  const encodedData = params.get('project');

  if (!encodedData) return null;

  try {
    const compressedBytes = urlSafeBase64ToUint8Array(encodedData);
    const decompressedBytes = inflateSync(compressedBytes);
    const jsonStr = strFromU8(decompressedBytes);
    const payload = JSON.parse(jsonStr) as ProjectSharePayload;

    if (payload && payload.v === 1 && Array.isArray(payload.files)) {
      const files: VirtualFile[] = payload.files.map((f) => ({
        name: f.n,
        content: f.c,
      }));
      return {
        files,
        title: payload.title,
      };
    }
  } catch (err) {
    console.error('Ошибка распаковки проекта из URL:', err);
  }

  return null;
}
