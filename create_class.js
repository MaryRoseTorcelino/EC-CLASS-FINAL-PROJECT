import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyCWp4G154pzyxTvM6jKJ9Ckxuvf8_h82mM",
    authDomain: "ecclasswebsitefinal.firebaseapp.com",
    projectId: "ecclasswebsitefinal",
    storageBucket: "ecclasswebsitefinal.firebasestorage.app",
    messagingSenderId: "1001100262118",
    appId: "1:1001100262118:web:78321a67ca5fc7654e1927",
    measurementId: "G-1FSR9EDHHN"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const createClassForm = document.getElementById('createClassForm');
const classNameInput = document.getElementById('className');
const classImageInput = document.getElementById('classImage');
const messageBox = document.getElementById('messageBox');
const classCodeDisplay = document.getElementById('classCodeDisplay');
const generatedClassCode = document.getElementById('generatedClassCode');
const copyCodeBtn = document.getElementById('copyCodeBtn');
const logoutLink = document.getElementById('logoutLink');

function showMessage(message, type = 'error') {
    messageBox.textContent = message;
    messageBox.style.display = 'block';
    if (type === 'error') {
        messageBox.style.backgroundColor = '#ffe0b2';
        messageBox.style.color = '#e65100';
        messageBox.style.borderColor = '#ffb74d';
    } else {
        messageBox.style.backgroundColor = '#d4edda';
        messageBox.style.color = '#155724';
        messageBox.style.borderColor = '#c3e6cb';
    }
}

function generateClassCode(length = 6) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

createClassForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    messageBox.style.display = 'none';
    classCodeDisplay.style.display = 'none';

    const className = classNameInput.value.trim();
    const classImage = classImageInput.value.trim();

    if (!className) {
        showMessage('Class Name cannot be empty.', 'error');
        return;
    }

    try {
        const newClassCode = generateClassCode();
        const classesCollection = collection(db, 'classes');
        
        await addDoc(classesCollection, {
            name: className,
            image: classImage,
            classCode: newClassCode,
            createdAt: serverTimestamp()
        });

        showMessage('Class created successfully! Share the code with others.', 'success');
        generatedClassCode.textContent = newClassCode;
        classCodeDisplay.style.display = 'block';

        classNameInput.value = '';
        classImageInput.value = '';

    } catch (error) {
        console.error("Error creating class:", error);
        showMessage('Failed to create class: ' + error.message, 'error');
    }
});

copyCodeBtn.addEventListener('click', () => {
    const codeToCopy = generatedClassCode.textContent;
    if (codeToCopy) {
        const tempInput = document.createElement('textarea');
        tempInput.value = codeToCopy;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
        showMessage('Class code copied to clipboard!', 'success');
    }
});

if (logoutLink) {
    logoutLink.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
            await signOut(auth);

            const authToken = localStorage.getItem('authToken');
            if (authToken) {
                await fetch('/logout', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${authToken}`
                    }
                });
            }

            localStorage.removeItem('loggedInUser');
            localStorage.removeItem('authToken');
            window.location.href = 'login.html';
        } catch (error) {
            console.error("Error signing out:", error);
            showMessage("Failed to log out. Please try again.", 'error');
        }
    });
}
