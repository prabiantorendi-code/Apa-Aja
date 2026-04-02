/* js/firebase-config.js */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-storage.js";

const firebaseConfig = {
  apiKey: "ISI_API_KEY_FIREBASE_DISINI",
  authDomain: "ISI_AUTH_DOMAIN_FIREBASE_DISINI",
  projectId: "ISI_PROJECT_ID_FIREBASE_DISINI",
  storageBucket: "ISI_STORAGE_BUCKET_FIREBASE_DISINI",
  messagingSenderId: "ISI_MESSAGING_SENDER_ID_FIREBASE_DISINI",
  appId: "ISI_APP_ID_FIREBASE_DISINI"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

export { app, db, auth, storage };

