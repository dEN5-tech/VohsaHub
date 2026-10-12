import { ensureWasmInitialized } from './urlShareCompressor';
import { wasm_encode_project } from '../wasm/vohsa_core.js';
import type { VirtualFile } from './templateEngine';

// Публичный адрес Rust бэкенда на вашем VPS
export const VOHSA_BACKEND_URL = 'http://vohsa.85.198.71.69.sslip.io';

export interface CloudSaveResult {
  id: string;
  hash: string;
  shortUrl: string;       // e.g. https://den5-tech.github.io/VohsaHub/#p=UtvguVw0
  redirectUrl: string;    // e.g. http://vohsa.85.198.71.69.sslip.io/api/r/UtvguVw0
  rawBytes: number;
  compressedBytes: number;
  filesCount: number;
}

/**
 * Сохраняет проект на Rust бэкенде через ультра-сжатый Brotli V2 + JSON-RPC
 */
export async function saveProjectToCloud(
  files: VirtualFile[],
  title?: string,
  isSecureTask?: boolean
): Promise<CloudSaveResult> {
  // 1. Сжимаем локально на клиенте через Rust WASM
  await ensureWasmInitialized();
  const payloadObj = {
    v: 2,
    f: files.map((f) => ({ n: f.name, c: f.content })),
    t: title || undefined,
    s: isSecureTask || undefined,
  };
  const jsonStr = JSON.stringify(payloadObj);
  const v2Hash = wasm_encode_project(jsonStr);

  // 2. Отправляем в Rust бэкенд вызов RPC vohsa.save
  const rpcReq = {
    jsonrpc: '2.0',
    id: Date.now(),
    method: 'vohsa.save',
    params: {
      hash: v2Hash,
      title: title || 'Без названия',
      is_secret: Boolean(isSecureTask),
      files_count: files.length,
      raw_bytes: jsonStr.length,
      compressed_bytes: v2Hash.length,
    },
  };

  const response = await fetch(`${VOHSA_BACKEND_URL}/rpc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(rpcReq),
  });

  if (!response.ok) {
    throw new Error(`Ошибка сервера (${response.status}): ${response.statusText}`);
  }

  const rpcRes = await response.json();
  if (rpcRes.error) {
    throw new Error(rpcRes.error.message || 'Ошибка RPC вызова');
  }

  const result = rpcRes.result;
  const baseUrl = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : 'https://den5-tech.github.io/VohsaHub';
  const cleanBase = baseUrl.replace(/\/+$/, '');

  return {
    id: result.id,
    hash: result.hash,
    shortUrl: `${cleanBase}/#p=${result.id}`,
    redirectUrl: `${VOHSA_BACKEND_URL}/api/r/${result.id}`,
    rawBytes: result.raw_bytes || jsonStr.length,
    compressedBytes: result.compressed_bytes || v2Hash.length,
    filesCount: result.files_count || files.length,
  };
}

/**
 * Загружает проект из Rust бэкенда по короткому ID
 */
export async function loadProjectFromCloud(id: string): Promise<{
  files: VirtualFile[];
  title?: string;
  isSecureTask?: boolean;
} | null> {
  try {
    const response = await fetch(`${VOHSA_BACKEND_URL}/api/p/${encodeURIComponent(id)}`);
    if (!response.ok) return null;

    const data = await response.json();
    if (data && data.payload && Array.isArray(data.payload.f)) {
      const files: VirtualFile[] = data.payload.f.map((item: any) => ({
        name: item.n,
        content: item.c,
      }));
      return {
        files,
        title: data.payload.t || data.record?.title,
        isSecureTask: Boolean(data.payload.s || data.record?.is_secret),
      };
    }
  } catch (err) {
    console.warn('Не удалось загрузить проект из облака по ID:', err);
  }
  return null;
}
