import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyDI5IdDITrfuOq4OH9zubyLwqbzje-N9OI",
    authDomain: "risklens-5cfa5.firebaseapp.com",
    projectId: "risklens-5cfa5",
    storageBucket: "risklens-5cfa5.firebasestorage.app",
    messagingSenderId: "83770647081",
    appId: "1:83770647081:web:7c49d77a36b26a9d633238",
    measurementId: "G-ZF8KYXNMTY"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
