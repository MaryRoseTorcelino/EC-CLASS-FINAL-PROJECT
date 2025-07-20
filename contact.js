import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// Your Firebase configuration (same as login.html, dashboard.html, and about.html)
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

document.addEventListener('DOMContentLoaded', () => {
    const logoutLink = document.getElementById('logoutLink');

    // Handle logout click
    logoutLink.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
            await signOut(auth);
            localStorage.removeItem('loggedInUser'); // Clear user from local storage
            window.location.href = 'login.html'; // Redirect to login page
        } catch (error) {
            console.error("Error signing out:", error);
            alert("Failed to log out. Please try again.");
        }
    });

    // Firebase Auth State Listener: Redirect if not logged in
    onAuthStateChanged(auth, (user) => {
        if (!user) {
            // User is signed out, redirect to login page
            console.log("Contact: No user logged in, redirecting to login.");
            localStorage.removeItem('loggedInUser'); // Clear any old user data
            window.location.href = 'login.html';
        } else {
            console.log("Contact: User is logged in as", user.email);
        }
    });

    // --- Navigation Active State Management ---
    const navLinks = document.querySelectorAll('.nav-links a');
    const currentFileName = window.location.pathname.split('/').pop();

    navLinks.forEach(link => {
        const linkFileName = link.getAttribute('href').split('/').pop();

        if (linkFileName === currentFileName) {
            link.classList.add('active');
        }
    });
});