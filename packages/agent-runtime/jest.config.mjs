/** @type {import('jest').Config} */
export default {
  preset: "ts-jest",
  testEnvironment: "node",
  testPathIgnorePatterns: ["/node_modules/", "/dist/"],
  moduleNameMapper: { "^(\\.{1,2}/.*)\\.js$": "$1" },
};
