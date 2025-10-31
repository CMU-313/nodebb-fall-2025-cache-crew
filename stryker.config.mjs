// @ts-check
/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
const config = {
  _comment:
    "This config was generated using 'stryker init'. Please take a look at: https://stryker-mutator.io/docs/stryker-js/configuration/ for more information.",
  packageManager: "npm",
  reporters: ["html", "clear-text", "progress"],
  mutate: ["nodebb-plugin-endorse-posts/**/*.js"],
  ignorePatterns: ["build/**", "coverage/**", "logs/**", "public/uploads/**", ".stryker-tmp/**"],
  testRunner: "mocha",
  mochaOptions: {
    require: ["./test/mutation.setup.js"],
    spec: [
      "test/endorse.api.spec.js",
      "test/endorse.decorate.spec.js",
    ],
  },
  testRunner_comment:
    "Take a look at https://stryker-mutator.io/docs/stryker-js/mocha-runner for information about the mocha plugin.",
  coverageAnalysis: "perTest",
};
export default config;
