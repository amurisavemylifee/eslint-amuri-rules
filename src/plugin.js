import adjacentSamePath from './rules/adjacent-same-path.js';
import asConstUpperSnake from './rules/as-const-upper-snake.js';
import curlyExceptReturn from './rules/curly-except-return.js';
import indexOnlyReexports from './rules/index-only-reexports.js';
import noDuplicateSameKind from './rules/no-duplicate-same-kind.js';
import noInlineExport from './rules/no-inline-export.js';
import noInlineTypeSpecifier from './rules/no-inline-type-specifier.js';
import reexportsBeforeLocal from './rules/reexports-before-local.js';
import sortedSpecifiers from './rules/sorted-specifiers.js';
import typeNamePrefix from './rules/type-name-prefix.js';
import valueBeforeType from './rules/value-before-type.js';

export default {
  rules: {
    'adjacent-same-path': adjacentSamePath,
    'as-const-upper-snake': asConstUpperSnake,
    'curly-except-return': curlyExceptReturn,
    'index-only-reexports': indexOnlyReexports,
    'no-duplicate-same-kind': noDuplicateSameKind,
    'no-inline-export': noInlineExport,
    'no-inline-type-specifier': noInlineTypeSpecifier,
    'reexports-before-local': reexportsBeforeLocal,
    'sorted-specifiers': sortedSpecifiers,
    'type-name-prefix': typeNamePrefix,
    'value-before-type': valueBeforeType,
  },
};
