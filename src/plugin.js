import adjacentSamePath from './rules/adjacent-same-path.js';
import curlyExceptReturn from './rules/curly-except-return.js';
import noDuplicateSameKind from './rules/no-duplicate-same-kind.js';
import noInlineExport from './rules/no-inline-export.js';
import noInlineTypeSpecifier from './rules/no-inline-type-specifier.js';
import reexportsBeforeLocal from './rules/reexports-before-local.js';
import valueBeforeType from './rules/value-before-type.js';

export default {
  rules: {
    'adjacent-same-path': adjacentSamePath,
    'curly-except-return': curlyExceptReturn,
    'no-duplicate-same-kind': noDuplicateSameKind,
    'no-inline-export': noInlineExport,
    'no-inline-type-specifier': noInlineTypeSpecifier,
    'reexports-before-local': reexportsBeforeLocal,
    'value-before-type': valueBeforeType,
  },
};
