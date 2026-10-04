// Class names must be PascalCase: start with an uppercase letter, no underscores or `$`.
//
// WRONG: class userService {}
// WRONG: class User_service {}
// WRONG: class _Base {}
// OK:    class UserService {}
// OK:    class HTTPClient {}
const PASCAL_CASE = /^[A-Z][A-Za-z0-9]*$/;

const toPascal = (name) =>
  name
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join('');

export default {
  meta: {
    type: 'suggestion',
    schema: [],
    messages: {
      pascalCase: 'Class "{{name}}" must be PascalCase (e.g. {{hint}}).',
    },
  },
  create(context) {
    const check = (node) => {
      if (!node.id) return;

      const { name } = node.id;

      if (PASCAL_CASE.test(name)) return;

      context.report({ node: node.id, messageId: 'pascalCase', data: { name, hint: toPascal(name) || 'Foo' } });
    };

    return { ClassDeclaration: check, ClassExpression: check };
  },
};
