import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ESLint } from 'eslint';

import config, { typescript, style } from '../src/index.js';

const run = async (code, filePath, fix = false) => {
  const eslint = new ESLint({ overrideConfigFile: true, overrideConfig: config, fix });
  const [result] = await eslint.lintText(code, { filePath });
  return { ids: result.messages.map((m) => m.ruleId), output: result.output };
};

const ids = async (code, filePath = 'a.ts') => (await run(code, filePath)).ids;

test('default is typescript + style', () => {
  assert.equal(config.length, typescript.length + style.length);
});

test('clean file has no messages', async () => {
  assert.deepEqual(await ids('const a: number = 1;\n\nexport { a };\n'), []);
});

test('import/first', async () => {
  assert.ok((await ids("const a = 1;\n\nimport x from './x';\n\nexport { a, x };\n")).includes('import/first'));
});

test('curly-except-return: flags braceless if, allows bare return', async () => {
  const bad = 'export const f = (a: boolean) => {\n  if (a) console.log(1);\n};\n';
  assert.ok((await ids(bad)).includes('amuri/curly-except-return'));
  const ok = 'export const f = (a: boolean) => {\n  if (a) return;\n};\n';
  assert.ok(!(await ids(ok)).includes('amuri/curly-except-return'));
});

test('no-inline-export: flags and autofixes', async () => {
  assert.ok((await ids('export const a = 1;\n')).includes('amuri/no-inline-export'));
  const { output } = await run('export const a = 1;\n', 'a.ts', true);
  assert.equal(output, 'const a = 1;\n');
});

test('no-duplicate-same-kind: two value imports flagged, value+type allowed', async () => {
  const dup = "import { a } from './m';\nimport { b } from './m';\n\nexport { a, b };\n";
  assert.ok((await ids(dup)).includes('amuri/no-duplicate-same-kind'));
  const ok = "import { a } from './m';\nimport type { B } from './m';\n\nexport { a };\nexport type { B };\n";
  assert.ok(!(await ids(ok)).includes('amuri/no-duplicate-same-kind'));
});

test('no-inline-type-specifier', async () => {
  const src = "import { type A } from './m';\n\nexport type { A };\n";
  assert.ok((await ids(src)).includes('amuri/no-inline-type-specifier'));
});

test('value-before-type', async () => {
  const src = "import type { A } from './m';\nimport { b } from './m';\n\nexport { b };\nexport type { A };\n";
  assert.ok((await ids(src)).includes('amuri/value-before-type'));
});

test('adjacent-same-path', async () => {
  const src = "import { a } from './m';\nimport { c } from './other';\nimport type { B } from './m';\n\nexport { a, c };\nexport type { B };\n";
  assert.ok((await ids(src)).includes('amuri/adjacent-same-path'));
});

test('reexports-before-local', async () => {
  const src = "const x = 1;\n\nexport { x };\n\nexport { y } from './m';\n";
  assert.ok((await ids(src)).includes('amuri/reexports-before-local'));
});
