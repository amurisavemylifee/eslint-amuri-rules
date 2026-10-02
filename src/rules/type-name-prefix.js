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
export default {
  meta: {
    type: 'suggestion',
    schema: [],
    messages: {
      interfacePrefix: 'Interface "{{name}}" must start with "I" followed by an uppercase letter (e.g. I{{hint}}).',
      genericPrefix: 'Generic parameter "{{name}}" must be "T" or start with "T" followed by an uppercase letter (e.g. T{{hint}}).',
      enumPrefix: 'Enum "{{name}}" must start with "E" followed by an uppercase letter (e.g. E{{hint}}).',
      typePrefix: 'Type "{{name}}" must start with "T" followed by an uppercase letter (e.g. T{{hint}}).',
    },
  },
  create(context) {
    const hint = (name) => name[0].toUpperCase() + name.slice(1);

    const check = (prefix, messageId) => (node) => {
      const { name } = node.id;

      if (new RegExp(`^${prefix}[A-Z]`).test(name)) return;

      context.report({ node: node.id, messageId, data: { name, hint: hint(name) } });
    };

    return {
      TSInterfaceDeclaration: check('I', 'interfacePrefix'),
      TSTypeParameter(node) {
        const { name } = node.name;

        if (/^T([A-Z]|$)/.test(name)) return;

        context.report({ node: node.name, messageId: 'genericPrefix', data: { name, hint: hint(name) } });
      },
      TSEnumDeclaration: check('E', 'enumPrefix'),
      TSTypeAliasDeclaration: check('T', 'typePrefix'),
    };
  },
};
