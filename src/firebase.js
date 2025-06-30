// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyANwsNBh5o5vM_L-suiGndwVT577KhbXmM",
  authDomain: "soccer-practice-2da31.firebaseapp.com",
  projectId: "soccer-practice-2da31",
  storageBucket: "soccer-practice-2da31.firebasestorage.app",
  messagingSenderId: "707067286783",
  appId: "1:707067286783:web:178ae705d56f0ce1d368ca",
  measurementId: "G-QQPJ8BXLK7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);