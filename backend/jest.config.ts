import type { Config } from 'jest'

const config: Config = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  testMatch: ['**/tests/unit/**/*.test.ts'],
  moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' },
  coverageDirectory: 'coverage',
  collectCoverageFrom: ['src/domain/**/*.ts', 'src/application/**/*.ts'],
  coverageThreshold: { global: { lines: 80, functions: 80, branches: 80 } },
  extensionsToTreatAsEsm: ['.ts'],
}

export default config
