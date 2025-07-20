// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    getFirestore,
    collection,
    getDocs,
    addDoc,
    doc,
    updateDoc,
    deleteDoc,
    query,
    where,
    getDoc // For fetching a single document to check ownership
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Firebase config (replace with your actual config if different from your other files)
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
const welcomeMessage = document.getElementById('welcomeMessage'); // If you have this on the grades page
const logoutLink = document.getElementById('logoutLink');
const pageHeader = document.getElementById('pageHeader'); // For the page title
const gradesContainer = document.getElementById('gradesContainer');
const noGradesMessage = document.getElementById('noGradesMessage');

// Form elements for adding/editing grades
const gradeForm = document.getElementById('gradeForm');
const gradeIdInput = document.getElementById('gradeId');
const gradeSubjectInput = document.getElementById('gradeSubject');
const gradeScoreInput = document.getElementById('gradeScore');
const gradeMaxScoreInput = document.getElementById('gradeMaxScore');
const gradeCategoryInput = document.getElementById('gradeCategory');
const gradeDateInput = document.getElementById('gradeDate');
const submitGradeBtn = document.getElementById('submitGradeBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');

let currentUserUid = null;

document.addEventListener('DOMContentLoaded', () => {
    // Set default date to today for the form
    gradeDateInput.valueAsDate = new Date();

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

    // Auth state change listener
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUserUid = user.uid; // Store the user ID
            const userName = user.email ? user.email.split('@')[0] : 'User';
            localStorage.setItem('loggedInUser', userName);

            if (welcomeMessage) {
                welcomeMessage.textContent = `WELCOME ${userName.toUpperCase()} TO THE GRADES PAGE!`;
            }
            if (pageHeader) {
                pageHeader.textContent = `${userName.toUpperCase()}'S GRADES`;
            }
            console.log("Grades Page: User is logged in as", user.email, "UID:", currentUserUid);

            // Fetch and render only the current user's grades
            fetchAndRenderUserGrades(currentUserUid);
        } else {
            console.log("Grades Page: No user logged in, redirecting to login.");
            localStorage.removeItem('loggedInUser');
            window.location.href = 'login.html';
        }
    });

    // Handle form submission for adding/updating grades
    gradeForm?.addEventListener('submit', handleAddOrUpdateGrade);
    cancelEditBtn?.addEventListener('click', resetForm);

    // Highlight current navigation link
    const navLinks = document.querySelectorAll('.nav-links a');
    const currentPath = window.location.pathname;

    navLinks.forEach(link => {
        const linkPath = link.getAttribute('href');
        if (currentPath.includes(linkPath) && linkPath !== '#') {
            link.classList.add('active');
        }
    });
});

// Render grade cards
function renderGrades(gradeList) {
    gradesContainer.innerHTML = ''; // Clear previous grades
    if (gradeList.length === 0) {
        if (noGradesMessage) {
            noGradesMessage.style.display = 'block';
        } else {
            gradesContainer.innerHTML = '<p style="text-align: center; color: var(--text-light); grid-column: 1 / -1;">No grades yet. Add a new grade!</p>';
        }
        return;
    } else {
        if (noGradesMessage) {
            noGradesMessage.style.display = 'none';
        }
    }

    gradeList.forEach(gradeItem => {
        const gradeCard = document.createElement('div');
        gradeCard.classList.add('grade-item');
        gradeCard.setAttribute('data-grade-id', gradeItem.id);

        // Calculate percentage
        const percentage = gradeItem.maxScore > 0 ? ((gradeItem.score / gradeItem.maxScore) * 100).toFixed(2) : 'N/A';

        gradeCard.innerHTML = `
            <h3>${gradeItem.subject}</h3>
            <p><strong>Category:</strong> ${gradeItem.category || '—'}</p>
            <p><strong>Score:</strong> ${gradeItem.score} / ${gradeItem.maxScore}</p>
            <p><strong>Percentage:</strong> ${percentage}%</p>
            <p><strong>Date:</strong> ${gradeItem.date}</p>
            <div class="grade-actions">
                <button class="edit-btn" data-id="${gradeItem.id}"
                    data-subject="${gradeItem.subject}" data-score="${gradeItem.score}"
                    data-maxscore="${gradeItem.maxScore}" data-category="${gradeItem.category || ''}"
                    data-date="${gradeItem.date}">
                    ✏️ Edit
                </button>
                <button class="delete-btn" data-id="${gradeItem.id}">🗑 Delete</button>
            </div>
        `;

        // Attach event listeners for edit and delete buttons
        gradeCard.querySelector('.edit-btn')?.addEventListener('click', (e) => {
            const data = e.currentTarget.dataset;
            editGrade(data.id, data.subject, data.score, data.maxscore, data.category, data.date);
        });

        gradeCard.querySelector('.delete-btn')?.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            // Pass the userId of the grade to the delete function for client-side check
            deleteGrade(id, gradeItem.userId);
        });

        gradesContainer.appendChild(gradeCard);
    });
}

// Fetch only current user's grades from Firestore
async function fetchAndRenderUserGrades(userId) {
    if (!userId) {
        console.warn("User ID is not available. Cannot fetch user-specific grades.");
        gradesContainer.innerHTML = '<p style="color: var(--text-light); text-align: center;">Please log in to see your grades.</p>';
        return;
    }

    try {
        const gradesRef = collection(db, "grades");
        // Create a query to filter grades by the current user's UID
        const q = query(gradesRef, where("userId", "==", userId));
        const querySnapshot = await getDocs(q);

        const grades = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            grades.push({
                id: doc.id,
                subject: data.subject || "Untitled Grade",
                score: data.score || 0,
                maxScore: data.maxScore || 100,
                category: data.category || "",
                date: data.date || "N/A",
                userId: data.userId // Ensure userId is included in the grade object
            });
        });

        renderGrades(grades);
    } catch (error) {
        console.error("Error fetching user grades:", error);
        if (gradesContainer) {
            gradesContainer.innerHTML = '<p style="color: red; text-align: center;">Failed to load your grades. Please try again later.</p>';
        }
    }
}

// Handle submit grade (add or update)
async function handleAddOrUpdateGrade(e) {
    e.preventDefault();

    if (!currentUserUid) {
        alert("You must be logged in to add/edit grades.");
        return;
    }

    const id = gradeIdInput.value;
    const subject = gradeSubjectInput.value.trim();
    const score = parseFloat(gradeScoreInput.value);
    const maxScore = parseFloat(gradeMaxScoreInput.value);
    const category = gradeCategoryInput.value.trim();
    const date = gradeDateInput.value;

    if (!subject || isNaN(score) || isNaN(maxScore) || !date) {
        alert("Subject, Score, Max Score, and Date are required for the grade.");
        return;
    }
    if (score < 0 || maxScore < 1 || score > maxScore) {
        alert("Please enter valid scores (Score must be between 0 and Max Score, Max Score must be at least 1).");
        return;
    }

    try {
        if (id) {
            // Update existing grade
            const gradeDocRef = doc(db, 'grades', id);
            const gradeDoc = await getDoc(gradeDocRef); // Use getDoc for single document

            if (!gradeDoc.exists()) {
                alert("Grade not found for update.");
                return;
            }
            const gradeData = gradeDoc.data();
            if (gradeData.userId !== currentUserUid) {
                alert("You do not have permission to edit this grade.");
                return;
            }

            await updateDoc(gradeDocRef, {
                subject, score, maxScore, category, date,
                // userId and createdAt are not updated on purpose
            });
            alert("Grade updated successfully!");
        } else {
            // Add new grade
            await addDoc(collection(db, 'grades'), {
                subject,
                score,
                maxScore,
                category,
                date,
                userId: currentUserUid, // Associate grade with the current user
                createdAt: new Date().toISOString()
            });
            alert("Grade added successfully!");
        }
        resetForm();
        fetchAndRenderUserGrades(currentUserUid); // Re-fetch and render user's grades
    } catch (err) {
        console.error("Error saving grade:", err);
        alert("An error occurred while saving the grade.");
    }
}

// Edit existing grade
function editGrade(id, subject, score, maxScore, category, date) {
    gradeIdInput.value = id;
    gradeSubjectInput.value = subject;
    gradeScoreInput.value = score;
    gradeMaxScoreInput.value = maxScore;
    gradeCategoryInput.value = category;
    gradeDateInput.value = date;

    submitGradeBtn.textContent = 'Update Grade';
    cancelEditBtn.style.display = 'inline-block';

    window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll to the form
}

// Delete grade
async function deleteGrade(id, gradeUserId) { // Added gradeUserId for client-side check
    if (!currentUserUid) {
        alert("You must be logged in to delete grades.");
        return;
    }

    // Client-side check: Ensure the current user is the owner of the grade
    if (currentUserUid !== gradeUserId) {
        alert("You do not have permission to delete this grade.");
        console.warn(`Attempted to delete grade ${id} by user ${currentUserUid} but owner is ${gradeUserId}`);
        return; // Prevent deletion if not the owner
    }

    const confirmDelete = confirm("Are you sure you want to delete this grade?");
    if (!confirmDelete) return;

    try {
        await deleteDoc(doc(db, 'grades', id));
        alert("Grade deleted.");
        fetchAndRenderUserGrades(currentUserUid); // Re-fetch and render user's grades after deletion
    } catch (err) {
        console.error("Delete failed:", err);
        if (err.code === 'permission-denied') {
            alert("Permission denied. You might not have the rights to delete this grade. Check Firebase Security Rules.");
        } else {
            alert("An error occurred while deleting the grade.");
        }
    }
}

// Reset form to default
function resetForm() {
    gradeForm.reset();
    gradeIdInput.value = '';
    submitGradeBtn.textContent = 'Add Grade';
    cancelEditBtn.style.display = 'none';
    gradeDateInput.valueAsDate = new Date(); // Set back to today's date
}
