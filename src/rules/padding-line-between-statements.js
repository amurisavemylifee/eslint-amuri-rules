// ESLint's `padding-line-between-statements` with one exception: a blank line is not required
// before a declaration of the same kind (`type`, `interface`, `const`, `let`) when the previous
// statement is a single-line declaration of that kind — the next one may be single- or multiline.
// Different kinds (type next to interface) and a blank line after a multiline declaration still
// follow the configured padding. Options are the core rule's.
//
// ✅ type TA = string;
//    type TB = number;
//    type TC = {
//      a: string;
//    };
//
// ✅ const a = 1;
//    const b = {
//      c: 2,
//    };
//
// ❌ type TA = string;
//    interface IB { a: string }   ← blank line required, different kind
//
// ❌ type TA = {
//      a: string;
//    };
//    type TB = number;      ← blank line required, TA is multiline
import { builtinRules } from 'eslint/use-at-your-own-risk';

const core = builtinRules.get('padding-line-between-statements');

const unwrap = (node) => (node.type === 'ExportNamedDeclaration' && node.declaration ? node.declaration : node);

const declarationKind = (node) => {
  const { type, kind } = unwrap(node);

  if (type === 'TSTypeAliasDeclaration' || type === 'TSInterfaceDeclaration') return type;

  return type === 'VariableDeclaration' && (kind === 'const' || kind === 'let') ? kind : null;
};

const isSingleLine = (node) => {
  const { loc } = unwrap(node);

  return loc.start.line === loc.end.line;
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

          const kind = prev && isSingleLine(prev) ? declarationKind(prev) : null;

          if (kind && kind === declarationKind(node)) return;

          context.report(descriptor);
        },
      },
    });

    return core.create(filtered);
  },
};
