/* eslint-disable @typescript-eslint/no-require-imports -- Isolated CommonJS test loader. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const ts = require('typescript');
module.exports = function loader(env, mocks = {}, fetch = () => { throw new Error('Unexpected external request'); }) {
  const cache = new Map();
  return function load(relative) {
    const filename = path.resolve(relative);
    if (cache.has(filename)) return cache.get(filename).exports;
    const entry = { exports: {} }; cache.set(filename, entry);
    const nativeRequire = createRequire(filename);
    const resolve = (id) => {
      if (Object.hasOwn(mocks, id)) return mocks[id];
      if (id.startsWith('@/') || id.startsWith('.')) {
        const target = id.startsWith('@/') ? path.resolve(id.slice(2)) : path.resolve(path.dirname(filename), id);
        return load(fs.existsSync(target + '.ts') ? target + '.ts' : path.join(target, 'index.ts'));
      }
      return nativeRequire(id);
    };
    const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
    vm.runInNewContext(code, { module: entry, exports: entry.exports, require: resolve, process: { env, cwd: () => process.cwd() }, Buffer, Date, Error, TextDecoder, URL, URLSearchParams, Request, Response, Set, Map, crypto: globalThis.crypto, AbortSignal, console, fetch }, { filename });
    return entry.exports;
  };
};
