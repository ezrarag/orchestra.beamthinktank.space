import { 
  signInWithEmailLink, 
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  ConfirmationResult
} from 'firebase/auth'
import { auth } from './firebase'

/**
 * Sign in with email using passwordless email link
 * @param email - User's email address
 * @param actionCodeSettings - Optional settings for the email link
 */
export async function signInWithEmail(
  email: string,
  actionCodeSettings?: {
    url: string
    handleCodeInApp: boolean
  }
): Promise<void> {
  if (!auth) {
    throw new Error('Firebase Auth is not initialized')
  }

  // Store email for later use when completing sign-in
  if (typeof window !== 'undefined') {
    window.localStorage.setItem('emailForSignIn', email)
  }

  const defaultSettings = {
    url: typeof window !== 'undefined' 
      ? window.location.origin + window.location.pathname + (window.location.search || '')
      : 'https://orchestra.beamthinktank.space/checkin',
    handleCodeInApp: true,
  }

  await sendSignInLinkToEmail(auth, email, actionCodeSettings || defaultSettings)
}

/**
 * Complete email sign-in if user clicked the link
 * @param email - User's email address
 * @param emailLink - The link from the email
 */
export async function completeEmailSignIn(email: string, emailLink: string): Promise<void> {
  if (!auth) {
    throw new Error('Firebase Auth is not initialized')
  }

  if (isSignInWithEmailLink(auth, emailLink)) {
    await signInWithEmailLink(auth, email, emailLink)
  } else {
    throw new Error('Invalid email link')
  }
}

/**
 * Sign in with phone number using SMS
 * @param phoneNumber - User's phone number (E.164 format, e.g., +1234567890)
 * @param appVerifier - RecaptchaVerifier instance
 * @returns ConfirmationResult with verification ID
 */
export async function signInWithPhone(
  phoneNumber: string,
  appVerifier: RecaptchaVerifier
): Promise<ConfirmationResult> {
  if (!auth) {
    throw new Error('Firebase Auth is not initialized')
  }

  return await signInWithPhoneNumber(auth, phoneNumber, appVerifier)
}

/**
 * Create a RecaptchaVerifier instance
 * @param containerId - HTML element ID where reCAPTCHA will be rendered
 * @param size - Size of the reCAPTCHA widget ('normal' | 'compact' | 'invisible')
 */
export function createRecaptchaVerifier(
  containerId: string = 'recaptcha-container',
  size: 'normal' | 'compact' | 'invisible' = 'invisible'
): RecaptchaVerifier {
  if (!auth) {
    throw new Error('Firebase Auth is not initialized')
  }

  return new RecaptchaVerifier(containerId, {
    size,
    callback: () => {
      // reCAPTCHA solved, allow signInWithPhoneNumber to proceed
    },
    'expired-callback': () => {
      // Response expired, ask user to solve reCAPTCHA again
      throw new Error('reCAPTCHA expired. Please try again.')
    }
  }, auth)
}

/**
 * Verify phone number with SMS code
 * @param confirmationResult - Result from signInWithPhone
 * @param code - SMS verification code
 */
export async function verifyPhoneCode(
  confirmationResult: ConfirmationResult,
  code: string
): Promise<void> {
  await confirmationResult.confirm(code)
}

// Re-export isSignInWithEmailLink for convenience
export { isSignInWithEmailLink }

