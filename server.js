const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path'); // Import the 'path' module

const app = express();
const PORT = 3000;
const USERS_FILE = path.join(__dirname, 'users.json'); 

// Middleware
app.use(bodyParser.json());
// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Helper functions for user management
function readUsers() {
    if (!fs.existsSync(USERS_FILE)) {
        fs.writeFileSync(USERS_FILE, '[]');
    }
    return JSON.parse(fs.readFileSync(USERS_FILE));
}

function saveUser(user) {
    const users = readUsers();
    users.push(user);
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// Routes

// Serve the index.html file when the root URL is accessed
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Signup endpoint
app.post('/signup', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required.' });
    }

    const users = readUsers();

    if (users.find(u => u.username === username)) {
        return res.status(409).json({ message: 'User already exists.' }); // Use 409 Conflict for existing resource
    }

    saveUser({ username, password });
    res.status(201).json({ message: 'Signup successful! You can now log in.' }); // Use 201 Created for successful resource creation
});

// Login endpoint
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required.' });
    }

    const users = readUsers();

    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
        // In a real application, you'd generate a session token or JWT here
        res.status(200).json({ message: 'Login successful!' });
    } else {
        res.status(401).json({ message: 'Invalid username or password.' });
    }
});

// Start the server
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));