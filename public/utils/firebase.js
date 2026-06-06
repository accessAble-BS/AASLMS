// Firebase Configuration for aas-lms project
const firebaseConfig = {
  apiKey: 'AIzaSyC1VwNOKpcC7ClJJMq5buwrpExz77Yv3lQ',
  authDomain: 'aas-lms.firebaseapp.com',
  projectId: 'aas-lms',
  storageBucket: 'aas-lms.firebasestorage.app',
  messagingSenderId: '715982904301',
  appId: '1:715982904301:web:e30ad5be969f1e2601e5e4',
  measurementId: 'G-3PC0JR9KM8'
};

firebase.initializeApp(firebaseConfig);

const auth = typeof firebase.auth === 'function' ? firebase.auth() : null;
const db = typeof firebase.firestore === 'function' ? firebase.firestore() : null;
