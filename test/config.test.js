import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ESLint } from 'eslint';

import config, { typescript, typeAware, style } from '../src/index.js';

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
  assert.deepEqual(await ids('const MAX: number = 1;\n\nexport { MAX };\n'), []);
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
  assert.ok(output.includes('export { C, E, f, z };'), output);
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

test('type-name-prefix: interface needs I, type alias T, enum E', async () => {
  const bad = 'interface Foo {}\n\ntype Bar = string;\n\ninterface Ifoo {}\n\nenum Dir { Up }\n\nexport { Dir };\nexport type { Foo, Bar, Ifoo };\n';
  const found = (await ids(bad)).filter((id) => id === 'amuri/type-name-prefix');
  assert.equal(found.length, 4);
  const ok = 'interface IFoo {}\n\ntype TBar = string;\n\nenum EDir { Up }\n\nexport { EDir };\nexport type { IFoo, TBar };\n';
  assert.ok(!(await ids(ok)).includes('amuri/type-name-prefix'));
});

test('sorted-specifiers: flags and autofixes imports and exports', async () => {
  const src = "import { b, a } from './m';\n\nexport { b, a };\n";
  assert.ok((await ids(src)).includes('amuri/sorted-specifiers'));
  const { output } = await run(src, 'a.ts', true);
  assert.equal(output, "import { a, b } from './m';\n\nexport { a, b };\n");
  const ok = "import { a, B } from './m';\n\nexport { a, B };\n";
  assert.ok(!(await ids(ok)).includes('amuri/sorted-specifiers'));
});

test('type-name-prefix: generic parameters need T or T + Uppercase', async () => {
  const bad = 'export const f = <Key, U>(a: Key, b: U) => [a, b];\n\nexport type TM<TK extends string> = { [P in TK]: P };\n';
  const found = (await ids(bad)).filter((id) => id === 'amuri/type-name-prefix');
  assert.equal(found.length, 2);
  const ok = 'const f = <T, TKey extends string>(a: T, b: TKey) => [a, b];\n\ntype TM<TK extends string> = { [TP in TK]: TP };\n\nexport { f };\nexport type { TM };\n';
  assert.deepEqual(await ids(ok), []);
});

test('as-const-upper-snake: both directions', async () => {
  const count = async (code) => (await ids(code)).filter((id) => id === 'amuri/as-const-upper-snake').length;
  assert.equal(await count("const dirs = { up: 'UP' } as const;\n\nexport { dirs };\n"), 1);
  assert.equal(await count("const DIRS = { up: 'UP' };\n\nexport { DIRS };\n"), 1);
  assert.equal(await count('const LIST = [1, 2];\n\nexport { LIST };\n'), 1);
  assert.equal(await count("const MAX = 3;\nconst NAME = 'a';\n\nexport { MAX, NAME };\n"), 0);
  assert.equal(await count("const DIRS = { up: 'UP' } as const satisfies object;\n\nexport { DIRS };\n"), 0);
  assert.equal(await count('const MAX_RETRIES = 3 as const;\n\nexport { MAX_RETRIES };\n'), 0);
  assert.equal(await count("const rootClassName = 'tw:flex';\n\nexport { rootClassName };\n"), 1);
  assert.equal(await count('const maxRetries = 3;\nconst offset = -1;\nconst tpl = `x`;\n\nexport { maxRetries, offset, tpl };\n'), 3);
  assert.equal(await count("const ROOT_CLASS_NAME = 'tw:flex';\n\nexport { ROOT_CLASS_NAME };\n"), 0);
  assert.equal(await count("function f() {\n  const label = 'x';\n\n  return label;\n}\n\nexport { f };\n"), 0);
  assert.equal(await count('const items = getItems();\nconst tpl = `a${items}`;\n\nexport { items, tpl };\n'), 0);
  assert.equal(await count('const { a } = { a: 1 };\n\nexport { a };\n'), 0);
});

test('value-before-type: inline type declarations are not moved below inline value declarations', async () => {
  const src = 'export type TClient = string;\n\nexport function create(): TClient {\n  return "a";\n}\n';
  assert.ok(!(await ids(src)).includes('amuri/value-before-type'));
  const { output } = await run(src, 'a.ts', true);
  assert.equal(output, 'type TClient = string;\n\nfunction create(): TClient {\n  return "a";\n}\n\nexport { create };\n\nexport type { TClient };\n');
});

test('index-only-reexports: index files allow only imports and re-exports', async () => {
  const ok = "'use client';\n\nimport { a } from './a';\n\nexport * from './b';\nexport { c } from './c';\nexport { a };\n";
  assert.ok(!(await ids(ok, 'index.ts')).includes('amuri/index-only-reexports'));
  assert.ok((await ids('const a = 1;\n\nexport { a };\n', 'index.ts')).includes('amuri/index-only-reexports'));
  assert.ok((await ids('export default 1;\n', 'index.ts')).includes('amuri/index-only-reexports'));
  assert.ok(!(await ids('const a = 1;\n\nexport { a };\n', 'a.ts')).includes('amuri/index-only-reexports'));
});

test('no-barrel-deep-import: relative imports into a folder with index must go through it', async () => {
  const root = mkdtempSync(join(process.cwd(), 'test', '.barrel-'));
  mkdirSync(join(root, 'feature/utils'), { recursive: true });
  mkdirSync(join(root, 'plain'), { recursive: true });
  writeFileSync(join(root, 'feature/index.ts'), '');
  writeFileSync(join(root, 'feature/internal.ts'), '');
  writeFileSync(join(root, 'plain/x.ts'), '');

  try {
    const has = async (code, file = 'main.ts') =>
      (await ids(code, join(root, file))).includes('amuri/no-barrel-deep-import');

    assert.ok(await has("import { a } from './feature/internal';\n\nexport { a };\n"));
    assert.ok(await has("import { a } from './feature/utils/x';\n\nexport { a };\n"));
    assert.ok(await has("export { a } from './feature/internal';\n"));
    assert.ok(!(await has("import { a } from './feature';\n\nexport { a };\n")));
    assert.ok(!(await has("import { a } from './feature/index';\n\nexport { a };\n")));
    assert.ok(!(await has("import { a } from './plain/x';\n\nexport { a };\n")));
    assert.ok(!(await has("import { a } from 'pkg/deep';\n\nexport { a };\n")));
    // inside the folder itself, siblings and nested files are fine
    assert.ok(!(await has("import { a } from './internal';\n\nexport { a };\n", 'feature/other.ts')));
    assert.ok(!(await has("import { a } from './utils/x';\n\nexport { a };\n", 'feature/other.ts')));
    assert.ok(!(await has("import { a } from '../internal';\n\nexport { a };\n", 'feature/utils/y.ts')));
    // from outside through a parent path
    assert.ok(await has("import { a } from '../feature/internal';\n\nexport { a };\n", 'plain/z.ts'));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('no-barrel-deep-import: aliases option resolves aliased paths', async () => {
  const root = mkdtempSync(join(process.cwd(), 'test', '.barrel-'));

  try {
    mkdirSync(join(root, 'src/feature'), { recursive: true });
    mkdirSync(join(root, 'src/app'), { recursive: true });
    writeFileSync(join(root, 'src/feature/index.ts'), '');

    const rel = root.slice(process.cwd().length + 1);
    const aliases = { '@': `${rel}/src`, '@app/': `${rel}/src/app` };
    const eslint = new ESLint({
      overrideConfigFile: true,
      overrideConfig: [...config, { rules: { 'amuri/no-barrel-deep-import': ['error', { aliases }] } }],
    });
    const has = async (code, file = 'src/app/main.ts') => {
      const [result] = await eslint.lintText(code, { filePath: join(root, file) });

      return result.messages.some((m) => m.ruleId === 'amuri/no-barrel-deep-import');
    };

    assert.ok(await has("import { a } from '@/feature/internal';\n\nexport { a };\n"));
    assert.ok(!(await has("import { a } from '@/feature';\n\nexport { a };\n")));
    assert.ok(!(await has("import { a } from '@/feature/index';\n\nexport { a };\n")));
    assert.ok(!(await has("import { a } from '@/other/x';\n\nexport { a };\n")));
    assert.ok(!(await has("import { a } from '@foo/feature/internal';\n\nexport { a };\n")));
    // inside the aliased folder itself
    assert.ok(!(await has("import { a } from '@/feature/internal';\n\nexport { a };\n", 'src/feature/x.ts')));
    // without the option aliases are ignored
    assert.ok(!(await ids("import { a } from '@/feature/internal';\n\nexport { a };\n", join(root, 'src/app/main.ts'))).includes('amuri/no-barrel-deep-import'));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('class-pascal-case: class names must be PascalCase', async () => {
  const found = async (code) => (await ids(code)).filter((id) => id === 'amuri/class-pascal-case').length;

  assert.equal(await found('class userService {}\n\nclass User_service {}\n\nclass _Base {}\n'), 3);
  assert.equal(await found('const A = class bad_name {};\n\nexport { A };\n'), 1);
  assert.equal(await found('class UserService {}\n\nclass HTTPClient {}\n\nconst A = class {};\n\nexport { A };\n'), 0);
});

test('boolean-name-prefix: type-aware only, inactive without type info', async () => {
  const dir = mkdtempSync(join(process.cwd(), '.tmp-typed-'));

  try {
    mkdirSync(join(dir, 'src'));
    writeFileSync(join(dir, 'tsconfig.json'), JSON.stringify({ compilerOptions: { strict: true }, include: ['src'] }));

    const code = [
      'declare function check(): boolean;',
      'declare const isMaybe: boolean | undefined;',
      '',
      'const loaded = check();',
      '',
      'const shown = isMaybe;',
      '',
      'const isOk = check();',
      '',
      'const count = 1;',
      '',
      'function f(open: boolean, name: string) {}',
      '',
      'export { count, f, isOk, loaded, shown };',
      '',
    ].join('\n');
    const file = join(dir, 'src', 'a.ts');

    writeFileSync(file, code);

    const eslint = new ESLint({
      overrideConfigFile: true,
      overrideConfig: [...typescript, ...typeAware, ...style],
      cwd: dir,
    });
    const [result] = await eslint.lintText(code, { filePath: file });
    const hits = result.messages.filter((m) => m.ruleId === 'amuri/boolean-name-prefix');

    assert.equal(hits.length, 3, JSON.stringify(result.messages.map((m) => [m.ruleId, m.message])));
    assert.equal((await ids(code)).filter((id) => id === 'amuri/boolean-name-prefix').length, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

const typedFound = async (code, ruleId) => {
  const dir = mkdtempSync(join(process.cwd(), '.tmp-typed-'));

  try {
    mkdirSync(join(dir, 'src'));
    writeFileSync(join(dir, 'tsconfig.json'), JSON.stringify({ compilerOptions: { strict: true }, include: ['src'] }));

    const file = join(dir, 'src', 'a.ts');

    writeFileSync(file, code);

    const eslint = new ESLint({ overrideConfigFile: true, overrideConfig: [...typescript, ...typeAware, ...style], cwd: dir });
    const [result] = await eslint.lintText(code, { filePath: file });
    const count = (list) => list.filter((m) => m.ruleId === ruleId).length;
    const plain = await ids(code);

    return { typed: count(result.messages), untyped: plain.filter((id) => id === ruleId).length };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

test('boolean-function-prefix: boolean-returning functions need a prefix (type-aware)', async () => {
  const code = [
    'function active(): boolean { return true; }',
    '',
    'const empty = (list: string[]) => list.length === 0;',
    '',
    'const isOk = () => true;',
    '',
    'const load = async () => true;',
    '',
    'const count = () => 1;',
    '',
    'const o = { ready() { return false; }, hasX: () => true };',
    '',
    'class A { valid(): boolean { return true; } }',
    '',
    'export { A, active, count, empty, isOk, load, o };',
    '',
  ].join('\n');

  assert.deepEqual(await typedFound(code, 'amuri/boolean-function-prefix'), { typed: 4, untyped: 0 });
});

test('max-function-params: more than 3 params flagged, option changes the limit', async () => {
  const found = async (code) => (await ids(code)).filter((id) => id === 'amuri/max-function-params').length;

  assert.equal(await found('function f(a: number, b: number, c: number, d: number) {}\n\nexport { f };\n'), 1);
  assert.equal(await found('const f = (a: number, b: number, c: number, d: number) => a;\n\nexport { f };\n'), 1);
  assert.equal(await found('function f(a: number, b: number, c: number) {}\n\nexport { f };\n'), 0);
  assert.equal(await found('function f(this: Window, a: number, b: number, c: number) {}\n\nexport { f };\n'), 0);

  const eslint = new ESLint({
    overrideConfigFile: true,
    overrideConfig: [...typescript, { plugins: { amuri: (await import('../src/index.js')).plugin }, rules: { 'amuri/max-function-params': ['error', { max: 1 }] } }],
  });
  const [result] = await eslint.lintText('function f(a: number, b: number) {}\n\nexport { f };\n', { filePath: 'a.ts' });

  assert.equal(result.messages.length, 1);
});

test('padding: single-line declarations of one kind may be adjacent, multiline ones need blank lines', async () => {
  const found = async (code) =>
    (await ids(code)).filter((id) => id === 'amuri/padding-line-between-statements').length;

  assert.equal(await found('type TA = string;\ntype TB = number;\n'), 0);
  assert.equal(await found('interface IA { a: string }\ninterface IB { b: string }\n'), 0);
  assert.equal(await found('type TA = string;\ninterface IC { a: string }\n'), 1);
  assert.equal(await found('interface IC { a: string }\ntype TA = string;\n'), 1);
  assert.equal(await found('type TA = string;\n\ninterface IC { a: string }\n'), 0);
  assert.equal(await found('type TA = string;\n\ntype TB = number;\n'), 0);
  assert.equal(await found('type TA = {\n  a: string;\n};\ntype TB = number;\n'), 1);
  assert.equal(await found('type TA = string;\ntype TB = {\n  a: string;\n};\n'), 0);
  assert.equal(await found('type TA = string;\ntype TB = number;\ntype TC = {\n  a: string;\n};\n'), 0);
  assert.equal(await found('interface IA { a: string }\ninterface IB {\n  a: string;\n}\n'), 0);
  assert.equal(await found('const a = 1;\nconst b = {\n  c: 2,\n};\n\nexport { a, b };\n'), 0);
  assert.equal(await found('let a = 1;\nlet b = {\n  c: 2,\n};\n\nexport { a, b };\n'), 0);
  assert.equal(await found('type TA = {\n  a: string;\n};\ntype TB = {\n  a: string;\n};\n'), 1);
  assert.equal(await found('type TA = string;\ninterface IB {\n  a: string;\n}\n'), 1);
  assert.equal(await found('type TA = string;\nconst a = 1;\n\nexport { a };\n'), 1);
  assert.equal(await found('const a = 1;\nfunction f() {}\n\nexport { a, f };\n'), 1);
});

const withRule = async (ruleId, options, code) => {
  const eslint = new ESLint({
    overrideConfigFile: true,
    overrideConfig: [...config, { rules: { [ruleId]: ['error', ...options] } }],
  });
  const [result] = await eslint.lintText(code, { filePath: 'a.ts' });

  return result.messages.filter((m) => m.ruleId === ruleId);
};

test('type-name-prefix: custom prefixes via options', async () => {
  const options = [{ interface: 'Interface', type: 'Type', enum: 'Enum', generic: 'G' }];
  const ok = 'interface InterfaceA {}\n\ntype TypeB = {};\n\nenum EnumC {}\n\nfunction f<G, GKey>() {}\n\nexport { f };\n';
  const bad = 'interface IA {}\n\ntype TB = {};\n\nenum EC {}\n\nfunction f<T>() {}\n\nexport { f };\n';

  assert.equal((await withRule('amuri/type-name-prefix', options, ok)).length, 0);
  assert.equal((await withRule('amuri/type-name-prefix', options, bad)).length, 4);
  assert.equal((await withRule('amuri/type-name-prefix', [{ type: 'Type' }], 'interface IA {}\n')).length, 0);
});

test('boolean-name-prefix / boolean-function-prefix: custom prefixes via options', async () => {
  const dir = mkdtempSync(join(process.cwd(), '.tmp-typed-'));

  try {
    mkdirSync(join(dir, 'src'));
    writeFileSync(join(dir, 'tsconfig.json'), JSON.stringify({ compilerOptions: { strict: true }, include: ['src'] }));

    const code = 'const isOn = true;\n\nconst hasX = true;\n\nconst enabledA = true;\n\nconst enabledFn = () => true;\n\nexport { enabledA, enabledFn, hasX, isOn };\n';
    const file = join(dir, 'src', 'a.ts');

    writeFileSync(file, code);

    const eslint = new ESLint({
      overrideConfigFile: true,
      overrideConfig: [
        ...typescript,
        ...typeAware,
        { rules: { 'amuri/boolean-name-prefix': ['error', { prefixes: ['enabled'] }], 'amuri/boolean-function-prefix': ['error', { prefixes: ['enabled'] }] } },
      ],
      cwd: dir,
    });
    const [result] = await eslint.lintText(code, { filePath: file });
    const names = result.messages.map((m) => m.message.match(/"(\w+)"/)?.[1]);

    assert.deepEqual(names, ['isOn', 'hasX'], JSON.stringify(result.messages.map((m) => m.message)));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('prefer-short-alias: most specific alias wins, auto-fix rewrites', async () => {
  const aliases = { '@': 'src', '@components': 'src/components', '@trpc': 'src/server/api/trpc' };
  const eslint = new ESLint({
    overrideConfigFile: true,
    overrideConfig: [...config, { rules: { 'amuri/prefer-short-alias': ['error', { aliases }] } }],
    fix: true,
  });
  const fixed = async (code) => {
    const [result] = await eslint.lintText(code, { filePath: join(process.cwd(), 'src/app/main.ts') });

    return result.output ?? code;
  };
  const wrap = (path) => `import { a } from '${path}';\n\nexport { a };\n`;

  assert.equal(await fixed(wrap('@/components/Button')), wrap('@components/Button'));
  assert.equal(await fixed(wrap('@/server/api/trpc')), wrap('@trpc'));
  assert.equal(await fixed(wrap('@/server/api/trpc/router')), wrap('@trpc/router'));
  assert.equal(await fixed(wrap('@/env')), wrap('@/env'));
  assert.equal(await fixed(wrap('@components/Button')), wrap('@components/Button'));
  assert.equal(await fixed(wrap('@trpc')), wrap('@trpc'));
  assert.equal(await fixed(wrap('./local')), wrap('./local'));
  assert.equal(await fixed(wrap('react')), wrap('react'));
});

test('import/order: frameworks first, their ecosystem next, blank line before other libraries', async () => {
  const src = [
    "import axios from 'axios';",
    "import path from 'node:path';",
    "import fs from 'node:fs';",
    "import { useRouter } from 'vue-router';",
    "import { createApp } from 'vue';",
    "import { createRoot } from 'react-dom/client';",
    "import { createStore } from 'pinia';",
    "import React from 'react';",
    '',
    'export { axios, createApp, createRoot, createStore, fs, path, React, useRouter };',
    '',
  ].join('\n');
  const { output } = await run(src, 'a.ts', true);
  assert.ok(output.startsWith(
    "import fs from 'node:fs';\nimport path from 'node:path';\n\nimport React from 'react';\nimport { createApp } from 'vue';\nimport { createStore } from 'pinia';\nimport { createRoot } from 'react-dom/client';\nimport { useRouter } from 'vue-router';\n\nimport axios from 'axios';\n",
  ), output);
});

test('side-effect-imports-last: moves bare imports after the other imports, keeps their order', async () => {
  const src = [
    "import './a.css';",
    "import React from 'react';",
    "import 'reflect-metadata';",
    "import axios from 'axios';",
    '',
    'export { axios, React };',
    '',
  ].join('\n');
  assert.ok((await ids(src)).includes('amuri/side-effect-imports-last'));
  const { output } = await run(src, 'a.ts', true);
  assert.ok(output.includes("import axios from 'axios';\n\nimport './a.css';\nimport 'reflect-metadata';\n"), output);
  const adjacent = "import axios from 'axios';\nimport './a.css';\n\nexport { axios };\n";
  assert.ok((await ids(adjacent)).includes('amuri/side-effect-imports-last'));
  assert.ok((await run(adjacent, 'a.ts', true)).output.includes("'axios';\n\nimport './a.css';"));
  assert.ok(!(await ids(output)).includes('amuri/side-effect-imports-last'));
});
