// Enforces that re-exports come BEFORE local exports, with a blank line separating them.
//
// ✅ Correct order at the bottom of a file:
//   export { A } from './m';    ← re-exports first
//   export type { B } from './m';
//                               ← blank line always
//   export { x };               ← local exports last
//   export type { T };
export default {
  meta: {
    type: 'suggestion',
    fixable: 'code',
    schema: [],
    messages: {
      localBeforeReexport:
        'Local export must come after all re-exports. Move this below the re-export block.',
      missingBlankLine: 'Expected a blank line between the re-export block and local exports.',
    },
  },
  create(context) {
    const src = context.sourceCode ?? context.getSourceCode();

    const localExports = [];

    const reexports = [];

    return {
      ExportNamedDeclaration(node) {
        if (node.source) reexports.push(node);
        else localExports.push(node);
      },

      'Program:exit'() {
        if (localExports.length === 0 || reexports.length === 0) return;

        const lastReexportNode = reexports.reduce((a, b) =>
          a.loc.end.line > b.loc.end.line ? a : b,
        );

        const firstLocalNode = localExports.reduce((a, b) =>
          a.loc.start.line < b.loc.start.line ? a : b,
        );

        // Local export appears before a re-export → move it after the last re-export
        for (const local of localExports) {
          const hasReexportAfter = reexports.some((re) => re.loc.start.line > local.loc.start.line);

          if (!hasReexportAfter) continue;

          context.report({
            node: local,
            messageId: 'localBeforeReexport',
            fix(fixer) {
              const text = src.getText(local);

              const tokenBefore = src.getTokenBefore(local, { includeComments: false });

              const removeStart = tokenBefore ? tokenBefore.range[1] : local.range[0];

              return [
                fixer.removeRange([removeStart, local.range[1]]),
                fixer.insertTextAfter(lastReexportNode, '\n\n' + text),
              ];
            },
          });
        }

        // No blank line between last re-export and first local export
        const gap = firstLocalNode.loc.start.line - lastReexportNode.loc.end.line;

        if (gap < 2) {
          context.report({
            node: firstLocalNode,
            messageId: 'missingBlankLine',
            fix: (fixer) => fixer.insertTextBefore(firstLocalNode, '\n'),
          });
        }
      },
    };
  },
};
