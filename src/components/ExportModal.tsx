import { useState, useMemo } from 'preact/hooks';
import { X, Copy, Check, Download, Share2, Link, AlertTriangle, ShieldCheck } from 'lucide-preact';
import { buildProductionStandaloneHtml, type VirtualFile } from '../compiler/templateEngine';
import { compressProjectToUrl, type ShareUrlStats } from '../compiler/urlShareCompressor';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  snippetTitle: string;
  files: VirtualFile[];
}

export function ExportModal({
  isOpen,
  onClose,
  snippetTitle,
  files,
}: ExportModalProps) {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'share' | 'html' | 'iframe' | 'json'>('share');
  const [copied, setCopied] = useState(false);

  const [isSecureShare, setIsSecureShare] = useState(false);

  // Сжатие проекта в URL через fflate (с учетом флага скрытия task.json)
  const shareStats: ShareUrlStats = useMemo(() => {
    return compressProjectToUrl(files, window.location.href, snippetTitle, isSecureShare);
  }, [files, snippetTitle, isSecureShare]);

  const standaloneHtml = useMemo(() => {
    return buildProductionStandaloneHtml(files, snippetTitle);
  }, [files, snippetTitle]);

  const iframeSnippet = `<iframe
  srcdoc="${standaloneHtml.replace(/"/g, '&quot;')}"
  style="width: 100%; min-height: 500px; border: 1px solid #27272a; border-radius: 6px;"
  sandbox="allow-scripts"
></iframe>`;

  const jsonBundle = JSON.stringify(
    {
      title: snippetTitle,
      files,
    },
    null,
    2
  );

  const getContent = () => {
    switch (activeTab) {
      case 'share':
        return shareStats.url;
      case 'iframe':
        return iframeSnippet;
      case 'json':
        return jsonBundle;
      default:
        return standaloneHtml;
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getContent());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([standaloneHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${snippetTitle.toLowerCase().replace(/[^a-z0-9а-яё]/gi, '_')}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div class="modal-backdrop" onClick={onClose}>
      <div class="chakra-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
        <div class="chakra-modal__header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Share2 size={18} color="#14b8a6" />
            <h3 class="modal-title-text" style={{ margin: 0 }}>Поделиться проектом / Экспорт</h3>
          </div>
          <button class="chakra-button chakra-button--ghost chakra-button--xs" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div class="chakra-modal__tabs">
          <button
            class={`chakra-modal__tab ${activeTab === 'share' ? 'active' : ''}`}
            onClick={() => setActiveTab('share')}
          >
            🔗 Ссылка (fflate URL)
          </button>
          <button
            class={`chakra-modal__tab ${activeTab === 'html' ? 'active' : ''}`}
            onClick={() => setActiveTab('html')}
          >
            HTML файл
          </button>
          <button
            class={`chakra-modal__tab ${activeTab === 'iframe' ? 'active' : ''}`}
            onClick={() => setActiveTab('iframe')}
          >
            iframe
          </button>
          <button
            class={`chakra-modal__tab ${activeTab === 'json' ? 'active' : ''}`}
            onClick={() => setActiveTab('json')}
          >
            JSON
          </button>
        </div>

        <div class="chakra-modal__body">
          {activeTab === 'share' ? (
            <div class="share-url-panel">
              <div class="share-url-input-wrap">
                <input
                  type="text"
                  readOnly
                  class="share-url-input"
                  value={shareStats.url}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <button
                  class="chakra-button chakra-button--solid-teal"
                  onClick={handleCopy}
                  title="Скопировать ссылку"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copied ? 'Скопировано' : 'Копировать'}</span>
                </button>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  backgroundColor: 'rgba(39, 39, 42, 0.4)',
                  borderRadius: '6px',
                  border: '1px solid rgba(63, 63, 70, 0.5)',
                  fontSize: '0.8rem',
                  color: '#d4d4d8',
                  cursor: 'pointer',
                }}
                onClick={() => setIsSecureShare((v) => !v)}
              >
                <input
                  type="checkbox"
                  id="secure-task-check"
                  checked={isSecureShare}
                  onChange={(e) => setIsSecureShare((e.target as HTMLInputElement).checked)}
                  onClick={(e) => e.stopPropagation()}
                  style={{ accentColor: '#14b8a6', cursor: 'pointer' }}
                />
                <label for="secure-task-check" style={{ cursor: 'pointer', userSelect: 'none' }}>
                  🔒 <strong>Скрыть файл задания (&is_s=1):</strong> студент не увидит <code>task.json</code> в проводнике/редакторе и не сможет подсмотреть автотесты
                </label>
              </div>

              {/* Метрики и расчет вместимости по формуле сжатия */}
              <div class="share-metrics-grid">
                <div class="share-metric-card">
                  <span class="metric-label">Всего строк кода</span>
                  <strong class="metric-val">{shareStats.totalLines}</strong>
                </div>
                <div class="share-metric-card">
                  <span class="metric-label">Сжатый размер</span>
                  <strong class="metric-val">{shareStats.compressedBytes} байт</strong>
                </div>
                <div class="share-metric-card">
                  <span class="metric-label">Сжатие fflate</span>
                  <strong class="metric-val">{shareStats.compressionRatio}x</strong>
                </div>
                <div class="share-metric-card">
                  <span class="metric-label">Длина URL ссылки</span>
                  <strong class="metric-val">{shareStats.urlLength} симв.</strong>
                </div>
              </div>

              {/* Статус безопасности для мессенджеров и браузера */}
              <div class="share-status-block">
                {shareStats.isSafeForMessengers ? (
                  <div class="share-badge-notice safe">
                    <ShieldCheck size={15} color="#4ade80" />
                    <span>
                      <strong>Безопасно для мессенджеров и соцсетей:</strong> Длина ссылки {shareStats.urlLength} символов (до 4000 симв.). Ссылка не будет обрезана в Telegram/WhatsApp.
                    </span>
                  </div>
                ) : shareStats.isSafeForBrowser ? (
                  <div class="share-badge-notice warning">
                    <AlertTriangle size={15} color="#fbbf24" />
                    <span>
                      <strong>Открытие в браузере поддерживается:</strong> Длина ссылки {shareStats.urlLength} символов (до 20 000 в Chrome/Safari/Firefox). В некоторых мессенджерах (Telegram) длинные ссылки могут усекаться.
                    </span>
                  </div>
                ) : (
                  <div class="share-badge-notice danger">
                    <AlertTriangle size={15} color="#f87171" />
                    <span>
                      <strong>Превышен лимит браузера (20 000 символов)!</strong> В проекте слишком много кода для одной URL ссылки. Рекомендуется использовать экспорт в HTML файл или JSON.
                    </span>
                  </div>
                )}
              </div>

              <div class="share-table-guide">
                <div class="guide-title">Вместимость кода в одну ссылку при сжатии fflate (Deflate level 9):</div>
                <table class="guide-table">
                  <thead>
                    <tr>
                      <th>Контекст/Условия сжатия</th>
                      <th>Лимит объема кода</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr class={shareStats.urlLength <= 4000 ? 'row-active' : ''}>
                      <td>Мессенджеры (Telegram, соцсети до 4 КБ)</td>
                      <td>~150 – 300 строк кода</td>
                    </tr>
                    <tr class={shareStats.urlLength > 4000 && shareStats.urlLength <= 20000 ? 'row-active' : ''}>
                      <td>Браузеры (Chrome / Safari / Firefox до 20 КБ)</td>
                      <td>~1000 – 1500 строк кода</td>
                    </tr>
                    <tr>
                      <td>Максимум при идеальном сжатии</td>
                      <td>до 2500 строк кода</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <pre class="export-preview">
              <code>{getContent()}</code>
            </pre>
          )}
        </div>

        <div class="chakra-modal__footer">
          {activeTab !== 'share' && (
            <button class="chakra-button chakra-button--solid-teal" onClick={handleCopy}>
              {copied ? <Check size={14} /> : <Copy size={14} />}
              <span>{copied ? 'Скопировано' : 'Скопировать'}</span>
            </button>
          )}

          {activeTab === 'html' && (
            <button class="chakra-button chakra-button--outline" onClick={handleDownload}>
              <Download size={14} />
              <span>Скачать файл</span>
            </button>
          )}

          <button class="chakra-button chakra-button--ghost" onClick={onClose}>
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
