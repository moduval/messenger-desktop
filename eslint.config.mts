import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    ignores: ["out/**", "dist/**", "node_modules/**"]
  },
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node
      }
    }
  },
  tseslint.configs.recommended,
  {
    files: ["**/*.{ts,mts,cts}"],
    rules: {
      "@typescript-eslint/consistent-type-imports": [
        "error",
        {
          prefer: "type-imports",
          fixStyle: "inline-type-imports",
          disallowTypeAnnotations: false
        }
      ]
    }
  },
  {
    files: ["**/*.{js,mjs,cjs}", "scripts/**/*.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off"
    }
  }
]);
