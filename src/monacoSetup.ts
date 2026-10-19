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
    aliases: ['Apache', 'apache', 'htaccess', 'httpd'],
  });
  monaco.languages.setLanguageConfiguration('apache', apacheLanguageConfiguration);
  monaco.languages.setMonarchTokensProvider('apache', apacheMonarchTokensProvider);

  // 1. Completion Item Provider (Автодополнение и контекстные подсказки директив, флагов и переменных)
  monaco.languages.registerCompletionItemProvider('apache', {
    triggerCharacters: [' ', '[', '%', '$', '^', '/', '<', ','],
    provideCompletionItems(model, position) {
      const word = model.getWordUntilPosition(position);
      const range: monaco.IRange = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      const lineContent = model.getLineContent(position.lineNumber);
      const textUntilPos = lineContent.substring(0, position.column - 1);
      const trimmedUntil = textUntilPos.trimStart();

      const suggestions: monaco.languages.CompletionItem[] = [];

      // Флаги внутри [ ... ]
      const insideBrackets = /\[[^\]]*$/.test(textUntilPos);
      if (insideBrackets || textUntilPos.endsWith('[')) {
        const flagsList = [
          { label: 'L', doc: 'Last rule: прекратить обработку последующих правил rewrite, если данное сработало' },
          { label: 'QSA', doc: 'Query String Append: объединить query-параметры (?id=...) исходного URL с новыми' },
          { label: 'NC', doc: 'No Case: нечувствительность к регистру при сопоставлении шаблона' },
          { label: 'R=301', doc: 'Redirect 301: постоянное HTTP-перенаправление браузера (Permanent Redirect)' },
          { label: 'R=302', doc: 'Redirect 302: временное HTTP-перенаправление браузера (Found)' },
          { label: 'F', doc: 'Forbidden: немедленно отдать код ответа HTTP 403' },
          { label: 'G', doc: 'Gone: отдать код ответа HTTP 410 (ресурс удален навсегда)' },
          { label: 'NE', doc: 'No Escape: не экранировать спецсимволы в целевом URL' },
          { label: 'PT', doc: 'Pass Through: передать преобразованный URI дальше стандартным обработчикам Apache' },
          { label: 'B', doc: 'Escape non-alphanumeric: экранировать спецсимволы перед преобразованием' },
          { label: 'C', doc: 'Chain: связать текущее правило со следующим' },
          { label: 'E=VAR:VAL', doc: 'Environment: установить внутреннюю переменную окружения' },
        ];

        flagsList.forEach((f) => {
          suggestions.push({
            label: f.label,
            kind: monaco.languages.CompletionItemKind.Value,
            insertText: f.label,
            documentation: f.doc,
            range,
          });
        });

        // Комплексные пресеты флагов
        suggestions.push(
          {
            label: 'L,QSA',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: 'L,QSA]',
            documentation: 'Стандартный роутинг: Last rule + Query String Append',
            range,
          },
          {
            label: 'NC,L,QSA',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: 'NC,L,QSA]',
            documentation: 'Регистронезависимый роутинг: No Case + Last + QSA',
            range,
          },
          {
            label: 'R=301,L',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: 'R=301,L]',
            documentation: 'Постоянный редирект 301 + Last',
            range,
          }
        );

        return { suggestions };
      }

      // Переменные сервера %{...}
      if (textUntilPos.endsWith('%') || textUntilPos.endsWith('%{')) {
        const vars = [
          { name: '%{REQUEST_URI}', doc: 'Путь запрашиваемого URL без домена (например: /user/42)' },
          { name: '%{REQUEST_FILENAME}', doc: 'Полный путь к файлу в локальной файловой системе сервера' },
          { name: '%{HTTP_HOST}', doc: 'Заголовок хоста HTTP-запроса (например: example.com)' },
          { name: '%{QUERY_STRING}', doc: 'Строка GET-параметров запроса (например: id=42&theme=dark)' },
          { name: '%{HTTPS}', doc: 'Включен ли SSL/TLS ("on" или "off")' },
          { name: '%{THE_REQUEST}', doc: 'Полная стартовая строка HTTP-запроса (GET /path HTTP/1.1)' },
          { name: '%{REMOTE_ADDR}', doc: 'IP-адрес клиента' },
          { name: '%{DOCUMENT_ROOT}', doc: 'Корневая папка виртуального хоста' },
        ];
        vars.forEach((v) => {
          suggestions.push({
            label: v.name,
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: textUntilPos.endsWith('%{') ? v.name.slice(2) : v.name,
            documentation: v.doc,
            range,
          });
        });
        return { suggestions };
      }

      // Если в строке после RewriteRule
      if (/^RewriteRule\s+/i.test(trimmedUntil)) {
        suggestions.push(
          {
            label: '^user/([0-9]+)$ profile.php?id=$1 [L,QSA]',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: '^user/([0-9]+)$ profile.php?id=$1 [L,QSA]',
            documentation: 'Маршрутизация профиля пользователя: /user/42 -> profile.php?id=42 [L,QSA]',
            range,
          },
          {
            label: '^items/([a-zA-Z0-9_-]+)$ item.php?slug=$1 [L,QSA]',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: '^items/([a-zA-Z0-9_-]+)$ item.php?slug=$1 [L,QSA]',
            documentation: 'Маршрутизация каталога товаров: /items/super-keyboard -> item.php?slug=super-keyboard [L,QSA]',
            range,
          },
          {
            label: '^api/v1/([a-zA-Z0-9_/-]+)$ api.php?endpoint=$1 [L,QSA]',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: '^api/v1/([a-zA-Z0-9_/-]+)$ api.php?endpoint=$1 [L,QSA]',
            documentation: 'REST API роутинг к центральному шлюзу',
            range,
          },
          {
            label: 'profile.php?id=$1 [L,QSA]',
            kind: monaco.languages.CompletionItemKind.Value,
            insertText: 'profile.php?id=$1 [L,QSA]',
            documentation: 'Целевой скрипт profile.php с id=$1',
            range,
          },
          {
            label: '[L,QSA]',
            kind: monaco.languages.CompletionItemKind.Value,
            insertText: '[L,QSA]',
            documentation: 'Флаги [L,QSA] (Last rule + Query String Append)',
            range,
          }
        );
      }

      // Общие директивы и сниппеты
      suggestions.push(
        {
          label: 'RewriteEngine On',
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: 'RewriteEngine On\n',
          documentation: 'Включает механизм маршрутизации URL mod_rewrite',
          range,
        },
        {
          label: 'RewriteRule',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'RewriteRule ^${1:pattern}$ ${2:target.php}?${3:param}=$1 [L,QSA]\n',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Шаблон директивы RewriteRule с интерактивными плейсхолдерами',
          range,
        },
        {
          label: 'RewriteRule (User Profile Routing)',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'RewriteRule ^user/([0-9]+)$ profile.php?id=$1 [L,QSA]\n',
          documentation: 'Маршрутизация ЧПУ профиля: /user/42 -> profile.php?id=42 [L,QSA]',
          range,
        },
        {
          label: 'RewriteRule (Catalog / Slug)',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'RewriteRule ^items/([a-zA-Z0-9_-]+)$ item.php?slug=$1 [L,QSA]\n',
          documentation: 'Маршрутизация товаров по слагу: /items/super-keyboard -> item.php?slug=super-keyboard [L,QSA]',
          range,
        },
        {
          label: 'RewriteCond File / Directory Check',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'RewriteCond %{REQUEST_FILENAME} !-f\nRewriteCond %{REQUEST_FILENAME} !-d\nRewriteRule ^(.*)$ index.php [L,QSA]\n',
          documentation: 'Front-Controller: если файл или директория не существует, направить в index.php',
          range,
        },
        {
          label: 'RewriteBase',
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: 'RewriteBase ${1:/}\n',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Задает базовый префикс URL для относительных правил mod_rewrite',
          range,
        },
        {
          label: '<VirtualHost *:80>',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: '<VirtualHost *:80>\n\tServerName ${1:vohsahub.local}\n\tDocumentRoot "${2:/var/www/html}"\n\t<Directory "${2:/var/www/html}">\n\t\tOptions Indexes FollowSymLinks\n\t\tAllowOverride All\n\t\tRequire all granted\n\t</Directory>\n\n\tRewriteEngine On\n\t${3}\n</VirtualHost>\n',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Полный блок виртуального хоста Apache с mod_rewrite',
          range,
        },
        {
          label: '<Directory "/var/www/html">',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: '<Directory "${1:/var/www/html}">\n\tOptions Indexes FollowSymLinks\n\tAllowOverride All\n\tRequire all granted\n</Directory>\n',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Конфигурация прав доступа к каталогу',
          range,
        },
        {
          label: 'AllowOverride All',
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: 'AllowOverride All\n',
          documentation: 'Разрешает переопределение любых директив через файлы .htaccess',
          range,
        },
        {
          label: 'Options Indexes FollowSymLinks',
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: 'Options Indexes FollowSymLinks\n',
          documentation: 'Включает листинг каталога и следование по символическим ссылкам',
          range,
        },
        {
          label: 'Require all granted',
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: 'Require all granted\n',
          documentation: 'Разрешает доступ всем клиентам к данному каталогу',
          range,
        },
        {
          label: 'DirectoryIndex index.php index.html',
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: 'DirectoryIndex index.php index.html\n',
          documentation: 'Определяет приоритет файлов индекса каталога',
          range,
        },
        {
          label: 'ErrorDocument 404',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'ErrorDocument 404 /404.html\n',
          documentation: 'Настройка страницы ошибки 404 Not Found',
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
        }
      );

      return { suggestions };
    },
  });

  // 2. Hover Provider (Всплывающие подсказки при наведении на директивы, флаги и переменные)
  monaco.languages.registerHoverProvider('apache', {
    provideHover(model, position) {
      const line = model.getLineContent(position.lineNumber);
      const word = model.getWordAtPosition(position);

      const docs: Record<string, string> = {
        rewriteengine: '**RewriteEngine** *(on | off)*\n\nВключает или выключает механизм виртуальной маршрутизации URL mod_rewrite в Apache.',
        rewriterule: '**RewriteRule** *Pattern Substitution [Flags]*\n\nОпределяет правило подстановки URL на основе регулярного выражения.\n- **Pattern**: Regex для сопоставления входящего запроса (например: `^user/([0-9]+)$`).\n- **Substitution**: Целевой файл или путь (например: `profile.php?id=$1`).\n- **Flags**: Модификаторы поведения (например: `[L,QSA]`).',
        rewritecond: '**RewriteCond** *TestString CondPattern [Flags]*\n\nЗадает условие для следующего `RewriteRule`. Поддерживает переменные `%{REQUEST_FILENAME}`, `%{HTTP_HOST}` и системные тесты `!-f`, `!-d`.',
        rewritebase: '**RewriteBase** *URL-path*\n\nБазовый префикс для относительных подстановок в контексте `.htaccess`.',
        virtualhost: '**<VirtualHost [IP|*]:порт>**\n\nКонтейнер изолированной конфигурации сайта/домена.',
        documentroot: '**DocumentRoot** *directory-path*\n\nКорневой каталог в файловой системе для отдачи документов сайта.',
        servername: '**ServerName** *hostname[:port]*\n\nОсновное доменное имя виртуального хоста (например: `vohsahub.local`).',
        serveralias: '**ServerAlias** *host1 host2...*\n\nДополнительные альтернативные доменные имена.',
        allowoverride: '**AllowOverride** *(All | None | Directives...)*\n\nРазрешает или запрещает переопределение настроек через локальные файлы `.htaccess`.',
        options: '**Options** *[+|-]Option...*\n\nВключает дополнительные функции каталога (`Indexes`, `FollowSymLinks`, `ExecCGI`).',
        directory: '**<Directory path>**\n\nБлок применения директив к конкретному каталогу файловой системы.',
        directoryindex: '**DirectoryIndex** *file1 file2...*\n\nЗадает имена файлов, которые сервер ищет при обращении к каталогу (`index.php`, `index.html`).',
        require: '**Require** *(all granted | all denied | user | group)*\n\nУправляет правами доступа клиентов к каталогу.',
        ifmodule: '**<IfModule [!]module.c>**\n\nУсловный блок, выполняемый только если указанный модуль загружен в Apache.',
        errordocument: '**ErrorDocument** *errorCode URL|message*\n\nНастройка страницы или текста ошибки (например: `ErrorDocument 404 /404.html`).',
        customlog: '**CustomLog** *file format*\n\nПуть и формат файла журнала запросов клиентов.',
        errorlog: '**ErrorLog** *file*\n\nПуть к журналу ошибок сервера Apache.',
        header: '**Header** *[condition] action header [value]*\n\nУправление HTTP-заголовками ответа (например: `Header set Access-Control-Allow-Origin "*"`).',
        setenv: '**SetEnv** *var-name value*\n\nУстанавливает внутреннюю переменную окружения сервера.',
        loadmodule: '**LoadModule** *module-name path*\n\nЗагружает динамический модуль Apache (.so / .dll).',
        listen: '**Listen** *[IP:]port*\n\nУказывает порты и сетевые интерфейсы, которые прослушивает сервер.',
        // Флаги
        l: '**Флаг [L]** *(Last Rule)*\n\nПредписывает Apache немедленно прекратить обработку последующих правил `RewriteRule` в текущей итерации, если данное правило сработало.',
        qsa: '**Флаг [QSA]** *(Query String Append)*\n\nОбъединяет исходную строку параметров запроса (Query String, например `?theme=dark`) с новой строкой подстановки (например `profile.php?id=42&theme=dark`). Без этого флага исходные GET-параметры теряются!',
        nc: '**Флаг [NC]** *(No Case)*\n\nДелает сопоставление паттерна регулярного выражения нечувствительным к регистру букв (A-Z эквивалентно a-z).',
        r: '**Флаг [R=301|302]** *(Redirect)*\n\nЗаставляет сервер выполнить внешний HTTP-редирект в браузере клиента вместо внутренней невидимой подстановки.',
        f: '**Флаг [F]** *(Forbidden)*\n\nНемедленно возвращает клиенту ответ HTTP 403 Forbidden.',
        g: '**Флаг [G]** *(Gone)*\n\nВозвращает ответ HTTP 410 Gone (ресурс удален навсегда).',
        pt: '**Флаг [PT]** *(Pass Through)*\n\nПередает преобразованный URI дальше внутренним обработчикам Apache.',
        ne: '**Флаг [NE]** *(No Escape)*\n\nПредотвращает автоматическое URL-экранирование спецсимволов.',
        b: '**Флаг [B]** *(Escape)*\n\nЭкранирует небуквенные символы перед применением подстановки.',
        // Серверные переменные
        request_uri: '**%{REQUEST_URI}**\n\nОтносительный путь запрашиваемого ресурса без хоста (например: `/user/42`).',
        request_filename: '**%{REQUEST_FILENAME}**\n\nАбсолютный путь к целевому файлу в локальной файловой системе сервера.',
        http_host: '**%{HTTP_HOST}**\n\nЗначение HTTP-заголовка Host (доменное имя сайта).',
        query_string: '**%{QUERY_STRING}**\n\nПараметры URL после символа `?` (например: `id=42&theme=dark`).',
        https: '**%{HTTPS}**\n\nСодержит `"on"` при защищенном SSL/TLS соединении, либо `"off"`.',
        remote_addr: '**%{REMOTE_ADDR}**\n\nIP-адрес подключившегося клиента.',
        the_request: '**%{THE_REQUEST}**\n\nПолная строка запроса, полученная от браузера (например: `GET /user/42 HTTP/1.1`).',
      };

      if (word) {
        const w = word.word.toLowerCase();
        if (docs[w]) {
          return {
            contents: [{ value: docs[w] }],
          };
        }
      }

      // Проверка на флаги [L,QSA]
      const flagMatch = line.match(/\[([A-Za-z0-9_=,\s]+)\]/);
      if (flagMatch && position.column >= (line.indexOf('[') + 1) && position.column <= (line.indexOf(']') + 1)) {
        const flagsRaw = flagMatch[1].split(',').map(f => f.trim().toLowerCase());
        const docItems = flagsRaw.map(f => {
          const key = f.split('=')[0];
          return docs[key] ? docs[key] : `**[${f.toUpperCase()}]**: Флаг mod_rewrite`;
        });
        return {
          contents: docItems.map(d => ({ value: d })),
        };
      }

      return null;
    },
  });

  // 3. Signature Help Provider (Подсказки аргументов при наборе директивы в реальном времени)
  monaco.languages.registerSignatureHelpProvider('apache', {
    signatureHelpTriggerCharacters: [' ', ','],
    signatureHelpRetriggerCharacters: [' '],
    provideSignatureHelp(model, position) {
      const line = model.getLineContent(position.lineNumber);
      const textBefore = line.substring(0, position.column - 1);
      const trimmed = textBefore.trimStart();

      if (/^RewriteRule\b/i.test(trimmed)) {
        const parts = trimmed.split(/\s+/);
        let activeParam = Math.max(0, parts.length - 2);
        if (activeParam > 2) activeParam = 2;

        return {
          value: {
            signatures: [
              {
                label: 'RewriteRule Pattern Substitution [Flags]',
                documentation: 'Определяет правило виртуальной маршрутизации URL.',
                parameters: [
                  {
                    label: 'Pattern',
                    documentation: 'Регулярное выражение входящего URL (например: ^user/([0-9]+)$)'
                  },
                  {
                    label: 'Substitution',
                    documentation: 'Путь к целевому файлу или сценарию (например: profile.php?id=$1)'
                  },
                  {
                    label: '[Flags]',
                    documentation: 'Модификаторы поведения в скобках: [L,QSA], [NC,L], [R=301,L]'
                  }
                ],
                activeParameter: activeParam
              }
            ],
            activeSignature: 0,
            activeParameter: activeParam
          },
          dispose: () => {}
        };
      }

      if (/^RewriteCond\b/i.test(trimmed)) {
        const parts = trimmed.split(/\s+/);
        let activeParam = Math.max(0, parts.length - 2);
        if (activeParam > 2) activeParam = 2;

        return {
          value: {
            signatures: [
              {
                label: 'RewriteCond TestString CondPattern [Flags]',
                documentation: 'Задает условие применения для следующего RewriteRule.',
                parameters: [
                  {
                    label: 'TestString',
                    documentation: 'Проверяемая строка или серверная переменная (%{REQUEST_FILENAME})'
                  },
                  {
                    label: 'CondPattern',
                    documentation: 'Шаблон проверки или системный тест: !-f (не файл), !-d (не каталог)'
                  },
                  {
                    label: '[Flags]',
                    documentation: 'Флаги условия: [NC] (No Case), [OR] (логическое ИЛИ)'
                  }
                ],
                activeParameter: activeParam
              }
            ],
            activeSignature: 0,
            activeParameter: activeParam
          },
          dispose: () => {}
        };
      }

      return null;
    }
  });

  // 4. Inlay Hints Provider (Визуальные бейджи аргументов: pattern:, target:, flags:)
  monaco.languages.registerInlayHintsProvider('apache', {
    provideInlayHints(model, range) {
      const hints: monaco.languages.InlayHint[] = [];
      const lineCount = model.getLineCount();
      const startLine = Math.max(1, range.startLineNumber);
      const endLine = Math.min(lineCount, range.endLineNumber);

      for (let lineNum = startLine; lineNum <= endLine; lineNum++) {
        const line = model.getLineContent(lineNum);
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;

        // RewriteRule <pattern> <substitution> [flags]
        const ruleMatch = line.match(/^(\s*)(RewriteRule)\s+([^\s]+)\s+([^\s]+)(?:\s+\[([^\]]+)\])?/i);
        if (ruleMatch) {
          const indentLen = ruleMatch[1].length;
          const directiveLen = ruleMatch[2].length;
          const patStartCol = indentLen + directiveLen + 2;

          hints.push({
            position: { lineNumber: lineNum, column: patStartCol },
            label: 'pattern: ',
            kind: monaco.languages.InlayHintKind.Parameter,
            paddingRight: true,
          });

          const patLen = ruleMatch[3].length;
          const subStartCol = patStartCol + patLen + 1;
          hints.push({
            position: { lineNumber: lineNum, column: subStartCol },
            label: 'target: ',
            kind: monaco.languages.InlayHintKind.Parameter,
            paddingRight: true,
          });

          if (ruleMatch[5] !== undefined) {
            const subLen = ruleMatch[4].length;
            const flagsIndex = line.indexOf('[', subStartCol + subLen);
            if (flagsIndex !== -1) {
              hints.push({
                position: { lineNumber: lineNum, column: flagsIndex + 1 },
                label: 'flags: ',
                kind: monaco.languages.InlayHintKind.Parameter,
                paddingRight: true,
              });
            }
          }
          continue;
        }

        // RewriteCond <test> <cond> [flags]
        const condMatch = line.match(/^(\s*)(RewriteCond)\s+([^\s]+)\s+([^\s]+)(?:\s+\[([^\]]+)\])?/i);
        if (condMatch) {
          const indentLen = condMatch[1].length;
          const directiveLen = condMatch[2].length;
          const testStartCol = indentLen + directiveLen + 2;

          hints.push({
            position: { lineNumber: lineNum, column: testStartCol },
            label: 'test: ',
            kind: monaco.languages.InlayHintKind.Parameter,
            paddingRight: true,
          });

          const testLen = condMatch[3].length;
          const condStartCol = testStartCol + testLen + 1;
          hints.push({
            position: { lineNumber: lineNum, column: condStartCol },
            label: 'cond: ',
            kind: monaco.languages.InlayHintKind.Parameter,
            paddingRight: true,
          });

          if (condMatch[5] !== undefined) {
            const condLen = condMatch[4].length;
            const flagsIndex = line.indexOf('[', condStartCol + condLen);
            if (flagsIndex !== -1) {
              hints.push({
                position: { lineNumber: lineNum, column: flagsIndex + 1 },
                label: 'flags: ',
                kind: monaco.languages.InlayHintKind.Parameter,
                paddingRight: true,
              });
            }
          }
          continue;
        }

        // DocumentRoot "/path"
        const docRootMatch = line.match(/^(\s*)(DocumentRoot)\s+/i);
        if (docRootMatch) {
          const col = docRootMatch[1].length + docRootMatch[2].length + 2;
          hints.push({
            position: { lineNumber: lineNum, column: col },
            label: 'path: ',
            kind: monaco.languages.InlayHintKind.Parameter,
            paddingRight: true,
          });
          continue;
        }

        // ServerName host
        const srvMatch = line.match(/^(\s*)(ServerName)\s+/i);
        if (srvMatch) {
          const col = srvMatch[1].length + srvMatch[2].length + 2;
          hints.push({
            position: { lineNumber: lineNum, column: col },
            label: 'host: ',
            kind: monaco.languages.InlayHintKind.Parameter,
            paddingRight: true,
          });
          continue;
        }
      }

      return { hints, dispose: () => {} };
    },
  });
} catch (apacheErr) {
  console.warn('Apache language registration error:', apacheErr);
}
// =============================================================================
// PHP (.php, .phtml) Language Configuration, Monarch Grammar & Snippets
// =============================================================================

export const phpLanguageConfiguration: monaco.languages.LanguageConfiguration = {
  comments: {
    lineComment: '//',
    blockComment: ['/*', '*/'],
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
    { open: '<', close: '>' },
    { open: '<!--', close: '-->', notIn: ['comment', 'string'] },
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
      start: new RegExp('^\\s*(#|//)\\s*#region\\b'),
      end: new RegExp('^\\s*(#|//)\\s*#endregion\\b'),
    },
  },
};

export const phpMonarchTokensProvider: monaco.languages.IMonarchLanguage = {
  defaultToken: '',
  tokenPostfix: '.php',

  keywords: [
    'abstract', 'and', 'array', 'as', 'break', 'callable', 'case', 'catch', 'class',
    'clone', 'const', 'continue', 'declare', 'default', 'die', 'do', 'echo', 'else',
    'elseif', 'empty', 'enddeclare', 'endfor', 'endforeach', 'endif', 'endswitch',
    'endwhile', 'eval', 'exit', 'extends', 'final', 'finally', 'fn', 'for', 'foreach',
    'function', 'global', 'goto', 'if', 'implements', 'include', 'include_once',
    'instanceof', 'insteadof', 'interface', 'isset', 'list', 'match', 'namespace',
    'new', 'or', 'print', 'private', 'protected', 'public', 'readonly', 'require',
    'require_once', 'return', 'static', 'switch', 'throw', 'trait', 'try', 'unset',
    'use', 'var', 'while', 'xor', 'yield', 'true', 'false', 'null'
  ],

  tokenizer: {
    root: [
      // Doctype
      [/<!DOCTYPE\b[^>]*>/i, 'metatag.html'],

      // PHP Open Tags
      [/<\?php\b/, { token: 'metatag.php', next: '@phpBlock' }],
      [/<\?=\s*/, { token: 'metatag.php', next: '@phpBlock' }],
      [/<\?/, { token: 'metatag.php', next: '@phpBlock' }],

      // HTML comments
      [/<!--/, 'comment.html', '@htmlComment'],

      // HTML tags
      [/<\/?[a-zA-Z0-9_\-]+/, 'tag', '@htmlTagContent'],

      // Raw text outside PHP
      [/[^<]+/, ''],
    ],

    htmlTagContent: [
      [/\/>/, 'delimiter.html', '@pop'],
      [/>/, 'delimiter.html', '@pop'],
      [/<\?php\b/, { token: 'metatag.php', next: '@phpBlock' }],
      [/<\?=\s*/, { token: 'metatag.php', next: '@phpBlock' }],
      [/[a-zA-Z0-9_\-]+/, 'attribute.name'],
      [/=\s*"([^"]*)"/, 'attribute.value'],
      [/=\s*'([^']*)'/, 'attribute.value'],
      [/=\s*([^\s>]+)/, 'attribute.value'],
      [/\s+/, 'white'],
    ],

    htmlComment: [
      [/-->/, 'comment.html', '@pop'],
      [/[^-]+/, 'comment.html'],
      [/[-]/, 'comment.html'],
    ],

    phpBlock: [
      // PHP Close Tag
      [/\?>/, { token: 'metatag.php', next: '@pop' }],

      // Whitespace
      [/\s+/, 'white'],

      // Line comments
      [/(#|\/\/).*$/, 'comment'],

      // Block comments
      [/\/\*/, 'comment', '@phpComment'],

      // Superglobals
      [/\$_(GET|POST|COOKIE|SERVER|ENV|REQUEST|SESSION|FILES)\b/, 'variable.predefined.php'],
      [/\$GLOBALS\b/, 'variable.predefined.php'],

      // Variables ($varName)
      [/\$[a-zA-Z_\x7f-\xff][a-zA-Z0-9_\x7f-\xff]*/, 'variable.php'],

      // Strings
      [/"([^"\\]|\\.)*"/, 'string'],
      [/'([^'\\]|\\.)*'/, 'string'],

      // Numbers
      [/\b\d+(\.\d+)?\b/, 'number'],

      // Function calls
      [/[a-zA-Z_\x7f-\xff][a-zA-Z0-9_\x7f-\xff]*(?=\s*\()/, {
        cases: {
          '@keywords': 'keyword.php',
          '@default': 'function'
        }
      }],

      // Keywords & identifiers
      [/[a-zA-Z_\x7f-\xff][a-zA-Z0-9_\x7f-\xff]*/, {
        cases: {
          '@keywords': 'keyword.php',
          '@default': 'identifier'
        }
      }],

      // Delimiters & operators
      [/[{}()\[\]]/, 'delimiter.bracket'],
      [/[,;:.]/, 'delimiter'],
      [/[+\-*\/%=&|!<>?~^]+/, 'operator'],
    ],

    phpComment: [
      [/\*\//, 'comment', '@pop'],
      [/[^*]+/, 'comment'],
      [/[\*]/, 'comment'],
    ],
  },
};

// Register PHP Language
try {
  monaco.languages.register({
    id: 'php',
    extensions: ['.php', '.phtml', '.php4', '.php5', '.phps'],
    aliases: ['PHP', 'php'],
    mimetypes: ['application/x-php'],
  });
  monaco.languages.setLanguageConfiguration('php', phpLanguageConfiguration);
  monaco.languages.setMonarchTokensProvider('php', phpMonarchTokensProvider);

  monaco.languages.registerCompletionItemProvider('php', {
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
          label: '<?php ... ?>',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: '<?php\n\t${1}\n?>',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Блок PHP кода',
          range,
        },
        {
          label: '<?= ... ?>',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: '<?= htmlspecialchars(${1:$_GET[\'id\']} ?? \'\') ?>',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Короткий вывод с безопасным экранированием htmlspecialchars',
          range,
        },
        {
          label: 'htmlspecialchars',
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: 'htmlspecialchars(${1:$data}, ENT_QUOTES, \'UTF-8\')',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Преобразует специальные символы в HTML-сущности',
          range,
        },
        {
          label: '$_GET',
          kind: monaco.languages.CompletionItemKind.Variable,
          insertText: '$_GET[\'${1:key}\']',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Ассоциативный массив параметров GET-запроса',
          range,
        },
        {
          label: '$_POST',
          kind: monaco.languages.CompletionItemKind.Variable,
          insertText: '$_POST[\'${1:key}\']',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Ассоциативный массив параметров POST-запроса',
          range,
        },
        {
          label: 'echo',
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: 'echo ${1};',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Вывод строки или выражения',
          range,
        },
      ];

      return { suggestions };
    },
  });
} catch (phpErr) {
  console.warn('PHP language registration error:', phpErr);
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
  emmetHTML(monaco, ['html', 'handlebars', 'razor', 'vue', 'php']);
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
    { token: 'metatag.html', foreground: '71717A', fontStyle: 'italic' },
    { token: 'operator', foreground: 'F43F5E' },
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
    { token: 'metatag.php', foreground: 'F43F5E', fontStyle: 'bold' },
    { token: 'variable.predefined.php', foreground: 'FB923C', fontStyle: 'bold' },
    { token: 'variable.php', foreground: 'FB923C' },
    { token: 'keyword.php', foreground: 'FB7185', fontStyle: 'bold' },
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

(window as any).monaco = monaco;
export { monaco };
