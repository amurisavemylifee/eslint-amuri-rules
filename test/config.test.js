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
  assert.equal(output, 'const a = 1;\n\nexport { a };\n');
});

test('no-inline-export fix: extends existing blocks, keeps types apart, no lost exports', async () => {
  const src = [
    'export interface I { a: number }',
    'export function f() {}',
    'export class C {}',
    'export enum E { A }',
    'export type T = string;',
    'const z = 1;',
    '',
    'export { z };',
    '',
  ].join('\n');
  const { output } = await run(src, 'a.ts', true);
  assert.ok(output.includes('export { z, f, C, E };'), output);
  assert.ok(output.includes('export type { I, T };'), output);
  assert.ok(!/^export (function|class|enum|interface) |^export type \w+ =/m.test(output), output);
});

test('no-inline-export fix: many exports converge in one lint run', async () => {
  const src = Array.from({ length: 15 }, (_, i) => `export const v${i} = ${i};`).join('\n\n') + '\n';
  const { output, ids: left } = await run(src, 'a.ts', true);
  assert.ok(!left.includes('amuri/no-inline-export'));
  for (let i = 0; i < 15; i++) assert.ok(output.includes(`v${i}`));
  assert.equal((output.match(/^export /gm) ?? []).length, 1);
});

test('no-inline-export: unsafe shapes are reported without a fix', async () => {
  for (const src of [
    'export const a = 1, b = 2;\n',
    'export const { a } = { a: 1 };\n',
    'export declare const a: number;\n',
    'export function f(a: string): void;\nexport function f(a: string) {}\n',
  ]) {
    const { ids: left, output } = await run(src, 'a.ts', true);
    assert.ok(left.includes('amuri/no-inline-export'), src);
    assert.ok(/^export /m.test(output ?? src), src);
  }
});

test('no-duplicate-same-kind: two value imports flagged, value+type allowed', async () => {
  const dup = "import { a } from './m';\nimport { b } from './m';\n\nexport { a, b };\n";
  assert.ok((await ids(dup)).includes('amuri/no-duplicate-same-kind'));
  const ok = "import { a } from './m';\nimport type { B } from './m';\n\nexport { a };\nexport type { B };\n";
  assert.ok(!(await ids(ok)).includes('amuri/no-duplicate-same-kind'));
});

test('no-duplicate-same-kind fix: trailing comma, default and namespace imports', async () => {
  const trailing = "import {\n  a,\n} from './m';\nimport { b } from './m';\n\nexport { a, b };\n";
  const fixed = await run(trailing, 'a.ts', true);
  assert.match(fixed.output, /import \{\s*a, b,?\s*\} from '\.\/m';/);
  assert.ok(!fixed.ids.includes('amuri/no-duplicate-same-kind'));

  for (const src of [
    "import d from './m';\nimport { b } from './m';\n\nexport { d, b };\n",
    "import { b } from './m';\nimport d from './m';\n\nexport { d, b };\n",
    "import * as ns from './m';\nimport * as ns2 from './m';\n\nexport { ns, ns2 };\n",
  ]) {
    await assert.doesNotReject(run(src, 'a.ts', true));
  }
});

test('no-inline-type-specifier fix: splits into value and type statements', async () => {
  const cases = [
    ["import { a, type B } from './m';\n\nexport { a };\nexport type { B };\n", "import { a } from './m';\nimport type { B } from './m';"],
    ["import { type A } from './m';\n\nexport type { A };\n", "import type { A } from './m';"],
    ["import d, { type B } from './m';\n\nexport { d };\nexport type { B };\n", "import d from './m';\nimport type { B } from './m';"],
  ];
  for (const [src, expected] of cases) {
    const { output } = await run(src, 'a.ts', true);
    assert.ok(output.includes(expected), output);
  }
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
