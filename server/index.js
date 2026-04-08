/**
 * CareLog — Socket.IO Real-Time Messaging Server
 * Port: 4001
 *
 * Architecture:
 *   - Express + Socket.IO handle real-time delivery
 *   - Firebase Firestore (via client SDK) handles persistence
 *   - Each user joins a room named by their userId
 *   - Messages are emitted to the receiver's room instantly
 */

const express = require('express');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') }); // Absolute path is most robust
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: ['http://localhost:3000', 'http://localhost:3001'],
        methods: ['GET', 'POST'],
        credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
});

app.use(cors({ origin: ['http://localhost:3000', 'http://localhost:3001'], credentials: true }));
app.use(express.json());

// ─── Environment Validation & Debug Logs ─────────────────
const REQUIRED_ENV = [
    'REACT_APP_FIREBASE_API_KEY', 'REACT_APP_FIREBASE_PROJECT_ID'
];
console.log('--- ENV LOADED ---');
REQUIRED_ENV.forEach(key => {
    if (!process.env[key]) console.error(`[CRITICAL] Missing Required Variable: ${key}`);
    else console.log(`[OK] ${key} is present`);
});

const geminiKeyToCheck = process.env.REACT_APP_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
if (!geminiKeyToCheck) console.error(`[CRITICAL] Missing Gemini API Key (tried REACT_APP_GEMINI_API_KEY & GEMINI_API_KEY)`);
else console.log(`[OK] Gemini API Key detected`);

// ─── In-Memory: userId → socketId(s) map ────────────────
const userSockets = new Map(); // userId → Set<socketId>

// ─── REST Health Check ───────────────────────────────────
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        connectedUsers: userSockets.size,
        uptime: Math.floor(process.uptime()),
    });
});

// ─── REST: Get Online Users (for UI presence indicators) ─
app.get('/online-users', (req, res) => {
    res.json({ onlineUsers: [...userSockets.keys()] });
});

// ─── Socket.IO Events ────────────────────────────────────
io.on('connection', (socket) => {
    console.log(`[Socket.IO] New connection: ${socket.id}`);

    /**
     * JOIN ROOM
     * User must emit 'join' with their userId to register.
     * They join a room named after their userId.
     */
    socket.on('join', ({ userId, role, name }) => {
        if (!userId) return;

        // Track user → socket mapping
        if (!userSockets.has(userId)) userSockets.set(userId, new Set());
        userSockets.get(userId).add(socket.id);

        // Join a room named by userId (for targeted delivery)
        socket.join(userId);
        socket.userId = userId;
        socket.userRole = role;
        socket.userName = name;

        console.log(`[Join] ${name || userId} (${role}) joined room: ${userId}`);

        // Notify the user they're connected
        socket.emit('joined', { userId, status: 'connected' });

        // Broadcast updated presence list
        io.emit('presence_update', { onlineUsers: [...userSockets.keys()] });
    });

    /**
     * SEND MESSAGE
     * Payload: { senderId, senderName, senderRole, receiverId, patientId, message, messageId, timestamp }
     *
     * The client is responsible for:
     *   1. Saving to Firestore before emitting
     *   2. Providing a messageId (Firestore doc ID) for dedup
     *
     * The server:
     *   1. Emits 'receive_message' to the receiver's room
     *   2. Confirms delivery back to sender
     */
    socket.on('send_message', (payload) => {
        const { senderId, receiverId, message, messageId, type } = payload;

        if (!senderId || !receiverId || (type === 'text' && !message)) {
            socket.emit('message_error', { error: 'Invalid message payload', messageId });
            return;
        }

        console.log(`[Message] ${payload.senderName || senderId} → ${receiverId}: ${type} message`);

        const msgPacket = {
            ...payload,
            delivered: true,
            timestamp: payload.timestamp || new Date().toISOString(),
        };

        // Deliver to receiver's room
        io.to(receiverId).emit('receive_message', msgPacket);

        // Confirm delivery to sender
        socket.emit('message_delivered', { messageId, deliveredAt: new Date().toISOString() });
    });

    /**
     * TYPING INDICATOR
     * Payload: { senderId, receiverId, isTyping }
     */
    socket.on('typing', ({ senderId, receiverId, isTyping }) => {
        if (!receiverId) return;
        io.to(receiverId).emit('user_typing', { senderId, isTyping });
    });

    /**
     * DISCONNECT
     */
    socket.on('disconnect', (reason) => {
        const uid = socket.userId;
        if (uid && userSockets.has(uid)) {
            userSockets.get(uid).delete(socket.id);
            if (userSockets.get(uid).size === 0) {
                userSockets.delete(uid);
                io.emit('presence_update', { onlineUsers: [...userSockets.keys()] });
            }
        }
        console.log(`[Socket.IO] Disconnected: ${socket.id} (${uid || 'anonymous'}), reason: ${reason}`);
    });

    socket.on('error', (err) => {
        console.error(`[Socket.IO Error] ${socket.id}:`, err.message);
    });
});
// ─── Firebase Init (using client SDK for direct access) ──
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, collection, getDocs, query, where, orderBy, limit, addDoc, serverTimestamp } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_FIREBASE_APP_ID
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);
console.log('--- FIREBASE OK ---');

function getMockAISummary(patientId) {
    return {
        summary: "The patient currently appears clinically stable. However, due to a synchronization delay in recent vitals, a manual assessment is recommended to confirm blood pressure trends.",
        risk: "Low",
        recommendation: "Ensure timely administration of scheduled medications and monitor heart rate every 4 hours.",
        generatedAt: new Date().toISOString()
    };
}

const PORT = process.env.PORT || 4001;
server.listen(PORT, () => {
    console.log(`\n🚀 CareLog Socket.IO Server running on http://localhost:${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/health`);
    console.log(`   Online: http://localhost:${PORT}/online-users\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => { server.close(() => process.exit(0)); });
process.on('SIGINT', () => { server.close(() => process.exit(0)); });
