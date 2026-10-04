// Positional `boolean` parameters are forbidden: a call like `f(true, false)` says nothing.
// Pass an options object instead. Type-aware: does nothing without type information
// (`typeAware` config). `boolean | undefined` (optional flag) counts as boolean.
//
// WRONG: function render(items: string[], compact: boolean) {}
// WRONG: const toggle = (isOpen?: boolean) => {};
// OK:    function render(items: string[], options: { compact: boolean }) {}
import { isBooleanType } from '../utils/boolean.js';

export default {
  meta: {
    type: 'suggestion',
    schema: [],
    messages: {
      noBooleanParam: 'Parameter "{{name}}" is a positional boolean, pass an options object instead.',
    },
  },
  create(context) {
    const services = context.sourceCode.parserServices;
    const checker = services?.program?.getTypeChecker();

    if (!checker) return {};

    const checkParam = (param) => {
      const target = param.type === 'AssignmentPattern' ? param.left : param;

      if (target.type !== 'Identifier') return;
      if (!isBooleanType(checker.getTypeAtLocation(services.esTreeNodeToTSNodeMap.get(target)))) return;

      context.report({ node: target, messageId: 'noBooleanParam', data: { name: target.name } });
    };

    const checkFunction = (node) => node.params.forEach(checkParam);

    return { FunctionDeclaration: checkFunction, FunctionExpression: checkFunction, ArrowFunctionExpression: checkFunction };
  },
};
