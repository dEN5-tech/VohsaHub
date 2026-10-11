import { deflateSync, inflateSync, strToU8, strFromU8 } from 'fflate';
import type { VirtualFile } from './templateEngine';
import initWasm, { wasm_decode_to_json, wasm_encode_project } from '../wasm/vohsa_core.js';
import wasmUrl from '../wasm/vohsa_core_bg.wasm?url';

let wasmInitPromise: Promise<any> | null = null;
export async function ensureWasmInitialized() {
  if (!wasmInitPromise) {
    wasmInitPromise = initWasm(wasmUrl);
  }
  return wasmInitPromise;
}

export interface ProjectSharePayload {
  v: 1;
  files: Array<{ n: string; c: string }>;
  title?: string;
  is_s?: boolean; // Флаг секретного задания: task.json скрывается от студента в проводнике/редакторе
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
  isV2?: boolean;
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
 * Упаковывает и сжимает проект через fflate (Deflate v1)
 */
export function compressProjectToUrl(
  files: VirtualFile[],
  baseUrl: string = window.location.origin + window.location.pathname,
  title?: string,
  isSecureTask?: boolean
): ShareUrlStats {
  const payload: ProjectSharePayload = {
    v: 1,
    files: files.map((f) => ({ n: f.name, c: f.content })),
    title,
    is_s: isSecureTask ? true : undefined,
  };

  const jsonStr = JSON.stringify(payload);
  const uncompressedBytes = strToU8(jsonStr);

  const compressedBytes = deflateSync(uncompressedBytes, { level: 9 });
  const base64Hash = uint8ArrayToUrlSafeBase64(compressedBytes);

  const cleanBaseUrl = baseUrl.split('#')[0];
  const secureParam = isSecureTask ? '&is_s=1' : '';
  const fullUrl = `${cleanBaseUrl}#project=${base64Hash}${secureParam}`;

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
    isV2: false,
  };
}

/**
 * Упаковывает проект в ультра-сжатый v2 формат через Rust WASM (Brotli + MessagePack)
 */
export async function compressProjectToUrlV2(
  files: VirtualFile[],
  baseUrl: string = window.location.origin + window.location.pathname,
  title?: string,
  isSecureTask?: boolean
): Promise<ShareUrlStats> {
  await ensureWasmInitialized();

  const payload = {
    v: 2,
    f: files.map((f) => ({ n: f.name, c: f.content })),
    t: title || null,
    s: isSecureTask ? true : null,
  };

  const jsonStr = JSON.stringify(payload);
  const v2Hash = wasm_encode_project(jsonStr);

  const cleanBaseUrl = baseUrl.split('#')[0];
  const secureParam = isSecureTask ? '&is_s=1' : '';
  const fullUrl = `${cleanBaseUrl}#v2=${v2Hash}${secureParam}`;

  const totalLines = files.reduce((acc, f) => acc + (f.content ? f.content.split('\n').length : 0), 0);
  const totalChars = files.reduce((acc, f) => acc + (f.content ? f.content.length : 0), 0);
  const urlLength = fullUrl.length;
  const compressionRatio = Number((jsonStr.length / (v2Hash.length || 1)).toFixed(1));

  return {
    url: fullUrl,
    totalLines,
    totalChars,
    compressedBytes: v2Hash.length,
    urlLength,
    isSafeForMessengers: urlLength <= 4000,
    isSafeForBrowser: urlLength <= 20000,
    compressionRatio,
    isV2: true,
  };
}

/**
 * Извлекает и распаковывает проект из hash строки (#project=... или #v2=...)
 */
export function decompressProjectFromUrl(hash: string = window.location.hash): {
  files: VirtualFile[];
  title?: string;
  isSecureTask?: boolean;
} | null {
  if (!hash) return null;

  const cleanHash = hash.startsWith('#') ? hash.slice(1) : hash;
  const params = new URLSearchParams(cleanHash);
  const encodedData = params.get('project');

  const is_s_query = params.get('is_s');
  const isSecureFromUrl = is_s_query === '1' || is_s_query === 'true' || cleanHash.includes('is_s');

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
        isSecureTask: isSecureFromUrl || Boolean(payload.is_s),
      };
    }
  } catch (err) {
    console.error('Ошибка распаковки проекта из URL (v1):', err);
  }

  return null;
}

/**
 * Асинхронная универсальная распаковка проекта из URL (поддерживает и v1, и v2 Rust WASM)
 */
export async function decompressProjectFromUrlAsync(hash: string = window.location.hash): Promise<{
  files: VirtualFile[];
  title?: string;
  isSecureTask?: boolean;
} | null> {
  if (!hash) return null;

  const cleanHash = hash.startsWith('#') ? hash.slice(1) : hash;
  const params = new URLSearchParams(cleanHash);

  const is_s_query = params.get('is_s');
  const isSecureFromUrl = is_s_query === '1' || is_s_query === 'true' || cleanHash.includes('is_s');

  // 1. Проверяем V2 формат (#v2=...)
  const v2Hash = params.get('v2');
  if (v2Hash) {
    try {
      await ensureWasmInitialized();
      const jsonStr = wasm_decode_to_json(v2Hash);
      const payload = JSON.parse(jsonStr);

      if (payload && Array.isArray(payload.f)) {
        const files: VirtualFile[] = payload.f.map((item: any) => ({
          name: item.n,
          content: item.c,
        }));
        return {
          files,
          title: payload.t || undefined,
          isSecureTask: isSecureFromUrl || Boolean(payload.s),
        };
      }
    } catch (err) {
      console.error('Ошибка WASM распаковки V2 проекта из URL:', err);
    }
  }

  // 2. Если не v2, пробуем v1 через синхронный метод
  return decompressProjectFromUrl(hash);
}

