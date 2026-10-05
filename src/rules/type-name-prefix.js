// Interfaces must be named `I` + PascalCase, type aliases `T` + PascalCase,
// enums `E` + PascalCase, generic parameters `T` or `T` + PascalCase.
//
// WRONG: interface Instructions {}
// WRONG: interface Itrain {}
// WRONG: type Train = {}
// OK:    interface IInstructions {}
// WRONG: enum Direction {}
//
// WRONG: function f<Key>() {}
//
// OK:    type TTrain = {}
// OK:    function f<T, TKey>() {}
// OK:    enum EDirection {}
// Prefixes are configurable: `{ interface: 'I', type: 'T', enum: 'E', generic: 'T' }` (all optional).
const DEFAULTS = { interface: 'I', type: 'T', enum: 'E', generic: 'T' };

export default {
  meta: {
    type: 'suggestion',
    schema: [
      {
        type: 'object',
        properties: Object.fromEntries(Object.keys(DEFAULTS).map((key) => [key, { type: 'string' }])),
        additionalProperties: false,
      },
    ],
    messages: {
      interfacePrefix: 'Interface "{{name}}" must start with "{{prefix}}" followed by an uppercase letter (e.g. {{prefix}}{{hint}}).',
      genericPrefix: 'Generic parameter "{{name}}" must be "{{prefix}}" or start with "{{prefix}}" followed by an uppercase letter (e.g. {{prefix}}{{hint}}).',
      enumPrefix: 'Enum "{{name}}" must start with "{{prefix}}" followed by an uppercase letter (e.g. {{prefix}}{{hint}}).',
      typePrefix: 'Type "{{name}}" must start with "{{prefix}}" followed by an uppercase letter (e.g. {{prefix}}{{hint}}).',
    },
  },
  create(context) {
    const prefixes = { ...DEFAULTS, ...context.options[0] };
    const hint = (name) => name[0].toUpperCase() + name.slice(1);

    const check = (kind, messageId) => (node) => {
      const prefix = prefixes[kind];
      const { name } = node.id;

      if (new RegExp(`^${prefix}[A-Z]`).test(name)) return;

      context.report({ node: node.id, messageId, data: { name, prefix, hint: hint(name) } });
    };

    return {
      TSInterfaceDeclaration: check('interface', 'interfacePrefix'),
      TSTypeParameter(node) {
        const { name } = node.name;

        if (new RegExp(`^${prefixes.generic}([A-Z]|$)`).test(name)) return;

        context.report({
          node: node.name,
          messageId: 'genericPrefix',
          data: { name, prefix: prefixes.generic, hint: hint(name) },
        });
      },
      TSEnumDeclaration: check('enum', 'enumPrefix'),
      TSTypeAliasDeclaration: check('type', 'typePrefix'),
    };
  },
};
