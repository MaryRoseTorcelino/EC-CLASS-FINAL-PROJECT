import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    getFirestore,
    collection,
    addDoc,
    query,
    orderBy,
    onSnapshot, // For real-time updates
    serverTimestamp // For message timestamps
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
const classHeaderTitle = document.getElementById('classHeaderTitle');
const messagesContainer = document.getElementById('messagesContainer');
const messageInput = document.getElementById('messageInput');
const sendMessageBtn = document.getElementById('sendMessageBtn');

let currentUserUid = null;
let currentUserName = 'Guest'; // Default name for messages
let currentClassId = null;
let currentClassName = 'Unknown Class';

document.addEventListener('DOMContentLoaded', () => {
    // Extract classId and className from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    currentClassId = urlParams.get('classId');
    currentClassName = urlParams.get('className') || 'Unknown Class';

    if (classHeaderTitle) {
        classHeaderTitle.textContent = currentClassName;
    }

    if (!currentClassId) {
        messagesContainer.innerHTML = '<p class="no-messages">Error: Class ID not found. Please go back to the dashboard.</p>';
        console.error("Class ID is missing from URL parameters.");
        return;
    }

    // Auth state change listener
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUserUid = user.uid;
            currentUserName = user.email ? user.email.split('@')[0] : 'User';
            console.log("Class Conversation Page: User is logged in as", user.email, "UID:", currentUserUid);

            // Start listening for messages after user is authenticated
            setupMessageListener(currentClassId);
            sendMessageBtn.addEventListener('click', sendMessage);
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    sendMessage();
                }
            });

        } else {
            console.log("Class Conversation Page: No user logged in, redirecting to login.");
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
            alert("Failed to log out. Please try again.");
        }
    });
});

// Setup real-time message listener
function setupMessageListener(classId) {
    const messagesRef = collection(db, 'classes', classId, 'messages');
    const q = query(messagesRef, orderBy('timestamp')); // Order by timestamp

    onSnapshot(q, (snapshot) => {
        messagesContainer.innerHTML = ''; // Clear existing messages
        if (snapshot.empty) {
            messagesContainer.innerHTML = '<p class="no-messages">No messages yet. Start the conversation!</p>';
            return;
        }

        snapshot.forEach((doc) => {
            const messageData = doc.data();
            const messageElement = document.createElement('div');
            messageElement.classList.add('message-item');

            // Determine if the message was sent by the current user
            if (messageData.senderId === currentUserUid) {
                messageElement.classList.add('sent');
            } else {
                messageElement.classList.add('received');
            }

            const timestamp = messageData.timestamp ?
                new Date(messageData.timestamp.toDate()).toLocaleString() : 'Just now';

            messageElement.innerHTML = `
                <strong>${messageData.senderName || 'Anonymous'}</strong>
                <p>${messageData.text}</p>
                <span class="timestamp">${timestamp}</span>
            `;
            messagesContainer.appendChild(messageElement);
        });

        // Scroll to the bottom of the messages container
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }, (error) => {
        console.error("Error listening to messages:", error);
        messagesContainer.innerHTML = '<p class="no-messages" style="color: red;">Failed to load messages. Check permissions.</p>';
    });
}

// Send a new message
async function sendMessage() {
    const messageText = messageInput.value.trim();

    if (!messageText) {
        alert("Message cannot be empty.");
        return;
    }

    if (!currentUserUid || !currentClassId) {
        alert("You must be logged in and a class must be selected to send messages.");
        return;
    }

    try {
        const messagesRef = collection(db, 'classes', currentClassId, 'messages');
        await addDoc(messagesRef, {
            text: messageText,
            senderId: currentUserUid,
            senderName: currentUserName,
            timestamp: serverTimestamp() // Use serverTimestamp for consistent time
        });
        messageInput.value = ''; // Clear input field
    } catch (error) {
        console.error("Error sending message:", error);
        alert("Failed to send message. Please try again.");
    }
}