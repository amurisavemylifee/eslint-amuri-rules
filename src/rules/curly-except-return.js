// Requires braces for all if-bodies except bare `return;` guard clauses.
//   WRONG:  if (this.isAlive()) this.cam.pointAtCoord(x, y, z);
//   OK:     if (activeId === undefined) return;
export default {
  meta: {
    type: 'suggestion',
    fixable: 'code',
    schema: [],
    messages: {
      requireBraces: 'Wrap the if-body in braces. Only `return;` is allowed without braces.',
    },
  },
  create(context) {
    const src = context.sourceCode ?? context.getSourceCode();

    function isBareReturn(node) {
      return node.type === 'ReturnStatement' && node.argument === null;
    }

    function checkBranch(branch, ifNode) {
      if (!branch) return;

      if (branch.type === 'BlockStatement') return;

      if (isBareReturn(branch)) return;

      context.report({
        node: branch,
        messageId: 'requireBraces',
        fix(fixer) {
          const bodyText = src.getText(branch);
          const ifLine = src.lines[ifNode.loc.start.line - 1];
          const indent = ifLine.match(/^(\s*)/)[1];
          const innerIndent = indent + '  ';

          return fixer.replaceText(branch, `{\n${innerIndent}${bodyText}\n${indent}}`);
        },
      });
    }

    return {
      IfStatement(node) {
        checkBranch(node.consequent, node);

        if (node.alternate && node.alternate.type !== 'IfStatement') {
          checkBranch(node.alternate, node);
        }
      },
    };
  },
};
