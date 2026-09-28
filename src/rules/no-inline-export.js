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
// Auto-fix: strips the `export` keyword and adds the name to the local `export { }` /
// `export type { }` block (an existing one is extended, otherwise a new one is appended to
// the end of the file). Declarations that cannot be moved safely (several declarators,
// `declare`, overloads, destructuring) are reported without a fix.
const VALUE_KINDS = new Set(['FunctionDeclaration', 'ClassDeclaration', 'TSEnumDeclaration']);

const TYPE_KINDS = new Set(['TSTypeAliasDeclaration', 'TSInterfaceDeclaration']);

const isLocalBlock = (node) =>
  node.type === 'ExportNamedDeclaration' && !node.declaration && !node.source;

const inlineExport = (node) => {
  const declaration = node.declaration;

  if (declaration.declare) return null;

  if (VALUE_KINDS.has(declaration.type) && declaration.id) {
    return { name: declaration.id.name, isType: false };
  }

  if (TYPE_KINDS.has(declaration.type)) return { name: declaration.id.name, isType: true };

  if (declaration.type === 'VariableDeclaration' && declaration.declarations.length === 1) {
    const { id } = declaration.declarations[0];

    if (id.type === 'Identifier') return { name: id.name, isType: false };
  }

  return null;
};

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

    const items = [];

    const blocks = [];

    const blockedNames = new Set();

    function buildFix(fixer, movable) {
      const fixes = [];

      const additions = { value: [], type: [] };

      for (const { node, name, isType } of movable) {
        const exportToken = src.getTokens(node).find((t) => t.value === 'export');

        fixes.push(fixer.removeRange([exportToken.range[0], src.getTokenAfter(exportToken).range[0]]));

        additions[isType ? 'type' : 'value'].push(name);
      }

      let appended = '';

      for (const kind of ['value', 'type']) {
        const names = additions[kind];

        if (names.length === 0) continue;

        const block = blocks.find((b) => (b.exportKind === 'type') === (kind === 'type'));

        const last = block?.specifiers[block.specifiers.length - 1];

        if (last) {
          fixes.push(fixer.insertTextAfter(last, `, ${names.join(', ')}`));
        } else {
          appended += `\nexport ${kind === 'type' ? 'type ' : ''}{ ${names.join(', ')} };\n`;
        }
      }

      if (appended) {
        const end = src.text.length;

        fixes.push(fixer.insertTextAfterRange([end, end], (src.text.endsWith('\n') ? '' : '\n') + appended));
      }

      return fixes;
    }

    return {
      ExportNamedDeclaration(node) {
        if (isLocalBlock(node)) {
          blocks.push(node);

          return;
        }

        if (!node.declaration) return;

        const info = inlineExport(node);

        if (!info && node.declaration.id?.name) blockedNames.add(node.declaration.id.name);

        items.push({ node, info });
      },

      'Program:exit'() {
        const movable = items
          .filter(({ info }) => info && !blockedNames.has(info.name))
          .map(({ node, info }) => ({ node, ...info }));

        for (const { node, info } of items) {
          const fixable = info && !blockedNames.has(info.name);

          context.report({
            node,
            messageId: 'noInlineExport',
            data: { name: info?.name ?? node.declaration.id?.name ?? '…' },
            // Every fixable report carries the same whole-file fix, so one pass converges.
            fix: fixable ? (fixer) => buildFix(fixer, movable) : null,
          });
        }
      },
    };
  },
};
