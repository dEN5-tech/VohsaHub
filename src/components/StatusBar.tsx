import { Check, AlertTriangle, Radio } from 'lucide-preact';
import type { CompilationResult } from '../compiler/templateEngine';

interface StatusBarProps {
  compilationResult: CompilationResult;
  activeFileName: string;
  cursorPos: { line: number; col: number };
  autoCompile: boolean;
}

function getLanguageLabel(fileName: string): string {
  if (fileName.endsWith('.eta')) return 'Eta Template';
  if (fileName.endsWith('.html')) return 'HTML';
  if (fileName.endsWith('.json')) return 'JSON';
  if (fileName.endsWith('.css')) return 'CSS';
  if (fileName.endsWith('.scss')) return 'SCSS';
  if (fileName.endsWith('.js')) return 'JavaScript';
  if (fileName.endsWith('.ts')) return 'TypeScript';
  return 'Plain Text';
}

export function StatusBar({
  compilationResult,
  activeFileName,
  cursorPos,
  autoCompile,
}: StatusBarProps) {
  return (
    <footer class="vscode-status-bar">
      <div class="status-bar-left">
        <div class="status-bar-item status-live">
          <Radio size={12} color={autoCompile ? '#14b8a6' : '#71717a'} />
          <span>{autoCompile ? 'Live Engine' : 'Manual'}</span>
        </div>

        <div
          class={`status-bar-item ${
            compilationResult.success ? 'status-ok' : 'status-err'
          }`}
        >
          {compilationResult.success ? (
            <>
              <Check size={12} color="#14b8a6" />
              <span>Собрано без ошибок</span>
            </>
          ) : (
            <>
              <AlertTriangle size={12} color="#f87171" />
              <span>Ошибка компиляции</span>
            </>
          )}
        </div>
      </div>

      <div class="status-bar-right">
        <div class="status-bar-item">
          <span>
            Ln {cursorPos.line}, Col {cursorPos.col}
          </span>
        </div>
        <div class="status-bar-item">
          <span>Spaces: 2</span>
        </div>
        <div class="status-bar-item">
          <span>UTF-8</span>
        </div>
        <div class="status-bar-item status-lang">
          <span>{getLanguageLabel(activeFileName)}</span>
        </div>
      </div>
    </footer>
  );
}
