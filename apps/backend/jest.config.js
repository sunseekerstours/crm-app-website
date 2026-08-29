module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@app/prisma(.*)$': '<rootDir>/prisma$1',
    '^@app/common(.*)$': '<rootDir>/common$1',
    '^@app/config(.*)$': '<rootDir>/config$1',
    '^@app/modules/(.*)$': '<rootDir>/modules/$1',
  },
};
