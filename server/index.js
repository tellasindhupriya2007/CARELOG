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
        const { senderId, receiverId, message, messageId, patientId, senderName, senderRole, timestamp } = payload;

        if (!senderId || !receiverId || !message) {
            socket.emit('message_error', { error: 'Invalid message payload', messageId });
            return;
        }

        console.log(`[Message] ${senderName || senderId} → ${receiverId}: "${message.slice(0, 40)}"`);

        const msgPacket = {
            messageId,
            senderId,
            senderName: senderName || senderId,
            senderRole: senderRole || 'unknown',
            receiverId,
            patientId: patientId || null,
            message,
            timestamp: timestamp || new Date().toISOString(),
            delivered: true,
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

// ─── Start Server ────────────────────────────────────────
const PORT = process.env.PORT || 4001;
server.listen(PORT, () => {
    console.log(`\n🚀 CareLog Socket.IO Server running on http://localhost:${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/health`);
    console.log(`   Online: http://localhost:${PORT}/online-users\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => { server.close(() => process.exit(0)); });
process.on('SIGINT', () => { server.close(() => process.exit(0)); });
