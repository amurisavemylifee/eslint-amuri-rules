// Functions take at most `max` parameters (default 3); more than that — pass an options object.
// A TypeScript `this` parameter is not counted.
//
// WRONG: function create(a, b, c, d) {}       // max: 3
// OK:    function create(a, b, c) {}
// OK:    function create(options) {}
export default {
  meta: {
    type: 'suggestion',
    schema: [{ type: 'object', properties: { max: { type: 'integer', minimum: 0 } }, additionalProperties: false }],
    messages: {
      tooMany: 'Function has {{count}} parameters, max is {{max}}. Pass an options object instead.',
    },
  },
  create(context) {
    const max = context.options[0]?.max ?? 3;

    const check = (node) => {
      const count = node.params.filter((param) => !(param.type === 'Identifier' && param.name === 'this')).length;

      if (count <= max) return;

      context.report({ node, loc: node.params[max].loc, messageId: 'tooMany', data: { count, max } });
    };

    return { FunctionDeclaration: check, FunctionExpression: check, ArrowFunctionExpression: check };
  },
};
