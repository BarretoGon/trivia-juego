import { initializeApp } from "firebase/app";
import {
  getDatabase,
  ref,
  set,
  get,
  update,
  onValue,
  off,
  remove,
} from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyD60QyceJWJf0OtXwZEt9VekEEt3Q-bnAA",
  authDomain: "trivia-reunion.firebaseapp.com",
  databaseURL: "https://trivia-reunion-default-rtdb.firebaseio.com",
  projectId: "trivia-reunion",
  storageBucket: "trivia-reunion.firebasestorage.app",
  messagingSenderId: "1025335360714",
  appId: "1:1025335360714:web:f62407fafe45bdabe2c833",
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);

export { ref, set, get, update, onValue, off, remove };
