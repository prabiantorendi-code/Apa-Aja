import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBQKEhdwpoPaoQgHDFRFtK1UZtfT31-T8o",
  authDomain: "naufal-a8da4.firebaseapp.com",
  projectId: "naufal-a8da4",
  storageBucket: "naufal-a8da4.firebasestorage.app",
  messagingSenderId: "400082079246",
  appId: "1:400082079246:web:cd70ac32053a7b0797f65f"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
