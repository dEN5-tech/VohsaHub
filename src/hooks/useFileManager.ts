import { useState, useEffect, useCallback, useRef } from 'preact/hooks';
import { INITIAL_FILES } from '../data/snippets';
import { compileSandboxBundle, type CompilationResult, type VirtualFile } from '../compiler/templateEngine';
import { decompressProjectFromUrl } from '../compiler/urlShareCompressor';

export interface UseFileManagerOptions {
  autoCompile: boolean;
}

export interface UseFileManagerReturn {
  files: VirtualFile[];
  activeFileName: string;
  compilationResult: CompilationResult;
  isLoadedFromUrl: boolean;
  setActiveFileName: (name: string) => void;
  triggerCompile: (currentFiles?: VirtualFile[]) => void;
  handleFileChange: (fileName: string, content: string) => void;
  handleCreateFile: (name: string) => void;
  handleDeleteFile: (fileName: string) => void;
  handleRenameFile: (oldName: string, newName: string) => void;
  handleReset: () => void;
}

export function useFileManager({ autoCompile }: UseFileManagerOptions): UseFileManagerReturn {
  // Проверяем, есть ли сжатый проект в URL хеше (#project=...)
  const initialSharedProject = typeof window !== 'undefined' ? decompressProjectFromUrl() : null;
  const initialFilesList = initialSharedProject?.files || [];

  const [files, setFiles] = useState<VirtualFile[]>(initialFilesList);
  const [activeFileName, setActiveFileName] = useState<string>(initialFilesList[0]?.name || '');
  const [compilationResult, setCompilationResult] = useState<CompilationResult>({ success: true });
  const [isLoadedFromUrl, setIsLoadedFromUrl] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return Boolean(initialSharedProject) || window.location.hash.includes('project=') || window.location.href.includes('boost');
  });

  const filesRef = useRef<VirtualFile[]>(files);
  const activeFileNameRef = useRef<string>(activeFileName);
  const debounceTimerRef = useRef<any>(null);

  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  useEffect(() => {
    activeFileNameRef.current = activeFileName;
  }, [activeFileName]);

  const triggerCompile = useCallback((currentFiles?: VirtualFile[]) => {
    const toCompile = currentFiles ?? filesRef.current;
    const result = compileSandboxBundle(toCompile);
    setCompilationResult(result);
  }, []);

  // Initial compile on mount & listen to hashchange for live project loading via URL
  useEffect(() => {
    triggerCompile(files);

    const handleHashChange = () => {
      const shared = decompressProjectFromUrl();
      if (shared && shared.files.length > 0) {
        setIsLoadedFromUrl(true);
        filesRef.current = shared.files;
        setFiles(shared.files);
        setActiveFileName(shared.files[0]?.name || 'index.html');
        triggerCompile(shared.files);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleFileChange = useCallback((fileName: string, content: string) => {
    setFiles((prevFiles) => {
      const updated = prevFiles.map((f) => (f.name === fileName ? { ...f, content } : f));
      filesRef.current = updated;

      if (autoCompile) {
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = setTimeout(() => {
          triggerCompile(updated);
        }, 300);
      }
      return updated;
    });
  }, [autoCompile, triggerCompile]);

  const handleCreateFile = useCallback((name: string) => {
    setFiles((prevFiles) => {
      if (prevFiles.some((f) => f.name === name)) {
        setActiveFileName(name);
        return prevFiles;
      }

      const updated = [...prevFiles, { name, content: '' }];
      filesRef.current = updated;
      setActiveFileName(name);
      triggerCompile(updated);
      return updated;
    });
  }, [triggerCompile]);

  const handleDeleteFile = useCallback((fileName: string) => {
    setFiles((prevFiles) => {
      const updated = prevFiles.filter((f) => f.name !== fileName);
      filesRef.current = updated;

      if (activeFileNameRef.current === fileName) {
        setActiveFileName(updated[0]?.name || '');
      }

      triggerCompile(updated);
      return updated;
    });
  }, [triggerCompile]);

  const handleRenameFile = useCallback((oldName: string, newName: string) => {
    setFiles((prevFiles) => {
      if (prevFiles.some((f) => f.name === newName && f.name !== oldName)) return prevFiles;
      const updated = prevFiles.map((f) => (f.name === oldName ? { ...f, name: newName } : f));
      filesRef.current = updated;

      if (activeFileNameRef.current === oldName) {
        setActiveFileName(newName);
      }

      triggerCompile(updated);
      return updated;
    });
  }, [triggerCompile]);

  const handleReset = useCallback(() => {
    setIsLoadedFromUrl(false);
    const defaultFiles = INITIAL_FILES.map((f) => ({ ...f }));
    filesRef.current = defaultFiles;
    setFiles(defaultFiles);
    setActiveFileName(defaultFiles[0]?.name || 'index.html');
    triggerCompile(defaultFiles);
  }, [triggerCompile]);

  return {
    files,
    activeFileName,
    compilationResult,
    isLoadedFromUrl,
    setActiveFileName,
    triggerCompile,
    handleFileChange,
    handleCreateFile,
    handleDeleteFile,
    handleRenameFile,
    handleReset,
  };
}
