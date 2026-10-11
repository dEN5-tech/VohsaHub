import { Files, GraduationCap, RotateCcw, Terminal } from 'lucide-preact';

interface ActivityBarProps {
  activeSidebarTab: 'explorer' | 'tasks' | null;
  onSelectSidebarTab: (tab: 'explorer' | 'tasks') => void;
  isConsoleOpen: boolean;
  onToggleConsole: () => void;
  onReset: () => void;
}

export function ActivityBar({
  activeSidebarTab,
  onSelectSidebarTab,
  isConsoleOpen,
  onToggleConsole,
  onReset,
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
          class={`activity-bar-btn ${activeSidebarTab === 'tasks' ? 'active' : ''}`}
          onClick={() => onSelectSidebarTab('tasks')}
          title="Практические задания и тесты (SoloLearn)"
        >
          <GraduationCap size={20} />
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
