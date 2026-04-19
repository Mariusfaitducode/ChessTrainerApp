module.exports = {
  projects: [
    {
      displayName: 'domain',
      testMatch: ['<rootDir>/src/domain/**/*.test.ts'],
      testEnvironment: 'node',
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
      },
    },
    {
      displayName: 'app',
      preset: 'jest-expo',
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
      testMatch: [
        '<rootDir>/app/**/*.test.[jt]s?(x)',
      ],
      testPathIgnorePatterns: [
        '/node_modules/',
        '/src/domain/',
      ],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
      },
      transformIgnorePatterns: [
        'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg))',
      ],
    },
    {
      displayName: 'db',
      testMatch: ['<rootDir>/src/db/**/*.test.ts'],
      testEnvironment: 'node',
      transform: {
        '^.+\\.tsx?$': ['babel-jest', { presets: ['babel-preset-expo'] }],
      },
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
        '^expo-sqlite$': '<rootDir>/__mocks__/expo-sqlite.ts',
      },
    },
    {
      displayName: 'services',
      testMatch: ['<rootDir>/src/services/**/*.test.ts'],
      testEnvironment: 'node',
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
      },
    },
  ],
};
