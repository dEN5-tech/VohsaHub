import * as monaco from 'monaco-editor';
import { html, css, json, typescript } from 'monaco-editor';

// Конфигурируем веб-воркеры Monaco через относительный путь к node_modules
// @ts-ignore
window.MonacoEnvironment = {
  getWorker(_: any, label: string) {
    if (label === 'json') {
      return new Worker(
        new URL('../node_modules/monaco-editor/esm/vs/language/json/json.worker.js', import.meta.url),
        { type: 'module' }
      );
    }
    if (label === 'html' || label === 'handlebars' || label === 'razor') {
      return new Worker(
        new URL('../node_modules/monaco-editor/esm/vs/language/html/html.worker.js', import.meta.url),
        { type: 'module' }
      );
    }
    if (label === 'css' || label === 'scss' || label === 'less') {
      return new Worker(
        new URL('../node_modules/monaco-editor/esm/vs/language/css/css.worker.js', import.meta.url),
        { type: 'module' }
      );
    }
    if (label === 'typescript' || label === 'javascript') {
      return new Worker(
        new URL('../node_modules/monaco-editor/esm/vs/language/typescript/ts.worker.js', import.meta.url),
        { type: 'module' }
      );
    }
    return new Worker(
      new URL('../node_modules/monaco-editor/esm/vs/editor/editor.worker.js', import.meta.url),
      { type: 'module' }
    );
  },
};

// Конфигурируем автодополнение (IntelliSense) и линтинг в Web Workers
try {
  // Настройка HTML Worker (автозакрытие тегов, подсказки тегов/атрибутов, форматирование)
  html?.htmlDefaults?.setOptions({
    format: {
      tabSize: 2,
      insertSpaces: true,
      wrapLineLength: 120,
      unformatted: 'wbr',
      contentUnformatted: 'pre,code,textarea',
      indentInnerHtml: false,
      preserveNewLines: true,
      maxPreserveNewLines: 2,
      indentHandlebars: false,
      endWithNewline: false,
      extraLiners: 'head, body, /html',
      wrapAttributes: 'auto',
    },
    suggest: {
      html5: true,
    },
  });

  // Настройка CSS Worker (подсказки селекторов, свойств, валидация)
  css?.cssDefaults?.setOptions({
    validate: true,
    lint: {
      compatibleVendorPrefixes: 'ignore',
      vendorPrefix: 'warning',
      duplicateProperties: 'warning',
      emptyRules: 'warning',
      importStatement: 'ignore',
      boxModel: 'ignore',
      universalSelector: 'ignore',
      zeroUnits: 'ignore',
      fontFaceProperties: 'warning',
      hexColorLength: 'error',
      argumentsInColorFunction: 'error',
      unknownProperties: 'warning',
      ieHack: 'ignore',
      unknownVendorSpecificProperties: 'ignore',
      propertyIgnoredDueToDisplay: 'warning',
      important: 'ignore',
      float: 'ignore',
      idSelector: 'ignore',
    },
  });

  // Настройка JS/TS Worker (поддержка современного ESNext, DOM-типов и автодополнения)
  typescript?.javascriptDefaults?.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
  });

  typescript?.javascriptDefaults?.setCompilerOptions({
    target: typescript.ScriptTarget.ESNext,
    allowNonTextFiles: true,
    allowJs: true,
    checkJs: true,
    alwaysStrict: false,
    noImplicitAny: false,
    allowSyntheticDefaultImports: true,
  });

  // Настройка JSON Worker (валидация, отключаем внешние сетевые/схемные запросы)
  json?.jsonDefaults?.setDiagnosticsOptions({
    validate: true,
    allowComments: true,
    trailingCommas: 'ignore',
    enableSchemaRequest: false,
    schemas: [],
  });
} catch (e) {
  console.warn('Monaco language defaults setup warning:', e);
}

// Защита от несанкционированного открытия file:/// ссылок в браузере
try {
  monaco.editor.registerEditorOpener({
    openCodeEditor(_source, resource) {
      if (resource.scheme === 'file') {
        return true; // блокируем попытки перехода на системную файловую систему
      }
      return false;
    },
  });
} catch (_) {
  // ignore
}

// Подключаем Emmet плагин для быстрой генерации HTML / CSS / JSX аббревиатур
import { emmetHTML, emmetCSS, emmetJSX } from 'emmet-monaco-es';

try {
  emmetHTML(monaco, ['html', 'handlebars', 'razor']);
  emmetCSS(monaco, ['css', 'scss', 'less']);
  emmetJSX(monaco, ['javascript', 'typescript', 'javascriptreact', 'typescriptreact']);
} catch (emmetErr) {
  console.warn('Emmet initialization warning:', emmetErr);
}

// Register Chakra UI Dark theme for Monaco Editor
monaco.editor.defineTheme('chakra-dark', {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: '', background: '09090B', foreground: 'F4F4F5' },
    { token: 'comment', foreground: '71717A', fontStyle: 'italic' },
    { token: 'keyword', foreground: 'FB7185', fontStyle: 'bold' },
    { token: 'keyword.control', foreground: 'F43F5E', fontStyle: 'bold' },
    { token: 'identifier', foreground: 'F4F4F5' },
    { token: 'string', foreground: 'FDE047' },
    { token: 'number', foreground: 'C084FC' },
    { token: 'tag', foreground: '2DD4BF' },
    { token: 'tag.id', foreground: '5EEAD4' },
    { token: 'tag.class', foreground: '5EEAD4' },
    { token: 'attribute.name', foreground: '2DD4BF' },
    { token: 'attribute.value', foreground: 'FDE047' },
    { token: 'delimiter', foreground: 'A1A1AA' },
    { token: 'delimiter.html', foreground: '71717A' },
    { token: 'type', foreground: '38BDF8', fontStyle: 'italic' },
    { token: 'function', foreground: '34D399' },
    { token: 'variable', foreground: 'FB923C' },
    { token: 'variable.parameter', foreground: 'FB923C', fontStyle: 'italic' },
    { token: 'constant', foreground: 'C084FC' },
  ],
  colors: {
    // Surface & background matching Chakra UI #09090b
    'editor.background': '#09090B',
    'editor.foreground': '#F4F4F5',
    'editorGutter.background': '#09090B',

    // Chakra subtle line highlight
    'editor.lineHighlightBackground': '#18181B',
    'editor.lineHighlightBorder': '#27272A00',

    // Chakra Teal selections
    'editor.selectionBackground': '#0D948844',
    'editor.inactiveSelectionBackground': '#0D948822',
    'editor.selectionHighlightBackground': '#0D948828',

    // Chakra Teal Cursor
    'editorCursor.foreground': '#14B8A6',

    // Chakra Line Numbers
    'editorLineNumber.foreground': '#52525B',
    'editorLineNumber.activeForeground': '#2DD4BF',

    // Guides & Whitespace
    'editorWhitespace.foreground': '#27272A',
    'editorIndentGuide.background1': '#27272A',
    'editorIndentGuide.activeBackground1': '#3F3F46',

    // Smooth modern scrollbars
    'scrollbarSlider.background': '#FFFFFF14',
    'scrollbarSlider.hoverBackground': '#FFFFFF24',
    'scrollbarSlider.activeBackground': '#FFFFFF38',

    // Autocomplete & Tooltips (Chakra Menu)
    'editorWidget.background': '#18181B',
    'editorWidget.border': '#27272A',
    'editorSuggestWidget.background': '#18181B',
    'editorSuggestWidget.border': '#27272A',
    'editorSuggestWidget.selectedBackground': '#27272A',
    'editorSuggestWidget.highlightForeground': '#2DD4BF',
  },
});

// Backward compatibility alias for monokai
monaco.editor.defineTheme('monokai', {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: '', background: '09090B', foreground: 'F4F4F5' },
    { token: 'comment', foreground: '71717A', fontStyle: 'italic' },
    { token: 'keyword', foreground: 'FB7185', fontStyle: 'bold' },
    { token: 'string', foreground: 'FDE047' },
    { token: 'number', foreground: 'C084FC' },
    { token: 'tag', foreground: '2DD4BF' },
    { token: 'attribute.name', foreground: '2DD4BF' },
    { token: 'attribute.value', foreground: 'FDE047' },
    { token: 'type', foreground: '38BDF8' },
    { token: 'function', foreground: '34D399' },
  ],
  colors: {
    'editor.background': '#09090B',
    'editor.foreground': '#F4F4F5',
    'editorGutter.background': '#09090B',
    'editor.lineHighlightBackground': '#18181B',
    'editor.selectionBackground': '#0D948844',
    'editorCursor.foreground': '#14B8A6',
    'editorLineNumber.foreground': '#52525B',
    'editorLineNumber.activeForeground': '#2DD4BF',
  },
});

export { monaco };
