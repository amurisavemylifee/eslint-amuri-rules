// Boolean variables, parameters and properties must be named with a boolean prefix:
// is, has, can, should, will, did, does, are, was, were (followed by an uppercase letter).
// Type-aware: the checker decides, so the rule does nothing without type information
// (`typeAware` config). Any `boolean` / `true` / `false` type, optionally with `null` /
// `undefined` (`isOpen?: boolean`), counts as boolean.
//
// WRONG: const active = true;
// WRONG: const loaded = check();   // check(): boolean
// WRONG: function f(open: boolean) {}
// OK:    const isActive = true;
// OK:    const hasItems = items.length > 0;
// OK:    const IS_DEBUG = false;
import ts from 'typescript';

const PREFIXES = ['is', 'has', 'can', 'should', 'will', 'did', 'does', 'are', 'was', 'were'];
const PREFIXED = new RegExp(`^_*(?:${PREFIXES.join('|')})(?:[A-Z0-9]|$)`);
const PREFIXED_UPPER = new RegExp(`^_*(?:${PREFIXES.join('|').toUpperCase()})(?:_|$)`);
const NULLISH = ts.TypeFlags.Null | ts.TypeFlags.Undefined | ts.TypeFlags.Void;

const isBooleanType = (type) => {
  const parts = (type.isUnion() ? type.types : [type]).filter((part) => (part.flags & NULLISH) === 0);

  return parts.length > 0 && parts.every((part) => (part.flags & ts.TypeFlags.BooleanLike) !== 0);
};

export default {
  meta: {
    type: 'suggestion',
    schema: [],
    messages: {
      booleanPrefix: 'Boolean "{{name}}" must start with one of: {{prefixes}} (e.g. {{hint}}).',
    },
  },
  create(context) {
    const services = context.sourceCode.parserServices;
    const checker = services?.program?.getTypeChecker();

    if (!checker) return {};

    const prefixes = PREFIXES.join(', ');

    const check = (idNode) => {
      const { name } = idNode;

      if (PREFIXED.test(name) || PREFIXED_UPPER.test(name)) return;
      if (!isBooleanType(checker.getTypeAtLocation(services.esTreeNodeToTSNodeMap.get(idNode)))) return;

      const bare = name.replace(/^_+/, '');
      const hint = /^[A-Z0-9_]+$/.test(bare) ? `IS_${bare}` : `is${bare[0].toUpperCase()}${bare.slice(1)}`;

      context.report({ node: idNode, messageId: 'booleanPrefix', data: { name, prefixes, hint } });
    };

    const checkParam = (param) => {
      const target = param.type === 'AssignmentPattern' ? param.left : param;

      if (target.type === 'Identifier') check(target);
    };

    const checkFunction = (node) => node.params.forEach(checkParam);

    const checkProperty = (node) => {
      if (!node.computed && node.key.type === 'Identifier') check(node.key);
    };

    return {
      VariableDeclarator(node) {
        if (node.id.type === 'Identifier') check(node.id);
      },
      FunctionDeclaration: checkFunction,
      FunctionExpression: checkFunction,
      ArrowFunctionExpression: checkFunction,
      PropertyDefinition: checkProperty,
      TSPropertySignature: checkProperty,
    };
  },
};
