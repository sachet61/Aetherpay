import test from 'node:test';
import assert from 'node:assert/strict';
import { validateRegistrationForm } from './authValidationUtils';

test('rejects missing required fields', () => {
  const res = validateRegistrationForm({
    displayName: 'Blithe Sweeps',
    email: '',
    password: 'Password123',
    confirmPassword: 'Password123',
  });
  assert.equal(res.valid, false);
  assert.equal(res.error, 'Please complete all required fields.');
});

test('rejects passwords shorter than 8 characters even when matching', () => {
  const res = validateRegistrationForm({
    displayName: 'Blithe Sweeps',
    email: 'blithe@example.com',
    password: 'abc1234',
    confirmPassword: 'abc1234',
  });
  assert.equal(res.valid, false);
  assert.equal(res.passwordMinLengthOk, false);
  assert.equal(res.passwordsMatch, true);
  assert.equal(res.error, 'Password must be at least 8 characters long.');
});

test('rejects missing or mismatched confirm password', () => {
  const missing = validateRegistrationForm({
    displayName: 'Blithe Sweeps',
    email: 'blithe@example.com',
    password: 'Password123',
    confirmPassword: '',
  });
  assert.equal(missing.valid, false);
  assert.equal(missing.error, 'Please confirm your password.');

  const mismatch = validateRegistrationForm({
    displayName: 'Blithe Sweeps',
    email: 'blithe@example.com',
    password: 'Password123',
    confirmPassword: 'Password124',
  });
  assert.equal(mismatch.valid, false);
  assert.equal(mismatch.passwordsMatch, false);
  assert.equal(
    mismatch.error,
    'Passwords do not match. Please enter the same password twice.'
  );
});

test('allows registration only when all required fields and matching passwords are valid', () => {
  const res = validateRegistrationForm({
    displayName: 'Blithe Sweeps',
    email: 'blithe@example.com',
    password: 'Password123',
    confirmPassword: 'Password123',
  });
  assert.equal(res.valid, true);
  assert.equal(res.error, null);
  assert.equal(res.passwordMinLengthOk, true);
  assert.equal(res.passwordsMatch, true);
});
