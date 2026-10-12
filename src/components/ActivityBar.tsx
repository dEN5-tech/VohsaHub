import { Files, GraduationCap, RotateCcw, Terminal, Package } from 'lucide-preact';

interface ActivityBarProps {
  activeSidebarTab: 'explorer' | 'tasks' | 'packages' | null;
  onSelectSidebarTab: (tab: 'explorer' | 'tasks' | 'packages') => void;
  isConsoleOpen: boolean;
  onToggleConsole: () => void;
  onReset: () => void;
  hasTasksBadge?: boolean;
}

export function ActivityBar({
  activeSidebarTab,
  onSelectSidebarTab,
  isConsoleOpen,
  onToggleConsole,
  onReset,
  hasTasksBadge,
}: ActivityBarProps) {
  return (
    <div class="vscode-activity-bar">
      <div class="activity-bar-top">
        <button
          class={`activity-bar-btn ${activeSidebarTab === 'explorer' ? 'active' : ''}`}
          onClick={() => onSelectSidebarTab('explorer')}
          title="Проводник файлов (Ctrl+Shift+E)"
        >
          <Files size={20} />
          {activeSidebarTab === 'explorer' && <span class="active-indicator" />}
        </button>

        <button
          class={`activity-bar-btn ${activeSidebarTab === 'packages' ? 'active' : ''}`}
          onClick={() => onSelectSidebarTab('packages')}
          title="Библиотеки и пакеты esm.sh (Vue 3, React, Tailwind, Icons...)"
        >
          <Package size={20} />
          {activeSidebarTab === 'packages' && <span class="active-indicator" />}
        </button>

        <button
          class={`activity-bar-btn ${activeSidebarTab === 'tasks' ? 'active' : ''}`}
          onClick={() => onSelectSidebarTab('tasks')}
          title="Практические задания и тесты (SoloLearn)"
          style={{ position: 'relative' }}
        >
          <GraduationCap size={20} />
          {hasTasksBadge && (
            <span
              style={{
                position: 'absolute',
                top: '6px',
                right: '8px',
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: '#14b8a6',
                boxShadow: '0 0 6px #14b8a6',
              }}
            />
          )}
          {activeSidebarTab === 'tasks' && <span class="active-indicator" />}
        </button>

        <button
          class={`activity-bar-btn ${isConsoleOpen ? 'active' : ''}`}
          onClick={onToggleConsole}
          title="Консоль терминала"
        >
          <Terminal size={20} />
          {isConsoleOpen && <span class="active-indicator" />}
        </button>
      </div>

      <div class="activity-bar-bottom">
        <button
          class="activity-bar-btn"
          onClick={onReset}
          title="Сбросить к исходным файлам"
        >
          <RotateCcw size={18} />
        </button>
      </div>
    </div>
  );
}
