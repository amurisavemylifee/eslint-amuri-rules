// Enforces that for the same module path, value import/export comes before type.
//
// ✅ import { bar } from './m';       ❌ import type { Foo } from './m';
//    import type { Foo } from './m';     import { bar } from './m';
//
// ✅ export { bar };                  ❌ export type { Foo };
//    export type { Foo };                export { bar };
//
// ✅ export { bar } from './m';       ❌ export type { Foo } from './m';
//    export type { Foo } from './m';     export { bar } from './m';
export default {
  meta: {
    type: 'suggestion',
    fixable: 'code',
    schema: [],
    messages: {
      typeBeforeValue:
        "{{kind}} type statement must come after the value statement for '{{path}}'.",
    },
  },
  create(context) {
    const src = context.sourceCode ?? context.getSourceCode();

    // imports[path] = { value: node | null, type: node | null }
    const imports = new Map();

    // reexports[path] = { value: node | null, type: node | null }
    const reexports = new Map();

    // local exports (no source)
    let localValueExport = null;

    let localTypeExport = null;

    function track(map, path, kind, node) {
      if (!map.has(path)) map.set(path, { value: null, type: null });

      map.get(path)[kind] = node;
    }

    function checkOrder(valueNode, typeNode, pathLabel) {
      if (!valueNode || !typeNode) return;

      if (typeNode.range[0] < valueNode.range[0]) {
        context.report({
          node: typeNode,
          messageId: 'typeBeforeValue',
          data: { kind: pathLabel ? 'Re-export' : 'Export', path: pathLabel ?? 'local' },
          fix(fixer) {
            const typeText = src.getText(typeNode);

            const tokenBefore = src.getTokenBefore(typeNode, { includeComments: false });

            const removeStart = tokenBefore ? tokenBefore.range[1] : typeNode.range[0];

            return [
              fixer.removeRange([removeStart, typeNode.range[1]]),
              fixer.insertTextAfter(valueNode, '\n' + typeText),
            ];
          },
        });
      }
    }

    return {
      ImportDeclaration(node) {
        track(imports, node.source.value, node.importKind, node);
      },

      ExportNamedDeclaration(node) {
        if (node.source) {
          track(reexports, node.source.value, node.exportKind, node);
        } else {
          if (node.exportKind === 'type') localTypeExport = node;
          else localValueExport = node;
        }
      },

      'Program:exit'() {
        for (const [path, { value, type }] of imports) {
          checkOrder(value, type, path);
        }

        checkOrder(localValueExport, localTypeExport, null);

        for (const [path, { value, type }] of reexports) {
          checkOrder(value, type, path);
        }
      },
    };
  },
};
