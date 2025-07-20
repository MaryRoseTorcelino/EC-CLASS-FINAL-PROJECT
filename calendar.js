// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    getFirestore,
    collection,
    addDoc,
    getDocs, // Used for fetching documents for the current month
    query,
    where,
    deleteDoc,
    doc,
    // updateDoc // You might want to import updateDoc if you plan to edit events later
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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
const db = getFirestore(app); // Initialize Firestore

// Get DOM Elements
const logoutLink = document.getElementById('logoutLink');
const calendarHeader = document.getElementById('calendarHeader');
const currentMonthYearSpan = document.getElementById('currentMonthYear');
const prevMonthBtn = document.getElementById('prevMonth');
const nextMonthBtn = document.getElementById('nextMonth');
const calendarGrid = document.getElementById('calendarGrid');

// Modals and Forms
const addEventFab = document.getElementById('addEventFab');
const addEventModal = document.getElementById('addEventModal');
const closeAddEventModalBtn = addEventModal.querySelector('.close-button');
const cancelAddEventBtn = document.getElementById('cancelAddEvent');
const eventForm = document.getElementById('eventForm');
const eventTitleInput = document.getElementById('eventTitle');
const eventDateInput = document.getElementById('eventDate');
const eventTypeSelect = document.getElementById('eventType');
const eventDescriptionTextarea = document.getElementById('eventDescription');

const eventDetailsModal = document.getElementById('eventDetailsModal');
const closeDetailsModalBtn = eventDetailsModal.querySelector('.close-button');
const detailsEventTitle = document.getElementById('detailsEventTitle');
const detailsEventDate = document.getElementById('detailsEventDate');
const detailsEventType = document.getElementById('detailsEventType');
const detailsEventDescription = document.getElementById('detailsEventDescription');
const deleteEventButton = document.getElementById('deleteEventButton');
const closeDetailsButton = document.getElementById('closeDetailsModal');


let currentDate = new Date(); // Start with current date for calendar navigation
let events = []; // Array to store fetched events for the current month
let selectedEventId = null; // To store the ID of the event currently shown in the details modal

// Current logged-in user's UID (to filter events by user)
let currentUserUid = null;

// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
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

    // Firebase Auth State Listener
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUserUid = user.uid; // Set the current user's UID
            const userName = user.email ? user.email.split('@')[0] : 'User';
            localStorage.setItem('loggedInUser', userName);
            calendarHeader.textContent = `WELCOME ${userName.toUpperCase()}! THIS IS YOUR CALENDAR.`;
            console.log("Calendar: User is logged in as", user.email);
            renderCalendar(); // Render calendar with events for the logged-in user
        } else {
            console.log("Calendar: No user logged in, redirecting to login.");
            localStorage.removeItem('loggedInUser');
            window.location.href = 'login.html';
        }
    });

    // --- Navigation Active State Management (for dashboard/other links) ---
    const navLinks = document.querySelectorAll('.nav-links a');
    const currentPath = window.location.pathname;

    navLinks.forEach(link => {
        const linkPath = link.getAttribute('href');
        if (currentPath.includes(linkPath) && linkPath !== '#') {
            link.classList.add('active');
        }
    });

    // --- Calendar Navigation Buttons ---
    prevMonthBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar(); // Re-render calendar for the new month
    });

    nextMonthBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar(); // Re-render calendar for the new month
    });

    // --- Add Event FAB and Modal ---
    addEventFab.addEventListener('click', () => {
        addEventModal.style.display = 'flex'; // Use flex to center the modal
        // Set default date in modal to the currently selected day or current day
        const selectedDay = document.querySelector('.calendar-day.selected'); // Assuming you add a 'selected' class to clicked days
        if (selectedDay && selectedDay.dataset.date) {
            eventDateInput.value = selectedDay.dataset.date;
        } else {
            eventDateInput.valueAsDate = new Date(); // Set to today if no day selected
        }
    });

    closeAddEventModalBtn.addEventListener('click', () => {
        addEventModal.style.display = 'none';
        eventForm.reset(); // Clear form on close
    });

    cancelAddEventBtn.addEventListener('click', () => {
        addEventModal.style.display = 'none';
        eventForm.reset(); // Clear form on cancel
    });

    eventForm.addEventListener('submit', handleAddEvent);

    // --- Event Details Modal ---
    closeDetailsModalBtn.addEventListener('click', () => {
        eventDetailsModal.style.display = 'none';
    });
    closeDetailsButton.addEventListener('click', () => { // Redundant if closeDetailsModalBtn does the same
        eventDetailsModal.style.display = 'none';
    });
    deleteEventButton.addEventListener('click', handleDeleteEvent);
});

// --- Firebase Firestore Functions ---

/**
 * Fetches events for the current month, filtered by the logged-in user.
 * Requires a composite index on `userId` (ASC) and `date` (ASC) in Firestore.
 * @returns {Promise<Array>} A promise that resolves to an array of event objects.
 */
async function fetchEvents() {
    if (!currentUserUid) {
        console.warn("No user logged in. Cannot fetch events.");
        return []; // Return empty array if no user is logged in
    }

    // Get the first day of the current month and the last day of the current month
    // These are used for date range queries.
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0); // Last day of current month

    // Format dates as YYYY-MM-DD strings for Firestore queries
    // Firestore string comparisons work correctly for YYYY-MM-DD
    const startOfMonthStr = startOfMonth.toISOString().split('T')[0];
    const endOfMonthStr = endOfMonth.toISOString().split('T')[0];

    const eventsCollection = collection(db, 'events');
    const q = query(
        eventsCollection,
        where('userId', '==', currentUserUid), // Filter by current user
        where('date', '>=', startOfMonthStr),  // Date within the current month (start)
        where('date', '<=', endOfMonthStr)     // Date within the current month (end)
    );

    try {
        const querySnapshot = await getDocs(q); // Executes the query
        const fetchedEvents = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        console.log("Fetched events for month:", fetchedEvents);
        return fetchedEvents;
    } catch (error) {
        console.error("Error fetching events:", error);
        // This is where your alert "Failed to load events..." would have been triggered.
        // It's better to handle this visually in the UI than with an alert,
        // but for now, the console error is informative.
        return []; // Return empty array on error
    }
}

/**
 * Handles the submission of the event form to add a new event to Firestore.
 */
async function handleAddEvent(e) {
    e.preventDefault();

    if (!currentUserUid) {
        alert("You must be logged in to add an event.");
        return;
    }

    const title = eventTitleInput.value.trim();
    const date = eventDateInput.value; // YYYY-MM-DD format from input
    const type = eventTypeSelect.value;
    const description = eventDescriptionTextarea.value.trim();

    if (!title || !date || !type) {
        alert("Please fill in all required fields (Title, Date, Type).");
        return;
    }

    try {
        await addDoc(collection(db, 'events'), {
            title: title,
            date: date, // Stored as YYYY-MM-DD string
            type: type,
            description: description,
            userId: currentUserUid, // Associate with current user
            createdAt: new Date().toISOString() // Timestamp for creation
        });
        alert('Event added successfully!');
        addEventModal.style.display = 'none';
        eventForm.reset();
        renderCalendar(); // Re-render calendar to show the new event
    } catch (error) {
        console.error("Error adding document: ", error);
        alert("Failed to add event. Please try again.");
    }
}

/**
 * Displays the event details modal with the given event data.
 * @param {Object} eventData - The event object to display.
 */
function showEventDetails(eventData) {
    selectedEventId = eventData.id; // Store the ID for potential deletion
    detailsEventTitle.textContent = eventData.title;
    // Format the date for display
    detailsEventDate.textContent = new Date(eventData.date + 'T00:00:00').toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    detailsEventType.textContent = eventData.type.charAt(0).toUpperCase() + eventData.type.slice(1); // Capitalize first letter
    detailsEventDescription.textContent = eventData.description || 'No description provided.';
    eventDetailsModal.style.display = 'flex'; // Show modal
}

/**
 * Deletes the currently selected event from Firestore.
 */
async function handleDeleteEvent() {
    if (!selectedEventId) {
        alert("No event selected for deletion.");
        return;
    }

    if (!confirm("Are you sure you want to delete this event?")) {
        return; // User cancelled
    }

    try {
        await deleteDoc(doc(db, 'events', selectedEventId)); // Delete by ID
        alert("Event deleted successfully!");
        eventDetailsModal.style.display = 'none';
        selectedEventId = null; // Clear selected ID
        renderCalendar(); // Re-render calendar to reflect deletion
    } catch (error) {
        console.error("Error deleting event:", error);
        alert("Failed to delete event. Please try again.");
    }
}

// --- Calendar Rendering Logic ---

/**
 * Renders the calendar grid for the current month, fetching events first.
 */
async function renderCalendar() {
    calendarGrid.innerHTML = ''; // Clear previous days
    events = await fetchEvents(); // Fetch events for the current month and update 'events' array

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth(); // 0-indexed (0 = Jan, 11 = Dec)

    // Update month and year display in the header
    currentMonthYearSpan.textContent = new Date(year, month).toLocaleString('en-US', {
        month: 'long',
        year: 'numeric'
    });

    // Determine the day of the week for the 1st of the month (0 = Sunday, 1 = Monday, etc.)
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    // Get the total number of days in the current month
    const daysInMonth = new Date(year, month + 1, 0).getDate(); // getDate(0) returns last day of previous month

    // Fill in leading empty days (for days before the 1st of the month)
    for (let i = 0; i < firstDayOfMonth; i++) {
        const emptyDayDiv = document.createElement('div');
        emptyDayDiv.classList.add('calendar-day', 'empty');
        calendarGrid.appendChild(emptyDayDiv);
    }

    // Fill in days of the month
    for (let day = 1; day <= daysInMonth; day++) {
        const dayDiv = document.createElement('div');
        dayDiv.classList.add('calendar-day');
        dayDiv.innerHTML = `<div class="calendar-day-number">${day}</div>`;

        const fullDate = new Date(year, month, day);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalize today's date for accurate comparison

        // Add 'today' class if it's the current date
        if (fullDate.toDateString() === today.toDateString()) {
            dayDiv.classList.add('today');
        }

        // Format date for comparison with event dates (YYYY-MM-DD)
        const formattedDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        dayDiv.dataset.date = formattedDate; // Store date as data attribute for easy access

        // --- MODIFIED SECTION: Display Event Titles ---
        const dayEvents = events.filter(event => event.date === formattedDate);

        if (dayEvents.length > 0) {
            const eventsContainer = document.createElement('div');
            eventsContainer.classList.add('day-events-list'); // Container for all events on that day
            
            // Loop through all events for this day and display their titles
            dayEvents.forEach(event => {
                const eventTitleElement = document.createElement('div');
                eventTitleElement.classList.add('event-title-on-calendar');
                eventTitleElement.textContent = event.title;
                // Add a class based on event type for potential styling (e.g., color coding)
                eventTitleElement.classList.add(`event-type-${event.type}`); // e.g., 'event-type-assignment', 'event-type-event'
                eventsContainer.appendChild(eventTitleElement);
            });
            dayDiv.appendChild(eventsContainer);
        }
        // --- END MODIFIED SECTION ---

        // Add click listener to show event details or open add event modal
        dayDiv.addEventListener('click', () => {
            // Remove 'selected' class from previously selected day
            const previouslySelected = document.querySelector('.calendar-day.selected');
            if (previouslySelected) {
                previouslySelected.classList.remove('selected');
            }
            // Add 'selected' class to the clicked day
            dayDiv.classList.add('selected');

            const clickedDate = dayDiv.dataset.date;
            const eventsForClickedDate = events.filter(event => event.date === clickedDate);

            if (eventsForClickedDate.length > 0) {
                // If there are events, show details of the first one
                // You might want to consider how to handle multiple events on one day here.
                // For now, it shows the first one.
                showEventDetails(eventsForClickedDate[0]);
            } else {
                // If no events, open the add event modal and pre-fill the date.
                // Reset form first in case it has old data.
                eventForm.reset();
                eventDateInput.value = clickedDate;
                addEventModal.style.display = 'flex';
            }
        });

        calendarGrid.appendChild(dayDiv);
    }
}