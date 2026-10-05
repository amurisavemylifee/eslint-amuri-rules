import tseslint from 'typescript-eslint';
import importPlugin from 'eslint-plugin-import';

import plugin from './plugin.js';

/** TypeScript parser + type import style. */
export const typescript = [
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: { '@typescript-eslint': tseslint.plugin },
    languageOptions: { parser: tseslint.parser },
    rules: {
      // separate-type-imports: splits mixed imports into import type {} + import {}
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'separate-type-imports' },
      ],
    },
  },
];

/**
 * Rules that need type information (projectService).
 * Opt-in: the consumer must have a tsconfig covering the linted files.
 */
export const typeAware = [
  {
    files: ['**/src/**/*.ts', '**/src/**/*.tsx'],
    plugins: { '@typescript-eslint': tseslint.plugin, amuri: plugin },
    languageOptions: { parserOptions: { projectService: true } },
    rules: {
      // splits mixed exports into export type {} + export {}
      '@typescript-eslint/consistent-type-exports': [
        'error',
        { fixMixedExportsWithInlineTypeSpecifier: false },
      ],
      // boolean variables/params/properties start with is/has/can/should/will/did/does/are/was/were
      'amuri/boolean-name-prefix': 'error',
      // functions returning boolean start with is/has/can/... too
      'amuri/boolean-function-prefix': 'error',
    },
  },
];

// Foundational frameworks go first, their ecosystem libraries right after (no blank line between).
const FRAMEWORKS = ['react', 'vue', 'express', 'svelte', 'next', 'nuxt', 'fastify', 'koa', '@angular/core', '@nestjs/core'];

// The framework block lives in its own group slot between builtin and external (the otherwise unused `object` group,
// pathGroups need an existing group name), so a blank line separates it from other libraries.
// One shared rank (brace pattern), so `alphabetize` sorts the ecosystem libraries among themselves.
const FRAMEWORK_ECOSYSTEM = [
  'react-*', 'react-*/**', 'react/**', '@react-*/**', 'vue-*', 'vue-*/**', '@vue/**', 'vuex', 'pinia',
  'express-*', 'svelte/**', 'svelte-*', 'next/**', 'next-*', 'nuxt/**', '@nuxt/**', 'fastify-*',
  '@fastify/**', '@angular/**', '@nestjs/**',
];

const FRAMEWORK_PATH_GROUPS = [
  ...FRAMEWORKS.map((pattern) => ({ pattern, group: 'object', position: 'before' })),
  { pattern: `{${FRAMEWORK_ECOSYSTEM.join(',')}}`, group: 'object', position: 'before' },
];

/** Import/export layout + statement spacing + custom `amuri/*` rules, all files. */
export const style = [
  {
    plugins: { import: importPlugin, amuri: plugin },
    rules: {
      // ── Blank lines between statements (auto-fix) ──
      // core rule + exception: a single-line declaration followed by one of the same kind (type, interface, const, let) needs no blank line, even if the next is multiline
      'amuri/padding-line-between-statements': [
        'error',
        { blankLine: 'always', prev: '*', next: '*' },
        { blankLine: 'any', prev: 'case', next: 'case' },
        { blankLine: 'any', prev: 'export', next: 'export' },
        { blankLine: 'any', prev: 'import', next: 'import' },
        { blankLine: 'any', prev: 'expression', next: 'expression' },
        // multiline expressions always require blank lines above and below
        { blankLine: 'always', prev: 'multiline-expression', next: '*' },
        { blankLine: 'always', prev: '*', next: 'multiline-expression' },
        // const/let groups: blank lines between them are optional
        { blankLine: 'any', prev: 'const', next: 'const' },
        { blankLine: 'any', prev: 'let', next: 'let' },
        { blankLine: 'any', prev: 'const', next: 'let' },
        { blankLine: 'any', prev: 'let', next: 'const' },
        // multiline const/let always requires blank lines above and below
        { blankLine: 'always', prev: 'multiline-const', next: '*' },
        { blankLine: 'always', prev: '*', next: 'multiline-const' },
        { blankLine: 'always', prev: 'multiline-let', next: '*' },
        { blankLine: 'always', prev: '*', next: 'multiline-let' },
      ],

      // ── Imports / Exports ──
      'import/first': 'error', // auto-fix: imports before other code
      'import/no-self-import': 'error',
      'import/no-relative-packages': 'error', // use workspace alias, not ../../other-pkg
      'import/exports-last': 'error', // all exports at the end of the file
      'import/group-exports': 'error', // at most one export { } and one export type { }
      'import/order': [
        'error',
        {
          groups: ['builtin', 'object', 'external', 'internal', 'parent', 'sibling', 'index'],
          pathGroups: FRAMEWORK_PATH_GROUPS,
          pathGroupsExcludedImportTypes: ['builtin'],
          distinctGroup: false,
          alphabetize: { order: 'asc', caseInsensitive: true },
          'newlines-between': 'always',
        },
      ],

      // ── Custom rules ──
      // class names are PascalCase
      'amuri/class-pascal-case': 'error',
      // braces for all if-bodies except bare `return;` guard clauses (auto-fix)
      'amuri/curly-except-return': 'error',
      // index files contain only imports and re-exports, no logic
      'amuri/index-only-reexports': 'error',
      // at most 3 function parameters, more — an options object
      'amuri/max-function-params': 'error',
      // folders with an index file are imported through it, not via internal files
      'amuri/no-barrel-deep-import': 'error',
      // aliased imports use the most specific alias (option `aliases`, inactive without it)
      'amuri/prefer-short-alias': 'error',
      // forbids inline exports, use export { } blocks (auto-fix strips `export`)
      'amuri/no-inline-export': 'error',
      // imports/re-exports from the same path must be adjacent
      'amuri/adjacent-same-path': 'error',
      // replaces import/no-duplicates: allows import {} + import type {} from same module
      'amuri/no-duplicate-same-kind': 'error',
      // forbids import { type Foo } / export { type Foo }, use import type / export type
      'amuri/no-inline-type-specifier': 'error',
      // re-exports (export { } from '...') before local exports (export { })
      'amuri/reexports-before-local': 'error',
      // side-effect imports (`import './x'`) after all other imports (auto-fix)
      'amuri/side-effect-imports-last': 'error',
      // specifiers inside import { } / export { } sorted alphabetically (auto-fix)
      'amuri/sorted-specifiers': 'error',
      // `as const` constants are UPPER_SNAKE_CASE; UPPER_SNAKE_CASE object/array constants are `as const`
      'amuri/as-const-upper-snake': 'error',
      // interface names start with I, type aliases with T, enums with E, generics with T (IFoo, TFoo, EFoo, T / TKey)
      'amuri/type-name-prefix': 'error',
      // for the same path: value import/export before type import/export
      'amuri/value-before-type': 'error',
    },
  },
  { ignores: ['**/node_modules/**', '**/dist/**', '.husky/**'] },
];

export { plugin };

/** Default: everything except type-aware rules. */
export default [...typescript, ...style];
