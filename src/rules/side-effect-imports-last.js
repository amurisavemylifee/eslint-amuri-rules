// Side-effect imports (`import './polyfill';`) go after all other imports.
//
// ✅ import React from 'react';       ❌ import './polyfill';
//    import './polyfill';                import React from 'react';
export default {
  meta: {
    type: 'suggestion',
    fixable: 'code',
    schema: [],
    messages: {
      sideEffectNotLast: 'Side-effect import must come after all other imports.',
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

        const misplaced = imports.filter(
          (n) => n.specifiers.length === 0 && n.range[0] < lastRegular.range[0],
        );

        if (misplaced.length === 0) return;

        // One fix moves all of them, keeping their relative order (side effects are order-sensitive)
        context.report({
          node: misplaced[0],
          messageId: 'sideEffectNotLast',
          fix(fixer) {
            const text = misplaced.map((n) => src.getText(n)).join('\n');

            const removals = misplaced.map((n) => {
              const tokenBefore = src.getTokenBefore(n, { includeComments: false });

              return fixer.removeRange([tokenBefore ? tokenBefore.range[1] : n.range[0], n.range[1]]);
            });

            return [...removals, fixer.insertTextAfter(lastRegular, '\n' + text)];
          },
        });
      },
    };
  },
};
