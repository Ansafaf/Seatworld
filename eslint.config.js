


import js from "@eslint/js";

export default [

  /* ---------- YOUR EXISTING FRONTEND CONFIG (KEEP AS-IS) ---------- */
  {
    files: ["public/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        window: "readonly",
        document: "readonly"
      }
    },
    rules: {
      "no-console": "off",
      "no-unused-vars": "warn"
    }
  },

  /* ---------- ADD THIS BACKEND CONFIG ---------- */
  {
    files: [
      "controllers/**/*.js",
      "models/**/*.js",
      "routes/**/*.js",
      "services/**/*.js",
      "middlewares/**/*.js",
      "utils/**/*.js",
      "app.js",
      "server.js"
    ],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        process: "readonly",
        __dirname: "readonly"
      }
    },
    rules: {
      ...js.configs.recommended.rules,
      "no-console": "off",
      "no-unused-vars": ["warn"],
      "consistent-return": "warn"
    }
  },

  /* ---------- IGNORE EJS ---------- */
  {
    ignores: ["views/**"]
  }
];

