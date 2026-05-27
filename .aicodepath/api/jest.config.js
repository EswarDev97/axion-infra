module.exports = {
  displayName: 'api',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  rootDir: '.',
  collectCoverageFrom: [
    'routes/**/*.js',
    '!routes/**/__tests__/**',
  ],
  coverageDirectory: '../../coverage/api',
  transform: {},
  moduleNameMapper: {},
  moduleDirectories: ['node_modules', '../templates/dashboard/node_modules'],
};
