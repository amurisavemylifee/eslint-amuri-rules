// Ensures imports and re-exports from the same path are adjacent.
// No imports/re-exports from other paths may appear between them.
//
// ✅ import { A } from './m';
//    import type { B } from './m';   ← adjacent, OK
//    import { C } from './other';
//
// ❌ import { A } from './m';
//    import { C } from './other';    ← breaks adjacency
//    import type { B } from './m';
export default {
  meta: {
    type: 'suggestion',
    fixable: 'code',
    schema: [],
    messages: {
      nonAdjacent:
        "{{kind}} from '{{path}}' must be adjacent to the other {{kind}} from the same path.",
    },
  },
  create(context) {
    const src = context.sourceCode ?? context.getSourceCode();

    function checkAdjacency(nodes, getPath, kind) {
      // Only one value + one type per path (no-duplicate-same-kind guarantees this),
      // so we only need to check pairs.
      const seen = new Map(); // path → index of first occurrence

      for (let j = 0; j < nodes.length; j++) {
        const path = getPath(nodes[j]);

        if (!seen.has(path)) {
          seen.set(path, j);

          continue;
        }

        const i = seen.get(path);

        // There are nodes from OTHER paths between i and j
        const hasGap = nodes.slice(i + 1, j).some((n) => getPath(n) !== path);

        if (!hasGap) continue;

        context.report({
          node: nodes[j],
          messageId: 'nonAdjacent',
          data: { kind, path },
          fix(fixer) {
            const text = src.getText(nodes[j]);

            const tokenBefore = src.getTokenBefore(nodes[j], { includeComments: false });

            const removeStart = tokenBefore ? tokenBefore.range[1] : nodes[j].range[0];

            return [
              fixer.removeRange([removeStart, nodes[j].range[1]]),
              fixer.insertTextAfter(nodes[i], '\n' + text),
            ];
          },
        });
      }
    }

    return {
      'Program:exit'(program) {
        const imports = program.body.filter((n) => n.type === 'ImportDeclaration');

        checkAdjacency(imports, (n) => n.source.value, 'import');

        const reexports = program.body.filter(
          (n) => n.type === 'ExportNamedDeclaration' && n.source,
        );

        checkAdjacency(reexports, (n) => n.source.value, 're-export');
      },
    };
  },
};
