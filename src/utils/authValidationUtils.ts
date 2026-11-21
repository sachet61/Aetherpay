export interface RegistrationValidationInput {
  displayName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface RegistrationValidationResult {
  valid: boolean;
  error: string | null;
  hasRequiredFields: boolean;
  passwordMinLengthOk: boolean;
  hasConfirmPassword: boolean;
  passwordsMatch: boolean;
}

export const MIN_SIGNUP_PASSWORD_LENGTH = 8;

export function validateRegistrationForm(
  input: RegistrationValidationInput
): RegistrationValidationResult {
  const displayName = (input.displayName || '').trim();
  const email = (input.email || '').trim();
  const password = input.password || '';
  const confirmPassword = input.confirmPassword || '';

  const hasRequiredFields = Boolean(displayName && email && password && confirmPassword);
  const passwordMinLengthOk = password.length >= MIN_SIGNUP_PASSWORD_LENGTH;
  const hasConfirmPassword = confirmPassword.length > 0;
  const passwordsMatch =
    password.length > 0 && hasConfirmPassword && password === confirmPassword;

  if (!displayName || !email || !password) {
    return {
      valid: false,
      error: 'Please complete all required fields.',
      hasRequiredFields,
      passwordMinLengthOk,
      hasConfirmPassword,
      passwordsMatch,
    };
  }

  if (!passwordMinLengthOk) {
    return {
      valid: false,
      error: 'Password must be at least 8 characters long.',
      hasRequiredFields,
      passwordMinLengthOk,
      hasConfirmPassword,
      passwordsMatch,
    };
  }

  if (!hasConfirmPassword) {
    return {
      valid: false,
      error: 'Please confirm your password.',
      hasRequiredFields,
      passwordMinLengthOk,
      hasConfirmPassword,
      passwordsMatch,
    };
  }

  if (!passwordsMatch) {
    return {
      valid: false,
      error: 'Passwords do not match. Please enter the same password twice.',
      hasRequiredFields,
      passwordMinLengthOk,
      hasConfirmPassword,
      passwordsMatch,
    };
  }

  return {
    valid: true,
    error: null,
    hasRequiredFields: true,
    passwordMinLengthOk: true,
    hasConfirmPassword: true,
    passwordsMatch: true,
  };
}
