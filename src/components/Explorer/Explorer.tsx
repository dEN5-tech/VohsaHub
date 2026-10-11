import { useState } from 'preact/hooks';
import { ExplorerSection } from './ExplorerSection';
import { FileCreateInput } from './FileCreateInput';
import { FileTreeItem } from './FileTreeItem';
import type { ExplorerProps } from './types';

export function Explorer({
  files,
  activeFileName,
  width,
  onSelectFile,
  onCreateFile,
  onDeleteFile,
  onRenameFile,
  onCreateTaskFile,
}: ExplorerProps) {
  const [isSectionOpen, setIsSectionOpen] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newFileName, setNewFileName] = useState('');

  const [editingFileName, setEditingFileName] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const handleStartCreate = () => {
    setIsCreating(true);
    setNewFileName('');
    setIsSectionOpen(true);
  };

  const handleConfirmCreate = () => {
    let name = newFileName.trim();
    if (!name) {
      setIsCreating(false);
      return;
    }
    if (!name.includes('.')) {
      name += '.html';
    }
    onCreateFile(name);
    setIsCreating(false);
    setNewFileName('');
  };

  const handleCancelCreate = () => {
    setIsCreating(false);
    setNewFileName('');
  };

  const handleStartRename = (fileName: string) => {
    setEditingFileName(fileName);
    setRenameValue(fileName);
  };

  const handleConfirmRename = () => {
    if (editingFileName && renameValue.trim() && renameValue.trim() !== editingFileName) {
      onRenameFile(editingFileName, renameValue.trim());
    }
    setEditingFileName(null);
  };

  const handleCancelRename = () => {
    setEditingFileName(null);
  };

  return (
    <aside class="vscode-explorer" style={width ? { width: `${width}px` } : undefined}>
      <div class="explorer-header">
        <span class="explorer-title">ПРОВОДНИК</span>
      </div>

      <div class="explorer-section">
        <ExplorerSection
          isOpen={isSectionOpen}
          onToggle={() => setIsSectionOpen((prev) => !prev)}
          onStartCreate={handleStartCreate}
          onCreateTaskFile={onCreateTaskFile}
        />

        {isSectionOpen && (
          <div class="file-tree-list">
            {isCreating && (
              <FileCreateInput
                fileName={newFileName}
                onFileNameChange={setNewFileName}
                onConfirm={handleConfirmCreate}
                onCancel={handleCancelCreate}
              />
            )}

            {files.map((file) => (
              <FileTreeItem
                key={file.name}
                file={file}
                isActive={file.name === activeFileName}
                isRenaming={editingFileName === file.name}
                renameValue={renameValue}
                onSelect={() => onSelectFile(file.name)}
                onStartRename={() => handleStartRename(file.name)}
                onRenameChange={setRenameValue}
                onConfirmRename={handleConfirmRename}
                onCancelRename={handleCancelRename}
                onDelete={() => onDeleteFile(file.name)}
              />
            ))}

            {files.length === 0 && !isCreating && (
              <div style={{ padding: '1.25rem 0.75rem', color: '#71717a', fontSize: '0.8rem', textAlign: 'center' }}>
                Нет файлов в проекте.<br />
                Нажмите <strong>+</strong> для создания.
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
