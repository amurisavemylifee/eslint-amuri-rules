// Functions and methods that return `boolean` must be named with a boolean prefix
// (is, has, can, should, will, did, does, are, was, were). Type-aware: the checker decides
// from the return type, so the rule does nothing without type information (`typeAware` config).
// Type predicates (`x is Foo`) count as `boolean`; `Promise<boolean>` does not.
//
// WRONG: function active(user: IUser): boolean {}
// WRONG: const empty = (list: string[]) => list.length === 0;
// OK:    function isActive(user: IUser): boolean {}
// OK:    const isEmpty = (list: string[]) => list.length === 0;
import { booleanHint, hasBooleanPrefix, isBooleanType, PREFIX_LIST } from '../utils/boolean.js';

const nameNode = (fn) => {
  const { parent } = fn;

  if (fn.type === 'FunctionDeclaration') return fn.id;
  if (parent.type === 'VariableDeclarator' && parent.init === fn && parent.id.type === 'Identifier') return parent.id;

  const isMember =
    (parent.type === 'MethodDefinition' && parent.kind === 'method') ||
    (parent.type === 'Property' && parent.value === fn && parent.kind === 'init') ||
    (parent.type === 'PropertyDefinition' && parent.value === fn);

  return isMember && !parent.computed && parent.key.type === 'Identifier' ? parent.key : null;
};

export default {
  meta: {
    type: 'suggestion',
    schema: [],
    messages: {
      booleanFunctionPrefix: 'Function "{{name}}" returns boolean, so it must start with one of: {{prefixes}} (e.g. {{hint}}).',
    },
  },
  create(context) {
    const services = context.sourceCode.parserServices;
    const checker = services?.program?.getTypeChecker();

    if (!checker) return {};

    const check = (fn) => {
      const id = nameNode(fn);

      if (!id || hasBooleanPrefix(id.name)) return;

      const signature = checker.getSignatureFromDeclaration(services.esTreeNodeToTSNodeMap.get(fn));

      if (!signature || !isBooleanType(checker.getReturnTypeOfSignature(signature))) return;

      context.report({
        node: id,
        messageId: 'booleanFunctionPrefix',
        data: { name: id.name, prefixes: PREFIX_LIST, hint: booleanHint(id.name) },
      });
    };

    return { FunctionDeclaration: check, FunctionExpression: check, ArrowFunctionExpression: check };
  },
};
