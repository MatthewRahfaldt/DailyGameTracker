import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

// Dropped eslint-config-next here (see docs/BACKLOG.md) — its 16.x shareable config crashes when
// bridged through @eslint/eslintrc's FlatCompat (a circular-structure error inside eslint-plugin-react's
// modern flat-shaped exports, reproduced even from a clean node_modules). This is a minimal,
// flat-native config instead: plain JS/TS recommended rules plus React Hooks rules, no legacy
// bridge involved. Trade-off: no Next-specific lint rules (e.g. next/no-img-element) until
// eslint-config-next ships something that works with flat config here — worth revisiting later.
export default tseslint.config(
  { ignores: [".next/**", "node_modules/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  }
);
