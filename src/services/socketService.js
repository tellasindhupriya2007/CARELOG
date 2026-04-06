/**
 * CareLog — Socket.IO Client Service
 *
 * Architecture:
 *   - Single socket instance (singleton) shared across app
 *   - Firestore handles persistence (messages collection)
 *   - Socket.IO handles real-time delivery only
 *   - Automatic fallback: if socket not connected, Firestore onSnapshot still works
 */

import { io } from 'socket.io-client';
import { db } from '../firebase/config';
import {
    collection, addDoc, query, where,
    onSnapshot, serverTimestamp
} from 'firebase/firestore';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:4001';

// ─── Singleton Socket Instance ───────────────────────────
let socket = null;

export const getSocket = () => socket;

/**
 * Initialize socket and join user's room.
 * Safe to call multiple times — only connects once.
 */
export const initSocket = ({ userId, role, name }) => {
    if (!userId) return null;

    // Already connected with same user
    if (socket && socket.connected && socket._userId === userId) return socket;

    // Clean up old socket
    if (socket) { socket.disconnect(); socket = null; }

    socket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
        timeout: 10000,
        autoConnect: true,
    });

    socket._userId = userId;

    socket.on('connect', () => {
        console.log('[Socket] Connected:', socket.id);
        socket.emit('join', { userId, role, name });
    });

    socket.on('connect_error', (err) => {
        console.warn('[Socket] Connection failed (Firestore fallback active):', err.message);
    });

    socket.on('disconnect', (reason) => {
        console.log('[Socket] Disconnected:', reason);
    });

    return socket;
};

/**
 * Disconnect and clear socket.
 */
export const disconnectSocket = () => {
    if (socket) { socket.disconnect(); socket = null; }
};

// ─── MESSAGING API ───────────────────────────────────────

/**
 * Send a message.
 * 1. Saves to Firestore (persists regardless of socket state)
 * 2. Emits via Socket.IO for instant delivery if connected
 */
export const sendMessage = async ({ senderId, senderName, senderRole, receiverId, patientId, message, type = 'text', audioUrl = null, imageUrl = null, duration = null }) => {
    if (!senderId || !receiverId) throw new Error('Invalid message params');
    if (type === 'text' && !message?.trim()) throw new Error('Text message cannot be empty');
    if (type === 'voice' && !audioUrl) throw new Error('Voice message requires audioUrl');
    if (type === 'image' && !imageUrl) throw new Error('Image message requires imageUrl');

    // 1. Persist to Firestore
    const docRef = await addDoc(collection(db, 'messages'), {
        senderId,
        senderName: senderName || senderId,
        senderRole: senderRole || 'unknown',
        receiverId,
        patientId: patientId || null,
        type,
        message: message?.trim() || '',
        audioUrl,
        imageUrl,
        duration,
        timestamp: serverTimestamp(),
        isRead: false,
    });

    // 2. Emit via Socket.IO (best-effort, no throw on failure)
    if (socket?.connected) {
        socket.emit('send_message', {
            ...({ senderId, senderName, senderRole, receiverId, patientId, message, type, audioUrl, imageUrl, duration }),
            messageId: docRef.id,
            timestamp: new Date().toISOString(),
        });
    }

    return docRef.id;
};

/**
 * Subscribe to messages for a conversation thread.
 * Uses Firestore onSnapshot (real-time, persistent fallback).
 * Also listens on socket for instant delivery.
 *
 * Returns unsubscribe function.
 */
export const subscribeToMessages = (userId, peerId, onMessage) => {
    if (!userId || !peerId) return () => {};

    // Two queries, no orderBy (avoids composite index requirement) — sorted client-side
    const q1 = query(
        collection(db, 'messages'),
        where('senderId', '==', userId),
        where('receiverId', '==', peerId)
    );
    const q2 = query(
        collection(db, 'messages'),
        where('senderId', '==', peerId),
        where('receiverId', '==', userId)
    );

    let msgs1 = [];
    let msgs2 = [];
    const emitMerged = () => {
        const merged = [...msgs1, ...msgs2]
            .sort((a, b) => {
                const ta = a.timestamp?.toDate?.() || new Date(a.timestamp || 0);
                const tb = b.timestamp?.toDate?.() || new Date(b.timestamp || 0);
                return ta - tb;
            });
        onMessage(merged);
    };

    const u1 = onSnapshot(q1, (snap) => {
        msgs1 = snap.docs.map(d => ({ id: d.id, ...d.data(), timestamp: d.data().timestamp?.toDate?.() || new Date(d.data().timestamp) }));
        emitMerged();
    }, (err) => console.warn('[Firestore q1 error]', err.message));

    const u2 = onSnapshot(q2, (snap) => {
        msgs2 = snap.docs.map(d => ({ id: d.id, ...d.data(), timestamp: d.data().timestamp?.toDate?.() || new Date(d.data().timestamp) }));
        emitMerged();
    }, (err) => console.warn('[Firestore q2 error]', err.message));

    return () => { u1(); u2(); };
};

/**
 * Get all threads for a user (unique peers they've messaged).
 */
export const subscribeToThreads = (userId, onThreads) => {
    if (!userId) return () => {};

    // No orderBy — avoids composite index requirement, sorted client-side
    const q = query(
        collection(db, 'messages'),
        where('senderId', '==', userId)
    );
    const q2 = query(
        collection(db, 'messages'),
        where('receiverId', '==', userId)
    );

    const threads = new Map();

    const merge = () => onThreads([...threads.values()].sort((a, b) => b.lastTs - a.lastTs));

    const addToThreads = (msgs, myId) => {
        msgs.forEach(m => {
            const peerId = m.senderId === myId ? m.receiverId : m.senderId;
            if (!threads.has(peerId) || threads.get(peerId).lastTs < m.lastTs) {
                threads.set(peerId, {
                    peerId,
                    peerName: m.senderId === myId ? (m.receiverName || peerId) : (m.senderName || peerId),
                    peerRole: m.senderId === myId ? (m.receiverRole || '') : (m.senderRole || ''),
                    lastMessage: m.message,
                    lastTs: m.timestamp?.toDate?.() || new Date(m.timestamp || 0),
                    patientId: m.patientId,
                });
            }
        });
        merge();
    };

    const u1 = onSnapshot(q, s => addToThreads(s.docs.map(d => ({ id: d.id, ...d.data() })), userId));
    const u2 = onSnapshot(q2, s => addToThreads(s.docs.map(d => ({ id: d.id, ...d.data() })), userId));

    return () => { u1(); u2(); };
};

/**
 * Emit typing indicator.
 */
export const emitTyping = (senderId, receiverId, isTyping) => {
    if (socket?.connected) socket.emit('typing', { senderId, receiverId, isTyping });
};

/**
 * Listen for typing indicators.
 * Returns unsubscribe function.
 */
export const onTyping = (callback) => {
    if (!socket) return () => {};
    socket.on('user_typing', callback);
    return () => socket.off('user_typing', callback);
};

/**
 * Listen for presence updates.
 */
export const onPresenceUpdate = (callback) => {
    if (!socket) return () => {};
    socket.on('presence_update', callback);
    return () => socket.off('presence_update', callback);
};
