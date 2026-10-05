// `as const` constants must be UPPER_SNAKE_CASE, and UPPER_SNAKE_CASE object/array
// constants must be `as const`. Primitives are already inferred as literals, so
// `const MAX_RETRIES = 3` is fine without `as const`.
//
// WRONG: const directions = { up: 'UP' } as const
// WRONG: const DIRECTIONS = { up: 'UP' }
// WRONG: const LIST = [1, 2]
//
// OK:    const DIRECTIONS = { up: 'UP' } as const
// OK:    const MAX_RETRIES = 3
//
// Top-level (module scope) constants initialised with a plain literal — string, number,
// boolean, template without expressions — never change, so they are UPPER_SNAKE_CASE too.
//
// WRONG: const rootClassName = 'tw:flex';
// OK:    const ROOT_CLASS_NAME = 'tw:flex';
// OK:    function f() { const label = 'x'; }   // not module scope
//
// Destructuring and declarations without an initializer are ignored.
const UPPER_SNAKE = /^[A-Z][A-Z0-9]*(_[A-Z0-9]+)*$/;

const isConstType = (type) =>
  type.type === 'TSTypeReference' && type.typeName.type === 'Identifier' && type.typeName.name === 'const';

const isObjectLiteral = (node) => node.type === 'ObjectExpression' || node.type === 'ArrayExpression';

const isAsConst = (node) => {
  switch (node.type) {
    case 'TSAsExpression':
    case 'TSTypeAssertion':
      return isConstType(node.typeAnnotation) || isAsConst(node.expression);
    case 'TSSatisfiesExpression':
    case 'TSNonNullExpression':
      return isAsConst(node.expression);
    default:
      return false;
  }
};

const isLiteral = (node) => {
  if (node.type === 'Literal') return node.value !== null && !node.regex && !node.bigint;
  if (node.type === 'TemplateLiteral') return node.expressions.length === 0;
  if (node.type === 'UnaryExpression') return (node.operator === '-' || node.operator === '+') && isLiteral(node.argument);

  return false;
};

const isModuleScope = (node) => {
  const { parent } = node;

  return parent.type === 'Program' || (parent.type === 'ExportNamedDeclaration' && parent.parent.type === 'Program');
};

export default {
  meta: {
    type: 'suggestion',
    schema: [],
    messages: {
      notUpperSnake: '`as const` constant "{{name}}" must be UPPER_SNAKE_CASE.',
      notUpperSnakeLiteral: 'Top-level constant "{{name}}" must be UPPER_SNAKE_CASE.',
      notAsConst: 'UPPER_SNAKE_CASE object/array constant "{{name}}" must be declared `as const`.',
    },
  },
  create(context) {
    return {
      VariableDeclaration(node) {
        if (node.kind !== 'const') return;

        for (const { id, init } of node.declarations) {
          if (id.type !== 'Identifier' || !init) continue;

          const { name } = id;
          const upper = UPPER_SNAKE.test(name);
          const asConst = isAsConst(init);

          if (asConst && !upper) {
            context.report({ node: id, messageId: 'notUpperSnake', data: { name } });
          } else if (!upper && isModuleScope(node) && isLiteral(init)) {
            context.report({ node: id, messageId: 'notUpperSnakeLiteral', data: { name } });
          } else if (upper && !asConst && isObjectLiteral(init)) {
            context.report({ node: id, messageId: 'notAsConst', data: { name } });
          }
        }
      },
    };
  },
};
