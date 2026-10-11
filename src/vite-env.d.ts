/// <reference types="vite/client" />

declare module 'monaco-editor/esm/vs/language/html/monaco.contribution.js' {
  export const htmlDefaults: any;
  export const handlebarDefaults: any;
  export const razorDefaults: any;
}

declare module 'monaco-editor/esm/vs/language/css/monaco.contribution.js' {
  export const cssDefaults: any;
  export const scssDefaults: any;
  export const lessDefaults: any;
}

declare module 'monaco-editor/esm/vs/language/typescript/monaco.contribution.js' {
  export const javascriptDefaults: any;
  export const typescriptDefaults: any;
  export const ScriptTarget: any;
}
