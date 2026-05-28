// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore, collection } from "firebase/firestore";
import {
  initializeAuth,
  browserLocalPersistence,
  browserPopupRedirectResolver,
  GoogleAuthProvider,
} from 'firebase/auth';
import { getStorage, ref } from 'firebase/storage';

const HOSTING_DOMAINS = {
  webApp: 'soccer-practice-2da31.web.app',
  firebaseApp: 'soccer-practice-2da31.firebaseapp.com',
};

const firebaseConfig = {
  apiKey: "AIzaSyANwsNBh5o5vM_L-suiGndwVT577KhbXmM",
  // Use firebaseapp.com — Google OAuth already allows this redirect URI (required for mobile).
  authDomain: HOSTING_DOMAINS.firebaseApp,
  projectId: "soccer-practice-2da31",
  storageBucket: "soccer-practice-2da31.firebasestorage.app",
  messagingSenderId: "707067286783",
  appId: "1:707067286783:web:178ae705d56f0ce1d368ca",
  measurementId: "G-QQPJ8BXLK7"
};

export { HOSTING_DOMAINS };

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = initializeAuth(app, {
  persistence: browserLocalPersistence,
  popupRedirectResolver: browserPopupRedirectResolver,
});
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

/** Popups are unreliable on iOS Safari and most mobile browsers; use redirect instead. */
export function shouldUseGoogleAuthRedirect() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  if (/iPhone|iPod|iPad|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
    return true;
  }
  // iPadOS 13+ may report as desktop Mac
  if (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) {
    return true;
  }
  return false;
}

export function getAuthSignInErrorMessage(err) {
  const code = err?.code || '';
  const message = err?.message || 'Sign in failed. Please try again.';
  if (code === 'auth/popup-blocked') {
    return 'Sign-in popup was blocked. Allow popups for this site or try again.';
  }
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
    return 'Sign in was cancelled.';
  }
  if (
    message.includes('Unable to process request due to missing initial state') ||
    code === 'auth/web-storage-unsupported'
  ) {
    return 'Sign-in failed due to browser privacy settings. Use a normal (not private) browser tab and allow cookies for this site. On iPhone Chrome: Settings → Privacy → turn off "Block All Cookies" if needed.';
  }
  return message;
}

export const teamsCollection = collection(db, 'teams');
const storage = getStorage();
export { storage, ref as storageRef };