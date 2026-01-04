// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCMDXi3GXgzxzKBMo8HH3W9k-Hoef1eqXo",
  authDomain: "packit-1c45d.firebaseapp.com",
  projectId: "packit-1c45d",
  storageBucket: "packit-1c45d.firebasestorage.app",
  messagingSenderId: "285601836900",
  appId: "1:285601836900:web:14b57a535bfab26ac89471"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
