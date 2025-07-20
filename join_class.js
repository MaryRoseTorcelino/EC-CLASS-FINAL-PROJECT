import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    getFirestore,
    collection,
    query,
    where,
    getDocs,
    doc,
    updateDoc,
    arrayUnion
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Firebase config (ensure this matches your project's config)
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

// DOM Elements
const logoutLink = document.getElementById('logoutLink');
const joinClassForm = document.getElementById('joinClassForm');
const classCodeInput = document.getElementById('classCodeInput');
const joinClassMessageBox = document.getElementById('joinClassMessageBox');

let currentUserUid = null;

// Function to display messages
function showMessage(message, type = 'error') {
    joinClassMessageBox.textContent = message;
    joinClassMessageBox.style.display = 'block';
    if (type === 'error') {
        joinClassMessageBox.style.backgroundColor = '#ffe0b2';
        joinClassMessageBox.style.color = '#e65100';
        joinClassMessageBox.style.borderColor = '#ffb74d';
    } else { // 'success' or default
        joinClassMessageBox.style.backgroundColor = '#d4edda';
        joinClassMessageBox.style.color = '#155724';
        joinClassMessageBox.style.borderColor = '#c3e6cb';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Auth state change listener
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUserUid = user.uid;
            console.log("Join Class Page: User is logged in as", user.email, "UID:", currentUserUid);
        } else {
            console.log("Join Class Page: No user logged in, redirecting to login.");
            localStorage.removeItem('loggedInUser');
            window.location.href = 'login.html';
        }
    });

    // Logout handler
    logoutLink.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
            await signOut(auth);
            localStorage.removeItem('loggedInUser');
            // Assuming server-side logout via fetch for authToken
            const authToken = localStorage.getItem('authToken');
            if (authToken) {
                await fetch('/logout', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${authToken}`
                    }
                });
            }
            localStorage.removeItem('authToken');
            window.location.href = 'login.html';
        } catch (error) {
            console.error("Error signing out:", error);
            showMessage("Failed to log out. Please try again.", 'error');
        }
    });

    // Handle form submission for joining a class
    joinClassForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        joinClassMessageBox.style.display = 'none'; // Clear previous messages

        const classCode = classCodeInput.value.trim().toUpperCase();

        if (!classCode) {
            showMessage("Please enter a class code.", 'error');
            return;
        }

        if (!currentUserUid) {
            showMessage("You must be logged in to join a class.", 'error');
            return;
        }

        try {
            const classesRef = collection(db, "classes");
            // CORRECTED: Querying by 'classCode' field name from Firestore.
            const q = query(classesRef, where("classCode", "==", classCode));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                showMessage("Class not found with that code.", 'error');
                return;
            }

            const classDoc = querySnapshot.docs[0];
            const classData = classDoc.data();
            const classId = classDoc.id;

            if (classData.ownerId === currentUserUid) {
                showMessage("You are the owner of this class. No need to join.", 'error');
                classCodeInput.value = '';
                return;
            }

            // Ensure students array exists before checking/updating
            const currentStudents = classData.students || []; // Handles case where 'students' field might be missing

            if (currentStudents.includes(currentUserUid)) {
                showMessage("You are already a member of this class.", 'success');
                classCodeInput.value = '';
                // Redirect even if already a member
                window.location.href = `class_conversation.html?classId=${classId}&className=${encodeURIComponent(classData.name || 'Untitled Class')}`;
                return;
            }

            const classDocRef = doc(db, "classes", classId);
            await updateDoc(classDocRef, {
                students: arrayUnion(currentUserUid)
            });

            showMessage(`Successfully joined "${classData.name}"! Redirecting...`, 'success');
            classCodeInput.value = ''; // Clear input field

            // Redirect to class_conversation.html with class details
            window.location.href = `class_conversation.html?classId=${classId}&className=${encodeURIComponent(classData.name || 'Untitled Class')}`;

        } catch (error) {
            console.error("Error joining class:", error);
            // This error is likely a permissions issue if the previous checks pass.
            showMessage("An error occurred while trying to join the class. Please ensure your account has permissions and the class exists.", 'error');
        }
    });
});