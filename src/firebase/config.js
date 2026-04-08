import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_FIREBASE_APP_ID
};

console.log('--- ENV LOADED ---');
['REACT_APP_FIREBASE_API_KEY'].forEach(key => {
    if (!process.env[key]) console.error(`[CRITICAL] Missing Required Variable: ${key}`);
    else console.log(`[OK] ${key} is present`);
});


// Safe initialization guard
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
console.log('--- FIREBASE OK ---');

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const messaging = null;
