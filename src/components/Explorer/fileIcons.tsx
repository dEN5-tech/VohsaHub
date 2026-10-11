import {
  FileCode,
  FileJson,
  Palette,
  Cpu,
  FileText,
} from 'lucide-preact';

/**
 * Возвращает соответствующую иконку Lucide в зависимости от расширения файла
 */
export function getFileIcon(fileName: string, size = 14) {
  if (fileName.endsWith('.eta') || fileName.endsWith('.html')) {
    return <FileCode size={size} color="var(--chakra-colors-teal-fg, #14b8a6)" />;
  }
  if (fileName.endsWith('.json')) {
    return <FileJson size={size} color="var(--chakra-colors-yellow-fg, #eab308)" />;
  }
  if (fileName.endsWith('.css') || fileName.endsWith('.scss')) {
    return <Palette size={size} color="var(--chakra-colors-cyan-fg, #38bdf8)" />;
  }
  if (fileName.endsWith('.js') || fileName.endsWith('.mjs')) {
    return <Cpu size={size} color="var(--chakra-colors-green-fg, #22c55e)" />;
  }
  if (fileName.endsWith('.ts')) {
    return <Cpu size={size} color="var(--chakra-colors-blue-fg, #3b82f6)" />;
  }
  return <FileText size={size} color="#a1a1aa" />;
}
