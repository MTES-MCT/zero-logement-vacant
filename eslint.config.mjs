import typescriptEslint from "@typescript-eslint/eslint-plugin";
import _import from "eslint-plugin-import";
import { fixupPluginRules, fixupConfigRules } from "@eslint/compat";
import globals from "globals";
import tsParser from "@typescript-eslint/parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default [{
    ignores: [
        "**/build/",
        "**/dist/",
        "frontend/src/components/_dsfr/",
        "frontend/jest.polyfills.js",
        "**/node_modules/",
        "**/public/",
        "**/tools/",
        "**/README.md",
        "**/bin",
        "**/Procfile",
        "**/jest.config.js",
        "**/.eslintrc.json",
        "**/package.json",
        "**/package-lock.json",
        "**/yarn.lock",
        "**/cron.json",
        "**/*.css",
        "**/*.hbs",
        "server/jest.config.ts",
        "frontend/jest.config.ts",
    ],
}, ...compat.extends("eslint:recommended", "plugin:@typescript-eslint/recommended", "prettier"), {
    plugins: {
        "@typescript-eslint": typescriptEslint,
        import: fixupPluginRules(_import),
    },

    languageOptions: {
        globals: {
            ...globals.node,
        },

        parser: tsParser,
        ecmaVersion: 2023,
        sourceType: "module",
    },

    rules: {
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-var-requires": "off",
        "import/no-commonjs": "error",
        eqeqeq: ["error", "always"],
        semi: ["error", "always"],
    },
}, ...fixupConfigRules(compat.extends(
    "plugin:react/recommended",
    "plugin:react/jsx-runtime",
    "plugin:react-hooks/recommended",
)).map(config => ({
    ...config,
    files: ["frontend/src/**/*.ts?(x)"],
})), {
    files: ["frontend/src/**/*.ts?(x)"],

    settings: {
        react: {
            version: "detect",
        },
    },

    rules: {
        "no-irregular-whitespace": ["error", {
            skipJSXText: true,
        }],
    },
}];
