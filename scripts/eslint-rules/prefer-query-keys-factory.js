/**
 * ESLint custom rule: prefer-query-keys-factory
 *
 * Flags inline `queryKey: ["..."]` literals, suggesting the central
 * `@/lib/queryKeys` factory instead.
 *
 * To enable, register it in eslint.config.js → plugins → rules:
 *   rules: { "local/prefer-query-keys-factory": "warn" }
 *
 * Escape hatch: keys starting with "_" are treated as internal-only and
 * allowed, for one-off caches that should not pollute the factory.
 */

/** @type {import('eslint').Rule.RuleModule} */
const rule = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Prefer the central queryKeys factory over inline string-literal query keys",
      recommended: true,
    },
    schema: [],
    messages: {
      useFactory:
        "Use the central `queryKeys` factory from `@/lib/queryKeys` instead of inline `{{literal}}`. Inline query keys drift from invalidation cascades and cause stale UI.",
    },
  },
  create(context) {
    function isStringLiteralArray(node) {
      return (
        node &&
        node.type === "ArrayExpression" &&
        node.elements.length > 0 &&
        node.elements.every(
          (el) => el && (el.type === "Literal" || el.type === "TemplateLiteral")
        )
      );
    }

    function reportIfInline(node) {
      if (!isStringLiteralArray(node)) return;
      const first = node.elements[0];
      const literal =
        first && first.type === "Literal" ? String(first.value) : "<template>";
      if (literal.startsWith("_")) return;
      context.report({ node, messageId: "useFactory", data: { literal } });
    }

    return {
      Property(node) {
        if (
          node.key &&
          (node.key.name === "queryKey" || node.key.value === "queryKey")
        ) {
          reportIfInline(node.value);
        }
      },
    };
  },
};

export default rule;
