// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    getFirestore,
    collection,
    getDocs, // Using getDocs for a one-time fetch of all events
    addDoc, // For adding new events
    doc, // For referencing a specific document
    updateDoc, // For updating events
    deleteDoc, // For deleting events
    query, // For building queries
    where // For adding conditions to queries
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

// DOM Elements
const welcomeMessage = document.getElementById('welcomeMessage'); // Assuming you have a welcome message for events page
const logoutLink = document.getElementById('logoutLink');
const pageHeader = document.getElementById('pageHeader'); // Using this for the title like 'USER'S EVENTS'
const eventsContainer = document.getElementById('eventsContainer');
const noEventsMessage = document.getElementById('noEventsMessage'); // For displaying when no events are found

// Form elements for adding/editing events
const eventForm = document.getElementById('eventForm');
const eventIdInput = document.getElementById('eventId');
const eventTitleInput = document.getElementById('eventTitle');
const eventDateInput = document.getElementById('eventDate');
const eventTimeInput = document.getElementById('eventTime');
const eventDescriptionTextarea = document.getElementById('eventDescription');
const submitEventBtn = document.getElementById('submitEventBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');

let currentUserUid = null;

document.addEventListener('DOMContentLoaded', () => {
    // Set default date to today for the form
    eventDateInput.valueAsDate = new Date();

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
            currentUserUid = user.uid; // Store the user ID
            const userName = user.email ? user.email.split('@')[0] : 'User';
            localStorage.setItem('loggedInUser', userName);
            // Update welcome message/header for events page
            if (welcomeMessage) { // Check if element exists
                welcomeMessage.textContent = `WELCOME ${userName.toUpperCase()} TO THE EVENTS PAGE!`;
            }
            if (pageHeader) { // Check if element exists
                pageHeader.textContent = `${userName.toUpperCase()}'S EVENTS`;
            }
            console.log("Events Page: User is logged in as", user.email, "UID:", currentUserUid);

            // Fetch and render only the current user's events
            fetchAndRenderUserEvents(currentUserUid);
        } else {
            console.log("Events Page: No user logged in, redirecting to login.");
            localStorage.removeItem('loggedInUser');
            window.location.href = 'login.html';
        }
    });

    // Handle form submission for adding/updating events
    eventForm?.addEventListener('submit', handleAddOrUpdateEvent);
    cancelEditBtn?.addEventListener('click', resetForm);

    // Highlight current navigation link (if you have a navigation on this page)
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

// Render event cards
function renderEvents(eventList) {
    eventsContainer.innerHTML = ''; // Clear previous events
    if (eventList.length === 0) {
        if (noEventsMessage) {
            noEventsMessage.style.display = 'block';
        } else {
            eventsContainer.innerHTML = '<p style="text-align: center; color: var(--text-light); grid-column: 1 / -1;">No events yet. Add a new event!</p>';
        }
        return;
    } else {
        if (noEventsMessage) {
            noEventsMessage.style.display = 'none';
        }
    }

    eventList.forEach(eventItem => {
        const eventCard = document.createElement('div');
        eventCard.classList.add('event-item');
        eventCard.setAttribute('data-event-id', eventItem.id);

        eventCard.innerHTML = `
            <h3>${eventItem.title}</h3>
            <p><strong>Date:</strong> ${eventItem.date}</p>
            <p><strong>Time:</strong> ${eventItem.time || '—'}</p>
            <p class="description"><strong>Description:</strong> ${eventItem.description || '—'}</p>
            <div class="event-actions">
                <button class="edit-btn" data-id="${eventItem.id}"
                    data-title="${eventItem.title}" data-date="${eventItem.date}"
                    data-time="${eventItem.time || ''}" data-description="${eventItem.description || ''}">
                    ✏️ Edit
                </button>
                <button class="delete-btn" data-id="${eventItem.id}">🗑 Delete</button>
            </div>
        `;

        // Attach event listeners for edit and delete buttons
        eventCard.querySelector('.edit-btn')?.addEventListener('click', (e) => {
            const data = e.currentTarget.dataset;
            editEvent(data.id, data.title, data.date, data.time, data.description);
        });

        eventCard.querySelector('.delete-btn')?.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            // Pass the userId of the event to the delete function for a client-side check
            deleteEvent(id, eventItem.userId); // Pass eventItem.userId
        });

        eventsContainer.appendChild(eventCard);
    });
}

// Fetch only current user's events from Firestore
async function fetchAndRenderUserEvents(userId) {
    if (!userId) {
        console.warn("User ID is not available. Cannot fetch user-specific events.");
        eventsContainer.innerHTML = '<p style="color: var(--text-light); text-align: center;">Please log in to see your events.</p>';
        return;
    }

    try {
        const eventsRef = collection(db, "events");
        // Create a query to filter events by the current user's UID
        const q = query(eventsRef, where("userId", "==", userId));
        const querySnapshot = await getDocs(q);

        const events = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            events.push({
                id: doc.id,
                title: data.title || "Untitled Event",
                date: data.date || "N/A",
                time: data.time || "",
                description: data.description || "",
                userId: data.userId // Ensure userId is included in the event object
            });
        });

        renderEvents(events);
    } catch (error) {
        console.error("Error fetching user events:", error);
        if (eventsContainer) {
            eventsContainer.innerHTML = '<p style="color: red; text-align: center;">Failed to load your events. Please try again later.</p>';
        }
    }
}


// Handle submit event (add or update)
async function handleAddOrUpdateEvent(e) {
    e.preventDefault();

    if (!currentUserUid) {
        alert("You must be logged in to add/edit events.");
        return;
    }

    const id = eventIdInput.value;
    const title = eventTitleInput.value.trim();
    const date = eventDateInput.value;
    const time = eventTimeInput.value.trim();
    const description = eventDescriptionTextarea.value.trim();

    if (!title || !date) {
        alert("Title and Date are required for the event.");
        return;
    }

    try {
        if (id) {
            // Update existing event
            // Client-side check before attempting update
            const eventDocRef = doc(db, 'events', id);
            const eventDoc = await getDocs(eventDocRef); // Use getDoc for single document
            if (!eventDoc.exists()) {
                alert("Event not found for update.");
                return;
            }
            const eventData = eventDoc.data();
            if (eventData.userId !== currentUserUid) {
                alert("You do not have permission to edit this event.");
                return;
            }

            await updateDoc(eventDocRef, {
                title, date, time, description,
                // Do not update userId or createdAt on update unless specifically needed
            });
            alert("Event updated successfully!");
        } else {
            // Add new event
            await addDoc(collection(db, 'events'), {
                title,
                date,
                time,
                description,
                userId: currentUserUid, // Associate event with the current user
                createdAt: new Date().toISOString()
            });
            alert("Event added successfully!");
        }
        resetForm();
        fetchAndRenderUserEvents(currentUserUid); // Re-fetch and render only user's events
    } catch (err) {
        console.error("Error saving event:", err);
        alert("An error occurred while saving the event.");
    }
}

// Edit existing event
function editEvent(id, title, date, time, description) {
    eventIdInput.value = id;
    eventTitleInput.value = title;
    eventDateInput.value = date;
    eventTimeInput.value = time;
    eventDescriptionTextarea.value = description;

    submitEventBtn.textContent = 'Update Event';
    cancelEditBtn.style.display = 'inline-block';

    window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll to the form
}

// Delete event
async function deleteEvent(id, eventUserId) { // Added eventUserId parameter
    if (!currentUserUid) {
        alert("You must be logged in to delete events.");
        return;
    }

    // Client-side check: Ensure the current user is the owner of the event
    if (currentUserUid !== eventUserId) {
        alert("You do not have permission to delete this event.");
        console.warn(`Attempted to delete event ${id} by user ${currentUserUid} but owner is ${eventUserId}`);
        return; // Prevent deletion if not the owner
    }

    const confirmDelete = confirm("Are you sure you want to delete this event?");
    if (!confirmDelete) return;

    try {
        await deleteDoc(doc(db, 'events', id));
        alert("Event deleted.");
        fetchAndRenderUserEvents(currentUserUid); // Re-fetch and render only user's events after deletion
    } catch (err) {
        console.error("Delete failed:", err);
        // FirebaseError from permissions will still be caught here if server rules deny it
        if (err.code === 'permission-denied') {
            alert("Permission denied. You might not have the rights to delete this event. Check Firebase Security Rules.");
        } else {
            alert("An error occurred while deleting the event.");
        }
    }
}


// Reset form to default
function resetForm() {
    eventForm.reset();
    eventIdInput.value = '';
    submitEventBtn.textContent = 'Add Event';
    cancelEditBtn.style.display = 'none';
    eventDateInput.valueAsDate = new Date(); // Set back to today's date
}