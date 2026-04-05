/**
 * Jest unit test setup — runs before each test file via setupFiles.
 *
 * Sets process.env variables so services that read from ConfigService
 * or process.env directly have deterministic values during unit tests.
 * Individual tests can override these with jest.replaceProperty or
 * by providing their own ConfigService mock.
 */
process.env.NODE_ENV = "test";
process.env.ENCRYPTION_KEY =
  "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90";
process.env.JWT_SECRET =
  "test_jwt_secret_for_unit_tests_only_64chars_long_padding_padding";
process.env.JWT_REFRESH_SECRET =
  "test_refresh_secret_for_unit_tests_only_64chars_long_padding_xx";
process.env.HONEYPOT_BLOCK_DURATION_MS = "3600000";
process.env.CORS_ALLOWED_ORIGINS = "http://localhost:3000";
