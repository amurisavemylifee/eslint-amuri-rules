// Boolean variables, parameters and properties must be named with a boolean prefix:
// is, has, can, should, will, did, does, are, was, were (followed by an uppercase letter).
// A name is considered boolean by syntax: `: boolean` annotation, `true`/`false` literal,
// `!x`, comparison (`===`, `<`, `in`, `instanceof`, ...) or `Boolean(x)` initializer.
//
// WRONG: const active = true;
// WRONG: const loaded: boolean = load();
// WRONG: const empty = items.length === 0;
// OK:    const isActive = true;
// OK:    const hasItems = items.length > 0;
// OK:    const IS_DEBUG = false;
const PREFIXES = ['is', 'has', 'can', 'should', 'will', 'did', 'does', 'are', 'was', 'were'];
const PREFIXED = new RegExp(`^_*(?:${PREFIXES.join('|')})(?:[A-Z0-9]|$)`);
const PREFIXED_UPPER = new RegExp(`^_*(?:${PREFIXES.join('|').toUpperCase()})(?:_|$)`);
const COMPARISONS = new Set(['==', '===', '!=', '!==', '<', '<=', '>', '>=', 'in', 'instanceof']);

const isBooleanInit = (node) => {
  if (!node) return false;
  if (node.type === 'Literal') return typeof node.value === 'boolean';
  if (node.type === 'UnaryExpression') return node.operator === '!';
  if (node.type === 'BinaryExpression') return COMPARISONS.has(node.operator);
  if (node.type === 'CallExpression') return node.callee.type === 'Identifier' && node.callee.name === 'Boolean';
  if (node.type === 'TSAsExpression' || node.type === 'TSNonNullExpression') return isBooleanInit(node.expression);

  return false;
};

const isBooleanType = (annotation) => annotation?.typeAnnotation?.type === 'TSBooleanKeyword';

export default {
  meta: {
    type: 'suggestion',
    schema: [],
    messages: {
      booleanPrefix: 'Boolean "{{name}}" must start with one of: {{prefixes}} (e.g. {{hint}}).',
    },
  },
  create(context) {
    const prefixes = PREFIXES.join(', ');

    const check = (idNode, name, isBoolean) => {
      if (!isBoolean) return;
      if (PREFIXED.test(name) || PREFIXED_UPPER.test(name)) return;

      const bare = name.replace(/^_+/, '');
      const hint = /^[A-Z0-9_]+$/.test(bare) ? `IS_${bare}` : `is${bare[0].toUpperCase()}${bare.slice(1)}`;

      context.report({ node: idNode, messageId: 'booleanPrefix', data: { name, prefixes, hint } });
    };

    const checkParam = (param) => {
      const target = param.type === 'AssignmentPattern' ? param.left : param;

      if (target.type !== 'Identifier') return;

      check(target, target.name, isBooleanType(target.typeAnnotation) || (param.type === 'AssignmentPattern' && isBooleanInit(param.right)));
    };

    const checkFunction = (node) => node.params.forEach(checkParam);

    const checkProperty = (node) => {
      if (node.computed || node.key.type !== 'Identifier') return;

      check(node.key, node.key.name, isBooleanType(node.typeAnnotation) || isBooleanInit(node.value));
    };

    return {
      VariableDeclarator(node) {
        if (node.id.type !== 'Identifier') return;

        check(node.id, node.id.name, isBooleanType(node.id.typeAnnotation) || isBooleanInit(node.init));
      },
      FunctionDeclaration: checkFunction,
      FunctionExpression: checkFunction,
      ArrowFunctionExpression: checkFunction,
      PropertyDefinition: checkProperty,
      TSPropertySignature: checkProperty,
    };
  },
};
