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


// =============================================================================
// Apache Configuration (.htaccess, httpd.conf) Language Plugin for Monaco
// =============================================================================

export const apacheLanguageConfiguration: monaco.languages.LanguageConfiguration = {
  comments: {
    lineComment: '#',
  },
  brackets: [
    ['<', '>'],
    ['[', ']'],
    ['(', ')'],
    ['{', '}'],
  ],
  autoClosingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '"', close: '"' },
    { open: "'", close: "'" },
    { open: '<', close: '>' },
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
      start: new RegExp('^\\s*<[a-zA-Z0-9_]+'),
      end: new RegExp('^\\s*</[a-zA-Z0-9_]+>'),
    },
  },
};

export const apacheMonarchTokensProvider: monaco.languages.IMonarchLanguage = {
  defaultToken: '',
  tokenPostfix: '.apache',
  ignoreCase: true,

  keywords: [
    'RewriteEngine', 'RewriteRule', 'RewriteCond', 'RewriteBase', 'RewriteMap', 'RewriteOptions',
    'Options', 'AllowOverride', 'Require', 'Order', 'Allow', 'Deny', 'Satisfy',
    'ServerName', 'ServerAlias', 'ServerAdmin', 'ServerRoot', 'DocumentRoot',
    'DirectoryIndex', 'ErrorDocument', 'CustomLog', 'ErrorLog', 'LogLevel',
    'Header', 'RequestHeader', 'SetEnv', 'SetEnvIf', 'PassEnv', 'UnsetEnv',
    'AddType', 'AddHandler', 'AddOutputFilter', 'AddEncoding', 'AddCharset',
    'ExpiresActive', 'ExpiresDefault', 'ExpiresByType',
    'IndexOptions', 'IndexIgnore', 'ReadmeName', 'HeaderName',
    'LimitRequestBody', 'LimitRequestFields', 'LimitRequestFieldSize',
    'KeepAlive', 'MaxKeepAliveRequests', 'KeepAliveTimeout', 'Timeout',
    'SSLEngine', 'SSLCertificateFile', 'SSLCertificateKeyFile', 'SSLCertificateChainFile',
    'SSLCACertificateFile', 'SSLProtocol', 'SSLCipherSuite',
    'AccessFileName', 'FileETag', 'DefaultType', 'HostnameLookups'
  ],

  tags: [
    'VirtualHost', 'Directory', 'DirectoryMatch', 'Files', 'FilesMatch',
    'Location', 'LocationMatch', 'IfModule', 'IfDefine', 'IfVersion',
    'Proxy', 'ProxyMatch', 'Limit', 'LimitExcept', 'AuthnProviderAlias'
  ],

  variables: [
    'HTTP_USER_AGENT', 'HTTP_REFERER', 'HTTP_COOKIE', 'HTTP_FORWARDED', 'HTTP_HOST',
    'HTTP_PROXY_CONNECTION', 'HTTP_ACCEPT', 'REMOTE_ADDR', 'REMOTE_HOST', 'REMOTE_PORT',
    'REMOTE_USER', 'REMOTE_IDENT', 'REQUEST_METHOD', 'SCRIPT_FILENAME', 'PATH_INFO',
    'QUERY_STRING', 'AUTH_TYPE', 'DOCUMENT_ROOT', 'SERVER_ADMIN', 'SERVER_NAME',
    'SERVER_ADDR', 'SERVER_PORT', 'SERVER_PROTOCOL', 'SERVER_SOFTWARE', 'TIME_YEAR',
    'TIME_MON', 'TIME_DAY', 'TIME_HOUR', 'TIME_MIN', 'TIME_SEC', 'TIME_WDAY',
    'TIME', 'API_VERSION', 'THE_REQUEST', 'REQUEST_URI', 'REQUEST_FILENAME',
    'IS_SUBREQ', 'HTTPS'
  ],

  flags: [
    'L', 'last', 'QSA', 'qsappend', 'NC', 'nocase', 'R', 'redirect',
    'F', 'forbidden', 'G', 'gone', 'PT', 'passthrough', 'B', 'BNE', 'BNP',
    'C', 'chain', 'CO', 'cookie', 'DPI', 'discardpath', 'E', 'env',
    'END', 'H', 'handler', 'N', 'next', 'NE', 'noescape', 'NS', 'nosubreq',
    'P', 'proxy', 'S', 'skip', 'T', 'type'
  ],

  tokenizer: {
    root: [
      // Comments
      [/#.*$/, 'comment'],

      // Section tags: <VirtualHost *:80>, </VirtualHost>
      [/(<\/?)(\w+)([^>]*)(>)/, [
        { token: 'delimiter' },
        { token: 'tag' },
        { token: 'attribute.name' },
        { token: 'delimiter' }
      ]],

      // Apache variables %{VAR}
      [/%\{[a-zA-Z0-9_]+\}/, 'variable'],

      // Backreferences $1, \1, %1
      [/[$%\\][0-9]/, 'number'],

      // Flags in brackets [L,QSA,NC,R=301]
      [/\[/, { token: 'delimiter.bracket', next: '@flags' }],

      // Directives
      [/^\s*([a-zA-Z0-9_]+)/, {
        cases: {
          '@keywords': 'keyword',
          '@default': 'identifier'
        }
      }],

      // Strings
      [/"([^"\\]|\\.)*"/, 'string'],
      [/'([^'\\]|\\.)*'/, 'string'],

      // IP addresses, numbers, ports
      [/\b\d+(\.\d+){3}(:\d+)?\b/, 'number'],
      [/\b\d+\b/, 'number'],

      // Delimiters
      [/[{}()]/, 'delimiter.bracket'],
      [/[,:]/, 'delimiter'],

      // Regular identifiers
      [/[a-zA-Z_]\w*/, {
        cases: {
          '@keywords': 'keyword',
          '@variables': 'variable',
          '@flags': 'constant',
          '@default': 'identifier'
        }
      }],

      // Whitespace
      [/\s+/, 'white'],
    ],

    flags: [
      [/\]/, { token: 'delimiter.bracket', next: '@pop' }],
      [/[a-zA-Z0-9_-]+(=[a-zA-Z0-9_.:/-]+)?/, {
        cases: {
          '@flags': 'constant',
          '@default': 'constant'
        }
      }],
      [/,/, 'delimiter'],
      [/\s+/, 'white'],
    ]
  }
};

// Register Apache language in Monaco
try {
  monaco.languages.register({
    id: 'apache',
    extensions: ['.conf', '.htaccess'],
    filenames: ['.htaccess', 'httpd.conf', 'apache.conf', 'apache2.conf', '000-default.conf'],
    aliases: ['Apache', 'apache', 'htaccess', 'httpd']
  });
  monaco.languages.setLanguageConfiguration('apache', apacheLanguageConfiguration);
  monaco.languages.setMonarchTokensProvider('apache', apacheMonarchTokensProvider);

  monaco.languages.registerCompletionItemProvider('apache', {
    provideCompletionItems(model, position) {
      const word = model.getWordUntilPosition(position);
      const range: monaco.IRange = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      const suggestions: monaco.languages.CompletionItem[] = [
        {
          label: 'RewriteEngine On',
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: 'RewriteEngine On\n',
          documentation: 'Включает механизм маршрутизации URL mod_rewrite',
          range,
        },
        {
          label: 'RewriteBase',
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: 'RewriteBase ${1:/}\n',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Задает базовый префикс URL для локальных правил mod_rewrite',
          range,
        },
        {
          label: 'RewriteRule (User Profile Routing)',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'RewriteRule ^user/([0-9]+)$ profile.php?id=$1 [L,QSA]\n',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Маршрутизация ЧПУ профиля: /user/42 -> profile.php?id=42 [L,QSA]',
          range,
        },
        {
          label: 'RewriteRule (Slug / Category)',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'RewriteRule ^${1:products}/([a-zA-Z0-9_-]+)/?$ ${2:item.php}?slug=$1 [L,QSA]\n',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Преобразование ЧПУ слагов в параметры запроса',
          range,
        },
        {
          label: 'RewriteCond File / Directory Check',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'RewriteCond %{REQUEST_FILENAME} !-f\nRewriteCond %{REQUEST_FILENAME} !-d\nRewriteRule ^(.*)$ index.php [L,QSA]\n',
          documentation: 'Front-Controller роутинг: если файл или папка не существует, направить в index.php',
          range,
        },
        {
          label: '<VirtualHost *:80>',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: '<VirtualHost *:80>\n\tServerName ${1:example.local}\n\tDocumentRoot "${2:/var/www/html}"\n\t<Directory "${2:/var/www/html}">\n\t\tAllowOverride All\n\t\tRequire all granted\n\t</Directory>\n</VirtualHost>\n',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Блок виртуального хоста Apache',
          range,
        },
        {
          label: '<IfModule mod_rewrite.c>',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: '<IfModule mod_rewrite.c>\n\tRewriteEngine On\n\t${1}\n</IfModule>\n',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Безопасная проверка наличия модуля mod_rewrite',
          range,
        },
        {
          label: '[L,QSA]',
          kind: monaco.languages.CompletionItemKind.Value,
          insertText: '[L,QSA]',
          documentation: 'Флаги: L (Last - последнее правило), QSA (Query String Append - объединение параметров запроса)',
          range,
        },
        {
          label: '[NC,L]',
          kind: monaco.languages.CompletionItemKind.Value,
          insertText: '[NC,L]',
          documentation: 'Флаги: NC (No Case - нечувствительность к регистру), L (Last)',
          range,
        },
        {
          label: '[R=301,L]',
          kind: monaco.languages.CompletionItemKind.Value,
          insertText: '[R=301,L]',
          documentation: 'Флаги: R=301 (Permanent Redirect), L (Last)',
          range,
        },
      ];

      return { suggestions };
    },
  });

  monaco.languages.registerHoverProvider('apache', {
    provideHover(model, position) {
      const word = model.getWordAtPosition(position);
      if (!word) return null;
      const w = word.word.toLowerCase();

      const docs: Record<string, string> = {
        rewriteengine: '**RewriteEngine** *(on | off)*\n\nВключает или выключает механизм маршрутизации URL mod_rewrite в Apache.',
        rewriterule: '**RewriteRule** *Pattern Substitution [Flags]*\n\nОпределяет правило подстановки URL на основе регулярного выражения.\n- **Pattern**: Regex для проверки входящего запроса.\n- **Substitution**: Целевой путь в файловой системе или URL.\n- **Flags**: Модификаторы поведения (например, `[L,QSA]`).',
        rewritecond: '**RewriteCond** *TestString CondPattern [Flags]*\n\nЗадает условие для следующего `RewriteRule`. Поддерживает переменные `%{REQUEST_FILENAME}`, `%{HTTP_HOST}` и системные тесты `!-f`, `!-d`.',
        rewritebase: '**RewriteBase** *URL-path*\n\nБазовый префикс для относительных подстановок в контексте `.htaccess`.',
        virtualhost: '**<VirtualHost [IP|*]:порт>**\n\nКонтейнер изолированной конфигурации сайта/домена.',
        documentroot: '**DocumentRoot** *directory-path*\n\nКорневой каталог в файловой системе для отдачи документов сайта.',
        servername: '**ServerName** *hostname[:port]*\n\nОсновное доменное имя виртуального хоста.',
        allowoverride: '**AllowOverride** *(All | None | Directives...)*\n\nРазрешает или запрещает переопределение настроек через локальные файлы `.htaccess`.',
        options: '**Options** *[+|-]Option...*\n\nВключает дополнительные функции каталога (`Indexes`, `FollowSymLinks`).',
      };

      if (docs[w]) {
        return {
          contents: [{ value: docs[w] }],
        };
      }
      return null;
    },
  });
} catch (apacheErr) {
  console.warn('Apache language registration error:', apacheErr);
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
