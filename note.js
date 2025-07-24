// js/notes.js

// Import all necessary Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import {
    getFirestore,
    collection,
    addDoc,
    getDocs,       // For fetching multiple documents (all notes)
    getDoc,        // For fetching a single document (for edit/delete permission check)
    doc,           // For referencing a specific document
    updateDoc,     // For updating existing notes
    deleteDoc,     // For deleting notes
    query,         // For building queries
    where,         // For adding conditions to queries
    orderBy,       // For ordering fetched notes
    serverTimestamp // For consistent timestamps
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

// --- Firebase Configuration (Your Actual Config) ---
const firebaseConfig = {
    apiKey: "AIzaSyCWp4G154pzyxTvM6jKJ9Ckxuvf8_h82mM", // Replace with your actual API Key
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

// --- DOM Elements ---
const logoutLink = document.getElementById('logoutLink');
const noteForm = document.getElementById('noteForm');
const noteIdInput = document.getElementById('noteId'); // Hidden input for editing
const noteTitleInput = document.getElementById('noteTitle');
const noteContentInput = document.getElementById('noteContent');
const submitNoteBtn = document.getElementById('submitNoteBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const messageDiv = document.getElementById('message');
const notesContainer = document.getElementById('notesContainer'); // For displaying notes
const noNotesMessage = document.getElementById('noNotesMessage'); // For displaying when no notes are found

let currentUserId = null; // To store the UID of the currently logged-in user

// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    // Handle logout click
    if (logoutLink) {
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
    }

    // Firebase Auth State Listener
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUserId = user.uid; // Set the current user's UID
            const userName = user.email ? user.email.split('@')[0] : 'User';
            console.log("Notes: User is logged in with UID:", currentUserId);
            // Fetch and render notes for the logged-in user
            fetchAndRenderUserNotes(currentUserId);
        } else {
            currentUserId = null;
            console.log("Notes: No user logged in. Redirecting to login.");
            // Redirect to login if not authenticated, as this page requires user context
            window.location.href = 'login.html';
        }
    });

    // Handle note form submission (add or update)
    noteForm.addEventListener('submit', handleAddOrUpdateNote);

    // Handle cancel edit button click
    cancelEditBtn.addEventListener('click', resetForm);

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
});

// --- Note Management Functions ---

/**
 * Handles adding a new note or updating an existing one.
 */
async function handleAddOrUpdateNote(e) {
    e.preventDefault(); // Prevent default form submission

    if (!currentUserId) {
        displayMessage('You must be logged in to save notes.', 'error');
        return;
    }

    const id = noteIdInput.value; // Check if an ID exists (for editing)
    const title = noteTitleInput.value.trim();
    const content = noteContentInput.value.trim();

    if (title === '' || content === '') {
        displayMessage('Please fill in both the note title and content.', 'error');
        return;
    }

    try {
        if (id) {
            // Update existing note
            const noteDocRef = doc(db, 'users', currentUserId, 'notes', id);
            const noteDocSnap = await getDoc(noteDocRef); // Get the document to verify ownership

            if (!noteDocSnap.exists() || noteDocSnap.data().userId !== currentUserId) {
                displayMessage('You do not have permission to edit this note.', 'error');
                return;
            }

            await updateDoc(noteDocRef, {
                title: title,
                content: content,
                updatedAt: serverTimestamp() // Update timestamp on modification
            });
            displayMessage('Note updated successfully!', 'success');
        } else {
            // Add new note
            // Store notes under a 'notes' subcollection for the specific user
            // Path: /users/{userId}/notes/{noteId}
            await addDoc(collection(db, 'users', currentUserId, 'notes'), {
                title: title,
                content: content,
                userId: currentUserId, // Explicitly store userId for querying/security
                createdAt: serverTimestamp(), // Use Firestore server timestamp
                updatedAt: serverTimestamp()
            });
            displayMessage('Note saved successfully!', 'success');
        }

        resetForm(); // Clear the form fields and reset button state
        fetchAndRenderUserNotes(currentUserId); // Re-fetch and render notes
    } catch (error) {
        console.error('Error saving note to Firestore: ', error);
        displayMessage('Error saving note: ' + error.message, 'error');
    }
}

/**
 * Fetches and renders the current user's notes.
 * @param {string} userId - The UID of the current user.
 */
async function fetchAndRenderUserNotes(userId) {
    if (!userId) {
        console.warn("User ID is not available. Cannot fetch user-specific notes.");
        notesContainer.innerHTML = ''; // Clear notes
        noNotesMessage.style.display = 'block'; // Show no notes message
        return;
    }

    try {
        // Query for notes belonging to the current user, ordered by creation date
        const notesRef = collection(db, 'users', userId, 'notes');
        const q = query(notesRef, orderBy('createdAt', 'desc')); // Order newest first
        const querySnapshot = await getDocs(q);

        const notes = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            notes.push({
                id: doc.id,
                title: data.title || "Untitled Note",
                content: data.content || "",
                createdAt: data.createdAt ? new Date(data.createdAt.toDate()).toLocaleString() : "N/A",
                userId: data.userId // Ensure userId is passed for permission checks
            });
        });

        renderNotes(notes); // Display the fetched notes
    } catch (error) {
        console.error("Error fetching user notes:", error);
        notesContainer.innerHTML = '<p class="error" style="grid-column: 1 / -1;">Failed to load your notes. Please try again.</p>';
        noNotesMessage.style.display = 'none'; // Hide if there's an error message
    }
}

/**
 * Renders the notes to the DOM.
 * @param {Array<Object>} noteList - An array of note objects.
 */
function renderNotes(noteList) {
    notesContainer.innerHTML = ''; // Clear existing notes
    if (noteList.length === 0) {
        noNotesMessage.style.display = 'block';
    } else {
        noNotesMessage.style.display = 'none';
        noteList.forEach(note => {
            const noteCard = document.createElement('div');
            noteCard.classList.add('note-card');
            noteCard.innerHTML = `
                <h3>${note.title}</h3>
                <p>${note.content.substring(0, 150)}${note.content.length > 150 ? '...' : ''}</p>
                <small>Created: ${note.createdAt}</small>
                <div class="note-actions">
                    <button class="edit-note-btn"
                        data-id="${note.id}"
                        data-title="${note.title}"
                        data-content="${note.content}">✏️ Edit</button>
                    <button class="delete-note-btn" data-id="${note.id}" data-user-id="${note.userId}">🗑 Delete</button>
                </div>
            `;
            // Attach event listeners for edit and delete buttons
            noteCard.querySelector('.edit-note-btn').addEventListener('click', (e) => {
                const data = e.currentTarget.dataset;
                editNote(data.id, data.title, data.content);
            });
            noteCard.querySelector('.delete-note-btn').addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                const noteOwnerId = e.currentTarget.dataset.userId; // Get the user ID from the data attribute
                deleteNote(id, noteOwnerId);
            });

            notesContainer.appendChild(noteCard);
        });
    }
}

/**
 * Populates the form for editing an existing note.
 * @param {string} id - The ID of the note to edit.
 * @param {string} title - The title of the note.
 * @param {string} content - The content of the note.
 */
function editNote(id, title, content) {
    noteIdInput.value = id;
    noteTitleInput.value = title;
    noteContentInput.value = content;
    submitNoteBtn.textContent = 'Update Note';
    cancelEditBtn.style.display = 'inline-block'; // Show cancel button
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll to the form
}

/**
 * Deletes a note from Firestore.
 * @param {string} id - The ID of the note to delete.
 * @param {string} noteOwnerId - The UID of the owner of the note (for client-side check).
 */
async function deleteNote(id, noteOwnerId) {
    if (!currentUserId) {
        displayMessage('You must be logged in to delete notes.', 'error');
        return;
    }

    // Client-side permission check
    if (currentUserId !== noteOwnerId) {
        displayMessage('You do not have permission to delete this note.', 'error');
        console.warn(`Attempted to delete note ${id} by user ${currentUserId} but owner is ${noteOwnerId}`);
        return;
    }

    const confirmDelete = confirm("Are you sure you want to delete this note?");
    if (!confirmDelete) return;

    try {
        await deleteDoc(doc(db, 'users', currentUserId, 'notes', id));
        displayMessage('Note deleted successfully!', 'success');
        fetchAndRenderUserNotes(currentUserId); // Re-fetch and render notes after deletion
    } catch (error) {
        console.error("Error deleting note:", error);
        // Firebase security rules might also block this if the current user isn't the owner
        if (error.code === 'permission-denied') {
            displayMessage('Permission denied. You might not have the rights to delete this note. Check Firebase Security Rules.', 'error');
        } else {
            displayMessage('Error deleting note: ' + error.message, 'error');
        }
    }
}

/**
 * Resets the note form to its initial state.
 */
function resetForm() {
    noteForm.reset();
    noteIdInput.value = ''; // Clear hidden ID
    submitNoteBtn.textContent = 'Save Note';
    cancelEditBtn.style.display = 'none'; // Hide cancel button
    messageDiv.textContent = ''; // Clear any messages
    messageDiv.className = 'message'; // Reset message classes
}

// --- Utility Function ---
/**
 * Displays a temporary message to the user.
 * @param {string} text - The message to display.
 * @param {'success' | 'error'} type - The type of message (for styling).
 */
function displayMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`; // Apply styling classes

    // Automatically hide the message after 5 seconds
    setTimeout(() => {
        messageDiv.textContent = '';
        messageDiv.className = 'message'; // Reset classes
    }, 5000);
}
