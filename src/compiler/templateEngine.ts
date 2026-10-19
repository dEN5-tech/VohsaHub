import { Eta } from 'eta';

export interface CompilationResult {
  success: boolean;
  html?: string;
  renderedBody?: string;
  error?: string;
  errorSource?: 'template' | 'data' | 'css' | 'js';
}

export interface VirtualFile {
  name: string;
  content: string;
}

/**
 * Нормализует относительный путь в файловой системе:
 * e.g., "./style.css" -> "style.css", "/css/style.css" -> "css/style.css"
 */
export function normalizeVirtualPath(path: string): string {
  return path.trim().replace(/^(\.\/|\/)+/, '').replace(/\\/g, '/');
}

/**
 * Находит виртуальный файл по относительному пути
 */
export function findVirtualFile(rawPath: string, files: VirtualFile[]): VirtualFile | undefined {
  const normalized = normalizeVirtualPath(rawPath).toLowerCase();

  // 1. Точное совпадение с нормализованным именем
  let found = files.find((f) => normalizeVirtualPath(f.name).toLowerCase() === normalized);
  if (found) return found;

  // 2. Совпадение по имени файла (basename)
  const baseName = normalized.split('/').pop();
  if (baseName) {
    found = files.find((f) => normalizeVirtualPath(f.name).toLowerCase() === baseName);
    if (found) return found;
  }

  return undefined;
}

function getMimeType(fileName: string): string {
  if (fileName.endsWith('.json')) return 'application/json';
  if (fileName.endsWith('.html') || fileName.endsWith('.htm')) return 'text/html';
  if (fileName.endsWith('.css')) return 'text/css';
  if (fileName.endsWith('.js') || fileName.endsWith('.mjs')) return 'application/javascript';
  if (fileName.endsWith('.svg')) return 'image/svg+xml';
  return 'text/plain';
}

/**
 * Скрипт перехвата консоли и эмуляции Virtual File System (fetch)
 */
function createSandboxBootstrapScript(files: VirtualFile[]): string {
  // Словарь виртуальной файловой системы для эмуляции fetch()
  const vfsMap: Record<string, string> = {};
  files.forEach((f) => {
    const norm = normalizeVirtualPath(f.name).toLowerCase();
    vfsMap[norm] = f.content;
    const base = norm.split('/').pop();
    if (base) vfsMap[base] = f.content;
  });

  // Безопасная сериализация JSON для вставки внутрь тега <script>:
  // Экранируем символы '<', '>', '&', чтобы HTML-парсер никогда не воспринял </script> внутри JSON как закрытие тега
  const safeVfsJson = JSON.stringify(vfsMap)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');

  return `
(function() {
  // 1. Виртуальная файловая система
  window.__VFS__ = ${safeVfsJson};

  // 2. Перехват fetch для относительных путей (эмуляция веб-сервера файловой системы)
  const originalFetch = window.fetch;
  window.fetch = function(input, init) {
    if (typeof input === 'string') {
      const isHttp = input.startsWith('http://') || input.startsWith('https://') || input.startsWith('//') || input.startsWith('data:');
      if (!isHttp) {
        const cleanPath = input.replace(/^(\\.\\/|\\/)+/, '').toLowerCase();
        if (window.__VFS__ && window.__VFS__[cleanPath] !== undefined) {
          const content = window.__VFS__[cleanPath];
          const mime = cleanPath.endsWith('.json') ? 'application/json' : cleanPath.endsWith('.html') ? 'text/html' : cleanPath.endsWith('.css') ? 'text/css' : 'text/plain';
          return Promise.resolve(new Response(content, {
            status: 200,
            statusText: 'OK',
            headers: new Headers({ 'Content-Type': mime })
          }));
        }
      }
    }
    return originalFetch.apply(this, arguments);
  };

  // 3. Перехватчик консоли
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;
  const originalInfo = console.info;

  function serialize(arg) {
    if (typeof arg === 'undefined') return 'undefined';
    if (arg === null) return 'null';
    if (typeof arg === 'object') {
      try {
        return JSON.stringify(arg, null, 2);
      } catch (e) {
        return Object.prototype.toString.call(arg);
      }
    }
    return String(arg);
  }

  function send(level, args) {
    try {
      const messages = Array.from(args).map(serialize);
      window.parent.postMessage({
        type: 'VOHSA_CONSOLE',
        level: level,
        messages: messages,
        timestamp: new Date().toLocaleTimeString()
      }, '*');
    } catch (e) {}
  }

  console.log = function() {
    send('info', arguments);
    originalLog.apply(console, arguments);
  };
  console.warn = function() {
    send('warn', arguments);
    originalWarn.apply(console, arguments);
  };
  console.error = function() {
    send('error', arguments);
    originalError.apply(console, arguments);
  };
  console.info = function() {
    send('info', arguments);
    originalInfo.apply(console, arguments);
  };

  window.addEventListener('error', function(event) {
    send('error', ['[Error] ' + (event.message || 'Unknown error') + (event.filename ? ' at ' + event.filename + ':' + event.lineno : '')]);
  });

  window.addEventListener('unhandledrejection', function(event) {
    send('error', ['[Promise Rejection] ' + (event.reason ? (event.reason.message || event.reason) : 'Unknown')]);
  });

  // 4. Всеобъемлющий перехват кликов по ссылкам <a> в песочнице
  document.addEventListener('click', function(e) {
    var anchor = e.target && e.target.closest ? e.target.closest('a') : null;
    if (!anchor) return;

    var rawHref = anchor.getAttribute('href');
    // Если href отсутствует или пустой ("") - предотвращаем перезагрузку фрейма и прокручиваем наверх
    if (rawHref === null || rawHref === undefined || rawHref.trim() === '') {
      e.preventDefault();
      e.stopPropagation();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      try {
        window.parent.postMessage({
          type: 'VOHSA_ANCHOR_CLICK',
          hash: '',
          href: ''
        }, '*');
      } catch (msgErr) {}
      return;
    }

    var href = rawHref.trim();

    // Служебные протоколы
    if (href.startsWith('javascript:')) return;
    if (href.startsWith('mailto:') || href.startsWith('tel:')) return;

    // Внешние веб-ссылки (открываем в новой вкладке, чтобы не ломать песочницу)
    if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('//')) {
      e.preventDefault();
      try {
        window.open(href, '_blank', 'noopener,noreferrer');
      } catch (openErr) {}
      return;
    }

    // ЛЮБАЯ внутренняя ссылка или якорь перехватывается, чтобы исключить 404 перезагрузку iframe!
    e.preventDefault();
    e.stopPropagation();

    var hashIndex = href.indexOf('#');
    var targetPath = hashIndex !== -1 ? href.substring(0, hashIndex).replace(/^(\.\/|\/)+/, '') : href.replace(/^(\.\/|\/)+/, '');
    var hash = hashIndex !== -1 ? href.substring(hashIndex + 1) : '';

    var currentPath = window.location.pathname.split('/').pop() || 'index.html';
    var isCurrentDoc = !targetPath || targetPath === '' || targetPath === 'index.html' || targetPath.toLowerCase() === currentPath.toLowerCase();

    // 1. Полноценный якорный хэштег (#id, index.html#id или #)
    if (hashIndex !== -1 && isCurrentDoc) {
      if (!hash || hash === '') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        try {
          history.pushState(null, '', '#');
        } catch (err) {}
      } else {
        var targetEl = document.getElementById(hash);
        if (!targetEl) {
          try {
            targetEl = document.querySelector('[name="' + CSS.escape(hash) + '"]') ||
                       document.querySelector('#' + CSS.escape(hash));
          } catch (selErr) {
            targetEl = null;
          }
        }

        if (targetEl) {
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          try {
            history.pushState(null, '', '#' + hash);
          } catch (err) {}

          var prevOutline = targetEl.style.outline;
          var prevTransition = targetEl.style.transition;
          targetEl.style.transition = 'outline 0.25s ease-in-out';
          targetEl.style.outline = '2px solid rgba(56, 189, 248, 0.9)';
          setTimeout(function() {
            targetEl.style.outline = prevOutline;
            targetEl.style.transition = prevTransition;
          }, 1400);
        } else {
          console.warn('[VohsaHub] Элемент с якорем #' + hash + ' не найден на странице.');
        }
      }

      try {
        window.parent.postMessage({
          type: 'VOHSA_ANCHOR_CLICK',
          hash: hash || '',
          href: href
        }, '*');
      } catch (msgErr) {}
      return;
    }

    // 2. Ссылка без решетки, но совпадающая с id элемента (например href="smile" для <section id="smile">)
    // Студенты часто забывают символ '#' при создании якорных ссылок!
    var directElem = document.getElementById(href);
    if (!directElem) {
      try {
        directElem = document.querySelector('[name="' + CSS.escape(href) + '"]') ||
                     document.querySelector('#' + CSS.escape(href));
      } catch (e) {
        directElem = null;
      }
    }

    if (directElem) {
      directElem.scrollIntoView({ behavior: 'smooth', block: 'start' });
      try {
        history.pushState(null, '', '#' + href);
      } catch (err) {}

      var origOutline = directElem.style.outline;
      var origTransition = directElem.style.transition;
      directElem.style.transition = 'outline 0.25s ease-in-out';
      directElem.style.outline = '2px solid rgba(56, 189, 248, 0.9)';
      setTimeout(function() {
        directElem.style.outline = origOutline;
        directElem.style.transition = origTransition;
      }, 1400);

      console.warn('[VohsaHub] Переход к секции #' + href + '. Подсказка: для создания якорной ссылки добавьте символ "#": <a href="#' + href + '">');

      try {
        window.parent.postMessage({
          type: 'VOHSA_ANCHOR_CLICK',
          hash: href,
          href: href
        }, '*');
      } catch (msgErr) {}
      return;
    }

    // 3. Ссылка на другой файл в виртуальной файловой системе VFS (например href="about.html")
    var cleanVirtual = href.split('#')[0].replace(/^(\.\/|\/)+/, '').toLowerCase();
    if (window.__VFS__ && (window.__VFS__[cleanVirtual] !== undefined || window.__VFS__[cleanVirtual.split('/').pop()] !== undefined)) {
      try {
        window.parent.postMessage({
          type: 'VOHSA_VFS_NAVIGATE',
          file: cleanVirtual,
          hash: hash || ''
        }, '*');
      } catch (msgErr) {}
      return;
    }

    // 4. Если ссылка никуда не ведет - выводим подсказку и безопасно остаемся на месте
    console.warn('[VohsaHub] Ссылка "' + href + '" не найдена. Если это якорь к секции, добавьте символ "#": <a href="#' + href + '">');
  }, true);

  function scrollToCurrentHash() {
    var rawHash = window.location.hash ? window.location.hash.substring(1) : '';
    if (!rawHash) return;
    try {
      var target = document.getElementById(rawHash) || document.querySelector('[name="' + CSS.escape(rawHash) + '"]');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } catch (e) {}
  }
  window.addEventListener('hashchange', scrollToCurrentHash);
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(scrollToCurrentHash, 100);
  } else {
    document.addEventListener('DOMContentLoaded', function() {
      setTimeout(scrollToCurrentHash, 100);
    });
  }
})();
`;
}

/**
 * Разрешает относительные пути в HTML (link href, script src) через виртуальные файлы
 */
function resolveHtmlRelativePaths(
  html: string,
  files: VirtualFile[]
): { resolvedHtml: string; linkedCssFiles: Set<string>; linkedJsFiles: Set<string> } {
  let resolvedHtml = html;
  const linkedCssFiles = new Set<string>();
  const linkedJsFiles = new Set<string>();

  // 1. Разрешаем <link rel="stylesheet" href="...">
  // Ищем теги <link> со стилями
  const linkRegex = /<link\s+([^>]*?)>/gi;
  resolvedHtml = resolvedHtml.replace(linkRegex, (fullMatch, attrsString) => {
    const isStylesheet = /rel=["']stylesheet["']/i.test(attrsString);
    if (!isStylesheet) return fullMatch;

    const hrefMatch = attrsString.match(/href=["']([^"']+)["']/i);
    if (!hrefMatch) return fullMatch;

    const href = hrefMatch[1];
    // Пропускаем внешние CDN URL
    if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('//') || href.startsWith('data:')) {
      return fullMatch;
    }

    const matched = findVirtualFile(href, files);
    if (matched) {
      linkedCssFiles.add(matched.name);
      const safeCss = matched.content.replace(/<\/style/gi, '<\\/style');
      return `<style data-vfs-href="${href}" data-vfs-file="${matched.name}">\n/* [VFS: ${matched.name}] */\n${safeCss}\n</style>`;
    } else {
      return `<!-- [VFS 404] Не найден файл стилей: "${href}" -->\n<script>console.warn('[VFS 404] Файл стилей не найден: "${href}"');<\/script>`;
    }
  });

  // 2. Разрешаем <script src="...">
  const scriptRegex = /<script\s+([^>]*?)src=["']([^"']+)["']([^>]*?)>\s*<\/script>/gi;
  resolvedHtml = resolvedHtml.replace(scriptRegex, (fullMatch, before, src, after) => {
    // Пропускаем внешние CDN URL
    if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('//') || src.startsWith('data:')) {
      return fullMatch;
    }

    const matched = findVirtualFile(src, files);
    if (matched) {
      linkedJsFiles.add(matched.name);
      const safeJs = matched.content.replace(/<\/script/gi, '<\\/script');

      // Полностью библиотечно-независимая обработка: сохраняем все атрибуты тега (type="module", type="text/babel", async и т.д.)
      const rawAttrs = `${before} ${after}`.trim().replace(/\s+/g, ' ');
      const isCustomType = /type=["']/i.test(rawAttrs) && !/type=["'](text\/javascript|application\/javascript)["']/i.test(rawAttrs);
      const attrsPrefix = rawAttrs ? `${rawAttrs} ` : '';

      if (isCustomType) {
        return `<script ${attrsPrefix}data-vfs-src="${src}" data-vfs-file="${matched.name}">\n/* [VFS: ${matched.name}] */\n${safeJs}\n<\/script>`;
      }
      return `<script ${attrsPrefix}data-vfs-src="${src}" data-vfs-file="${matched.name}">\n/* [VFS: ${matched.name}] */\ntry {\n${safeJs}\n} catch (err) {\nconsole.error('[Script Error in ' + "${matched.name}" + ']', err.message || err);\n}\n<\/script>`;
    } else {
      return `<!-- [VFS 404] Не найден файл скрипта: "${src}" -->\n<script>console.warn('[VFS 404] Файл скрипта не найден: "${src}"');<\/script>`;
    }
  });

  return { resolvedHtml, linkedCssFiles, linkedJsFiles };
}

/**
 * Создает инъекцию Vue 3 SFC Loader через esm.sh в виде ES-модуля
 */
function createVueSfcBootstrapScript(): string {
  return `
<!-- [Vue 3 SFC Loader via esm.sh] -->
<script type="module">
(async function() {
  try {
    // 1. Загрузка Vue 3 через esm.sh (с fallback на jsdelivr)
    let Vue;
    try {
      const vueModule = await import('https://esm.sh/vue@3');
      Vue = vueModule.default && vueModule.createApp ? vueModule : (vueModule.default || vueModule);
    } catch (e1) {
      console.warn('[VohsaHub] Загрузка Vue 3 с esm.sh не удалась, пробуем fallback...', e1);
      const vueModule = await import('https://cdn.jsdelivr.net/npm/vue@3/dist/vue.esm-browser.prod.js');
      Vue = vueModule.default || vueModule;
    }

    if (!Vue) {
      throw new Error('Не удалось загрузить библиотеку Vue 3');
    }
    window.Vue = Vue;

    // 2. Загрузка vue3-sfc-loader
    let sfcLoaderModule;
    try {
      sfcLoaderModule = await import('https://esm.sh/vue3-sfc-loader@0.8.4');
    } catch (e2) {
      console.warn('[VohsaHub] Загрузка vue3-sfc-loader с esm.sh не удалась, пробуем fallback...', e2);
      sfcLoaderModule = await import('https://cdn.jsdelivr.net/npm/vue3-sfc-loader@0.8.4/dist/vue3-sfc-loader.esm.js');
    }

    const loadModule = sfcLoaderModule.loadModule || sfcLoaderModule.default?.loadModule || sfcLoaderModule.default;
    if (typeof loadModule !== 'function') {
      throw new Error('vue3-sfc-loader не предоставил функцию loadModule');
    }

    // 3. Конфигурация для загрузки SFC из виртуальной памяти редактора
    const options = {
      moduleCache: {
        vue: Vue
      },
      async getFile(url) {
        const clean = url.replace(/^(\\.\\/|\\/)+/, '');
        const low = clean.toLowerCase();
        if (window.__VFS__) {
          if (window.__VFS__[clean] !== undefined) return window.__VFS__[clean];
          if (window.__VFS__[low] !== undefined) return window.__VFS__[low];
        }
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to load ' + url);
        return await res.text();
      },
      addStyle(textContent) {
        const style = document.createElement('style');
        style.textContent = textContent;
        const ref = document.head.getElementsByTagName('style')[0] || null;
        document.head.insertBefore(style, ref);
      },
      log(type, ...args) {
        console[type](...args);
      }
    };

    window.__loadVueComponent = function(name) {
      return loadModule(name, options);
    };

    // 4. Поиск главного .vue компонента и монтирование в #app
    function mountApp() {
      const appEl = document.getElementById('app');
      if (!appEl || !window.__VFS__) return;

      let mainVue = null;
      for (const key of Object.keys(window.__VFS__)) {
        if (key.toLowerCase() === 'app.vue') {
          mainVue = key;
          break;
        }
      }
      if (!mainVue) {
        for (const key of Object.keys(window.__VFS__)) {
          if (key.endsWith('.vue')) {
            mainVue = key;
            break;
          }
        }
      }

      if (mainVue) {
        loadModule(mainVue, options)
          .then(function(Comp) {
            const createAppFn = Vue.createApp || Vue.default?.createApp;
            if (createAppFn) {
              createAppFn(Comp).mount('#app');
            } else {
              console.error('[Vue 3 Error] Vue.createApp не найден в экспортах Vue');
            }
          })
          .catch(function(err) {
            console.error('[Vue 3 SFC Compile Error in ' + mainVue + ']', err.message || err);
          });
      }
    }

    if (document.readyState === 'loading') {
      window.addEventListener('DOMContentLoaded', mountApp);
    } else {
      mountApp();
    }
  } catch (err) {
    console.error('[Vue 3 Loader Boot Error]', err.message || err);
  }
})();
<\/script>
`;
}

/**
 * Компилирует виртуальную файловую систему в единый запускной документ
 */
export function compileSandboxBundle(files: VirtualFile[]): CompilationResult {
  const eta = new Eta({
    useWith: true,
    autoEscape: false,
  });

  // Если файлов в проекте нет (чистый пустой редактор)
  if (files.length === 0) {
    return {
      success: true,
      html: '',
    };
  }

  const hasVueFiles = files.some((f) => f.name.endsWith('.vue'));

  // 1. Находим входной HTML файл (index.html)
  let entryTemplateFile = files.find((f) => f.name === 'index.html' || f.name === 'template.html' || f.name === 'index.eta');
  if (!entryTemplateFile) {
    entryTemplateFile = files.find((f) => f.name.endsWith('.html') || f.name.endsWith('.eta'));
  }

  // Если есть .vue файлы, но нет index.html — синтезируем стандартный входной файл с монтированием в #app
  if (!entryTemplateFile && hasVueFiles) {
    entryTemplateFile = {
      name: 'index.html',
      content: `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vue 3 App</title>
</head>
<body>
  <div id="app"></div>
</body>
</html>`,
    };
  }

  if (!entryTemplateFile) {
    return {
      success: false,
      error: 'Нет входного HTML файла. Создайте файл index.html в файловой системе.',
      errorSource: 'template',
    };
  }

  // 2. Парсим data.json (если есть)
  const isTaskFile = (n: string) => {
    const l = n.toLowerCase();
    return l === 'task.json' || l === 'tasks.json' || l === 'sololearn.json' || l.endsWith('.task.json') || l.endsWith('.sololearn.json');
  };
  const jsonFile = files.find((f) => f.name === 'data.json') || files.find((f) => f.name.endsWith('.json') && !isTaskFile(f.name));
  let parsedData: any = {};
  if (jsonFile && jsonFile.content.trim()) {
    try {
      parsedData = JSON.parse(jsonFile.content);
    } catch (err: any) {
      return {
        success: false,
        error: `Ошибка синтаксиса в ${jsonFile.name}: ${err.message}`,
        errorSource: 'data',
      };
    }
  }

  // 3. Регистрируем все шаблоны как partials для include
  for (const file of files) {
    if (file.name.endsWith('.eta') || file.name.endsWith('.html')) {
      const baseName = file.name.replace(/\.(eta|html)$/, '');
      try {
        eta.loadTemplate(`@${file.name}`, file.content);
        eta.loadTemplate(`@${baseName}`, file.content);
        eta.loadTemplate(file.name, file.content);
        eta.loadTemplate(baseName, file.content);
        eta.loadTemplate(`./${file.name}`, file.content);
        eta.loadTemplate(`./${baseName}`, file.content);
      } catch (err: any) {
        return {
          success: false,
          error: `Ошибка регистрации шаблона ${file.name}: ${err.message}`,
          errorSource: 'template',
        };
      }
    }
  }

  // 4. Рендерим HTML
  let rawRendered = '';
  try {
    rawRendered = eta.renderString(entryTemplateFile.content, parsedData) || '';
  } catch (err: any) {
    return {
      success: false,
      error: `Ошибка в ${entryTemplateFile.name}: ${err.message}`,
      errorSource: 'template',
    };
  }

  // 5. Разрешаем относительные пути (link href, script src) в виртуальной файловой системе
  const { resolvedHtml, linkedCssFiles, linkedJsFiles } = resolveHtmlRelativePaths(rawRendered, files);

  // 6. Любые не привязанные явным <link> или <script> файлы CSS/JS (для обратной совместимости)
  const unlinkedCss = files
    .filter((f) => f.name.endsWith('.css') && !linkedCssFiles.has(f.name))
    .map((f) => `/* [Auto-injected: ${f.name}] */\n${f.content.replace(/<\/style/gi, '<\\/style')}`)
    .join('\n\n');

  const unlinkedJs = files
    .filter((f) => (f.name.endsWith('.js') || f.name.endsWith('.ts')) && !linkedJsFiles.has(f.name))
    .map((f) => `/* [Auto-injected: ${f.name}] */\ntry {\n${f.content.replace(/<\/script/gi, '<\\/script')}\n} catch(e) { console.error(e); }`)
    .join('\n\n');

  const bootstrapScript = `<script>${createSandboxBootstrapScript(files)}<\/script>`;
  const vueSfcScript = hasVueFiles ? createVueSfcBootstrapScript() : '';
  const isFullDoc = /<!DOCTYPE html/i.test(resolvedHtml) || /<html[\s>]/i.test(resolvedHtml);

  let finalHtml = '';

  if (isFullDoc) {
    let doc = resolvedHtml;

    // Вставляем bootstrap script, unlinked CSS и Vue SFC loader в head
    const headExtra = `\n  ${bootstrapScript}${vueSfcScript}${unlinkedCss ? `\n  <style data-vfs-auto="true">\n${unlinkedCss}\n  </style>` : ''}\n`;
    if (/<head[\s>]/i.test(doc)) {
      doc = doc.replace(/<head[\s>]/i, (m) => `${m}${headExtra}`);
    } else {
      doc = headExtra + doc;
    }

    // Если есть .vue файлы, но в разметке забыли <div id="app">, аккуратно добавляем его в начало body
    if (hasVueFiles && !/id=["']app["']/i.test(doc)) {
      if (/<body[\s>]/i.test(doc)) {
        doc = doc.replace(/<body[\s>]/i, (m) => `${m}\n  <div id="app"></div>`);
      } else {
        doc = `<div id="app"></div>\n` + doc;
      }
    }

    // Вставляем unlinked JS перед закрывающим </body>
    if (unlinkedJs) {
      const jsBlock = `${unlinkedJs ? `\n  <script data-vfs-auto="true">\n${unlinkedJs}\n  <\/script>\n` : ''}`;
      if (/<\/body>/i.test(doc)) {
        doc = doc.replace(/<\/body>/i, () => `${jsBlock}</body>`);
      } else {
        doc = doc + jsBlock;
      }
    }

    finalHtml = doc;
  } else {
    // Если передан только фрагмент HTML, оборачиваем в стандартную HTML5 оболочку
    finalHtml = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${bootstrapScript}
  ${vueSfcScript}
  ${unlinkedCss ? `<style data-vfs-auto="true">\n${unlinkedCss}\n</style>` : ''}
</head>
<body>
  ${hasVueFiles && !/id=["']app["']/i.test(resolvedHtml) ? '<div id="app"></div>' : ''}
  <div id="root">
    ${resolvedHtml}
  </div>
  ${unlinkedJs ? `<script data-vfs-auto="true">\n${unlinkedJs}\n<\/script>` : ''}
</body>
</html>`;
  }

  return {
    success: true,
    html: finalHtml,
    renderedBody: resolvedHtml,
  };
}

/**
 * Собирает итоговый автономный HTML файл для экспорта
 */
export function buildProductionStandaloneHtml(files: VirtualFile[], title: string = 'Проект'): string {
  const result = compileSandboxBundle(files);
  return result.html || `<!-- Ошибка сборки -->\n${result.error}`;
}
