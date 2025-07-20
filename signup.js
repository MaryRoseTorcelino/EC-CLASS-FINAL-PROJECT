import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Your Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCWp4G154pzyxTvM6jKJ9Ckxuvf8_h82mM",
    authDomain: "ecclasswebsitefinal.firebaseapp.com",
    projectId: "ecclasswebsitefinal",
    storageBucket: "ecclasswebsitefinal.firebasestorage.app",
    messagingSenderId: "1001100262118",
    appId: "1:1001100262118:web:78321a67ca5fc7654e1927",
    measurementId: "G-1FSR9EDHHN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const signupForm = document.getElementById('signupForm');
const signupEmailInput = document.getElementById('signupEmail');
const signupPasswordInput = document.getElementById('signupPassword');
const confirmPasswordInput = document.getElementById('confirmPassword');
const messageBox = document.getElementById('messageBox');

function showMessage(message, type = 'error') {
    messageBox.textContent = message;
    messageBox.style.display = 'block';
    if (type === 'error') {
        messageBox.style.backgroundColor = '#ffe0b2';
        messageBox.style.color = '#e65100';
        messageBox.style.borderColor = '#ffb74d';
    } else { // success
        messageBox.style.backgroundColor = '#d4edda';
        messageBox.style.color = '#155724';
        messageBox.style.borderColor = '#c3e6cb';
    }
}

signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = signupEmailInput.value;
    const password = signupPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    messageBox.style.display = 'none';

    if (password !== confirmPassword) {
        showMessage('Passwords do not match.');
        return;
    }
    if (password.length < 6) {
        showMessage('Password should be at least 6 characters.');
        return;
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        console.log("User signed up successfully:", user.email);
        localStorage.setItem('loggedInUser', user.email); // Store email as user name
        showMessage('Sign up successful! Redirecting to login...', 'success');
        setTimeout(() => {
            window.location.href = 'login.html'; 
        }, 1500);
    } catch (error) {
        console.error("Sign up error:", error.code, error.message);
        let errorMessage = "An unknown error occurred.";
        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMessage = 'Email address is already in use.';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Invalid email address format.';
                break;
            case 'auth/weak-password':
                errorMessage = 'Password is too weak. Please choose a stronger one.';
                break;
            default:
                errorMessage = 'Sign up failed. Please try again.';
                break;
        }
        showMessage(errorMessage, 'error');
    }
});