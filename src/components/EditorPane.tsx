import { useEffect, useRef, useState } from 'preact/hooks';
import { monaco, getJsxSyntaxHighlighter } from '../monacoSetup';
import { Plus, X, ChevronRight, Sparkles } from 'lucide-preact';
import { getFileIcon } from './Explorer';
import { findVirtualFile, type VirtualFile } from '../compiler/templateEngine';
import { isVfsTaskFile } from '../compiler/astTaskValidator';
import type { LearningTask, TaskValidationResult } from '../types/learningTasks';

interface EditorPaneProps {
  files: VirtualFile[];
  activeFileName: string;
  onSelectFile: (fileName: string) => void;
  onFileChange: (fileName: string, content: string) => void;
  onCreateFile: (fileName: string) => void;
  onDeleteFile: (fileName: string) => void;
  onRenameFile: (oldName: string, newName: string) => void;
  onCursorChange: (pos: { line: number; col: number }) => void;
  taskValidationResult?: TaskValidationResult | null;
  activeTask?: LearningTask;
  onLoadTaskTemplate?: (task: LearningTask) => void;
}

function getFileLanguage(fileName: string): string {
  if (fileName.endsWith('.vue')) return 'vue';
  if (fileName.endsWith('.jsx')) return 'javascript';
  if (fileName.endsWith('.tsx')) return 'typescript';
  if (fileName.endsWith('.eta') || fileName.endsWith('.html')) return 'html';
  if (fileName.endsWith('.json')) return 'json';
  if (fileName.endsWith('.css') || fileName.endsWith('.scss')) return 'css';
  if (fileName.endsWith('.js') || fileName.endsWith('.mjs')) return 'javascript';
  if (fileName.endsWith('.ts')) return 'typescript';
  if (fileName.endsWith('.md')) return 'markdown';
  return 'plaintext';
}

export function EditorPane({
  files,
  activeFileName,
  onSelectFile,
  onFileChange,
  onCreateFile,
  onDeleteFile,
  onRenameFile,
  onCursorChange,
  taskValidationResult,
  activeTask,
  onLoadTaskTemplate,
}: EditorPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorInstanceRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const modelsMapRef = useRef<Map<string, monaco.editor.ITextModel>>(new Map());

  // Refs for callbacks to always execute the freshest parent function in Monaco event listeners
  const onFileChangeRef = useRef(onFileChange);
  const onCursorChangeRef = useRef(onCursorChange);
  const onSelectFileRef = useRef(onSelectFile);
  const onCreateFileRef = useRef(onCreateFile);
  const onDeleteFileRef = useRef(onDeleteFile);
  const onRenameFileRef = useRef(onRenameFile);
  const filesRef = useRef(files);
  const activeFileNameRef = useRef(activeFileName);
  const isInternalChangeRef = useRef(false);

  filesRef.current = files;
  activeFileNameRef.current = activeFileName;
  onFileChangeRef.current = onFileChange;
  onCursorChangeRef.current = onCursorChange;
  onSelectFileRef.current = onSelectFile;
  onCreateFileRef.current = onCreateFile;
  onDeleteFileRef.current = onDeleteFile;
  onRenameFileRef.current = onRenameFile;

  // Local state for creating new file inline in tab bar
  const [isCreating, setIsCreating] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const newFileInputRef = useRef<HTMLInputElement>(null);

  // Local state for renaming file inline in tab bar
  const [editingFileName, setEditingFileName] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // 1. Initialize Monaco editor
  useEffect(() => {
    if (!containerRef.current) return;

    // Create models for all initial files with safe vfs:/// URI
    files.forEach((file) => {
      if (!modelsMapRef.current.has(file.name)) {
        const lang = getFileLanguage(file.name);
        const uri = monaco.Uri.parse(`vfs:///${file.name}`);
        const existingModel = monaco.editor.getModel(uri);
        const model = existingModel || monaco.editor.createModel(file.content, lang, uri);
        modelsMapRef.current.set(file.name, model);
      }
    });

    const activeModel = modelsMapRef.current.get(activeFileName) || null;

    const editor = monaco.editor.create(containerRef.current, {
      model: activeModel,
      links: false, // Отключаем встроенный LinkDetector Monaco во избежание ошибочных window.open на file:///
      theme: 'chakra-dark',
      fontSize: 13,
      fontFamily: "'Fira Code', 'Courier New', monospace",
      fontLigatures: true,
      lineNumbers: 'on',
      roundedSelection: true,
      scrollBeyondLastLine: false,
      readOnly: false,
      cursorBlinking: 'smooth',
      cursorSmoothCaretAnimation: 'on',
      smoothScrolling: true,
      minimap: { enabled: true, maxColumn: 80, renderCharacters: false },
      automaticLayout: true,
      tabSize: 2,
      wordWrap: 'on',
      padding: { top: 8, bottom: 8 },
      overviewRulerLanes: 0,
      overviewRulerBorder: false,
      hideCursorInOverviewRuler: true,
      suggestOnTriggerCharacters: true,
      quickSuggestions: {
        other: 'on',
        comments: 'off',
        strings: 'on',
      },
      suggest: {
        snippetsPreventQuickSuggestions: false,
        showWords: true,
        showClasses: true,
        showFunctions: true,
        showVariables: true,
        showConstants: true,
        showMethods: true,
        showProperties: true,
        showEvents: true,
        showOperators: true,
        showUnits: true,
        showValues: true,
        showColors: true,
        showFiles: true,
        showReferences: true,
        showFolders: true,
        showTypeParameters: true,
        showModules: true,
      },
      parameterHints: {
        enabled: true,
      },
      autoClosingBrackets: 'always',
      autoClosingQuotes: 'always',
      formatOnType: true,
      formatOnPaste: true,
    });

    editorInstanceRef.current = editor;

    // JSX / TSX syntax highlighter instance
    let jsxHighlighterDisposable: { highlighter: (code?: string) => void; dispose: () => void } | null = null;

    const runJsxHighlight = () => {
      const ed = editorInstanceRef.current;
      if (!ed) return;
      const currentName = (activeFileNameRef.current || '').toLowerCase();
      if (currentName.endsWith('.jsx') || currentName.endsWith('.tsx')) {
        try {
          if (!jsxHighlighterDisposable) {
            const factory = getJsxSyntaxHighlighter();
            if (factory) {
              jsxHighlighterDisposable = factory.highlighterBuilder({
                editor: ed,
                filePath: activeFileNameRef.current,
              });
            }
          }
          jsxHighlighterDisposable?.highlighter();
        } catch (err) {
          console.warn('JSX highlight warning:', err);
        }
      } else if (jsxHighlighterDisposable) {
        try {
          jsxHighlighterDisposable.dispose();
        } catch (_) {}
        jsxHighlighterDisposable = null;
      }
    };

    runJsxHighlight();

    // Listen to changes on active editor model through ref to prevent stale closures
    const changeDisposable = editor.onDidChangeModelContent(() => {
      const currentModel = editor.getModel();
      if (!currentModel) return;

      for (const [name, model] of modelsMapRef.current.entries()) {
        if (model === currentModel) {
          const val = currentModel.getValue();
          isInternalChangeRef.current = true;
          onFileChangeRef.current(name, val);
          runJsxHighlight();
          break;
        }
      }
    });

    // Listen to cursor position
    const cursorDisposable = editor.onDidChangeCursorPosition((e) => {
      onCursorChangeRef.current({
        line: e.position.lineNumber,
        col: e.position.column,
      });
    });

    // Register custom LinkProvider to enable "Follow link (Ctrl + click)" for virtual files and anchor hashtag links
    const supportedLanguages = ['html', 'css', 'javascript', 'typescript', 'vue'];
    const linkProviderDisposables: monaco.IDisposable[] = [];

    supportedLanguages.forEach((lang) => {
      const disposable = monaco.languages.registerLinkProvider(lang, {
        provideLinks(model) {
          const links: monaco.languages.ILink[] = [];
          const lineCount = model.getLineCount();

          // Regex matching relative src="...", href="...", to="...", url("..."), import '...'
          const linkRegex = /(?:(?:src|href|to)\s*=\s*(?:["']([^"']+)["']|\{\s*["'`]([^"'`]+)["'`]\s*\}))|(?:url\(\s*["']?([^"')]+)["']?\s*\))|(?:(?:from|import)\s*["']([^"']+)["'])/g;

          for (let lineNum = 1; lineNum <= lineCount; lineNum++) {
            const lineContent = model.getLineContent(lineNum);
            let match: RegExpExecArray | null;
            linkRegex.lastIndex = 0;

            while ((match = linkRegex.exec(lineContent)) !== null) {
              const rawTarget = match[1] || match[2] || match[3] || match[4];
              if (!rawTarget) continue;

              // Ignore external URLs, data URIs, javascript, mailto, tel
              if (
                rawTarget.startsWith('http://') ||
                rawTarget.startsWith('https://') ||
                rawTarget.startsWith('//') ||
                rawTarget.startsWith('data:') ||
                rawTarget.startsWith('javascript:') ||
                rawTarget.startsWith('mailto:') ||
                rawTarget.startsWith('tel:')
              ) {
                continue;
              }

              // 1. In-file anchor hashtag link (e.g. href="#about", href="#contact", href="#")
              if (rawTarget.startsWith('#')) {
                const subIndex = match[0].indexOf(rawTarget);
                const startCol = match.index + subIndex + 1;
                const endCol = startCol + rawTarget.length;
                const anchorName = rawTarget.slice(1);

                links.push({
                  range: new monaco.Range(lineNum, startCol, lineNum, endCol),
                  url: `vfs-anchor://${rawTarget}`,
                  tooltip: anchorName
                    ? `Перейти к якорю #${anchorName} (Ctrl + клик)`
                    : 'Перейти в начало файла (Ctrl + клик)',
                });
                continue;
              }

              // 2. Cross-file anchor link (e.g. href="index.html#features" or href="./about.html#team")
              if (rawTarget.includes('#')) {
                const hashIdx = rawTarget.indexOf('#');
                const filePart = rawTarget.substring(0, hashIdx);
                const anchorName = rawTarget.substring(hashIdx + 1);

                const matchedVfsFile = findVirtualFile(filePart, filesRef.current);
                if (matchedVfsFile) {
                  const subIndex = match[0].indexOf(rawTarget);
                  const startCol = match.index + subIndex + 1;
                  const endCol = startCol + rawTarget.length;

                  links.push({
                    range: new monaco.Range(lineNum, startCol, lineNum, endCol),
                    url: `vfs://${matchedVfsFile.name}#${anchorName}`,
                    tooltip: anchorName
                      ? `Перейти к ${matchedVfsFile.name} #${anchorName} (Ctrl + клик)`
                      : `Перейти к файлу ${matchedVfsFile.name} (Ctrl + клик)`,
                  });
                }
                continue;
              }

              // 3. Check if file exists in our Virtual File System
              const matchedVfsFile = findVirtualFile(rawTarget, filesRef.current);
              if (matchedVfsFile) {
                const subIndex = match[0].indexOf(rawTarget);
                const startCol = match.index + subIndex + 1; // 1-based index in Monaco
                const endCol = startCol + rawTarget.length;

                links.push({
                  range: new monaco.Range(lineNum, startCol, lineNum, endCol),
                  url: `vfs://${matchedVfsFile.name}`,
                  tooltip: `Перейти к файлу ${matchedVfsFile.name} (Ctrl + клик)`,
                });
              }
            }
          }

          return { links };
        },
      });
      linkProviderDisposables.push(disposable);
    });

    // Intercept clicks on links with vfs:// protocol or anchor links
    const mouseDisposable = editor.onMouseDown((e) => {
      // Check if Ctrl / Cmd key is held and target has a link
      if ((e.event.ctrlKey || e.event.metaKey) && e.target?.position) {
        const model = editor.getModel();
        if (!model) return;

        const pos = e.target.position;
        const lineContent = model.getLineContent(pos.lineNumber);
        const linkRegex = /(?:(?:src|href|to)\s*=\s*(?:["']([^"']+)["']|\{\s*["'`]([^"'`]+)["'`]\s*\}))|(?:url\(\s*["']?([^"')]+)["']?\s*\))|(?:(?:from|import)\s*["']([^"']+)["'])/g;

        let match: RegExpExecArray | null;
        while ((match = linkRegex.exec(lineContent)) !== null) {
          const rawTarget = match[1] || match[2] || match[3] || match[4];
          if (!rawTarget) continue;
          const subIndex = match[0].indexOf(rawTarget);
          const startCol = match.index + subIndex + 1;
          const endCol = startCol + rawTarget.length;

          if (pos.column >= startCol && pos.column <= endCol) {
            e.event.preventDefault();
            e.event.stopPropagation();

            // 1. In-file anchor hashtag (e.g. #contact or #)
            if (rawTarget.startsWith('#')) {
              if (rawTarget === '#' || rawTarget.toLowerCase() === '#top') {
                const htmlFile = filesRef.current.find((f) => f.name.toLowerCase() === 'index.html') ||
                                 filesRef.current.find((f) => f.name.toLowerCase().endsWith('.html') || f.name.toLowerCase().endsWith('.eta')) ||
                                 filesRef.current.find((f) => /\.(jsx|tsx|vue)$/i.test(f.name)) ||
                                 filesRef.current[0];
                handleNavigateToText({ detail: { text: rawTarget, targetFile: htmlFile?.name } });
              } else {
                handleNavigateToText({ detail: { text: rawTarget } });
              }
              break;
            }

            // 2. Cross-file anchor (e.g. index.html#contact)
            if (rawTarget.includes('#')) {
              const hashIdx = rawTarget.indexOf('#');
              const filePart = rawTarget.substring(0, hashIdx);
              const anchorPart = rawTarget.substring(hashIdx);
              const matchedVfsFile = findVirtualFile(filePart, filesRef.current);
              if (matchedVfsFile) {
                handleNavigateToText({ detail: { text: anchorPart, targetFile: matchedVfsFile.name } });
              }
              break;
            }

            // 3. Regular file link
            const matchedVfsFile = findVirtualFile(rawTarget, filesRef.current);
            if (matchedVfsFile) {
              onSelectFileRef.current(matchedVfsFile.name);
              break;
            }
          }
        }
      }
    });

    const resizeObserver = new ResizeObserver(() => {
      editor.layout();
    });
    resizeObserver.observe(containerRef.current);

    // Listen to jump-to-selector events from TaskPanel
    let navDecorations: string[] = [];
    let navTimer: any = null;

    const handleNavigateToText = (e: any) => {
      const { text, targetFile } = e.detail || {};
      if (!text) return;

      const ed = editorInstanceRef.current;
      if (!ed) return;

      // 1. If target file is specified, switch model immediately
      if (targetFile) {
        const targetModel = modelsMapRef.current.get(targetFile);
        if (targetModel && ed.getModel() !== targetModel) {
          ed.setModel(targetModel);
        }
        if (targetFile !== activeFileNameRef.current) {
          onSelectFileRef.current(targetFile);
        }
      }

      // 2. Perform search and smooth reveal
      const executeNavigation = () => {
        const currentModel = ed.getModel();
        if (!currentModel) return;

        const cleanText = text.trim();
        if (!cleanText) return;

        // Jump to top of HTML content tab in editor for bare hash '#' or '#top'
        if (cleanText === '#' || cleanText.toLowerCase() === '#top') {
          const htmlFile = filesRef.current.find((f) => f.name.toLowerCase() === 'index.html') ||
                           filesRef.current.find((f) => f.name.toLowerCase().endsWith('.html') || f.name.toLowerCase().endsWith('.eta')) ||
                           filesRef.current.find((f) => /\.(jsx|tsx|vue)$/i.test(f.name)) ||
                           filesRef.current[0];
          const destFileName = htmlFile?.name || 'index.html';

          if (destFileName !== activeFileNameRef.current) {
            const destModel = modelsMapRef.current.get(destFileName);
            if (destModel && ed.getModel() !== destModel) {
              ed.setModel(destModel);
            }
            onSelectFileRef.current(destFileName);
          }

          requestAnimationFrame(() => {
            const currentEd = editorInstanceRef.current || ed;
            currentEd.setPosition({ lineNumber: 1, column: 1 });
            currentEd.revealLineInCenter(1, monaco.editor.ScrollType.Smooth);
            currentEd.focus();
          });
          return;
        }

        let matches: monaco.editor.FindMatch[] = [];

        // Special high-precision handling for ID / anchor navigation (#section, #contact, etc.)
        if (cleanText.startsWith('#')) {
          const rawId = cleanText.slice(1).trim();

          // Check if current file has the ID element
          let testMatches = currentModel.findMatches(`id="${rawId}"`, false, false, false, null, true);
          if (!testMatches || testMatches.length === 0) {
            testMatches = currentModel.findMatches(`id='${rawId}'`, false, false, false, null, true);
          }
          if (!testMatches || testMatches.length === 0) {
            testMatches = currentModel.findMatches(`id={"${rawId}"}`, false, false, false, null, true);
          }
          if (!testMatches || testMatches.length === 0) {
            testMatches = currentModel.findMatches(`id={\`${rawId}\`}`, false, false, false, null, true);
          }

          const currentExt = activeFileNameRef.current.split('.').pop()?.toLowerCase();
          const isCurrentHtml = currentExt === 'html' || currentExt === 'eta' || currentExt === 'jsx' || currentExt === 'tsx' || currentExt === 'vue';

          // If not found in current file and current file is not an HTML/markup file, switch to the HTML content tab!
          if ((!testMatches || testMatches.length === 0) && !isCurrentHtml) {
            const htmlFile = filesRef.current.find((f) => f.name.toLowerCase() === 'index.html') ||
                             filesRef.current.find((f) => f.name.toLowerCase().endsWith('.html') || f.name.toLowerCase().endsWith('.eta')) ||
                             filesRef.current[0];
            if (htmlFile && htmlFile.name !== activeFileNameRef.current) {
              const htmlModel = modelsMapRef.current.get(htmlFile.name);
              if (htmlModel && ed.getModel() !== htmlModel) {
                ed.setModel(htmlModel);
              }
              onSelectFileRef.current(htmlFile.name);
              setTimeout(() => {
                executeNavigation();
              }, 60);
              return;
            }
          }

          // 1. Try HTML / JSX exact attribute id="rawId", id='rawId', id={"rawId"}, id={`rawId`}
          matches = currentModel.findMatches(`id="${rawId}"`, false, false, false, null, true);
          if (!matches || matches.length === 0) {
            matches = currentModel.findMatches(`id='${rawId}'`, false, false, false, null, true);
          }
          if (!matches || matches.length === 0) {
            matches = currentModel.findMatches(`id={"${rawId}"}`, false, false, false, null, true);
          }
          if (!matches || matches.length === 0) {
            matches = currentModel.findMatches(`id={\`${rawId}\`}`, false, false, false, null, true);
          }
          // 2. Try HTML classic anchor name attribute: name="rawId"
          if (!matches || matches.length === 0) {
            matches = currentModel.findMatches(`name="${rawId}"`, false, false, false, null, true);
          }
          if (!matches || matches.length === 0) {
            matches = currentModel.findMatches(`name='${rawId}'`, false, false, false, null, true);
          }
          // 3. Try CSS ID selector `#rawId`
          if (!matches || matches.length === 0) {
            matches = currentModel.findMatches(`#${rawId}`, false, false, false, null, true);
          }
          // 4. Fallback: match rawId directly
          if (!matches || matches.length === 0) {
            matches = currentModel.findMatches(rawId, false, false, false, null, true);
          }
        } else {
          // 1. Try direct find
          matches = currentModel.findMatches(cleanText, false, false, false, null, true);

          // 2. Fallback for HTML classes (.grid-container -> grid-container)
          if ((!matches || matches.length === 0) && cleanText.startsWith('.')) {
            const rawName = cleanText.replace(/^\./, '');
            matches = currentModel.findMatches(rawName, false, false, false, null, true);
          }

          // 3. Fallback for compound selectors (e.g. .pricing-card.featured)
          if ((!matches || matches.length === 0) && cleanText.includes('.')) {
            const parts = cleanText.split('.').filter(Boolean);
            for (const p of parts) {
              matches = currentModel.findMatches('.' + p, false, false, false, null, true);
              if (!matches || matches.length === 0) {
                matches = currentModel.findMatches(p, false, false, false, null, true);
              }
              if (matches && matches.length > 0) break;
            }
          }

          // 4. Fallback for descendant / pseudo selectors (e.g. .modal::backdrop, .faq-item summary)
          if (!matches || matches.length === 0) {
            const firstWord = cleanText.split(/[:\s]+/)[0];
            if (firstWord && firstWord !== cleanText) {
              matches = currentModel.findMatches(firstWord, false, false, false, null, true);
              if ((!matches || matches.length === 0) && firstWord.startsWith('.')) {
                matches = currentModel.findMatches(firstWord.slice(1), false, false, false, null, true);
              }
            }
          }

          // 5. Fallback for CSS custom properties (e.g. --primary-color -> :root)
          if ((!matches || matches.length === 0) && cleanText.startsWith('--')) {
            matches = currentModel.findMatches(':root', false, false, false, null, true);
          }
        }

        // 6. Intelligent fallback when element is not yet created by student:
        // Guide cursor to the insertion zone (placeholder comment, container, or end of file)
        if (!matches || matches.length === 0) {
          const placeholder = currentModel.findMatches('<!-- Новые блоки', false, false, false, null, true);
          if (placeholder && placeholder.length > 0) {
            matches = placeholder;
          } else {
            const mainClose = currentModel.findMatches('</main>', false, false, false, null, true);
            if (mainClose && mainClose.length > 0) {
              matches = mainClose;
            } else {
              const lineCount = currentModel.getLineCount();
              matches = [{
                range: new monaco.Range(lineCount, 1, lineCount, 1),
                _findMatchBrand: undefined as any,
                matches: null,
              } as any];
            }
          }
        }

        // Prioritize non-comment matches (rule declarations with '{' or code lines)
        let bestMatch = matches[0];
        const nonCommentMatches = matches.filter((m) => {
          const line = currentModel.getLineContent(m.range.startLineNumber).trim();
          return !line.startsWith('/*') && !line.startsWith('*') && !line.startsWith('//');
        });

        if (nonCommentMatches.length > 0) {
          if (cleanText.startsWith('#')) {
            // For anchor hashtag targets, prefer lines with id= or name= or CSS rule
            const idMatch = nonCommentMatches.find((m) => {
              const line = currentModel.getLineContent(m.range.startLineNumber);
              return /id\s*=/i.test(line) || /name\s*=/i.test(line) || line.includes('{');
            });
            bestMatch = idMatch || nonCommentMatches[0];
          } else {
            const ruleMatch = nonCommentMatches.find((m) => {
              const line = currentModel.getLineContent(m.range.startLineNumber).trim();
              return line.includes('{') || line.startsWith(cleanText);
            });
            bestMatch = ruleMatch || nonCommentMatches[0];
          }
        }

        // Set selection and smoothly center in view
        ed.setSelection(bestMatch.range);
        ed.revealRangeInCenter(bestMatch.range, monaco.editor.ScrollType.Smooth);
        ed.focus();

        // High-contrast line & inline flash decoration
        if (navDecorations.length > 0) {
          ed.deltaDecorations(navDecorations, []);
          navDecorations = [];
        }

        navDecorations = ed.deltaDecorations([], [
          {
            range: bestMatch.range,
            options: {
              isWholeLine: true,
              className: 'target-selector-highlight-flash',
              inlineClassName: 'target-selector-inline-flash',
            },
          },
        ]);

        if (navTimer) {
          clearTimeout(navTimer);
        }
        navTimer = setTimeout(() => {
          if (editorInstanceRef.current && navDecorations.length > 0) {
            editorInstanceRef.current.deltaDecorations(navDecorations, []);
            navDecorations = [];
          }
        }, 2200);
      };

      executeNavigation();
      requestAnimationFrame(() => {
        executeNavigation();
      });
      setTimeout(() => {
        executeNavigation();
      }, 60);
    };

    const handleAnchorMessage = (event: MessageEvent) => {
      if (event.data?.type === 'VOHSA_ANCHOR_CLICK') {
        const rawHash = event.data.hash ? '#' + event.data.hash : '#';
        const htmlFile = filesRef.current.find((f) => f.name.toLowerCase() === 'index.html') ||
                         filesRef.current.find((f) => f.name.toLowerCase().endsWith('.html') || f.name.toLowerCase().endsWith('.eta')) ||
                         filesRef.current.find((f) => /\.(jsx|tsx|vue)$/i.test(f.name)) ||
                         filesRef.current[0];
        handleNavigateToText({ detail: { text: rawHash, targetFile: htmlFile?.name } });
      }
    };

    window.addEventListener('vohsa:navigate-to-text', handleNavigateToText);
    window.addEventListener('message', handleAnchorMessage);

    return () => {
      if (navTimer) clearTimeout(navTimer);
      window.removeEventListener('vohsa:navigate-to-text', handleNavigateToText);
      window.removeEventListener('message', handleAnchorMessage);
      resizeObserver.disconnect();
      changeDisposable.dispose();
      cursorDisposable.dispose();
      mouseDisposable.dispose();
      linkProviderDisposables.forEach((d) => d.dispose());
      modelsMapRef.current.forEach((m) => m.dispose());
      modelsMapRef.current.clear();
      editor.dispose();
    };
  }, []);

  // 2. Synchronize models map with files array and activeFileName
  useEffect(() => {
    // Add models for new files or update content if changed externally
    const isInternal = isInternalChangeRef.current;
    isInternalChangeRef.current = false;

    files.forEach((file) => {
      if (!modelsMapRef.current.has(file.name)) {
        const lang = getFileLanguage(file.name);
        const uri = monaco.Uri.parse(`vfs:///${file.name}`);
        const existingModel = monaco.editor.getModel(uri);
        const model = existingModel || monaco.editor.createModel(file.content, lang, uri);
        modelsMapRef.current.set(file.name, model);
      } else if (!isInternal) {
        const model = modelsMapRef.current.get(file.name)!;
        if (model.getValue() !== file.content) {
          model.setValue(file.content);
        }
      }
    });

    // Remove models for deleted files
    const fileNames = new Set(files.map((f) => f.name));
    for (const [name, model] of modelsMapRef.current.entries()) {
      if (!fileNames.has(name)) {
        model.dispose();
        modelsMapRef.current.delete(name);
      }
    }

    // Keep editor pointing to active file
    if (editorInstanceRef.current) {
      const targetModel = modelsMapRef.current.get(activeFileName) || null;
      if (editorInstanceRef.current.getModel() !== targetModel) {
        editorInstanceRef.current.setModel(targetModel);
        const pos = editorInstanceRef.current.getPosition();
        if (pos) {
          onCursorChangeRef.current({ line: pos.lineNumber, col: pos.column });
        }
      }
      // Trigger JSX highlighting on active model change
      const cur = (activeFileName || '').toLowerCase();
      if (cur.endsWith('.jsx') || cur.endsWith('.tsx')) {
        const factory = getJsxSyntaxHighlighter();
        if (factory) {
          try {
            const h = factory.highlighterBuilder({
              editor: editorInstanceRef.current,
              filePath: activeFileName,
            });
            h.highlighter();
          } catch (_) {}
        }
      }
    }
  }, [files, activeFileName]);

  // 3. Set Task Validation markers in Monaco Editor
  useEffect(() => {
    if (!editorInstanceRef.current) return;
    const model = modelsMapRef.current.get(activeFileName);
    if (!model) return;

    if (!taskValidationResult || taskValidationResult.targetFile.toLowerCase() !== activeFileName.toLowerCase()) {
      monaco.editor.setModelMarkers(model, 'sololearn-task', []);
      return;
    }

    const markers: monaco.editor.IMarkerData[] = [];

    // AST syntax error
    if (!taskValidationResult.astSummary.syntaxValid && taskValidationResult.astSummary.syntaxError) {
      const line = taskValidationResult.astSummary.line || 1;
      const col = taskValidationResult.astSummary.column || 1;
      markers.push({
        severity: monaco.MarkerSeverity.Error,
        message: `[AST Синтаксис] ${taskValidationResult.astSummary.syntaxError}`,
        startLineNumber: line,
        startColumn: col,
        endLineNumber: line,
        endColumn: model.getLineMaxColumn(line),
      });
    }

    // Criteria failures
    taskValidationResult.criteriaResults
      .filter((c) => !c.passed && c.message)
      .forEach((c) => {
        const line = c.line || 1;
        markers.push({
          severity: monaco.MarkerSeverity.Warning,
          message: `[Задание] ${c.message}`,
          startLineNumber: line,
          startColumn: c.column || 1,
          endLineNumber: line,
          endColumn: model.getLineMaxColumn(line),
        });
      });

    monaco.editor.setModelMarkers(model, 'sololearn-task', markers);
  }, [activeFileName, taskValidationResult]);

  // 4. Monaco Content Widgets: Инлайн-карточки тренажера синтаксиса [[slot:id]]
  const activeWidgetsRef = useRef<monaco.editor.IContentWidget[]>([]);

  useEffect(() => {
    const editor = editorInstanceRef.current;
    if (!editor) return;

    // Очистить старые виджеты
    activeWidgetsRef.current.forEach((w) => {
      try {
        editor.removeContentWidget(w);
      } catch (err) {
        // ignore
      }
    });
    activeWidgetsRef.current = [];

    // В файлах заданий (task.json, tasks.json, *.task.json и т.д.) не монтируем виджеты слотов,
    // чтобы исходная JSON-структура была полностью видна и редактируема
    if (isVfsTaskFile(activeFileName)) {
      return;
    }

    const targetModel = modelsMapRef.current.get(activeFileName);
    const model = editor.getModel();
    if (!model || (targetModel && model !== targetModel)) return;

    const currentText = model.getValue();
    const slotRegex = /\[\[slot:([a-zA-Z0-9_-]+)\]\]/g;
    const matches: { id: string; slotName: string; range: monaco.Range }[] = [];

    let match: RegExpExecArray | null;
    while ((match = slotRegex.exec(currentText)) !== null) {
      const slotName = match[1];
      const startPos = model.getPositionAt(match.index);
      const endPos = model.getPositionAt(match.index + match[0].length);
      matches.push({
        id: `slot-widget-${slotName}-${match.index}`,
        slotName,
        range: new monaco.Range(
          startPos.lineNumber,
          startPos.column,
          endPos.lineNumber,
          endPos.column
        ),
      });
    }

    if (matches.length === 0) return;

    matches.forEach(({ id, slotName, range }) => {
      const slotConfig = activeTask?.slots?.[slotName];

      const domNode = document.createElement('div');
      domNode.className = 'monaco-inline-slot-widget';

      const handleSlotSelect = (val: string) => {
        // Ищем актуальный диапазон токена в модели на случай смещения строк или соседних замен
        const targetToken = `[[slot:${slotName}]]`;
        const currentMatches = model.findMatches(targetToken, false, false, true, null, true);
        const targetRange = currentMatches.length > 0 ? currentMatches[0].range : range;

        editor.executeEdits('slot-replace', [
          {
            range: targetRange,
            text: val,
            forceMoveMarkers: true,
          },
        ]);
        editor.focus();
      };

      if (!slotConfig || slotConfig.type === 'chips') {
        const options = slotConfig?.options || ['вариант 1', 'вариант 2'];
        const container = document.createElement('div');
        container.className = 'slot-chips-wrap';

        const label = document.createElement('span');
        label.className = 'slot-badge-label';
        label.textContent = slotName + ':';
        container.appendChild(label);

        options.forEach((opt) => {
          const chipBtn = document.createElement('button');
          chipBtn.className = 'slot-chip-btn';
          chipBtn.textContent = opt;
          chipBtn.type = 'button';
          chipBtn.title = `Вставить "${opt}"`;
          chipBtn.onclick = (e) => {
            e.stopPropagation();
            e.preventDefault();
            handleSlotSelect(opt);
          };
          container.appendChild(chipBtn);
        });
        domNode.appendChild(container);
      } else if (slotConfig.type === 'select') {
        const select = document.createElement('select');
        select.className = 'slot-select-input';

        const defaultOpt = document.createElement('option');
        defaultOpt.value = '';
        defaultOpt.disabled = true;
        defaultOpt.selected = true;
        defaultOpt.textContent = slotConfig.placeholder || `[${slotName}]`;
        select.appendChild(defaultOpt);

        (slotConfig.options || []).forEach((opt) => {
          const optionEl = document.createElement('option');
          optionEl.value = opt;
          optionEl.textContent = opt;
          select.appendChild(optionEl);
        });

        select.onchange = (e) => {
          e.stopPropagation();
          const selectedVal = (e.target as HTMLSelectElement).value;
          if (selectedVal) {
            handleSlotSelect(selectedVal);
          }
        };
        domNode.appendChild(select);
      } else if (slotConfig.type === 'input') {
        const inputWrap = document.createElement('div');
        inputWrap.className = 'slot-input-wrap';

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'slot-text-input';
        input.placeholder = slotConfig.placeholder || slotName;

        const confirmBtn = document.createElement('button');
        confirmBtn.className = 'slot-input-confirm-btn';
        confirmBtn.textContent = '✓';
        confirmBtn.title = 'Подтвердить ввод';

        const submitInput = () => {
          const val = input.value.trim();
          if (val) {
            handleSlotSelect(val);
          }
        };

        confirmBtn.onclick = (e) => {
          e.stopPropagation();
          e.preventDefault();
          submitInput();
        };

        input.onkeydown = (e) => {
          if (e.key === 'Enter') {
            e.stopPropagation();
            e.preventDefault();
            submitInput();
          }
        };

        inputWrap.appendChild(input);
        inputWrap.appendChild(confirmBtn);
        domNode.appendChild(inputWrap);
      }

      const widget: monaco.editor.IContentWidget = {
        getId: () => id,
        getDomNode: () => domNode,
        getPosition: () => ({
          position: {
            lineNumber: range.startLineNumber,
            column: range.startColumn,
          },
          preference: [monaco.editor.ContentWidgetPositionPreference.EXACT],
        }),
      };

      editor.addContentWidget(widget);
      activeWidgetsRef.current.push(widget);
    });

    return () => {
      activeWidgetsRef.current.forEach((w) => {
        try {
          editor.removeContentWidget(w);
        } catch (err) {
          // ignore
        }
      });
      activeWidgetsRef.current = [];
    };
  }, [files, activeFileName, activeTask]);

  const handleStartCreate = () => {
    setIsCreating(true);
    setNewFileName('');
    setTimeout(() => newFileInputRef.current?.focus(), 50);
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

  return (
    <div class="editor-pane-wrapper">
      <div class="editor-tabs-bar">
        <div class="editor-tabs-scroll">
          {files.map((file) => {
            const isActive = file.name === activeFileName;
            const isEditing = editingFileName === file.name;

            return (
              <div
                key={file.name}
                class={`tab-item ${isActive ? 'active' : ''}`}
                onClick={() => onSelectFile(file.name)}
                onDblClick={() => handleStartRename(file.name)}
                title="Двойной клик для переименования"
              >
                {getFileIcon(file.name, 13)}

                {isEditing ? (
                  <input
                    type="text"
                    class="tab-rename-input"
                    value={renameValue}
                    onInput={(e) => setRenameValue((e.target as HTMLInputElement).value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleConfirmRename();
                      if (e.key === 'Escape') setEditingFileName(null);
                    }}
                    onBlur={handleConfirmRename}
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span class="tab-name">{file.name}</span>
                )}

                <button
                  class="tab-close-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteFile(file.name);
                  }}
                  title="Удалить файл"
                >
                  <X size={12} />
                </button>
              </div>
            );
          })}

          {isCreating ? (
            <div class="tab-item new-file-input-tab">
              {getFileIcon(newFileName || 'index.html', 13)}
              <input
                ref={newFileInputRef}
                type="text"
                class="tab-create-input"
                placeholder="filename.html"
                value={newFileName}
                onInput={(e) => setNewFileName((e.target as HTMLInputElement).value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleConfirmCreate();
                  if (e.key === 'Escape') setIsCreating(false);
                }}
                onBlur={handleConfirmCreate}
              />
            </div>
          ) : (
            <button
              class="tab-add-btn"
              onClick={handleStartCreate}
              title="Создать новый файл"
            >
              <Plus size={14} />
            </button>
          )}
        </div>
      </div>

      <div class="editor-breadcrumbs">
        <div class="breadcrumbs-left">
          <span class="breadcrumb-item">workspace</span>
          {activeFileName ? (
            <>
              <ChevronRight size={11} class="breadcrumb-sep" />
              <span class="breadcrumb-item breadcrumb-current">
                {getFileIcon(activeFileName, 12)}
                <span>{activeFileName}</span>
              </span>
            </>
          ) : null}
        </div>

        {activeTask?.templateCode && activeTask.targetFile === activeFileName && (
          <button
            class="template-load-pill-btn"
            onClick={() => {
              if (onLoadTaskTemplate) {
                onLoadTaskTemplate(activeTask);
              } else if (activeTask.templateCode) {
                onFileChange(activeFileName, activeTask.templateCode);
              }
            }}
            title="Загрузить интерактивный тренажер синтаксиса с карточками для этого урока"
          >
            <Sparkles size={12} color="#5eead4" />
            <span>Вставить тренажер урока</span>
          </button>
        )}
      </div>

      <div
        class="monaco-host"
        ref={containerRef}
        style={files.length === 0 ? { display: 'none' } : undefined}
      />

      {files.length === 0 && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: 'calc(100% - 70px)',
            color: '#71717a',
            gap: '1rem',
            padding: '2rem',
          }}
        >
          <p style={{ margin: 0, fontSize: '0.9rem' }}>В проекте нет файлов.</p>
          <button
            class="chakra-button chakra-button--teal chakra-button--sm"
            onClick={handleStartCreate}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={14} /> Создать файл
          </button>
        </div>
      )}
    </div>
  );
}
