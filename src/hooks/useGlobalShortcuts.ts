import { useEffect } from 'preact/hooks';

export interface UseGlobalShortcutsOptions {
  onRunCompile: () => void;
  onToggleExplorer: () => void;
}

export function useGlobalShortcuts({
  onRunCompile,
  onToggleExplorer,
}: UseGlobalShortcutsOptions) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Enter or Cmd+Enter to compile
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        onRunCompile();
      }

      // Ctrl+Shift+E to toggle file explorer
      if (
        (e.ctrlKey || e.metaKey) &&
        e.shiftKey &&
        (e.key === 'e' || e.key === 'E' || e.key === 'у' || e.key === 'У')
      ) {
        e.preventDefault();
        onToggleExplorer();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onRunCompile, onToggleExplorer]);
}
