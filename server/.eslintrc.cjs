/* eslint-disable no-undef */
// server/.eslintrc.cjs
module.exports = {
  env: {
    node: true, // ← process や __dirname を未定義扱いしなくする
    es2022: true,
  },
  parserOptions: {
    sourceType: "module", // ESM
    ecmaVersion: "latest",
  },
  rules: {
    "no-console": "off",
    "no-undef": "off",
  },
};
