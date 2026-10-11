import { useState, useMemo } from 'preact/hooks';
import {
  ChevronRight,
  ChevronDown,
  Copy,
  Check,
  AlertTriangle,
  Code2,
  ListTree,
  FileCode,
  Palette,
  Cpu,
} from 'lucide-preact';
import { parseFileAst, type AstParseResult } from '../compiler/astParser';
import type { VirtualFile } from '../compiler/templateEngine';

interface AstViewerProps {
  files: VirtualFile[];
  activeFileName: string;
}

export function AstViewer({ files, activeFileName }: AstViewerProps) {
  const [selectedFile, setSelectedFile] = useState<string>(activeFileName);
  const [viewMode, setViewMode] = useState<'tree' | 'json'>('tree');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  // Auto-switch to active file if user changes files in editor, or use selected
  const currentFile = files.find((f) => f.name === selectedFile) || files.find((f) => f.name === activeFileName) || files[0];

  const parseResult: AstParseResult = useMemo(() => {
    if (!currentFile) {
      return {
        success: false,
        language: 'unknown',
        parserName: 'None',
        error: 'Файл не найден',
      };
    }
    return parseFileAst(currentFile.name, currentFile.content);
  }, [currentFile?.name, currentFile?.content]);

  const astJsonString = useMemo(() => {
    if (!parseResult.ast) return '';
    try {
      return JSON.stringify(parseResult.ast, null, 2);
    } catch (e) {
      return String(parseResult.ast);
    }
  }, [parseResult.ast]);

  const handleCopy = () => {
    if (!astJsonString) return;
    navigator.clipboard.writeText(astJsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getLanguageIcon = (name: string) => {
    if (name.endsWith('.html') || name.endsWith('.htm')) {
      return <FileCode size={13} color="var(--chakra-colors-teal-fg, #14b8a6)" />;
    }
    if (name.endsWith('.css')) {
      return <Palette size={13} color="var(--chakra-colors-cyan-fg, #38bdf8)" />;
    }
    if (name.endsWith('.js') || name.endsWith('.ts')) {
      return <Cpu size={13} color="var(--chakra-colors-green-fg, #22c55e)" />;
    }
    return <Code2 size={13} color="#a1a1aa" />;
  };

  return (
    <div class="ast-viewer-container">
      {/* Top Header / Switcher Bar */}
      <div class="ast-header-bar">
        <div class="ast-file-tabs">
          {files
            .filter((f) => f.name.endsWith('.html') || f.name.endsWith('.css') || f.name.endsWith('.js') || f.name.endsWith('.ts'))
            .map((file) => {
              const isCurrent = file.name === currentFile?.name;
              return (
                <button
                  key={file.name}
                  class={`ast-file-tab ${isCurrent ? 'active' : ''}`}
                  onClick={() => setSelectedFile(file.name)}
                >
                  {getLanguageIcon(file.name)}
                  <span>{file.name}</span>
                </button>
              );
            })}
        </div>

        <div class="ast-header-actions">
          <div class="ast-parser-badge">
            <span>{parseResult.parserName}</span>
          </div>

          <div class="ast-view-toggle">
            <button
              class={`toggle-btn ${viewMode === 'tree' ? 'active' : ''}`}
              onClick={() => setViewMode('tree')}
              title="Интерактивное дерево AST"
            >
              <ListTree size={13} />
              <span>Дерево</span>
            </button>
            <button
              class={`toggle-btn ${viewMode === 'json' ? 'active' : ''}`}
              onClick={() => setViewMode('json')}
              title="JSON представление"
            >
              <Code2 size={13} />
              <span>JSON</span>
            </button>
          </div>

          <button
            class="chakra-button chakra-button--ghost chakra-button--xs"
            onClick={handleCopy}
            title="Скопировать AST JSON"
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            <span>{copied ? 'Скопировано' : 'Копия'}</span>
          </button>
        </div>
      </div>

      {/* Main Body */}
      {parseResult.success ? (
        <div class="ast-content-body">
          {viewMode === 'tree' ? (
            <div class="ast-tree-scroll">
              <div class="ast-search-row">
                <input
                  type="text"
                  class="ast-search-input"
                  placeholder="Фильтр узлов (по типу или имени)..."
                  value={searchFilter}
                  onInput={(e) => setSearchFilter((e.target as HTMLInputElement).value)}
                />
              </div>

              <div class="ast-tree-root">
                <AstNodeItem
                  name="root"
                  value={parseResult.ast}
                  depth={0}
                  filter={searchFilter.toLowerCase().trim()}
                />
              </div>
            </div>
          ) : (
            <div class="ast-json-scroll">
              <pre class="ast-json-code">
                <code>{astJsonString}</code>
              </pre>
            </div>
          )}
        </div>
      ) : (
        <div class="ast-error-overlay">
          <div class="ast-error-box">
            <div class="error-header">
              <AlertTriangle size={18} />
              <h4>Синтаксическая ошибка ({parseResult.parserName})</h4>
            </div>
            <pre class="error-details">{parseResult.error}</pre>
            {parseResult.line !== undefined && (
              <span class="error-loc">
                Строка {parseResult.line}, колонка {parseResult.column}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface AstNodeItemProps {
  name: string;
  value: any;
  depth: number;
  filter: string;
}

function AstNodeItem({ name, value, depth, filter }: AstNodeItemProps) {
  // По умолчанию раскрываем первые 2 уровня
  const [isOpen, setIsOpen] = useState<boolean>(depth < 2);

  if (value === null) {
    return (
      <div class="tree-leaf" style={{ paddingLeft: `${depth * 14}px` }}>
        <span class="node-key">{name}:</span>
        <span class="val-null">null</span>
      </div>
    );
  }

  if (typeof value === 'undefined') {
    return (
      <div class="tree-leaf" style={{ paddingLeft: `${depth * 14}px` }}>
        <span class="node-key">{name}:</span>
        <span class="val-undefined">undefined</span>
      </div>
    );
  }

  if (typeof value === 'boolean') {
    return (
      <div class="tree-leaf" style={{ paddingLeft: `${depth * 14}px` }}>
        <span class="node-key">{name}:</span>
        <span class="val-bool">{value ? 'true' : 'false'}</span>
      </div>
    );
  }

  if (typeof value === 'number') {
    return (
      <div class="tree-leaf" style={{ paddingLeft: `${depth * 14}px` }}>
        <span class="node-key">{name}:</span>
        <span class="val-num">{value}</span>
      </div>
    );
  }

  if (typeof value === 'string') {
    return (
      <div class="tree-leaf" style={{ paddingLeft: `${depth * 14}px` }}>
        <span class="node-key">{name}:</span>
        <span class="val-str">"{value}"</span>
      </div>
    );
  }

  const isArray = Array.isArray(value);
  const keys = Object.keys(value);

  // Вычисляем заголовок узла (например, type: "Program" или nodeName: "div")
  const nodeType = value.type || value.nodeName || value.tagName || (isArray ? `Array(${value.length})` : 'Object');

  // Если задан фильтр, проверяем совпадение в названии ключа или типа узла
  const matchesFilter = !filter || name.toLowerCase().includes(filter) || String(nodeType).toLowerCase().includes(filter);

  return (
    <div class={`tree-branch ${matchesFilter ? '' : 'filter-dim'}`}>
      <div
        class="tree-branch-header"
        style={{ paddingLeft: `${depth * 14}px` }}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <button class="caret-btn">
          {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </button>

        <span class="node-key">{name}:</span>

        <span class="node-type-badge">{nodeType}</span>

        {!isOpen && (
          <span class="node-collapsed-summary">
            {isArray ? `[${value.length}]` : `{${keys.length}}`}
          </span>
        )}
      </div>

      {isOpen && (
        <div class="tree-branch-children">
          {keys.map((key) => (
            <AstNodeItem
              key={key}
              name={key}
              value={value[key]}
              depth={depth + 1}
              filter={filter}
            />
          ))}
        </div>
      )}
    </div>
  );
}
