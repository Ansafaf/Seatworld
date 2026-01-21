import js from "@eslint/js";

export default [

  /* ---------- FRONTEND CONFIG (SAFE, NO AUTOFIX) ---------- */
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

  /* ---------- BACKEND CONFIG (SAFE, NO AUTOFIX) ---------- */
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

      /* ---- SAFETY RULES (NO FILE MUTATION SIDE EFFECTS) ---- */
      "no-console": "off",
      "no-unused-vars": "warn",
      "consistent-return": "warn",

      /* ---- PREVENT DANGEROUS AUTOFIX BEHAVIOR ---- */
      "no-extra-semi": "warn",
      "no-multi-spaces": "warn",
      "no-trailing-spaces": "off",
      "eol-last": "off"
    }
  },

  /* ---------- IGNORE ALL TEMPLATE FILES ---------- */
  {
    ignores: [
      "views/**",
      "**/*.ejs",
      "**/*.html"
    ]
  }
];
