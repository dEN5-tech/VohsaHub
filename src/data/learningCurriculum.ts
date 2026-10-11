import {
  parseHtmlTree,
  queryHtmlElements,
  getHtmlNodeText,
  parseCssTree,
  queryCssRules,
  getCssProperty,
  parseJsTree,
  walkJsAst,
} from '../compiler/astTaskValidator';
import type { LearningTask } from '../types/learningTasks';

/**
 * Программа уроков и практических заданий.
 * Содержит понятную цель урока и шаблон кода с инлайн-карточками [[slot:id]] для упрощения ввода студентом.
 */
export const DEFAULT_LEARNING_TASKS: LearningTask[] = [
  {
    id: 'task-1-html',
    title: 'Задание 1: Разметка карточки и кнопки (HTML)',
    category: 'HTML',
    targetFile: 'index.html',
    description: 'Добавьте заголовок первого уровня <h1> с названием проекта и кнопку действия с id="btnClick" и классом "btn-primary".',
    templateCode: `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>Мой проект</title>
</head>
<body>
  <div class="card">
    <[[slot:headerTag]]>
      <h1>[[slot:titleText]]</h1>
    </[[slot:headerTag]]>
    <button id="[[slot:buttonId]]" class="[[slot:buttonClass]]">Кликнуть</button>
  </div>
</body>
</html>`,
    slots: {
      headerTag: {
        id: 'headerTag',
        type: 'select',
        options: ['header', 'div', 'section'],
        correctAnswer: 'header',
        placeholder: 'Тег контейнера',
      },
      titleText: {
        id: 'titleText',
        type: 'input',
        placeholder: 'Название проекта',
        correctAnswer: 'Песочница проекта',
      },
      buttonId: {
        id: 'buttonId',
        type: 'chips',
        options: ['btnClick', 'btnSubmit', 'btnAction'],
        correctAnswer: 'btnClick',
      },
      buttonClass: {
        id: 'buttonClass',
        type: 'chips',
        options: ['btn-primary', 'btn-default', 'btn-ghost'],
        correctAnswer: 'btn-primary',
      },
    },
    criteria: [
      {
        id: 'html-h1-exists',
        description: 'В разметке присутствует тег <h1> с текстом заголовка',
        check: (code) => {
          const { ast } = parseHtmlTree(code);
          if (!ast) return { passed: false, message: 'Ошибка разметки HTML' };
          const h1List = queryHtmlElements(ast, 'h1');
          if (h1List.length === 0) {
            return { passed: false, message: 'Тег <h1> не найден в документе' };
          }
          const text = getHtmlNodeText(h1List[0]).trim();
          if (text.length < 2) {
            return {
              passed: false,
              message: 'Напишите текст заголовка проекта в теге <h1>',
              line: h1List[0].sourceCodeLocation?.startLine,
            };
          }
          return { passed: true, message: `Заголовок найден: "${text}"` };
        },
      },
      {
        id: 'html-button-exists',
        description: 'Присутствует кнопка с id="btnClick" и классом btn-primary',
        check: (code) => {
          const { ast } = parseHtmlTree(code);
          if (!ast) return { passed: false, message: 'Ошибка разметки HTML' };
          const buttons = queryHtmlElements(ast, 'button');
          const targetBtn = buttons.find((b: any) =>
            b.attrs?.some((a: any) => a.name === 'id' && a.value === 'btnClick')
          );

          if (!targetBtn) {
            return { passed: false, message: 'Кнопка с id="btnClick" не найдена' };
          }

          const hasClass = targetBtn.attrs?.some(
            (a: any) => a.name === 'class' && a.value.includes('btn-primary')
          );

          if (!hasClass) {
            return {
              passed: false,
              message: 'Добавьте кнопке класс class="btn-primary"',
              line: targetBtn.sourceCodeLocation?.startLine,
            };
          }

          return { passed: true, message: 'Кнопка #btnClick корректно сконфигурирована' };
        },
      },
    ],
  },
  {
    id: 'task-2-css',
    title: 'Задание 2: Стилизация карточки и кнопки (CSS)',
    category: 'CSS',
    targetFile: 'style.css',
    description: 'Задайте скругление углов border-radius для класса .card и настройте фон и cursor: pointer для кнопки .btn-primary.',
    templateCode: `.card {
  background-color: #18181b;
  border-radius: [[slot:borderRadius]];
  padding: 1.5rem;
}

.btn-primary {
  background-color: [[slot:bgColor]];
  cursor: [[slot:cursorType]];
  color: #042f2e;
}`,
    slots: {
      borderRadius: {
        id: 'borderRadius',
        type: 'chips',
        options: ['12px', '8px', '4px', '50%'],
        correctAnswer: '12px',
      },
      bgColor: {
        id: 'bgColor',
        type: 'chips',
        options: ['#14b8a6', '#3b82f6', '#ef4444'],
        correctAnswer: '#14b8a6',
      },
      cursorType: {
        id: 'cursorType',
        type: 'chips',
        options: ['pointer', 'default', 'wait'],
        correctAnswer: 'pointer',
      },
    },
    criteria: [
      {
        id: 'css-card-radius',
        description: 'Селектор .card содержит свойство border-radius',
        check: (code) => {
          const { ast } = parseCssTree(code);
          if (!ast) return { passed: false, message: 'Синтаксическая ошибка в CSS' };
          const rules = queryCssRules(ast, '.card');
          if (rules.length === 0) {
            return { passed: false, message: 'Правило .card не найдено' };
          }
          const radiusProp = getCssProperty(rules[0], 'border-radius');
          if (!radiusProp) {
            return {
              passed: false,
              message: 'В правиле .card не найдено свойство border-radius',
              line: rules[0].loc?.start?.line,
            };
          }
          return { passed: true, message: 'Свойство border-radius настроено' };
        },
      },
      {
        id: 'css-btn-styles',
        description: 'Селектор .btn-primary содержит background-color и cursor: pointer',
        check: (code) => {
          const { ast } = parseCssTree(code);
          if (!ast) return { passed: false, message: 'Синтаксическая ошибка в CSS' };
          const rules = queryCssRules(ast, '.btn-primary');
          if (rules.length === 0) {
            return { passed: false, message: 'Правило .btn-primary не найдено' };
          }
          const bgProp = getCssProperty(rules[0], 'background-color');
          if (!bgProp) {
            return {
              passed: false,
              message: 'Укажите background-color для .btn-primary',
              line: rules[0].loc?.start?.line,
            };
          }
          const cursorProp = getCssProperty(rules[0], 'cursor');
          if (!cursorProp) {
            return {
              passed: false,
              message: 'Добавьте cursor: pointer для .btn-primary',
              line: rules[0].loc?.start?.line,
            };
          }
          return { passed: true, message: 'Стили кнопки настроены корректно' };
        },
      },
    ],
  },
  {
    id: 'task-3-js-counter',
    title: 'Задание 3: Логика счётчика кликов (JavaScript)',
    category: 'JavaScript',
    targetFile: 'main.js',
    description: 'Объявите шаг изменения кликов step и подключите слушатель события "click" к кнопке с помощью addEventListener.',
    templateCode: `var counter = 0;
var step = [[slot:stepVal]];

var btnClick = document.getElementById('btnClick');

if (btnClick) {
  btnClick.[[slot:listenMethod]]('[[slot:eventType]]', function() {
    counter += step;
    console.log('Счетчик:', counter);
  });
}`,
    slots: {
      stepVal: {
        id: 'stepVal',
        type: 'chips',
        options: ['1', '2', '5', '10'],
        correctAnswer: '1',
      },
      listenMethod: {
        id: 'listenMethod',
        type: 'select',
        options: ['addEventListener', 'attachEvent', 'onclick'],
        correctAnswer: 'addEventListener',
      },
      eventType: {
        id: 'eventType',
        type: 'chips',
        options: ['click', 'hover', 'change'],
        correctAnswer: 'click',
      },
    },
    criteria: [
      {
        id: 'js-step-var',
        description: 'Объявлены переменные counter и step',
        check: (code) => {
          const { ast } = parseJsTree(code);
          if (!ast) return { passed: false, message: 'Синтаксическая ошибка в JavaScript' };

          let hasCounter = false;
          let hasStep = false;
          let targetLine: number | undefined;

          walkJsAst(ast, (node) => {
            if (node.type === 'VariableDeclarator' && node.id?.name === 'counter') {
              hasCounter = true;
            }
            if (node.type === 'VariableDeclarator' && node.id?.name === 'step') {
              hasStep = true;
              targetLine = node.loc?.start?.line;
            }
          });

          if (!hasCounter) {
            return { passed: false, message: 'Объявите переменную: var counter = 0;' };
          }
          if (!hasStep) {
            return { passed: false, message: 'Объявите шаг счётчика: var step = 1;' };
          }

          return { passed: true, message: 'Переменные counter и step объявлены', line: targetLine };
        },
      },
      {
        id: 'js-click-listener',
        description: 'Присутствует вызов addEventListener с событием "click"',
        check: (code) => {
          const { ast } = parseJsTree(code);
          if (!ast) return { passed: false, message: 'Синтаксическая ошибка в JavaScript' };

          let hasClickEvent = false;
          let targetLine: number | undefined;

          walkJsAst(ast, (node) => {
            if (
              node.type === 'CallExpression' &&
              node.callee?.property?.name === 'addEventListener' &&
              node.arguments?.[0]?.value === 'click'
            ) {
              hasClickEvent = true;
              targetLine = node.loc?.start?.line;
            }
          });

          if (!hasClickEvent) {
            return {
              passed: false,
              message: 'Добавьте обработчик: btnClick.addEventListener("click", ...)',
            };
          }

          return { passed: true, message: 'Обработчик клика подтверждён AST', line: targetLine };
        },
      },
    ],
  },
];
