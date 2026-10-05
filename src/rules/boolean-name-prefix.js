// Boolean variables, parameters and properties must be named with a boolean prefix:
// is, has, can, should, will, did, does, are, was, were (followed by an uppercase letter).
// Type-aware: the checker decides, so the rule does nothing without type information
// (`typeAware` config). Option `{ prefixes: ['is', 'has'] }` replaces the default list. Any `boolean` / `true` / `false` type, optionally with `null` /
// `undefined` (`isOpen?: boolean`), counts as boolean.
//
// WRONG: const active = true;
// WRONG: const loaded = check();   // check(): boolean
// WRONG: function f(open: boolean) {}
// OK:    const isActive = true;
// OK:    const hasItems = items.length > 0;
// OK:    const IS_DEBUG = false;
import { createBooleanPrefixes, isBooleanType, PREFIXES_SCHEMA } from '../utils/boolean.js';

export default {
  meta: {
    type: 'suggestion',
    schema: PREFIXES_SCHEMA,
    messages: {
      booleanPrefix: 'Boolean "{{name}}" must start with one of: {{prefixes}} (e.g. {{hint}}).',
    },
  },
  create(context) {
    const prefixes = createBooleanPrefixes(context.options[0]);
    const services = context.sourceCode.parserServices;
    const checker = services?.program?.getTypeChecker();

    if (!checker) return {};

    const check = (idNode) => {
      const { name } = idNode;

      if (prefixes.has(name)) return;
      if (!isBooleanType(checker.getTypeAtLocation(services.esTreeNodeToTSNodeMap.get(idNode)))) return;

      context.report({
        node: idNode,
        messageId: 'booleanPrefix',
        data: { name, prefixes: prefixes.list, hint: prefixes.hint(name) },
      });
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
