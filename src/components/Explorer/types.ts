import type { VirtualFile } from '../../compiler/templateEngine';

export interface ExplorerProps {
  files: VirtualFile[];
  activeFileName: string;
  width?: number;
  onSelectFile: (fileName: string) => void;
  onCreateFile: (fileName: string) => void;
  onDeleteFile: (fileName: string) => void;
  onRenameFile: (oldName: string, newName: string) => void;
}

export interface FileTreeItemProps {
  file: VirtualFile;
  isActive: boolean;
  isRenaming: boolean;
  renameValue: string;
  onSelect: () => void;
  onStartRename: () => void;
  onRenameChange: (val: string) => void;
  onConfirmRename: () => void;
  onCancelRename: () => void;
  onDelete: () => void;
}

export interface FileCreateInputProps {
  fileName: string;
  onFileNameChange: (val: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export interface ExplorerHeaderProps {
  isOpen: boolean;
  onToggle: () => void;
  onStartCreate: () => void;
}
