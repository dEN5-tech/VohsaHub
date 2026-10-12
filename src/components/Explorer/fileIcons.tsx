import {
  FileCode,
  FileJson,
  Palette,
  Cpu,
  FileText,
  GraduationCap,
} from 'lucide-preact';

/**
 * Возвращает соответствующую иконку Lucide в зависимости от расширения файла
 */
export function getFileIcon(fileName: string, size = 14) {
  const lower = fileName.toLowerCase();
  if (
    lower === 'task.json' ||
    lower === 'tasks.json' ||
    lower === 'sololearn.json' ||
    lower.endsWith('.task.json') ||
    lower.endsWith('.sololearn.json')
  ) {
    return <GraduationCap size={size} color="var(--chakra-colors-teal-fg, #14b8a6)" />;
  }
  if (fileName.endsWith('.vue')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
        <path d="M2 3h4l6 10 6-10h4l-10 18z" fill="#42b883" />
        <path d="M6 3h3.5l2.5 4.5 2.5-4.5h3.5l-6 11z" fill="#35495e" />
      </svg>
    );
  }
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
