import * as monaco from 'monaco-editor';
import { html, css, json, typescript } from 'monaco-editor';
import { emmetHTML, emmetCSS, emmetJSX } from 'emmet-monaco-es';
import { MonacoJsxSyntaxHighlight, getWorker } from 'monaco-jsx-syntax-highlight';

// Vue Single File Component (.vue) language configuration
export const vueLanguageConfiguration: monaco.languages.LanguageConfiguration = {
  comments: {
    blockComment: ['<!--', '-->'],
  },
  brackets: [
    ['<!--', '-->'],
    ['<', '>'],
    ['{', '}'],
    ['(', ')'],
    ['[', ']'],
  ],
  autoClosingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '"', close: '"' },
    { open: "'", close: "'" },
    { open: '`', close: '`' },
    { open: '<!--', close: '-->', notIn: ['comment', 'string'] },
    { open: '<', close: '>', notIn: ['string'] },
  ],
  surroundingPairs: [
    { open: '"', close: '"' },
    { open: "'", close: "'" },
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '<', close: '>' },
  ],
  folding: {
    markers: {
      start: new RegExp('^\\s*<!--\\s*#region\\b.*-->'),
      end: new RegExp('^\\s*<!--\\s*#endregion\\b.*-->'),
    },
  },
};

// Vue Monarch Tokenizer with embedded JavaScript & CSS
export const vueMonarchTokensProvider: monaco.languages.IMonarchLanguage = {
  defaultToken: '',
  tokenPostfix: '.vue',
  ignoreCase: false,

  keywords: [
    'v-if', 'v-else-if', 'v-else', 'v-for', 'v-on', 'v-bind', 'v-model',
    'v-slot', 'v-show', 'v-cloak', 'v-pre', 'v-once', 'v-memo', 'v-html', 'v-text',
    'template', 'script', 'style', 'setup'
  ],

  tokenizer: {
    root: [
      [/<!--/, 'comment', '@comment'],
      [
        /(<)(script)(.*)(>)/,
        [
          { token: 'delimiter.html' },
          { token: 'tag' },
          { token: 'attribute.name' },
          { token: 'delimiter.html', next: '@scriptEmbedded', nextEmbedded: 'javascript' },
        ],
      ],
      [
        /(<)(style)(.*)(>)/,
        [
          { token: 'delimiter.html' },
          { token: 'tag' },
          { token: 'attribute.name' },
          { token: 'delimiter.html', next: '@styleEmbedded', nextEmbedded: 'css' },
        ],
      ],
      [/\{\{/, { token: 'delimiter.bracket', next: '@interpolation', nextEmbedded: 'javascript' }],
      [/<\/?[a-zA-Z0-9_\-]+/, 'tag', '@tagContent'],
      [/[^<{]+/, ''],
    ],

    tagContent: [
      [/\/>/, 'delimiter.html', '@pop'],
      [/>/, 'delimiter.html', '@pop'],
      [/(@|:|#)[a-zA-Z0-9_\-.:]+/, 'keyword'],
      [/v-[a-zA-Z0-9_\-.:]+/, 'keyword'],
      [/[a-zA-Z0-9_\-]+/, 'attribute.name'],
      [/=\s*"([^"]*)"/, 'attribute.value'],
      [/=\s*'([^']*)'/, 'attribute.value'],
      [/=\s*([^\s>]+)/, 'attribute.value'],
      [/\s+/, 'white'],
    ],

    comment: [
      [/-->/, 'comment', '@pop'],
      [/[^-]+/, 'comment'],
      [/[-]/, 'comment'],
    ],

    scriptEmbedded: [
      [/<\/script>/, { token: '@rematch', next: '@pop', nextEmbedded: '@pop' }],
    ],

    styleEmbedded: [
      [/<\/style>/, { token: '@rematch', next: '@pop', nextEmbedded: '@pop' }],
    ],

    interpolation: [
      [/\}\}/, { token: 'delimiter.bracket', next: '@pop', nextEmbedded: '@pop' }],
    ],
  },
};

// Register Vue language
try {
  monaco.languages.register({ id: 'vue', extensions: ['.vue'] });
  monaco.languages.setLanguageConfiguration('vue', vueLanguageConfiguration);
  monaco.languages.setMonarchTokensProvider('vue', vueMonarchTokensProvider);
} catch (vueErr) {
  console.warn('Vue language registration error:', vueErr);
}

// Singleton for JSX / TSX syntax highlighter
let jsxSyntaxHighlighterInstance: MonacoJsxSyntaxHighlight | null = null;

export function getJsxSyntaxHighlighter(): MonacoJsxSyntaxHighlight | null {
  if (typeof window === 'undefined') return null;
  if (!jsxSyntaxHighlighterInstance) {
    try {
      jsxSyntaxHighlighterInstance = new MonacoJsxSyntaxHighlight(getWorker(), monaco);
    } catch (err) {
      console.warn('MonacoJsxSyntaxHighlight initialization warning:', err);
    }
  }
  return jsxSyntaxHighlighterInstance;
}

// Configure Monaco web workers via relative path to node_modules
// @ts-ignore
window.MonacoEnvironment = {
  getWorker(_: any, label: string) {
    if (label === 'json') {
      return new Worker(
        new URL('../node_modules/monaco-editor/esm/vs/language/json/json.worker.js', import.meta.url),
        { type: 'module' }
      );
    }
    if (label === 'html' || label === 'handlebars' || label === 'razor' || label === 'vue') {
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
    if (label === 'typescript' || label === 'javascript' || label === 'jsx' || label === 'tsx') {
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

// Configure IntelliSense and linting in Web Workers
try {
  // HTML Worker setup (auto closing tags, tag/attribute suggestions, formatting)
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

  // CSS Worker setup (selector and property hints, validation)
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

  // Настройка JS/TS Worker (Настройка Настройка ESNext, DOM-Настройка, JSX/TSX)
  typescript?.javascriptDefaults?.setDiagnosticsOptions({
    noSemanticValidation: true,
    noSyntaxValidation: false,
  });

  typescript?.javascriptDefaults?.setCompilerOptions({
    target: typescript.ScriptTarget.ESNext,
    allowNonTextFiles: true,
    allowJs: true,
    checkJs: false,
    alwaysStrict: false,
    noImplicitAny: false,
    allowSyntheticDefaultImports: true,
    jsx: typescript.JsxEmit.React,
  });

  typescript?.typescriptDefaults?.setDiagnosticsOptions({
    noSemanticValidation: true,
    noSyntaxValidation: false,
  });

  typescript?.typescriptDefaults?.setCompilerOptions({
    target: typescript.ScriptTarget.ESNext,
    allowNonTextFiles: true,
    allowJs: true,
    checkJs: false,
    alwaysStrict: false,
    noImplicitAny: false,
    allowSyntheticDefaultImports: true,
    jsx: typescript.JsxEmit.React,
  });

  // Настройка JSON Worker (Настройка, Настройка Настройка Настройка/Настройка Настройка)
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

// Настройка ?? Настройка Настройка file:/// Настройка ? Настройка
try {
  monaco.editor.registerEditorOpener({
    openCodeEditor(_source, resource) {
      if (resource.scheme === 'file') {
        return true; // Настройка Настройка Настройка ?? Настройка Настройка Настройка
      }
      return false;
    },
  });
} catch (_) {
  // ignore
}

// Настройка Emmet Настройка ??? Настройка Настройка HTML / CSS / JSX Настройка
try {
  emmetHTML(monaco, ['html', 'handlebars', 'razor', 'vue']);
  emmetCSS(monaco, ['css', 'scss', 'less']);
  emmetJSX(monaco, ['javascript', 'typescript', 'javascriptreact', 'typescriptreact', 'jsx', 'tsx']);
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
    { token: 'attribute.name.css', foreground: '38BDF8' },
    { token: 'property.css', foreground: '38BDF8' },
    { token: 'support.type.property-name.css', foreground: '38BDF8' },
    { token: 'support.type.property-name', foreground: '38BDF8' },
    { token: 'attribute.value.css', foreground: 'FDE047' },
    { token: 'support.constant.property-value.css', foreground: 'FDE047' },
    { token: 'string.css', foreground: 'FDE047' },
    { token: 'unit.css', foreground: 'C084FC' },
    { token: 'number.css', foreground: 'C084FC' },
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
