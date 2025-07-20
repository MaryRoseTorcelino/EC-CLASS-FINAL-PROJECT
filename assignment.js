import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, where, orderBy, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Your Firebase configuration (MUST BE THE SAME FOR ALL PAGES)
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

// Get DOM Elements
const logoutLink = document.getElementById('logoutLink');
const assignmentForm = document.getElementById('assignmentForm');
const assignmentIdInput = document.getElementById('assignmentId');
const assignmentTitleInput = document.getElementById('assignmentTitle');
const dueDateInput = document.getElementById('dueDate');
const dueTimeInput = document.getElementById('dueTime');
const assignmentDescriptionTextarea = document.getElementById('assignmentDescription');
const statusSelect = document.getElementById('status');
const pageHeader = document.getElementById('pageHeader');
const assignmentsContainer = document.getElementById('assignmentsContainer');
const noAssignmentsMessage = document.getElementById('noAssignmentsMessage');
const submitAssignmentBtn = document.getElementById('submitAssignmentBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');

let currentUserUid = null;

// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    // Handle logout click
    logoutLink.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
            await signOut(auth);
            localStorage.removeItem('loggedInUser');
            console.log("Logged out successfully. Redirecting to login.");
            window.location.href = 'login.html';
        } catch (error) {
            console.error("Error signing out:", error);
            alert("Failed to log out. Please try again.");
        }
    });

    // Firebase Auth State Listener
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUserUid = user.uid;
            const userName = user.email ? user.email.split('@')[0] : 'User';
            pageHeader.textContent = `${userName.toUpperCase()}'S ASSIGNMENTS`;
            console.log("Auth State Changed (Assignments Page): User logged in. UID:", currentUserUid); // CRITICAL LOG
            renderAssignments(); // Load assignments ONLY after user is confirmed
        } else {
            console.log("Auth State Changed (Assignments Page): No user logged in, redirecting to login."); // CRITICAL LOG
            currentUserUid = null;
            localStorage.removeItem('loggedInUser');
            window.location.href = 'login.html';
        }
    });

    // --- Navigation Active State Management ---
    const navLinks = document.querySelectorAll('.nav-links a');
    const currentPath = window.location.pathname;

    navLinks.forEach(link => {
        const linkPath = link.getAttribute('href');
        if (currentPath.includes('assignments.html') && linkPath.includes('assignments.html')) {
            link.classList.add('active');
        } else if (currentPath.includes(linkPath) && linkPath !== '#' && !linkPath.includes('assignments.html')) {
            link.classList.add('active');
        }
    });

    // Set default date to today
    dueDateInput.valueAsDate = new Date();

    // Handle Assignment Form Submission
    assignmentForm.addEventListener('submit', handleAddOrUpdateAssignment);
    cancelEditBtn.addEventListener('click', resetForm);
});

// --- Firebase Firestore Functions ---

/**
 * Handles adding a new assignment or updating an existing one.
 */
async function handleAddOrUpdateAssignment(e) {
    e.preventDefault();

    console.log("handleAddOrUpdateAssignment called. Current UID at call time:", currentUserUid); // CRITICAL LOG

    if (!currentUserUid) {
        alert("You must be logged in to add or update an assignment.");
        console.error("ERROR: Attempted add/update without current user UID. Operation aborted."); // CRITICAL LOG
        return;
    }

    const id = assignmentIdInput.value;
    const title = assignmentTitleInput.value.trim();
    const dueDate = dueDateInput.value;
    const dueTime = dueTimeInput.value.trim();
    const description = assignmentDescriptionTextarea.value.trim();
    const status = statusSelect.value;

    if (!title || !dueDate) {
        alert("Please fill in Assignment Title and Due Date.");
        return;
    }

    try {
        if (id) {
            // Update existing assignment
            const assignmentRef = doc(db, 'assignments', id);
            await updateDoc(assignmentRef, {
                title: title,
                dueDate: dueDate,
                dueTime: dueTime,
                description: description,
                status: status
                // userId should NOT be updated here
            });
            alert('Assignment updated successfully!');
            console.log(`Assignment ${id} updated for UID: ${currentUserUid}.`); // CRITICAL LOG
        } else {
            // Add new assignment
            const newDocRef = await addDoc(collection(db, 'assignments'), {
                title: title,
                dueDate: dueDate,
                dueTime: dueTime,
                description: description,
                status: status,
                userId: currentUserUid, // CRITICAL: Storing the user's UID for security rules
                createdAt: new Date().toISOString()
            });
            alert('Assignment added successfully!');
            console.log(`New assignment added with ID: ${newDocRef.id} for UID: ${currentUserUid}.`); // CRITICAL LOG
        }
        resetForm();
        renderAssignments();
    } catch (error) {
        console.error("Firebase Error adding/updating assignment:", error); // DETAILED ERROR LOG
        alert("Failed to add/update assignment. Please try again. Check console for details.");
    }
}

/**
 * Fetches and renders assignments for the current user.
 */
async function renderAssignments() {
    assignmentsContainer.innerHTML = ''; // Clear existing list
    noAssignmentsMessage.style.display = 'none'; // Hide default message

    console.log("renderAssignments called. Current UID at render time:", currentUserUid); // CRITICAL LOG

    if (!currentUserUid) {
        assignmentsContainer.innerHTML = '<p>Please log in to view assignments.</p>';
        console.warn("WARNING: Attempted to render assignments without current user UID."); // CRITICAL LOG
        return;
    }

    try {
        const q = query(
            collection(db, 'assignments'),
            where('userId', '==', currentUserUid), // Filter by current user's ID
            orderBy('dueDate', 'asc'),
            orderBy('dueTime', 'asc'),
            orderBy('createdAt', 'asc')
        );
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            noAssignmentsMessage.style.display = 'block';
            console.log("No assignments found for current UID:", currentUserUid); // CRITICAL LOG
            return;
        }

        console.log(`Found ${querySnapshot.size} assignments for UID: ${currentUserUid}.`); // CRITICAL LOG

        querySnapshot.forEach((doc) => {
            const assignment = { id: doc.id, ...doc.data() };
            // Extra client-side check (optional)
            if (assignment.userId !== currentUserUid) {
                console.warn(`Mismatched userId found for assignment ID ${assignment.id}. Document UID: ${assignment.userId}, Current User UID: ${currentUserUid}. This assignment will not be displayed.`);
                return;
            }

            const assignmentItem = document.createElement('div');
            assignmentItem.classList.add('assignment-item', assignment.status); // Add status class for styling

            assignmentItem.innerHTML = `
                <h3>${assignment.title}</h3>
                <p class="assignment-date">Due Date: ${assignment.dueDate}</p>
                <p class="assignment-time">Due Time: ${assignment.dueTime || 'No specific time'}</p>
                <p class="assignment-status">Status: ${assignment.status.charAt(0).toUpperCase() + assignment.status.slice(1)}</p>
                <p class="description">${assignment.description || 'No description provided.'}</p>
                <div class="assignment-actions">
                    <button class="edit-btn" data-id="${assignment.id}" data-title="${assignment.title}"
                        data-due-date="${assignment.dueDate}" data-due-time="${assignment.dueTime || ''}"
                        data-description="${assignment.description || ''}" data-status="${assignment.status}">
                        <span class="material-icons">edit</span> Edit
                    </button>
                    <button class="delete-btn" data-id="${assignment.id}">
                        <span class="material-icons">delete</span> Delete
                    </button>
                </div>
            `;
            assignmentsContainer.appendChild(assignmentItem);
        });

        // Add event listeners to the new buttons
        document.querySelectorAll('.edit-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const { id, title, dueDate, dueTime, description, status } = e.currentTarget.dataset;
                editAssignment(id, title, dueDate, dueTime, description, status);
            });
        });

        document.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                deleteAssignment(id);
            });
        });

    } catch (error) {
        console.error("Firebase Error fetching assignments:", error); // DETAILED ERROR LOG
        assignmentsContainer.innerHTML = '<p>Failed to load assignments. Please try again. Check console for details.</p>';
    }
}

/**
 * Populates the form with assignment data for editing.
 */
function editAssignment(id, title, dueDate, dueTime, description, status) {
    assignmentIdInput.value = id;
    assignmentTitleInput.value = title;
    dueDateInput.value = dueDate;
    dueTimeInput.value = dueTime;
    assignmentDescriptionTextarea.value = description;
    statusSelect.value = status; // Set the status dropdown

    submitAssignmentBtn.textContent = 'Update Assignment';
    cancelEditBtn.style.display = 'inline-block';
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll to form
}

/**
 * Deletes an assignment.
 */
async function deleteAssignment(assignmentId) {
    console.log(`Attempting to delete assignment ${assignmentId} for UID: ${currentUserUid}.`); // CRITICAL LOG
    if (!currentUserUid) {
        alert("You must be logged in to delete an assignment.");
        console.error("Attempted delete without current user UID.");
        return;
    }

    if (confirm("Are you sure you want to delete this assignment?")) {
        try {
            await deleteDoc(doc(db, 'assignments', assignmentId));
            console.log(`Assignment ${assignmentId} deleted successfully.`); // CRITICAL LOG
            renderAssignments(); // Re-render the list
        } catch (error) {
            console.error("Firebase Error deleting assignment:", error); // DETAILED ERROR LOG
            alert("Failed to delete assignment. Please try again. Check console for details.");
        }
    }
}

/**
 * Resets the assignment form to its initial state (for adding new assignments).
 */
function resetForm() {
    assignmentForm.reset();
    assignmentIdInput.value = ''; // Clear hidden ID
    submitAssignmentBtn.textContent = 'Add Assignment';
    cancelEditBtn.style.display = 'none';
    dueDateInput.valueAsDate = new Date(); // Reset date to today
    statusSelect.value = 'pending'; // Reset status to default
}