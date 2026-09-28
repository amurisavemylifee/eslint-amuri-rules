// Forbids inline exports — all named exports must go through `export { }`.
//
// WRONG: export function createKeybinds() { ... }
// WRONG: export const foo = 1
// WRONG: export class Foo {}
// WRONG: export interface Bar {}
// WRONG: export type Baz = string
//
// OK:    export { createKeybinds }
// OK:    export type { Bar, Baz }
// OK:    export { foo } from './foo'
// OK:    export default ...
//
// Auto-fix: strips the `export` keyword from the declaration.
// You still need to add the name to an `export { }` block manually.
export default {
  meta: {
    type: 'suggestion',
    fixable: 'code',
    schema: [],
    messages: {
      noInlineExport:
        'Move "{{name}}" out of the declaration and into an `export { {{name}} }` block.',
    },
  },
  create(context) {
    const src = context.sourceCode ?? context.getSourceCode();

    function exportedName(declaration) {
      if (!declaration) return null;

      if (declaration.id?.name) return declaration.id.name;

      if (declaration.type === 'VariableDeclaration' && declaration.declarations.length === 1) {
        const { id } = declaration.declarations[0];

        if (id.type === 'Identifier') return id.name;
      }

      return null;
    }

    return {
      ExportNamedDeclaration(node) {
        if (!node.declaration) return;

        const name = exportedName(node.declaration) ?? '…';

        context.report({
          node,
          messageId: 'noInlineExport',
          data: { name },
          fix(fixer) {
            const exportToken = src.getFirstToken(node);
            const nextToken = src.getTokenAfter(exportToken);

            return fixer.removeRange([exportToken.range[0], nextToken.range[0]]);
          },
        });
      },
    };
  },
};
