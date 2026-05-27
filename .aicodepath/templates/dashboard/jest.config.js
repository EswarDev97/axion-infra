export default {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        jsx: 'react',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-markdown|remark-gfm|vfile|unist-util-visit|unist-util-is|mdast-util-to-hast|html-void-elements|property-information|space-separated-tokens|web-namespaces|trim-lines|ccount|escape-string-regexp|string-width|estree-util-is-identifier-name|markdown-table|zwitch|bail|extend|is-plain-obj|trough)/)',
  ],
  setupFiles: ['<rootDir>/src/test-utils.tsx'],
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/main.tsx',
    '!src/vite-env.d.ts',
    '!src/**/__tests__/**',
  ],
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
  ],
  projects: [
    {
      displayName: 'frontend',
      testMatch: ['<rootDir>/src/**/__tests__/**/*.[jt]s?(x)'],
    },
    {
      displayName: 'api',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/../../api/**/__tests__/**/*.test.js'],
      testPathIgnorePatterns: ['/node_modules/'],
      transform: {},
      moduleNameMapper: {},
      setupFiles: [],
      setupFilesAfterEnv: [],
      transformIgnorePatterns: [],
      modulePathIgnorePatterns: ['<rootDir>/node_modules'],
    },
  ],
};
