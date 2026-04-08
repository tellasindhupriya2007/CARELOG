/**
 * CareLog — Socket.IO Real-Time Messaging Server
 * Production Edition — Configured for Render/Railway/Heroku Deployment
 */

const express = require('express');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

// Try load .env for local dev fallback (not needed for Render as they inject variables)
try {
    require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
} catch (e) {
    console.log('[Info] .env file not found, assuming variables are in environment memory.');
}

const app = express();
const server = http.createServer(app);

// ─── Environment Validation & Debug Logs ─────────────────
const REQUIRED_ENV = [
    'REACT_APP_FIREBASE_API_KEY', 'REACT_APP_FIREBASE_PROJECT_ID'
];
console.log('--- ENV AUDIT ---');
REQUIRED_ENV.forEach(key => {
    if (!process.env[key]) console.error(`[CRITICAL] Missing Required Variable: ${key}`);
    else console.log(`[OK] ${key} is present`);
});

// Universal CORS for initial deployment
const io = new Server(server, {
    cors: {
        origin: "*", // Allows connections from your Firebase URL (carelog-e2196.web.app)
        methods: ['GET', 'POST'],
        credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
});

app.use(cors({ origin: "*", credentials: true }));
app.use(express.json());

// ─── In-Memory: userId → socketId(s) map ────────────────
const userSockets = new Map(); // userId → Set<socketId>

// ─── REST Health Check ───────────────────────────────────
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        connectedUsers: userSockets.size,
        uptime: Math.floor(process.uptime()),
        timestamp: new Date().toISOString()
    });
});

app.get('/online-users', (req, res) => {
    res.json({ onlineUsers: [...userSockets.keys()] });
});

// ─── Socket.IO Events ────────────────────────────────────
io.on('connection', (socket) => {
    console.log(`[Socket.IO] New connection: ${socket.id}`);

    socket.on('join', ({ userId, role, name }) => {
        if (!userId) return;
        if (!userSockets.has(userId)) userSockets.set(userId, new Set());
        userSockets.get(userId).add(socket.id);
        socket.join(userId);
        socket.userId = userId;
        socket.userRole = role;
        socket.userName = name;
        console.log(`[Join] ${name || userId} (${role}) joined`);
        socket.emit('joined', { userId, status: 'connected' });
        io.emit('presence_update', { onlineUsers: [...userSockets.keys()] });
    });

    socket.on('send_message', (payload) => {
        const { senderId, receiverId, message, messageId, type } = payload;
        if (!senderId || !receiverId) return;
        const msgPacket = {
            ...payload,
            delivered: true,
            timestamp: payload.timestamp || new Date().toISOString(),
        };
        io.to(receiverId).emit('receive_message', msgPacket);
        socket.emit('message_delivered', { messageId, deliveredAt: new Date().toISOString() });
    });

    socket.on('typing', ({ senderId, receiverId, isTyping }) => {
        if (!receiverId) return;
        io.to(receiverId).emit('user_typing', { senderId, isTyping });
    });

    socket.on('disconnect', (reason) => {
        const uid = socket.userId;
        if (uid && userSockets.has(uid)) {
            userSockets.get(uid).delete(socket.id);
            if (userSockets.get(uid).size === 0) {
                userSockets.delete(uid);
                io.emit('presence_update', { onlineUsers: [...userSockets.keys()] });
            }
        }
        console.log(`[Socket.IO] Disconnected: ${socket.id} (${uid || 'anonymous'})`);
    });
});

// ─── Firebase Init (Client SDK mode) ────────────────────
const { initializeApp } = require('firebase/app');
const { getFirestore } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_FIREBASE_APP_ID
};

try {
    const firebaseApp = initializeApp(firebaseConfig);
    const db = getFirestore(firebaseApp);
    console.log('--- FIREBASE OK ---');
} catch (error) {
    console.error('[CRITICAL] Firebase Init Failed:', error.message);
}

// ─── Server Start ────────────────────────────────────────
const PORT = process.env.PORT || 4001;
server.listen(PORT, () => {
    console.log(`\n🚀 CareLog Production API running on Port ${PORT}`);
    console.log(`   Health: /health\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => { server.close(() => process.exit(0)); });
process.on('SIGINT', () => { server.close(() => process.exit(0)); });
