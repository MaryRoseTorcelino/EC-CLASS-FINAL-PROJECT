import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    getFirestore,
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Firebase config
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

document.addEventListener('DOMContentLoaded', () => {
    const welcomeMessage = document.getElementById('welcomeMessage');
    const logoutLink = document.getElementById('logoutLink');
    const logoDiv = document.querySelector('.logo');
    const classesContainer = document.getElementById('classesContainer');

    // Logout handler
    logoutLink.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
            await signOut(auth);
            localStorage.removeItem('loggedInUser');
            window.location.href = 'login.html';
        } catch (error) {
            console.error("Error signing out:", error);
            alert("Failed to log out. Please try again.");
        }
    });

    // Auth state change
    onAuthStateChanged(auth, (user) => {
        if (user) {
            const userName = user.email ? user.email.split('@')[0] : 'User';
            localStorage.setItem('loggedInUser', userName);
            welcomeMessage.textContent = `WELCOME ${userName.toUpperCase()} TO EC CLASSROOM!`;
            console.log("Dashboard: User is logged in as", user.email);

            // 👉 Fetch all classes (no filtering by creator)
            fetchAndRenderAllClasses();
        } else {
            console.log("Dashboard: No user logged in, redirecting to login.");
            localStorage.removeItem('loggedInUser');
            window.location.href = 'login.html';
        }
    });

    // Highlight current navigation link
    const navLinks = document.querySelectorAll('.nav-links a');
    const currentPath = window.location.pathname;

    navLinks.forEach(link => {
        const linkPath = link.getAttribute('href');
        if (currentPath.includes(linkPath) && linkPath !== '#') {
            link.classList.add('active');
        } else if (linkPath === 'dashboard.html' && (currentPath === '/' || currentPath.endsWith('/index.html') || currentPath === '')) {
            link.classList.add('active');
        }
    });
    
    // Render class cards
    function renderClasses(classList) {
        classesContainer.innerHTML = '';
        if (classList.length === 0) {
            classesContainer.innerHTML = '<p style="text-align: center; color: var(--text-light); grid-column: 1 / -1;">No classes yet. Click "+ CREATE NEW CLASS" to add one!</p>';
            return;
        }
        classList.forEach(classItem => {
            const classCard = document.createElement('div');
            classCard.classList.add('class-card');
            classCard.setAttribute('data-class-id', classItem.id);
            classCard.innerHTML = `
                <h3>${classItem.name}</h3>
                <img src="${classItem.image}" alt="${classItem.name} Class Image">
                <a href="join_class.html?classId=${classItem.id}&className=${encodeURIComponent(classItem.name)}" class="join-class-btn">JOIN CLASS</a>
            `;
            classesContainer.appendChild(classCard);
        });
    }

    // Fetch all classes from Firestore
    async function fetchAndRenderAllClasses() {
        try {
            const classesRef = collection(db, "classes");
            const querySnapshot = await getDocs(classesRef);

            const classes = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                classes.push({
                    id: doc.id,
                    name: data.name || "Untitled Class",
                    image: data.image || 'https://via.placeholder.com/200x120?text=New+Class'
                });
            });

            renderClasses(classes);
        } catch (error) {
            console.error("Error fetching classes:", error);
            classesContainer.innerHTML = '<p style="color: red;">Failed to load classes. Please try again later.</p>';
        }
    }
});