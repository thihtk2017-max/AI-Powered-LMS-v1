import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
// IMPORTANT: Do not hardcode these values. Use environment variables.
const firebaseConfig = {
  apiKey: "AIzaSyCBvEtvJmB0p1AZmydeBZZ5Hewz6yUEm_I",
  authDomain: "lmstin1.firebaseapp.com",
  projectId: "lmstin1",
  storageBucket: "lmstin1.firebasestorage.app",
  messagingSenderId: "414084063602",
  appId: "1:414084063602:web:020d849d197f496f2dfdeb",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);
