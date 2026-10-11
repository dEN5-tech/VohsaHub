import { useRef, useEffect } from 'preact/hooks';
import { Check, X } from 'lucide-preact';
import { getFileIcon } from './fileIcons';
import type { FileCreateInputProps } from './types';

export function FileCreateInput({
  fileName,
  onFileNameChange,
  onConfirm,
  onCancel,
}: FileCreateInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div class="file-tree-item creating-item">
      <span class="tree-item-icon">{getFileIcon(fileName || 'index.html')}</span>
      <input
        ref={inputRef}
        type="text"
        class="tree-inline-input"
        placeholder="filename.html"
        value={fileName}
        onInput={(e) => onFileNameChange((e.target as HTMLInputElement).value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onConfirm();
          if (e.key === 'Escape') onCancel();
        }}
        onBlur={onConfirm}
      />
      <button
        class="inline-input-btn"
        onClick={onConfirm}
        title="Подтвердить (Enter)"
      >
        <Check size={12} />
      </button>
      <button
        class="inline-input-btn cancel"
        onClick={onCancel}
        title="Отмена (Esc)"
      >
        <X size={12} />
      </button>
    </div>
  );
}
