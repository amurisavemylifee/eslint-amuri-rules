// ESLint's `padding-line-between-statements` with one exception: consecutive single-line
// `type` / `interface` declarations need no blank line between them (like `const` / `let`).
// Multiline declarations still follow the configured padding. Options are the core rule's.
//
// ✅ type TA = string;
//    type TB = number;
//
// ❌ type TA = {
//      a: string;
//    };
//    type TB = number;      ← blank line required, TA is multiline
import { builtinRules } from 'eslint/use-at-your-own-risk';

const core = builtinRules.get('padding-line-between-statements');

const unwrap = (node) => (node.type === 'ExportNamedDeclaration' && node.declaration ? node.declaration : node);

const isSingleLineType = (node) => {
  const { type, loc } = unwrap(node);

  return (type === 'TSTypeAliasDeclaration' || type === 'TSInterfaceDeclaration') && loc.start.line === loc.end.line;
};

const previousSibling = (node) => {
  const siblings = node.parent?.body;

  return Array.isArray(siblings) ? siblings[siblings.indexOf(node) - 1] : undefined;
};

export default {
  meta: core.meta,
  create(context) {
    const filtered = Object.create(context, {
      report: {
        value(descriptor) {
          const { node } = descriptor;
          const prev = node && previousSibling(node);

          if (prev && isSingleLineType(prev) && isSingleLineType(node)) return;

          context.report(descriptor);
        },
      },
    });

    return core.create(filtered);
  },
};
