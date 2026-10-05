// Side-effect imports (`import './polyfill';`) go after all other imports, separated by a blank line.
//
// ✅ import React from 'react';       ❌ import './polyfill';
//                                        import React from 'react';
//    import './polyfill';
export default {
  meta: {
    type: 'suggestion',
    fixable: 'code',
    schema: [],
    messages: {
      sideEffectNotLast: 'Side-effect import must come after all other imports.',
      missingBlankLine: 'Expected a blank line between the imports and the side-effect imports.',
    },
  },
  create(context) {
    const src = context.sourceCode ?? context.getSourceCode();

    return {
      'Program:exit'(program) {
        const imports = program.body.filter((n) => n.type === 'ImportDeclaration');

        const regular = imports.filter((n) => n.specifiers.length > 0);

        if (regular.length === 0) return;

        const lastRegular = regular[regular.length - 1];

        const sideEffects = imports.filter((n) => n.specifiers.length === 0);

        const misplaced = sideEffects.filter((n) => n.range[0] < lastRegular.range[0]);

        if (misplaced.length > 0) {
          // One fix moves all of them into one block, keeping their relative order
          // (side effects are order-sensitive)
          context.report({
            node: misplaced[0],
            messageId: 'sideEffectNotLast',
            fix(fixer) {
              const text = sideEffects.map((n) => src.getText(n)).join('\n');

              const removals = sideEffects.map((n) => {
                const tokenBefore = src.getTokenBefore(n, { includeComments: false });

                return fixer.removeRange([tokenBefore ? tokenBefore.range[1] : n.range[0], n.range[1]]);
              });

              return [...removals, fixer.insertTextAfter(lastRegular, '\n\n' + text)];
            },
          });

          return;
        }

        const first = sideEffects[0];

        if (first && first.loc.start.line - lastRegular.loc.end.line < 2) {
          context.report({
            node: first,
            messageId: 'missingBlankLine',
            fix: (fixer) => fixer.insertTextBefore(first, '\n'),
          });
        }
      },
    };
  },
};
