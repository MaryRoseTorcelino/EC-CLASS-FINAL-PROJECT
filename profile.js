import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
// Removed Firebase Storage imports as we're using URL directly
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


// Your Firebase configuration (same as other pages)
const firebaseConfig = {
    apiKey: "AIzaSyCWp4G154pzyxTvM6jKJ9Ckxuvf8_h82mM",
    authDomain: "ecclasswebsitefinal.firebaseapp.com",
    projectId: "ecclasswebsitefinal",
    storageBucket: "ecclasswebsitefinal.firebasestorage.app", // Still needed for project config, but not actively used for file uploads here
    messagingSenderId: "1001100262118",
    appId: "1:1001100262118:web:78321a67ca5fc7654e1927",
    measurementId: "G-1FSR9EDHHN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app); // Initialize Firestore

// DOM elements
const form = document.getElementById('studentProfileForm');
const display = document.getElementById('profileDisplay');
const editBtn = document.getElementById('editProfileBtn');
const logoutLink = document.getElementById('logoutLink');
const loadingMessage = document.getElementById('loadingMessage');

const inputs = {
    name: document.getElementById('name'),
    yearCourse: document.getElementById('yearCourse'),
    studentId: document.getElementById('studentId'),
    contact: document.getElementById('contact'),
    address: document.getElementById('address'),
    profilePictureUrl: document.getElementById('profilePictureUrl') // New input for URL
};

const displayElements = {
    displayName: document.getElementById('displayName'),
    displayYearCourse: document.getElementById('displayYearCourse'),
    displayStudentId: document.getElementById('displayStudentId'),
    displayContact: document.getElementById('displayContact'),
    displayAddress: document.getElementById('displayAddress'),
    displayImage: document.getElementById('displayImage'),
    formProfileImage: document.getElementById('formProfileImage')
};

// Function to show the profile display and hide the form
function showProfile(data) {
    form.classList.add('hidden');
    display.classList.remove('hidden');
    loadingMessage.style.display = 'none';

    displayElements.displayName.textContent = data.name || 'N/A';
    displayElements.displayYearCourse.textContent = data.yearCourse || 'N/A';
    displayElements.displayStudentId.textContent = data.studentId || 'N/A';
    displayElements.displayContact.textContent = data.contact || '-';
    displayElements.displayAddress.textContent = data.address || '-';

    // Set profile picture for display and form preview using the URL
    const profilePicUrl = data.profilePictureUrl || "https://via.placeholder.com/120x120?text=+";
    displayElements.displayImage.src = profilePicUrl;
    displayElements.formProfileImage.src = profilePicUrl;

    // Pre-fill form fields with current data for editing
    inputs.name.value = data.name || '';
    inputs.yearCourse.value = data.yearCourse || '';
    inputs.studentId.value = data.studentId || '';
    inputs.contact.value = data.contact || '';
    inputs.address.value = data.address || '';
    inputs.profilePictureUrl.value = data.profilePictureUrl || ''; // Pre-fill the URL input
}

// Function to show the form and hide the profile display
function showForm() {
    display.classList.add('hidden');
    form.classList.remove('hidden');
    loadingMessage.style.display = 'none';
}

// Load profile data from Firestore
async function loadProfile(user) {
    loadingMessage.style.display = 'block';
    try {
        const docRef = doc(db, "user_profiles", user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            console.log("Document data:", docSnap.data());
            showProfile(docSnap.data());
        } else {
            console.log("No profile data found for this user in Firestore. Showing empty form.");
            showForm(); // Show the form for initial input
            displayElements.formProfileImage.src = "https://via.placeholder.com/120x120?text=+"; // Default for new profile
            displayElements.displayImage.src = "https://via.placeholder.com/120x120?text=+"; // Default for new profile
        }
    } catch (error) {
        console.error("Error getting document from Firestore:", error);
        alert("Error loading profile. Please try again.");
        showForm(); // Show form even on error to allow input
    } finally {
        loadingMessage.style.display = 'none'; // Ensure loading message is hidden
    }
}

// Handle profile picture URL input change to update preview
inputs.profilePictureUrl.addEventListener('input', (e) => {
    const url = e.target.value;
    if (url) {
        displayElements.formProfileImage.src = url;
    } else {
        displayElements.formProfileImage.src = "https://via.placeholder.com/120x120?text=+";
    }
});

// Handle profile save
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    loadingMessage.style.display = 'block';
    form.classList.add('hidden');

    const user = auth.currentUser;
    if (!user) {
        alert("You must be logged in to save your profile.");
        window.location.href = 'login.html';
        return;
    }

    const profileData = {
        name: inputs.name.value,
        yearCourse: inputs.yearCourse.value,
        studentId: inputs.studentId.value,
        contact: inputs.contact.value,
        address: inputs.address.value,
        profilePictureUrl: inputs.profilePictureUrl.value, // Get URL directly from input
        lastUpdated: new Date()
    };

    // Save profile data to Firestore
    try {
        await setDoc(doc(db, "user_profiles", user.uid), profileData, { merge: true });
        alert("Profile saved successfully!");
        loadProfile(user); // Reload profile to display updated info
    } catch (error) {
        console.error("Error saving profile to Firestore:", error);
        alert("Error saving profile. Please try again.");
        showForm(); // Keep form visible if data save fails
    } finally {
        loadingMessage.style.display = 'none'; // Ensure loading message is hidden
    }
});

// Edit profile button click
editBtn.addEventListener('click', () => {
    showForm();
});

// Handle logout click
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

// Firebase Auth State Listener: Essential for page access control and initial data load
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("Profile: User is logged in as", user.email);
        loadProfile(user);
    } else {
        console.log("Profile: No user logged in, redirecting to login.");
        localStorage.removeItem('loggedInUser');
        window.location.href = 'login.html';
    }
});

// --- Navigation Active State Management ---
document.addEventListener('DOMContentLoaded', () => {
    const navLinks = document.querySelectorAll('.nav-links a');
    const currentFileName = window.location.pathname.split('/').pop();

    navLinks.forEach(link => {
        const linkFileName = link.getAttribute('href').split('/').pop();

        if (linkFileName === currentFileName) {
            link.classList.add('active');
        }
    });
});