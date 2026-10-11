#!/usr/bin/env node
/**
 * Скрипт-генератор ссылок на задания VohsaHub из локальных папок
 * Использование:
 *   bun run generate-task.js <путь_к_папке_задания> [--secret] [--base=<url>]
 *   node generate-task.js ../tasks/lesson-1-button --secret
 * 
 * Если аргументы не переданы, скрипт сканирует всю соседнюю директорию ../tasks/
 * и генерирует ссылки для всех найденных заданий.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { deflateSync, strToU8 } from 'fflate';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Базовый URL GitHub Pages развертывания
const DEFAULT_BASE_URL = 'https://den5-tech.github.io/VohsaHub/';

// Вспомогательная функция для url-safe base64 кодирования
function uint8ArrayToUrlSafeBase64(bytes) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = Buffer.from(binary, 'binary').toString('base64');
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Упаковывает массив файлов в сжатую fflate ссылку
 */
function buildShareUrl(files, baseUrl = DEFAULT_BASE_URL, title = '', isSecret = false) {
  const payload = {
    v: 1,
    files: files.map((f) => ({ n: f.name, c: f.content })),
    title,
    is_s: isSecret ? true : undefined,
  };

  const jsonStr = JSON.stringify(payload);
  const uncompressedBytes = strToU8(jsonStr);
  const compressedBytes = deflateSync(uncompressedBytes, { level: 9 });
  const base64Hash = uint8ArrayToUrlSafeBase64(compressedBytes);

  const cleanBase = baseUrl.split('#')[0];
  const secretParam = isSecret ? '&is_s=1' : '';
  const url = `${cleanBase}#project=${base64Hash}${secretParam}`;

  return {
    url,
    totalFiles: files.length,
    rawBytes: uncompressedBytes.length,
    compressedBytes: compressedBytes.length,
    urlLength: url.length,
    compressionRatio: (uncompressedBytes.length / compressedBytes.length).toFixed(1),
  };
}

/**
 * Читает файлы из директории задания
 */
function readTaskDirectory(dirPath) {
  const resolved = path.resolve(process.cwd(), dirPath);
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
    throw new Error(`Папка не найдена: ${resolved}`);
  }

  const entries = fs.readdirSync(resolved, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.isFile()) {
      // Игнорируем служебные файлы вроде .DS_Store
      if (entry.name.startsWith('.')) continue;

      const fullPath = path.join(resolved, entry.name);
      const content = fs.readFileSync(fullPath, 'utf-8');
      files.push({
        name: entry.name,
        content,
      });
    }
  }

  return files;
}

/**
 * Главная функция
 */
function main() {
  const args = process.argv.slice(2);
  const isSecret = args.includes('--secret') || args.includes('-s');
  
  // Кастомный baseUrl если передан --base=...
  const baseArg = args.find((a) => a.startsWith('--base='));
  const baseUrl = baseArg ? baseArg.split('=')[1] : DEFAULT_BASE_URL;

  // Конкретная папка задания
  const targetDirArg = args.find((a) => !a.startsWith('--') && !a.startsWith('-'));

  console.log('\n======================================================');
  console.log('🚀 VohsaHub Task Link Generator');
  console.log('======================================================');
  console.log(`📌 Режим: ${isSecret ? '🔒 Секретный (&is_s=1, task.json скрыт)' : 'Открытый'}`);
  console.log(`🌐 Base URL: ${baseUrl}\n`);

  if (targetDirArg) {
    // Генерация для одной конкретной папки
    const dirName = path.basename(path.resolve(targetDirArg));
    try {
      const files = readTaskDirectory(targetDirArg);
      const stats = buildShareUrl(files, baseUrl, dirName, isSecret);

      console.log(`📂 Задание: [${dirName}] (${stats.totalFiles} файлов)`);
      console.log(`   Файлы: ${files.map((f) => f.name).join(', ')}`);
      console.log(`   Сжатие: ${stats.rawBytes} Б -> ${stats.compressedBytes} Б (${stats.compressionRatio}x)`);
      console.log(`   Длина ссылки: ${stats.urlLength} симв.\n`);
      console.log('🔗 Ссылка на урок:');
      console.log('------------------------------------------------------');
      console.log(stats.url);
      console.log('------------------------------------------------------\n');
    } catch (err) {
      console.error(`❌ Ошибка: ${err.message}`);
    }
    return;
  }

  // Ищем папку tasks рядом с проектом (../tasks) или внутри текущей директории
  const candidatePaths = [
    path.resolve(process.cwd(), '../tasks'),
    path.resolve(__dirname, '../../tasks'),
    path.resolve(process.cwd(), 'tasks'),
  ];

  const defaultTasksRoot = candidatePaths.find((p) => fs.existsSync(p));

  if (!defaultTasksRoot) {
    console.error(`❌ Папка tasks не найдена (проверены: ${candidatePaths.join(', ')}).`);
    console.log('Укажите папку вручную: node scripts/generate-task.js <путь_к_папке>');
    return;
  }

  const subdirs = fs.readdirSync(defaultTasksRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  if (subdirs.length === 0) {
    console.log(`⚠️ В папке ${defaultTasksRoot} пока нет подпапок с заданиями.`);
    return;
  }

  console.log(`Найдено заданий: ${subdirs.length} в ${defaultTasksRoot}\n`);

  for (const sub of subdirs) {
    const fullSubPath = path.join(defaultTasksRoot, sub);
    try {
      const files = readTaskDirectory(fullSubPath);
      const stats = buildShareUrl(files, baseUrl, sub, isSecret);

      console.log(`🎯 [${sub}] (${stats.totalFiles} файлов: ${files.map((f) => f.name).join(', ')})`);
      console.log(`   Длина URL: ${stats.urlLength} симв. (сжатие ${stats.compressionRatio}x)`);
      console.log(`   👉 ${stats.url}\n`);
    } catch (err) {
      console.error(`   ❌ [${sub}]: ${err.message}`);
    }
  }

  console.log('💡 Подсказка: Чтобы сгенерировать скрытое задание (без показа task.json студенту), добавьте флаг --secret:\n   bun run generate-task.js --secret\n');
}

main();
