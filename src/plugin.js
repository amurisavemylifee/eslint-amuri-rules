import adjacentSamePath from './rules/adjacent-same-path.js';
import asConstUpperSnake from './rules/as-const-upper-snake.js';
import booleanFunctionPrefix from './rules/boolean-function-prefix.js';
import booleanNamePrefix from './rules/boolean-name-prefix.js';
import classPascalCase from './rules/class-pascal-case.js';
import curlyExceptReturn from './rules/curly-except-return.js';
import indexOnlyReexports from './rules/index-only-reexports.js';
import maxFunctionParams from './rules/max-function-params.js';
import noBarrelDeepImport from './rules/no-barrel-deep-import.js';
import noBooleanParam from './rules/no-boolean-param.js';
import noDuplicateSameKind from './rules/no-duplicate-same-kind.js';
import noInlineExport from './rules/no-inline-export.js';
import noInlineTypeSpecifier from './rules/no-inline-type-specifier.js';
import paddingLineBetweenStatements from './rules/padding-line-between-statements.js';
import reexportsBeforeLocal from './rules/reexports-before-local.js';
import sortedSpecifiers from './rules/sorted-specifiers.js';
import typeNamePrefix from './rules/type-name-prefix.js';
import valueBeforeType from './rules/value-before-type.js';

export default {
  rules: {
    'adjacent-same-path': adjacentSamePath,
    'as-const-upper-snake': asConstUpperSnake,
    'boolean-function-prefix': booleanFunctionPrefix,
    'boolean-name-prefix': booleanNamePrefix,
    'class-pascal-case': classPascalCase,
    'curly-except-return': curlyExceptReturn,
    'index-only-reexports': indexOnlyReexports,
    'max-function-params': maxFunctionParams,
    'no-barrel-deep-import': noBarrelDeepImport,
    'no-boolean-param': noBooleanParam,
    'no-duplicate-same-kind': noDuplicateSameKind,
    'no-inline-export': noInlineExport,
    'no-inline-type-specifier': noInlineTypeSpecifier,
    'padding-line-between-statements': paddingLineBetweenStatements,
    'reexports-before-local': reexportsBeforeLocal,
    'sorted-specifiers': sortedSpecifiers,
    'type-name-prefix': typeNamePrefix,
    'value-before-type': valueBeforeType,
  },
};
