import tseslint from "typescript-eslint";
export default tseslint.config(
  {
    ignores: [
      "**/.next/**",
      "**/.next-e2e/**",
      "**/node_modules/**",
      "**/dist/**",
      "apps/mobile/android/**",
      "apps/mobile/ios/**",
      "test-results/**",
      "apps/web/next-env.d.ts",
      "apps/web/src/components/**",
    ],
  },
  ...tseslint.configs.recommended,
  {
    files: [
      "apps/web/src/app/api/**/*.ts",
      "apps/web/src/app/seguimiento/**/*.tsx",
      "apps/web/src/app/t/**/*.ts",
      "apps/web/src/lib/auth.ts",
      "apps/web/src/lib/db.ts",
      "apps/web/src/lib/media.ts",
      "apps/mobile/app/**/*.tsx",
      "packages/domain/src/**/*.ts",
      "scripts/**/*.ts",
      "tests/**/*.ts",
    ],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
);
