import { Play, Share2, Smartphone, Tablet, Monitor } from 'lucide-preact';

interface HeaderProps {
  activeFileName: string;
  autoCompile: boolean;
  onToggleAutoCompile: () => void;
  onRunCompile: () => void;
  onOpenExport: () => void;
  viewportMode: 'desktop' | 'tablet' | 'mobile';
  onChangeViewport: (mode: 'desktop' | 'tablet' | 'mobile') => void;
}

export function Header({
  activeFileName,
  autoCompile,
  onToggleAutoCompile,
  onRunCompile,
  onOpenExport,
  viewportMode,
  onChangeViewport,
}: HeaderProps) {
  return (
    <header class="app-header">
      <div class="header-left">
        <div class="brand">
          <div class="brand-logo">
            <span class="logo-v">V</span>
          </div>
          <span class="brand-name">VohsaHub</span>
        </div>

        <div class="header-breadcrumb-tag">
          <span class="header-project-name">workspace</span>
          <span class="header-project-sep">/</span>
          <span class="header-file-name">{activeFileName}</span>
        </div>
      </div>

      <div class="header-center">
        <div class="viewport-controls" title="Размер экрана предпросмотра">
          <button
            class={`vp-btn ${viewportMode === 'desktop' ? 'active' : ''}`}
            onClick={() => onChangeViewport('desktop')}
            title="Десктоп (100%)"
          >
            <Monitor size={14} />
          </button>
          <button
            class={`vp-btn ${viewportMode === 'tablet' ? 'active' : ''}`}
            onClick={() => onChangeViewport('tablet')}
            title="Планшет (768px)"
          >
            <Tablet size={14} />
          </button>
          <button
            class={`vp-btn ${viewportMode === 'mobile' ? 'active' : ''}`}
            onClick={() => onChangeViewport('mobile')}
            title="Телефон (375px)"
          >
            <Smartphone size={14} />
          </button>
        </div>
      </div>

      <div class="header-right">
        <label class="chakra-switch" title="Автоматическая компиляция шаблона при вводе">
          <input
            type="checkbox"
            checked={autoCompile}
            onChange={onToggleAutoCompile}
          />
          <span class="chakra-switch__track">
            <span class="chakra-switch__thumb"></span>
          </span>
          <span class="switch-label">Live</span>
        </label>

        <button
          class="chakra-button chakra-button--solid-teal"
          onClick={onRunCompile}
          title="Собрать (Ctrl+Enter)"
        >
          <Play size={13} fill="currentColor" />
          <span>Собрать</span>
        </button>

        <button
          class="chakra-button chakra-button--subtle-teal"
          onClick={onOpenExport}
          title="Поделиться проектом через сжатую ссылку (fflate) / Экспорт"
        >
          <Share2 size={13} />
          <span>Поделиться</span>
        </button>
      </div>
    </header>
  );
}
