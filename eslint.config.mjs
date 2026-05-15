import nextConfig from "eslint-config-next/core-web-vitals";
import nextTypescriptConfig from "eslint-config-next/typescript";

const eslintConfig = [
    ...nextConfig,
    ...nextTypescriptConfig,
    {
        ignores: ["node_modules/**", ".next/**", "out/**", "build/**", "next-env.d.ts"],
    },
    {
        settings: {
            react: {
                version: "19.2",
            },
        },
    },
    {
        rules: {
            curly: ["error", "all"],
            "react-hooks/set-state-in-effect": "off",
        },
    },
    {
        files: ["**/opengraph-image.tsx"],
        rules: {
            "@next/next/no-img-element": "off",
        },
    },
    {
        rules: {
            "@typescript-eslint/no-unused-vars": [
                "error",
                {
                    args: "all",
                    argsIgnorePattern: "^_",
                    caughtErrors: "all",
                    caughtErrorsIgnorePattern: "^_",
                    destructuredArrayIgnorePattern: "^_",
                    varsIgnorePattern: "^_",
                    ignoreRestSiblings: true,
                },
            ],
            "@typescript-eslint/explicit-member-accessibility": "error",
        },
    },
];

export default eslintConfig;
