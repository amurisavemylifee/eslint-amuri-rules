// A folder with an `index` file is a module: import it through the index, not its internals.
// Relative paths and configured aliases are checked; imports from inside the folder itself are fine.
// Aliases are an option: { aliases: { '@': 'src', '@app': 'src/app' } } (targets are relative to cwd).
//
// ✅ import { a } from './feature';            ← feature/index.ts exists
// ✅ import { b } from '../feature/index';
// ✅ import { c } from './helpers';            ← inside feature/, importing a sibling
//
// ❌ import { a } from './feature/internal';   ← feature/index.ts exists
// ❌ import { a } from '../feature/utils/x';
// ❌ import { a } from '@/feature/internal';   ← with aliases: { '@': 'src' }
import { existsSync } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';

const INDEX_NAMES = ['index.ts', 'index.tsx', 'index.mts', 'index.cts', 'index.js', 'index.jsx', 'index.mjs', 'index.cjs'];
const TRAILING_INDEX = /[\\/]index(\.[cm]?[jt]sx?)?$/;

const hasIndex = (dir) => INDEX_NAMES.some((name) => existsSync(resolve(dir, name)));

const isInside = (dir, parent) => dir === parent || dir.startsWith(parent + sep);

const findBarrel = (importerDir, targetPath) => {
  const target = targetPath.replace(TRAILING_INDEX, '');
  let dir = dirname(target);

  // walk up from the target's folder until we reach the importer's own folders
  while (!isInside(importerDir, dir) && dir !== dirname(dir)) {
    if (hasIndex(dir)) return dir;

    dir = dirname(dir);
  }

  return null;
};

// longest matching alias wins; `@` matches `@` and `@/...`, not `@foo`
const resolveAlias = (aliases, cwd, specifier) => {
  const match = aliases
    .filter(([prefix]) => specifier === prefix || specifier.startsWith(prefix + '/'))
    .sort((a, b) => b[0].length - a[0].length)[0];

  return match ? resolve(cwd, match[1], specifier.slice(match[0].length + 1)) : null;
};

export default {
  meta: {
    type: 'problem',
    schema: [
      {
        type: 'object',
        properties: { aliases: { type: 'object', additionalProperties: { type: 'string' } } },
        additionalProperties: false,
      },
    ],
    messages: {
      deepImport: "'{{path}}' reaches inside a folder that has an index file, import from the index instead.",
    },
  },
  create(context) {
    const filename = context.filename ?? context.getFilename();

    if (!filename || filename.startsWith('<')) return {};

    const importerDir = dirname(resolve(filename));
    const cwd = context.cwd ?? process.cwd();
    const aliases = Object.entries(context.options[0]?.aliases ?? {}).map(([prefix, target]) => [
      prefix.replace(/\/+$/, ''),
      target,
    ]);

    const check = (node) => {
      const path = node.source?.value;

      if (typeof path !== 'string') return;

      const target = path.startsWith('.') ? resolve(importerDir, path) : resolveAlias(aliases, cwd, path);

      if (target && findBarrel(importerDir, target)) context.report({ node: node.source, messageId: 'deepImport', data: { path } });
    };

    return {
      ImportDeclaration: check,
      ExportNamedDeclaration: check,
      ExportAllDeclaration: check,
    };
  },
};
