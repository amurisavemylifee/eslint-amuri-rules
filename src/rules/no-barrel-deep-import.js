// A folder with an `index` file is a module: import it through the index, not its internals.
// Only relative paths are checked; imports from inside the folder itself are fine.
//
// ✅ import { a } from './feature';            ← feature/index.ts exists
// ✅ import { b } from '../feature/index';
// ✅ import { c } from './helpers';            ← inside feature/, importing a sibling
//
// ❌ import { a } from './feature/internal';   ← feature/index.ts exists
// ❌ import { a } from '../feature/utils/x';
import { existsSync } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';

const INDEX_NAMES = ['index.ts', 'index.tsx', 'index.mts', 'index.cts', 'index.js', 'index.jsx', 'index.mjs', 'index.cjs'];
const TRAILING_INDEX = /[\\/]index(\.[cm]?[jt]sx?)?$/;

const hasIndex = (dir) => INDEX_NAMES.some((name) => existsSync(resolve(dir, name)));

const isInside = (dir, parent) => dir === parent || dir.startsWith(parent + sep);

const findBarrel = (importerDir, specifier) => {
  const target = resolve(importerDir, specifier.replace(TRAILING_INDEX, ''));
  let dir = dirname(target);

  // walk up from the target's folder until we reach the importer's own folders
  while (!isInside(importerDir, dir) && dir !== dirname(dir)) {
    if (hasIndex(dir)) return dir;

    dir = dirname(dir);
  }

  return null;
};

export default {
  meta: {
    type: 'problem',
    schema: [],
    messages: {
      deepImport: "'{{path}}' reaches inside a folder that has an index file, import from the index instead.",
    },
  },
  create(context) {
    const filename = context.filename ?? context.getFilename();

    if (!filename || filename.startsWith('<')) return {};

    const importerDir = dirname(resolve(filename));

    const check = (node) => {
      const path = node.source?.value;

      if (typeof path !== 'string' || !path.startsWith('.')) return;

      if (findBarrel(importerDir, path)) context.report({ node: node.source, messageId: 'deepImport', data: { path } });
    };

    return {
      ImportDeclaration: check,
      ExportNamedDeclaration: check,
      ExportAllDeclaration: check,
    };
  },
};
