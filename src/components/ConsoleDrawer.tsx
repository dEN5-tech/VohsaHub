import { Terminal, Trash2, ChevronDown, ChevronUp, AlertCircle, AlertTriangle, Info } from 'lucide-preact';

export interface ConsoleEntry {
  id: string;
  level: 'info' | 'warn' | 'error';
  messages: string[];
  timestamp: string;
}

interface ConsoleDrawerProps {
  entries: ConsoleEntry[];
  isOpen: boolean;
  onToggle: () => void;
  onClear: () => void;
}

export function ConsoleDrawer({
  entries,
  isOpen,
  onToggle,
  onClear,
}: ConsoleDrawerProps) {
  const errorCount = entries.filter((e) => e.level === 'error').length;
  const warnCount = entries.filter((e) => e.level === 'warn').length;

  return (
    <div class={`console-drawer ${isOpen ? 'open' : 'collapsed'}`}>
      <div class="console-header" onClick={onToggle}>
        <div class="console-title">
          <Terminal size={14} class="term-icon" />
          <span>Консоль песочницы</span>
          <span class="entry-count">({entries.length})</span>

          {errorCount > 0 && (
            <span class="chakra-badge chakra-badge--red">
              <AlertCircle size={10} /> {errorCount}
            </span>
          )}
          {warnCount > 0 && (
            <span class="chakra-badge chakra-badge--yellow">
              <AlertTriangle size={10} /> {warnCount}
            </span>
          )}
        </div>

        <div class="console-actions" onClick={(e) => e.stopPropagation()}>
          <button
            class="chakra-button chakra-button--ghost chakra-button--xs"
            onClick={onClear}
            title="Очистить консоль"
          >
            <Trash2 size={13} />
            <span>Очистить</span>
          </button>
          <button
            class="chakra-button chakra-button--ghost chakra-button--xs"
            onClick={onToggle}
            title={isOpen ? 'Свернуть' : 'Развернуть'}
          >
            {isOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div class="console-body">
          {entries.length === 0 ? (
            <div class="console-empty">
              <span>Логи браузера песочницы пусты. Запустите скрипт или вызовите console.log().</span>
            </div>
          ) : (
            <div class="console-stream">
              {entries.map((entry) => (
                <div key={entry.id} class={`console-line level-${entry.level}`}>
                  <span class="line-time">[{entry.timestamp}]</span>
                  <span class="line-badge">
                    {entry.level === 'error' && <AlertCircle size={12} />}
                    {entry.level === 'warn' && <AlertTriangle size={12} />}
                    {entry.level === 'info' && <Info size={12} />}
                  </span>
                  <span class="line-text">{entry.messages.join(' ')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
