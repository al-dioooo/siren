import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Architecture boundaries (see ARCHITECTURE.md): features never import from
  // app/ or from sibling features. Cross-feature needs go through
  // components/shared or lib. Intra-feature imports must be relative.
  {
    files: ["src/features/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/app/*"],
              message:
                "features/ must not import from app/. Move the shared piece into the feature or components/shared.",
            },
            {
              group: ["@/features/*"],
              message:
                "No cross-feature imports. Use a relative path within your own feature; shared pieces belong in components/shared or lib.",
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
