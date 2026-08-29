import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
      // Ban the deleted legacy toast system. Use `sonner` instead.
      "no-restricted-imports": ["error", {
        paths: [
          {
            name: "@/hooks/use-toast",
            message: "useToast was deleted. Use `import { toast } from \"sonner\"` instead.",
          },
          {
            name: "@/components/ui/use-toast",
            message: "useToast re-export was deleted. Use `import { toast } from \"sonner\"` instead.",
          },
          {
            name: "@/components/ui/toaster",
            message: "<Toaster /> was deleted. Use <Sonner /> from \"@/components/ui/sonner\" instead.",
          },
          {
            name: "@/components/ui/toast",
            message: "Radix toast primitives were deleted. Use `sonner` for toasts.",
          },
        ],
      }],
    },
  },
);
