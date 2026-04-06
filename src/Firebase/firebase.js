import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDCGUiZtx43AgX0RzsENonXeuG9KCaBISY",
  authDomain: "prime-oils.firebaseapp.com",
  projectId: "prime-oils",
  storageBucket: "prime-oils.firebasestorage.app",
  messagingSenderId: "389895675121",
  appId: "1:389895675121:web:ffd6af623165483fe4dd50",
  measurementId: "G-H2EMVG29KN",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
