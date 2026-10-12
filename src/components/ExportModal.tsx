import { useState, useMemo, useEffect } from 'preact/hooks';
import { X, Copy, Check, Download, Share2, Link, Cloud, Loader2 } from 'lucide-preact';
import { buildProductionStandaloneHtml, type VirtualFile } from '../compiler/templateEngine';
import { compressProjectToUrlV2 } from '../compiler/urlShareCompressor';
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

  const [activeTab, setActiveTab] = useState<'link' | 'html' | 'iframe' | 'json'>('link');
  const [copied, setCopied] = useState(false);
  const [isSecureShare, setIsSecureShare] = useState(false);

  // Локальная хеш-ссылка (клиентская)
  const [localUrl, setLocalUrl] = useState<string>('');

  // Облачная короткая ссылка
  const [cloudResult, setCloudResult] = useState<CloudSaveResult | null>(null);
  const [isSavingCloud, setIsSavingCloud] = useState(false);
  const [cloudError, setCloudError] = useState<string | null>(null);

  // Подготовка локальной ссылки
  useEffect(() => {
    let isMounted = true;
    compressProjectToUrlV2(files, window.location.href, snippetTitle, isSecureShare)
      .then((stats) => {
        if (isMounted) setLocalUrl(stats.url);
      })
      .catch(() => {
        // Fallback
        if (isMounted) setLocalUrl(window.location.href);
      });
    return () => {
      isMounted = false;
    };
  }, [files, snippetTitle, isSecureShare]);

  const handleSaveToCloud = async () => {
    setIsSavingCloud(true);
    setCloudError(null);
    try {
      const res = await saveProjectToCloud(files, snippetTitle, isSecureShare);
      setCloudResult(res);
      navigator.clipboard.writeText(res.shortUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e: any) {
      setCloudError(e.message || 'Не удалось сохранить проект');
    } finally {
      setIsSavingCloud(false);
    }
  };

  const currentDisplayUrl = cloudResult ? cloudResult.shortUrl : localUrl;

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
      case 'link':
        return currentDisplayUrl;
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
      <div class="chakra-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px' }}>
        <div class="chakra-modal__header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Share2 size={18} color="#14b8a6" />
            <h3 class="modal-title-text" style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>
              Поделиться
            </h3>
          </div>
          <button class="chakra-button chakra-button--ghost chakra-button--xs" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div class="chakra-modal__tabs">
          <button
            class={`chakra-modal__tab ${activeTab === 'link' ? 'active' : ''}`}
            onClick={() => setActiveTab('link')}
          >
            Ссылка
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
          {activeTab === 'link' ? (
            <div class="share-url-panel">
              <div class="share-url-input-wrap">
                <input
                  type="text"
                  readOnly
                  class="share-url-input"
                  value={currentDisplayUrl}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                  placeholder="Генерация ссылки..."
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
                  justifyContent: 'space-between',
                  gap: '8px',
                  marginTop: '12px',
                  padding: '8px 10px',
                  background: 'rgba(24, 24, 27, 0.5)',
                  borderRadius: '6px',
                  border: '1px solid rgba(63, 63, 70, 0.4)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    id="secure-task-check"
                    checked={isSecureShare}
                    onChange={(e) => {
                      setIsSecureShare((e.target as HTMLInputElement).checked);
                      setCloudResult(null);
                    }}
                    style={{ accentColor: '#14b8a6', cursor: 'pointer' }}
                  />
                  <label for="secure-task-check" style={{ fontSize: '0.8rem', color: '#d4d4d8', cursor: 'pointer' }}>
                    Скрыть файл задания (<code>task.json</code>)
                  </label>
                </div>

                {!cloudResult && (
                  <button
                    class="chakra-button chakra-button--xs chakra-button--outline"
                    onClick={handleSaveToCloud}
                    disabled={isSavingCloud}
                    style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
                  >
                    {isSavingCloud ? <Loader2 size={12} class="spin-animation" /> : <Cloud size={12} />}
                    <span>{isSavingCloud ? 'Сохранение...' : 'Создать короткую ссылку'}</span>
                  </button>
                )}
              </div>

              {cloudResult && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: '8px',
                    padding: '6px 10px',
                    background: 'rgba(56, 189, 248, 0.08)',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    color: '#38bdf8',
                  }}
                >
                  <span>Короткая ссылка создана (ID: {cloudResult.id})</span>
                  <button
                    class="chakra-button chakra-button--xs chakra-button--ghost"
                    onClick={handleSaveToCloud}
                    disabled={isSavingCloud}
                    style={{ fontSize: '0.75rem', height: 'auto', padding: '2px 6px' }}
                  >
                    Обновить
                  </button>
                </div>
              )}

              {cloudError && (
                <div style={{ marginTop: '8px', fontSize: '0.78rem', color: '#f87171' }}>
                  {cloudError}
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
          {activeTab !== 'link' && (
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
