import { useEffect, useRef } from 'preact/hooks';
import { RefreshCw, AlertTriangle, Check } from 'lucide-preact';
import type { CompilationResult } from '../compiler/templateEngine';

interface PreviewPaneProps {
  compilationResult: CompilationResult;
  viewportMode: 'desktop' | 'tablet' | 'mobile';
  onReload: () => void;
  snippetTitle: string;
}

export function PreviewPane({
  compilationResult,
  viewportMode,
  onReload,
  snippetTitle,
}: PreviewPaneProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (iframeRef.current && compilationResult.success && compilationResult.html) {
      iframeRef.current.srcdoc = compilationResult.html;
    }
  }, [compilationResult]);

  const getViewportWidth = () => {
    switch (viewportMode) {
      case 'mobile':
        return '375px';
      case 'tablet':
        return '768px';
      default:
        return '100%';
    }
  };

  return (
    <div class="preview-pane-wrapper">
      <div class="preview-toolbar">
        <div class="preview-info">
          <span class="preview-label">Предпросмотр</span>
        </div>

        <div class="preview-actions">
          <span class="status-indicator">
            {compilationResult.success ? (
              <span class="chakra-badge chakra-badge--teal">
                <Check size={11} /> Готов
              </span>
            ) : (
              <span class="chakra-badge chakra-badge--red">
                <AlertTriangle size={11} /> Ошибка
              </span>
            )}
          </span>

          <button
            class="chakra-button chakra-button--ghost chakra-button--xs"
            onClick={onReload}
            title="Перезагрузить страницу"
          >
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      <div class="preview-canvas-area">
        <div
          class={`viewport-container mode-${viewportMode}`}
          style={{ width: getViewportWidth() }}
        >
          {compilationResult.success ? (
            compilationResult.html ? (
              <iframe
                ref={iframeRef}
                title={`Preview - ${snippetTitle}`}
                class="sandbox-iframe"
                sandbox="allow-scripts allow-modals allow-forms allow-same-origin"
              />
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  color: '#71717a',
                  fontSize: '0.85rem',
                }}
              >
                Ожидание файлов проекта...
              </div>
            )
          ) : (
            <div class="compilation-error-overlay">
              <div class="error-card">
                <div class="error-header">
                  <AlertTriangle size={18} />
                  <h4>Синтаксическая ошибка</h4>
                </div>
                <pre class="error-details">{compilationResult.error}</pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
