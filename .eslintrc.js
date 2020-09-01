module.exports = {
    root: true,
    "env": {
        "node": true
    },
    parser: '@typescript-eslint/parser',
    plugins: [
        '@typescript-eslint',
        "simple-import-sort"
    ],
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
    ],
    "parserOptions": {
        "ecmaVersion": 6,
        "sourceType": "module",
        "ecmaFeatures": {
            "jsx": true,
            "modules": true
        }
    },
    rules: {
        "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
        "simple-import-sort/sort": "error",
        "@typescript-eslint/no-var-requires": "off",
        "@typescript-eslint/ban-ts-comment": "off"
    }
};