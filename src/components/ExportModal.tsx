import { useState, useMemo, useEffect } from 'preact/hooks';
import { X, Copy, Check, Download, Share2, Link, AlertTriangle, ShieldCheck, Zap, Cloud, Loader2 } from 'lucide-preact';
import { buildProductionStandaloneHtml, type VirtualFile } from '../compiler/templateEngine';
import { compressProjectToUrl, compressProjectToUrlV2, type ShareUrlStats } from '../compiler/urlShareCompressor';
import { saveProjectToCloud, type CloudSaveResult } from '../compiler/vohsaBackendClient';

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

  const [activeTab, setActiveTab] = useState<'share' | 'cloud' | 'html' | 'iframe' | 'json'>('share');
  const [copied, setCopied] = useState(false);
  const [isSecureShare, setIsSecureShare] = useState(false);
  const [useWasmV2, setUseWasmV2] = useState(true);
  const [wasmStats, setWasmStats] = useState<ShareUrlStats | null>(null);

  // Облачное сохранение через Rust RPC бэкенд
  const [cloudResult, setCloudResult] = useState<CloudSaveResult | null>(null);
  const [isSavingCloud, setIsSavingCloud] = useState(false);
  const [cloudError, setCloudError] = useState<string | null>(null);

  const handleSaveToCloud = async () => {
    setIsSavingCloud(true);
    setCloudError(null);
    try {
      const res = await saveProjectToCloud(files, snippetTitle, isSecureShare);
      setCloudResult(res);
      navigator.clipboard.writeText(res.shortUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e: any) {
      setCloudError(e.message || 'Ошибка сохранения в облако');
    } finally {
      setIsSavingCloud(false);
    }
  };

  // Сжатие проекта в URL через fflate (Deflate v1)
  const v1Stats: ShareUrlStats = useMemo(() => {
    return compressProjectToUrl(files, window.location.href, snippetTitle, isSecureShare);
  }, [files, snippetTitle, isSecureShare]);

  // Сжатие проекта в URL через Rust WASM (Brotli + MessagePack v2)
  useEffect(() => {
    let isMounted = true;
    compressProjectToUrlV2(files, window.location.href, snippetTitle, isSecureShare)
      .then((stats) => {
        if (isMounted) setWasmStats(stats);
      })
      .catch((err) => {
        console.warn('WASM compress not ready yet:', err);
      });
    return () => {
      isMounted = false;
    };
  }, [files, snippetTitle, isSecureShare]);

  const activeShareStats: ShareUrlStats = useWasmV2 && wasmStats ? wasmStats : v1Stats;

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
        return activeShareStats.url;
      case 'cloud':
        return cloudResult ? cloudResult.shortUrl : '';
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
            🔗 URL Hash (Без сервера)
          </button>
          <button
            class={`chakra-modal__tab ${activeTab === 'cloud' ? 'active' : ''}`}
            onClick={() => setActiveTab('cloud')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Cloud size={14} color="#38bdf8" />
            <span>Облако Rust (Короткая ссылка)</span>
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
              {/* Переключатель кодеков: WASM V2 vs fflate V1 */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '10px',
                  padding: '6px 10px',
                  background: 'rgba(24, 24, 27, 0.6)',
                  borderRadius: '6px',
                  border: '1px solid rgba(63, 63, 70, 0.5)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    class={`chakra-button chakra-button--xs ${useWasmV2 ? 'chakra-button--solid-teal' : 'chakra-button--ghost'}`}
                    onClick={() => setUseWasmV2(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Zap size={12} />
                    <span>Rust WASM V2 (Brotli)</span>
                  </button>
                  <button
                    class={`chakra-button chakra-button--xs ${!useWasmV2 ? 'chakra-button--solid-teal' : 'chakra-button--ghost'}`}
                    onClick={() => setUseWasmV2(false)}
                  >
                    fflate V1 (Deflate)
                  </button>
                </div>
                {wasmStats && (
                  <span style={{ fontSize: '0.75rem', color: '#4ade80', fontWeight: 600 }}>
                    ⚡ WASM длина: {wasmStats.urlLength} симв. vs {v1Stats.urlLength} симв.
                  </span>
                )}
              </div>

              <div class="share-url-input-wrap">
                <input
                  type="text"
                  readOnly
                  class="share-url-input"
                  value={activeShareStats.url}
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
                  <strong class="metric-val">{activeShareStats.totalLines}</strong>
                </div>
                <div class="share-metric-card">
                  <span class="metric-label">Сжатый размер</span>
                  <strong class="metric-val">{activeShareStats.compressedBytes} байт</strong>
                </div>
                <div class="share-metric-card">
                  <span class="metric-label">{useWasmV2 ? 'Сжатие WASM' : 'Сжатие fflate'}</span>
                  <strong class="metric-val">{activeShareStats.compressionRatio}x</strong>
                </div>
                <div class="share-metric-card">
                  <span class="metric-label">Длина URL ссылки</span>
                  <strong class="metric-val">{activeShareStats.urlLength} симв.</strong>
                </div>
              </div>

              {/* Статус безопасности для мессенджеров и браузера */}
              <div class="share-status-block">
                {activeShareStats.isSafeForMessengers ? (
                  <div class="share-badge-notice safe">
                    <ShieldCheck size={15} color="#4ade80" />
                    <span>
                      <strong>Безопасно для мессенджеров и соцсетей:</strong> Длина ссылки {activeShareStats.urlLength} символов (до 4000 симв.). Ссылка не будет обрезана в Telegram/WhatsApp.
                    </span>
                  </div>
                ) : activeShareStats.isSafeForBrowser ? (
                  <div class="share-badge-notice warning">
                    <AlertTriangle size={15} color="#fbbf24" />
                    <span>
                      <strong>Открытие в браузере поддерживается:</strong> Длина ссылки {activeShareStats.urlLength} символов (до 20 000 в Chrome/Safari/Firefox). В некоторых мессенджерах (Telegram) длинные ссылки могут усекаться.
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
                <div class="guide-title">
                  {useWasmV2
                    ? 'Вместимость кода при ультра-сжатии Rust WASM (Brotli + MessagePack):'
                    : 'Вместимость кода при сжатии fflate (Deflate level 9):'}
                </div>
                <table class="guide-table">
                  <thead>
                    <tr>
                      <th>Контекст/Условия сжатия</th>
                      <th>Лимит объема кода</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr class={activeShareStats.urlLength <= 4000 ? 'row-active' : ''}>
                      <td>Мессенджеры (Telegram, соцсети до 4 КБ)</td>
                      <td>~200 – 450 строк кода</td>
                    </tr>
                    <tr class={activeShareStats.urlLength > 4000 && activeShareStats.urlLength <= 20000 ? 'row-active' : ''}>
                      <td>Браузеры (Chrome / Safari / Firefox до 20 КБ)</td>
                      <td>~1200 – 2000 строк кода</td>
                    </tr>
                    <tr>
                      <td>Максимум при идеальном сжатии</td>
                      <td>до 2500 строк кода</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ) : activeTab === 'cloud' ? (
            <div class="share-url-panel">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px',
                  background: 'rgba(56, 189, 248, 0.08)',
                  borderRadius: '8px',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  marginBottom: '14px',
                }}
              >
                <Cloud size={24} color="#38bdf8" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: '#f0f9ff', fontSize: '0.9rem' }}>
                    Облачное хранилище VohsaHub (Rust + Brotli V2)
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                    Сжимает проект и сохраняет под коротким ID (всего ~45 символов). Больше никаких километровых ссылок!
                  </div>
                </div>
              </div>

              {cloudResult ? (
                <>
                  <div class="share-url-input-wrap">
                    <input
                      type="text"
                      readOnly
                      class="share-url-input"
                      value={cloudResult.shortUrl}
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                    />
                    <button
                      class="chakra-button chakra-button--solid-teal"
                      onClick={() => {
                        navigator.clipboard.writeText(cloudResult.shortUrl);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      title="Скопировать короткую ссылку"
                    >
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                      <span>{copied ? 'Скопировано' : 'Копировать'}</span>
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                    <a
                      href={cloudResult.redirectUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      class="chakra-button chakra-button--xs chakra-button--outline"
                      style={{ textDecoration: 'none' }}
                    >
                      <span>Открыть через серверный редирект ↗</span>
                    </a>
                  </div>

                  <div class="share-metrics-grid" style={{ marginTop: '12px' }}>
                    <div class="share-metric-card">
                      <span class="metric-label">Короткий ID</span>
                      <strong class="metric-val" style={{ color: '#38bdf8' }}>{cloudResult.id}</strong>
                    </div>
                    <div class="share-metric-card">
                      <span class="metric-label">Файлов</span>
                      <strong class="metric-val">{cloudResult.filesCount}</strong>
                    </div>
                    <div class="share-metric-card">
                      <span class="metric-label">Исходный JSON</span>
                      <strong class="metric-val">{cloudResult.rawBytes} байт</strong>
                    </div>
                    <div class="share-metric-card">
                      <span class="metric-label">Сжато Brotli V2</span>
                      <strong class="metric-val" style={{ color: '#4ade80' }}>{cloudResult.compressedBytes} байт</strong>
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '20px 10px' }}>
                  <button
                    class="chakra-button chakra-button--solid-teal"
                    onClick={handleSaveToCloud}
                    disabled={isSavingCloud}
                    style={{ fontSize: '0.9rem', padding: '10px 20px', borderRadius: '8px' }}
                  >
                    {isSavingCloud ? <Loader2 size={16} class="spin-animation" /> : <Cloud size={16} />}
                    <span>{isSavingCloud ? 'Сохранение в Rust бэкенд...' : 'Сохранить и получить короткую ссылку'}</span>
                  </button>

                  {cloudError && (
                    <div style={{ marginTop: '12px', color: '#f87171', fontSize: '0.8rem' }}>
                      ⚠️ {cloudError}
                    </div>
                  )}

                  <div style={{ marginTop: '14px', fontSize: '0.78rem', color: '#71717a' }}>
                    Бэкенд на Rust сжимает файлы через Brotli V2 и выделяет уникальный короткий идентификатор.
                  </div>
                </div>
              )}
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
