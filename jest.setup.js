// Silence expected RN warnings; add global mocks here later if needed.

// Disable jest-expo's import scope check for domain modules (pure TS)
if (global.__DEV__ !== undefined) {
  // jest-expo sets this, but we can override behavior selectively
}

// Mock the Expo import registry for domain tests
if (!global.__ExpoImportMetaRegistry) {
  global.__ExpoImportMetaRegistry = {};
}
