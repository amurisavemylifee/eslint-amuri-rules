// Prevents inline `type` keyword in import/export specifiers.
// Forces dedicated statements instead:
//   import { a, type Foo }   → import { a };  import type { Foo };
//   export { a, type Foo }   → export { a };  export type { Foo };
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

    const isInlineType = (s) =>
      (s.type === 'ImportSpecifier' || s.type === 'ExportSpecifier') &&
      (s.importKind ?? s.exportKind) === 'type';

    const bare = (s) => src.getText(s).replace(/^type\s+/, '');

    // Splits the declaration into a value statement and a type statement.
    function rewrite(fixer, node, keyword) {
      if (node.attributes?.length) return null;

      const types = node.specifiers.filter(isInlineType).map(bare);

      const rest = node.specifiers.filter((s) => !isInlineType(s));

      const from = node.source ? ` from ${src.getText(node.source)}` : '';

      const defaultSpecifier = rest.find((s) => s.type === 'ImportDefaultSpecifier');

      const named = rest.filter((s) => s !== defaultSpecifier).map((s) => src.getText(s));

      const valueParts = [
        defaultSpecifier && src.getText(defaultSpecifier),
        named.length > 0 && `{ ${named.join(', ')} }`,
      ].filter(Boolean);

      const statements = [];

      if (valueParts.length > 0) statements.push(`${keyword} ${valueParts.join(', ')}${from};`);

      statements.push(`${keyword} type { ${types.join(', ')} }${from};`);

      return fixer.replaceText(node, statements.join('\n'));
    }

    function check(node, keyword, messageId) {
      for (const specifier of node.specifiers.filter(isInlineType)) {
        context.report({
          node: specifier,
          messageId,
          data: { name: specifier.local.name },
          // Every report of one declaration carries the same whole-declaration fix.
          fix: (fixer) => rewrite(fixer, node, keyword),
        });
      }
    }

    return {
      ImportDeclaration(node) {
        if (node.importKind === 'type') return;

        check(node, 'import', 'inlineTypeImport');
      },
      ExportNamedDeclaration(node) {
        if (node.exportKind === 'type') return;

        check(node, 'export', 'inlineTypeExport');
      },
    };
  },
};
