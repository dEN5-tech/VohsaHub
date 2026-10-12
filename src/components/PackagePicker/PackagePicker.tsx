import { useState, useMemo } from 'preact/hooks';
import {
  Package,
  Plus,
  Trash2,
  Copy,
  Check,
  Search,
  Sparkles,
  ExternalLink,
  Zap,
} from 'lucide-preact';
import type { VirtualFile } from '../../compiler/templateEngine';

export interface PackagePickerProps {
  files: VirtualFile[];
  width?: number;
  onUpdateFile: (fileName: string, content: string) => void;
  onCreateFile: (name: string) => void;
  onSelectFile: (fileName: string) => void;
}

interface PopularLib {
  name: string;
  pkg: string;
  desc: string;
  category: 'vue' | 'ui' | 'util' | 'css';
  icon: string;
  url?: string;
  isSpecialVueTemplate?: boolean;
}

const POPULAR_LIBRARIES: PopularLib[] = [
  {
    name: 'Vue 3 Core',
    pkg: 'vue',
    desc: 'Реактивный прогрессивный фреймворк',
    category: 'vue',
    icon: '💚',
    url: 'https://esm.sh/vue@3/dist/vue.esm-browser.js',
  },
  {
    name: 'Vue 3 SFC Loader',
    pkg: 'vue3-sfc-loader',
    desc: 'Запуск .vue файлов прямо в браузере без сборщика',
    category: 'vue',
    icon: '⚡',
    url: 'https://esm.sh/vue3-sfc-loader@0.8.4',
  },
  {
    name: 'Pinia (Vue 3 Store)',
    pkg: 'pinia',
    desc: 'Официальный легковесный стейт-менеджер для Vue 3',
    category: 'vue',
    icon: '🍍',
    url: 'https://esm.sh/pinia@2.1.7?deps=vue@3',
  },
  {
    name: 'Vue Router 4',
    pkg: 'vue-router',
    desc: 'Маршрутизация для Vue 3 приложений',
    category: 'vue',
    icon: '🧭',
    url: 'https://esm.sh/vue-router@4.3.0?deps=vue@3',
  },
  {
    name: 'Canvas Confetti',
    pkg: 'canvas-confetti',
    desc: 'Праздничные салюты и конфетти в один вызов функции',
    category: 'ui',
    icon: '🎉',
    url: 'https://esm.sh/canvas-confetti@1.9.4',
  },
  {
    name: 'Lucide Icons',
    pkg: 'lucide',
    desc: 'Красивый набор векторных иконок для веба',
    category: 'ui',
    icon: '✨',
    url: 'https://esm.sh/lucide@latest',
  },
  {
    name: 'Tailwind CSS (CDN)',
    pkg: 'tailwindcss',
    desc: 'Утилитарный CSS фреймворк прямо через CDN',
    category: 'css',
    icon: '🌊',
    url: 'https://cdn.tailwindcss.com',
  },
  {
    name: 'Three.js',
    pkg: 'three',
    desc: 'Популярная библиотека для 3D графики и WebGL',
    category: 'util',
    icon: '🎮',
    url: 'https://esm.sh/three@0.164.1',
  },
  {
    name: 'GSAP',
    pkg: 'gsap',
    desc: 'Высокопроизводительные анимации интерфейса',
    category: 'ui',
    icon: '🚀',
    url: 'https://esm.sh/gsap@3.12.5',
  },
  {
    name: 'Chart.js',
    pkg: 'chart.js',
    desc: 'Интерактивные графики и диаграммы для HTML5 Canvas',
    category: 'util',
    icon: '📊',
    url: 'https://esm.sh/chart.js@auto',
  },
  {
    name: 'Lodash ES',
    pkg: 'lodash-es',
    desc: 'Коллекция вспомогательных функций для JavaScript',
    category: 'util',
    icon: '🛠',
    url: 'https://esm.sh/lodash-es@4.17.21',
  },
  {
    name: 'Day.js',
    pkg: 'dayjs',
    desc: 'Ультралегкая библиотека для работы со временем и датами',
    category: 'util',
    icon: '⏰',
    url: 'https://esm.sh/dayjs@1.11.11',
  },
  {
    name: 'Axios',
    pkg: 'axios',
    desc: 'HTTP клиент на базе Promise для запросов к API',
    category: 'util',
    icon: '📡',
    url: 'https://esm.sh/axios@1.6.8',
  },
];

const DEFAULT_VUE_SFC_TEMPLATE = `<template>
  <div class="vue-card">
    <div class="vue-badge">Vue 3 Single File Component</div>
    <h1>{{ title }}</h1>
    <p class="subtitle">Работает прямо в браузере через esm.sh!</p>

    <div class="counter-box">
      <button @click="decrement" class="btn-ctrl">-</button>
      <span class="count-value">{{ count }}</span>
      <button @click="increment" class="btn-ctrl">+</button>
    </div>

    <div class="input-wrap">
      <label>Изменить заголовок реактивно:</label>
      <input v-model="title" placeholder="Введите текст..." />
    </div>

    <div class="chips-row">
      <span v-for="tag in tags" :key="tag" class="chip">#{{ tag }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const title = ref('Привет, Vue 3 в VohsaHub! 💚');
const count = ref(5);
const tags = ref(['vue3', 'sfc', 'esm.sh', 'vite', 'sandbox']);

function increment() {
  count.value++;
}

function decrement() {
  if (count.value > 0) count.value--;
}
</script>

<style scoped>
.vue-card {
  font-family: system-ui, -apple-system, sans-serif;
  max-width: 520px;
  margin: 36px auto;
  padding: 28px;
  background-color: #1e293b;
  border-radius: 16px;
  border: 1px solid #334155;
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.4);
  color: #f8fafc;
  text-align: center;
}

.vue-badge {
  display: inline-block;
  background: rgba(66, 184, 131, 0.2);
  color: #42b883;
  border: 1px solid rgba(66, 184, 131, 0.4);
  font-size: 0.75rem;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 20px;
  margin-bottom: 14px;
}

h1 {
  font-size: 1.4rem;
  color: #38bdf8;
  margin-bottom: 6px;
}

.subtitle {
  font-size: 0.85rem;
  color: #94a3b8;
  margin-bottom: 20px;
}

.counter-box {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-bottom: 24px;
}

.btn-ctrl {
  width: 44px;
  height: 44px;
  background-color: #42b883;
  color: #0f172a;
  border: none;
  border-radius: 10px;
  font-size: 1.4rem;
  font-weight: bold;
  cursor: pointer;
  transition: transform 0.15s, background-color 0.15s;
}

.btn-ctrl:hover {
  background-color: #34a973;
  transform: scale(1.06);
}

.count-value {
  font-size: 2rem;
  font-weight: 800;
  min-width: 48px;
  color: #f8fafc;
}

.input-wrap {
  text-align: left;
  margin-bottom: 20px;
}

.input-wrap label {
  display: block;
  font-size: 0.8rem;
  color: #94a3b8;
  margin-bottom: 6px;
}

input {
  width: 100%;
  padding: 10px 14px;
  background-color: #090d16;
  border: 1px solid #334155;
  border-radius: 8px;
  color: #f8fafc;
  font-size: 0.9rem;
  box-sizing: border-box;
}

input:focus {
  outline: none;
  border-color: #42b883;
}

.chips-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
}

.chip {
  background-color: #334155;
  color: #94a3b8;
  font-size: 0.75rem;
  padding: 4px 8px;
  border-radius: 6px;
}
</style>
`;

/**
 * Извлекает установленные пакеты из <script type="importmap"> в index.html
 */
function extractImportMap(html: string): Record<string, string> {
  const match = html.match(/<script\s+type=["']importmap["'][^>]*>([\s\S]*?)<\/script>/i);
  if (!match) return {};
  try {
    const parsed = JSON.parse(match[1]);
    return parsed.imports || {};
  } catch {
    return {};
  }
}

/**
 * Добавляет или обновляет пакет в <script type="importmap"> внутри index.html
 */
function injectPackageIntoHtml(html: string, pkgName: string, esmUrl: string): string {
  const cleanPkg = pkgName.trim();
  const importMapRegex = /<script\s+type=["']importmap["'][^>]*>([\s\S]*?)<\/script>/i;
  const match = html.match(importMapRegex);

  let importsMap: Record<string, string> = {};

  if (match) {
    try {
      const parsed = JSON.parse(match[1]);
      importsMap = parsed.imports || {};
    } catch {
      importsMap = {};
    }
  }

  importsMap[cleanPkg] = esmUrl;

  const newImportMapScript = `<script type="importmap">\n${JSON.stringify({ imports: importsMap }, null, 2)}\n<\/script>`;

  if (match) {
    return html.replace(importMapRegex, newImportMapScript);
  }

  // Если importmap еще нет, вставляем его в <head> или в начало документа
  if (/<head[\s>]/i.test(html)) {
    return html.replace(/<head[\s>]/i, (m) => `${m}\n  ${newImportMapScript}`);
  }

  return `${newImportMapScript}\n${html}`;
}

/**
 * Удаляет пакет из <script type="importmap">
 */
function removePackageFromHtml(html: string, pkgName: string): string {
  const importMapRegex = /<script\s+type=["']importmap["'][^>]*>([\s\S]*?)<\/script>/i;
  const match = html.match(importMapRegex);
  if (!match) return html;

  try {
    const parsed = JSON.parse(match[1]);
    const imports = parsed.imports || {};
    delete imports[pkgName];

    if (Object.keys(imports).length === 0) {
      return html.replace(importMapRegex, '');
    }

    const newScript = `<script type="importmap">\n${JSON.stringify({ imports }, null, 2)}\n<\/script>`;
    return html.replace(importMapRegex, newScript);
  } catch {
    return html;
  }
}

export function PackagePicker({
  files,
  width,
  onUpdateFile,
  onCreateFile,
  onSelectFile,
}: PackagePickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedPkg, setCopiedPkg] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<'all' | 'vue' | 'ui' | 'util' | 'css'>('all');

  const indexHtmlFile = useMemo(() => {
    return files.find((f) => f.name === 'index.html' || f.name.endsWith('.html'));
  }, [files]);

  const installedImports = useMemo(() => {
    if (!indexHtmlFile) return {};
    return extractImportMap(indexHtmlFile.content);
  }, [indexHtmlFile]);

  const installedList = Object.entries(installedImports);

  const handleInstallPackage = (pkgName: string, customUrl?: string) => {
    const targetUrl = customUrl || `https://esm.sh/${pkgName}`;

    // Если это tailwindcdn — добавляем как внешний скрипт
    if (pkgName === 'tailwindcss') {
      const scriptTag = `<script src="https://cdn.tailwindcss.com"><\/script>`;
      if (indexHtmlFile) {
        if (!indexHtmlFile.content.includes('cdn.tailwindcss.com')) {
          const updated = indexHtmlFile.content.replace(/<head[\s>]/i, (m) => `${m}\n  ${scriptTag}`);
          onUpdateFile(indexHtmlFile.name, updated);
        }
      } else {
        onCreateFile('index.html');
        onUpdateFile('index.html', `<!DOCTYPE html>\n<html>\n<head>\n  ${scriptTag}\n</head>\n<body>\n  <h1 class="text-2xl font-bold text-blue-500">Hello Tailwind!</h1>\n</body>\n</html>`);
      }
      return;
    }

    if (indexHtmlFile) {
      const updated = injectPackageIntoHtml(indexHtmlFile.content, pkgName, targetUrl);
      onUpdateFile(indexHtmlFile.name, updated);
    } else {
      onCreateFile('index.html');
      const initialHtml = `<!DOCTYPE html>\n<html lang="ru">\n<head>\n  <meta charset="UTF-8">\n</head>\n<body>\n  <div id="app"></div>\n</body>\n</html>`;
      const updated = injectPackageIntoHtml(initialHtml, pkgName, targetUrl);
      onUpdateFile('index.html', updated);
    }
  };

  const handleUninstallPackage = (pkgName: string) => {
    if (!indexHtmlFile) return;
    const updated = removePackageFromHtml(indexHtmlFile.content, pkgName);
    onUpdateFile(indexHtmlFile.name, updated);
  };

  const handleCopyImportSnippet = (pkgName: string) => {
    const snippet = `import { } from '${pkgName}';`;
    navigator.clipboard.writeText(snippet);
    setCopiedPkg(pkgName);
    setTimeout(() => setCopiedPkg(null), 2000);
  };

  const handleCreateVueStarter = () => {
    // 1. Создаем App.vue, если его нет
    const existingVue = files.find((f) => f.name.toLowerCase() === 'app.vue');
    if (!existingVue) {
      onCreateFile('App.vue');
      onUpdateFile('App.vue', DEFAULT_VUE_SFC_TEMPLATE);
    }

    // 2. Добавляем vue в importmap в index.html
    handleInstallPackage('vue', 'https://esm.sh/vue@3/dist/vue.esm-browser.js');

    // 3. Убеждаемся, что в index.html есть <div id="app"></div>
    if (indexHtmlFile) {
      if (!/id=["']app["']/i.test(indexHtmlFile.content)) {
        let updated = indexHtmlFile.content;
        if (/<body[\s>]/i.test(updated)) {
          updated = updated.replace(/<body[\s>]/i, (m) => `${m}\n  <div id="app"></div>`);
        } else {
          updated += `\n<div id="app"></div>`;
        }
        onUpdateFile(indexHtmlFile.name, updated);
      }
    }

    onSelectFile('App.vue');
  };

  const filteredLibraries = useMemo(() => {
    let list = POPULAR_LIBRARIES;
    if (activeCategory !== 'all') {
      list = list.filter((l) => l.category === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((l) => l.name.toLowerCase().includes(q) || l.pkg.toLowerCase().includes(q) || l.desc.toLowerCase().includes(q));
    }
    return list;
  }, [searchQuery, activeCategory]);

  return (
    <aside class="vscode-explorer" style={width ? { width: `${width}px` } : undefined}>
      <div class="explorer-header">
        <span class="explorer-title">БИБЛИОТЕКИ (ESM.SH)</span>
      </div>

      <div style={{ padding: '10px 12px', borderBottom: '1px solid #27272a' }}>
        {/* Поисковая строка для ввода любого пакета */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={13} style={{ position: 'absolute', left: '8px', top: '9px', color: '#71717a' }} />
            <input
              type="text"
              placeholder="npm пакет (напр. vue@3, axios, confetti...)"
              value={searchQuery}
              onInput={(e) => setSearchQuery((e.target as HTMLInputElement).value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchQuery.trim()) {
                  handleInstallPackage(searchQuery.trim());
                  setSearchQuery('');
                }
              }}
              style={{
                width: '100%',
                padding: '6px 8px 6px 26px',
                background: '#090d16',
                border: '1px solid #334155',
                borderRadius: '4px',
                color: '#f8fafc',
                fontSize: '0.8rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
          {searchQuery.trim() && (
            <button
              class="chakra-button chakra-button--xs chakra-button--solid-teal"
              onClick={() => {
                handleInstallPackage(searchQuery.trim());
                setSearchQuery('');
              }}
              title="Установить пакет в importmap"
            >
              <Plus size={14} />
            </button>
          )}
        </div>

        {/* Быстрая кнопка создания шаблона Vue 3 SFC */}
        <button
          class="chakra-button chakra-button--xs chakra-button--solid-teal"
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: '#42b883', color: '#0f172a', fontWeight: 'bold' }}
          onClick={handleCreateVueStarter}
          title="Создать App.vue и настроить окружение Vue 3"
        >
          <Sparkles size={13} />
          <span>Создать Vue 3 компонент (App.vue)</span>
        </button>
      </div>

      {/* Установленные пакеты в проекте */}
      {installedList.length > 0 && (
        <div style={{ padding: '8px 12px', borderBottom: '1px solid #27272a', background: 'rgba(20, 184, 166, 0.05)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#14b8a6', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Package size={12} />
            <span>УСТАНОВЛЕНО В IMPORTMAP ({installedList.length}):</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {installedList.map(([pkg, url]) => (
              <div
                key={pkg}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '4px 6px',
                  background: '#090d16',
                  borderRadius: '4px',
                  border: '1px solid #27272a',
                  fontSize: '0.75rem',
                }}
              >
                <span style={{ fontWeight: 600, color: '#f8fafc' }}>{pkg}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <button
                    class="chakra-button chakra-button--ghost chakra-button--xs"
                    style={{ padding: '2px', height: 'auto' }}
                    onClick={() => handleCopyImportSnippet(pkg)}
                    title={`Скопировать import: import { } from '${pkg}'`}
                  >
                    {copiedPkg === pkg ? <Check size={12} color="#4ade80" /> : <Copy size={12} color="#94a3b8" />}
                  </button>
                  <button
                    class="chakra-button chakra-button--ghost chakra-button--xs"
                    style={{ padding: '2px', height: 'auto', color: '#f87171' }}
                    onClick={() => handleUninstallPackage(pkg)}
                    title="Удалить из importmap"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Вкладки категорий */}
      <div style={{ display: 'flex', gap: '4px', padding: '6px 10px', borderBottom: '1px solid #27272a', overflowX: 'auto' }}>
        {(['all', 'vue', 'ui', 'util', 'css'] as const).map((cat) => (
          <button
            key={cat}
            class={`chakra-button chakra-button--xs ${activeCategory === cat ? 'chakra-button--solid-teal' : 'chakra-button--ghost'}`}
            style={{ fontSize: '0.7rem', padding: '2px 6px', height: '22px' }}
            onClick={() => setActiveCategory(cat)}
          >
            {cat === 'all' ? 'Все' : cat === 'vue' ? 'Vue 3' : cat === 'ui' ? 'UI' : cat === 'util' ? 'Утилиты' : 'CSS'}
          </button>
        ))}
      </div>

      {/* Список популярных библиотек */}
      <div style={{ overflowY: 'auto', flex: 1, padding: '8px 10px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filteredLibraries.map((lib) => {
            const isInstalled = Boolean(installedImports[lib.pkg]);

            return (
              <div
                key={lib.pkg}
                style={{
                  background: '#131b2e',
                  border: isInstalled ? '1px solid rgba(20, 184, 166, 0.4)' : '1px solid #27272a',
                  borderRadius: '6px',
                  padding: '8px 10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '1rem' }}>{lib.icon}</span>
                    <strong style={{ fontSize: '0.8rem', color: '#f8fafc' }}>{lib.name}</strong>
                  </div>
                  {isInstalled ? (
                    <span style={{ fontSize: '0.65rem', background: 'rgba(20, 184, 166, 0.2)', color: '#14b8a6', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                      Установлен
                    </span>
                  ) : (
                    <button
                      class="chakra-button chakra-button--xs chakra-button--solid-teal"
                      style={{ height: '22px', fontSize: '0.7rem', padding: '0 8px' }}
                      onClick={() => handleInstallPackage(lib.pkg, lib.url)}
                    >
                      + Добавить
                    </button>
                  )}
                </div>

                <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8', lineHeight: 1.3 }}>
                  {lib.desc}
                </p>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px', paddingTop: '4px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <code style={{ fontSize: '0.7rem', color: '#38bdf8' }}>{lib.pkg}</code>
                  <button
                    class="chakra-button chakra-button--ghost chakra-button--xs"
                    style={{ fontSize: '0.7rem', height: '20px', padding: '0 4px', color: '#71717a' }}
                    onClick={() => handleCopyImportSnippet(lib.pkg)}
                    title="Скопировать строку import"
                  >
                    {copiedPkg === lib.pkg ? 'Скопировано!' : 'Копировать import'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
