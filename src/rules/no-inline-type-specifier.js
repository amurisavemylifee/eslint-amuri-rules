// Prevents inline `type` keyword in import/export specifiers.
// Forces dedicated statements instead:
//   import { type Foo }   → import type { Foo }
//   export { type Foo }   → export type { Foo }
export default {
  meta: {
    type: 'suggestion',
    fixable: 'code',
    schema: [],
    messages: {
      inlineTypeImport: 'Use `import type { {{name}} }` instead of inline `type` annotation.',
      inlineTypeExport: 'Use `export type { {{name}} }` instead of inline `type` annotation.',
    },
  },
  create(context) {
    const src = context.sourceCode ?? context.getSourceCode();

    function checkSpecifiers(specifiers, messageId) {
      for (const specifier of specifiers) {
        if (specifier.type !== 'ImportSpecifier' && specifier.type !== 'ExportSpecifier') continue;

        if (!specifier.importKind && !specifier.exportKind) continue;

        const kind = specifier.importKind ?? specifier.exportKind;

        if (kind !== 'type') continue;

        context.report({
          node: specifier,
          messageId,
          data: { name: specifier.local.name },
          fix(fixer) {
            // Remove the `type ` keyword from the specifier
            const typeToken = src.getFirstToken(specifier);

            const nextToken = src.getTokenAfter(typeToken);

            return fixer.removeRange([typeToken.range[0], nextToken.range[0]]);
          },
        });
      }
    }

    return {
      ImportDeclaration(node) {
        checkSpecifiers(node.specifiers, 'inlineTypeImport');
      },
      ExportNamedDeclaration(node) {
        checkSpecifiers(node.specifiers, 'inlineTypeExport');
      },
    };
  },
};
