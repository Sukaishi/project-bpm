import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAvJ8DTjoIkmJUPvV26FsP83Cncg5sY2tw",
  authDomain: "project-bpm-32bbc.firebaseapp.com",
  projectId: "project-bpm-32bbc",
  storageBucket: "project-bpm-32bbc.appspot.com",
  messagingSenderId: "639579793270",
  appId: "1:639579793270:web:719c4954d26e1ce64c7c57",
  measurementId: "G-1C0ZVQSZ9D"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
const db = getFirestore(app);

export { app, db };