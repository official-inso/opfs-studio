import type * as monacoNS from "monaco-editor/esm/vs/editor/editor.api";

import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker&url";
import jsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker&url";
import cssWorker from "monaco-editor/esm/vs/language/css/css.worker?worker&url";
import htmlWorker from "monaco-editor/esm/vs/language/html/html.worker?worker&url";
import tsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker&url";

import "monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution";
import "monaco-editor/esm/vs/basic-languages/typescript/typescript.contribution";
import "monaco-editor/esm/vs/language/typescript/monaco.contribution";
import "monaco-editor/esm/vs/language/json/monaco.contribution";
import "monaco-editor/esm/vs/language/html/monaco.contribution";
import "monaco-editor/esm/vs/language/css/monaco.contribution";
import "monaco-editor/esm/vs/basic-languages/markdown/markdown.contribution";

import "monaco-editor/esm/vs/basic-languages/python/python.contribution";
import "monaco-editor/esm/vs/basic-languages/php/php.contribution";
import "monaco-editor/esm/vs/basic-languages/java/java.contribution";
import "monaco-editor/esm/vs/basic-languages/cpp/cpp.contribution";
import "monaco-editor/esm/vs/basic-languages/csharp/csharp.contribution";
import "monaco-editor/esm/vs/basic-languages/go/go.contribution";
import "monaco-editor/esm/vs/basic-languages/ruby/ruby.contribution";
import "monaco-editor/esm/vs/basic-languages/sql/sql.contribution";
import "monaco-editor/esm/vs/basic-languages/yaml/yaml.contribution";
import "monaco-editor/esm/vs/basic-languages/powershell/powershell.contribution";
import "monaco-editor/esm/vs/basic-languages/shell/shell.contribution";
import "monaco-editor/esm/vs/basic-languages/xml/xml.contribution";
import "monaco-editor/esm/vs/basic-languages/yaml/yaml.contribution";
import "monaco-editor/esm/vs/basic-languages/ini/ini.contribution";
import "monaco-editor/esm/vs/basic-languages/graphql/graphql.contribution";
import "monaco-editor/esm/vs/basic-languages/dockerfile/dockerfile.contribution";


declare global {
  interface Window {
    MonacoEnvironment?: monacoNS.Environment;
  }
}

window.MonacoEnvironment = {
  getWorkerUrl: (_moduleId, label) => {
    if (label === "json") return jsonWorker;
    if (label === "css" || label === "scss" || label === "less")
      return cssWorker;
    if (label === "html" || label === "handlebars" || label === "razor")
      return htmlWorker;
    if (label === "typescript" || label === "javascript") return tsWorker;
    return editorWorker;
  },
};
