// Prevents multiple import/re-export statements of the same kind from the same module.
//
// Allows:  import type { A } from './m'  +  import { B } from './m'   (different kinds)
// Errors:  import type { A } from './m'  +  import type { B } from './m' → merge!
//          export { A } from './m'       +  export { B } from './m'      → merge!
export default {
  meta: {
    type: 'suggestion',
    fixable: 'code',
    schema: [],
    messages: {
      duplicateImport: "Duplicate {{kind}} from '{{module}}'. Merge into one statement.",
      duplicateReexport:
        "Duplicate {{kind}} re-export from '{{module}}'. Merge into one statement.",
    },
  },
  create(context) {
    const src = context.sourceCode ?? context.getSourceCode();

    const imports = new Map();

    const reexports = new Map();

    function track(map, module, kind, node) {
      if (!map.has(module)) map.set(module, { value: [], type: [] });

      const key = kind === 'type' ? 'type' : 'value';

      map.get(module)[key].push(node);
    }

    function mergeIntoFirst(fixer, first, dup) {
      const specifiers = dup.specifiers.map((s) => src.getText(s)).join(', ');

      const closing = src.getLastToken(first, (t) => t.value === '}');

      const insertion = first.specifiers.length > 0 ? `, ${specifiers}` : specifiers;

      // Remove duplicate including its leading newline
      const tokenBefore = src.getTokenBefore(dup, { includeComments: false });

      const removeStart = tokenBefore ? tokenBefore.range[1] : dup.range[0];

      return [
        fixer.insertTextBefore(closing, insertion),
        fixer.removeRange([removeStart, dup.range[1]]),
      ];
    }

    function reportDuplicates(map, messageId) {
      for (const [module, groups] of map) {
        for (const [kind, nodes] of Object.entries(groups)) {
          if (nodes.length <= 1) continue;

          const first = nodes[0];

          for (let i = 1; i < nodes.length; i++) {
            const dup = nodes[i];

            context.report({
              node: dup,
              messageId,
              data: {
                kind: kind === 'type' ? 'type' : 'value',
                module,
              },
              fix: (fixer) => mergeIntoFirst(fixer, first, dup),
            });
          }
        }
      }
    }

    return {
      ImportDeclaration(node) {
        track(imports, node.source.value, node.importKind, node);
      },

      ExportNamedDeclaration(node) {
        if (!node.source) return;

        track(reexports, node.source.value, node.exportKind, node);
      },

      'Program:exit'() {
        reportDuplicates(imports, 'duplicateImport');
        reportDuplicates(reexports, 'duplicateReexport');
      },
    };
  },
};
