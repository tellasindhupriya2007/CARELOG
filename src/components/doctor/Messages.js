import React, { useEffect, useState, useRef, useCallback } from 'react';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { DS } from './ds';
import DoctorShell from './DoctorShell';
import { useAuthContext } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { sendMessage, subscribeToMessages, emitTyping, onTyping } from '../../services/socketService';
import { MessageSquare, Send, Wifi, WifiOff, Circle } from 'lucide-react';

// ─── Static thread list for doctor (Doctor ↔ Family / Caregiver) ─────────
// In production, this is derived from Firestore users collection
const STATIC_THREADS = [
    { peerId: 'family-user-1', peerName: 'Tella Family', peerRole: 'Family', avatar: 'TF', color: '#1E40AF', bg: '#EEF2FF', patientId: null },
    { peerId: 'caretaker-user-1', peerName: 'Ravi (Caregiver)', peerRole: 'Caregiver', avatar: 'RC', color: '#712AE2', bg: '#EDE9FE', patientId: null },
    { peerId: 'family-user-2', peerName: 'Priya Family', peerRole: 'Family', avatar: 'PF', color: '#059669', bg: '#DCFCE7', patientId: null },
];

function timeStr(ts) {
    if (!ts) return '';
    const d = ts instanceof Date ? ts : (ts?.toDate ? ts.toDate() : new Date(ts));
    if (isNaN(d)) return '';
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function DoctorMessages() {
    const { user, role } = useAuthContext();
    const { isConnected } = useSocket();
    const [threads, setThreads] = useState(STATIC_THREADS);
    const [activeThread, setActiveThread] = useState(STATIC_THREADS[0]);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const [loadingMsgs, setLoadingMsgs] = useState(false);
    const [alertCount, setAlertCount] = useState(0);
    const [typingPeer, setTypingPeer] = useState(false);
    const [error, setError] = useState(null);
    const messagesEndRef = useRef(null);
    const typingTimerRef = useRef(null);
    const unsubMsgsRef = useRef(null);

    const myId = user?.uid || 'dev-doctor';
    const myName = user?.displayName || 'Dr. Smith';
    const myRole = role || 'doctor';

    // Alert count subscription
    useEffect(() => {
        const u = onSnapshot(collection(db, 'alerts'), s => setAlertCount(s.docs.filter(d => !d.data().isRead).length));
        return () => u();
    }, []);

    // Seed mock messages for demo if Firestore thread is empty
    const seedMockMessages = useCallback(async (peerId) => {
        const q = query(
            collection(db, 'messages'),
            where('senderId', 'in', [myId, peerId]),
            where('receiverId', 'in', [myId, peerId])
        );
        try {
            const snap = await getDocs(q);
            if (!snap.empty) return; // already seeded — skip
        } catch (e) {
            return; // index not ready — skip seeding
        }

        const mockConvos = {
            'family-user-1': [
                { from: peerId, text: 'Doctor, how is Mr. Sriramulu doing? Any medication changes needed?' },
                { from: myId, text: 'He is stable. Continue current Aspirin dosage. I\'ll check BP readings today.' },
                { from: peerId, text: 'Thank you doctor. Should we be worried about the recent high BP readings?' },
                { from: myId, text: 'I\'m monitoring them. Let\'s review again after tomorrow\'s vitals check. No need to panic.' },
            ],
            'caretaker-user-1': [
                { from: peerId, text: 'Patient refused morning medication. BP is 148/96.' },
                { from: myId, text: 'Please try again in 30 minutes with some food. Note it in the care log.' },
                { from: peerId, text: 'Done. He took it. BP now 138/88.' },
            ],
            'family-user-2': [
                { from: peerId, text: 'Is the new prescription ready for Priya?' },
                { from: myId, text: 'Yes, Amlodipine 5mg. Pharmacy has been notified. Pick up anytime.' },
            ],
        };

        const conv = mockConvos[peerId] || [];
        for (let i = 0; i < conv.length; i++) {
            const m = conv[i];
            await addDoc(collection(db, 'messages'), {
                senderId: m.from,
                senderName: m.from === myId ? myName : (threads.find(t => t.peerId === peerId)?.peerName || peerId),
                senderRole: m.from === myId ? 'doctor' : 'family',
                receiverId: m.from === myId ? peerId : myId,
                message: m.text,
                timestamp: serverTimestamp(),
                isRead: true,
                patientId: null,
            });
        }
    }, [myId, myName, threads]);

    // Subscribe to messages when thread changes
    useEffect(() => {
        if (!activeThread?.peerId) return;
        const peerId = activeThread.peerId;

        setLoadingMsgs(true);
        setMessages([]);

        // Seed then subscribe
        seedMockMessages(peerId).finally(() => {
            if (unsubMsgsRef.current) { unsubMsgsRef.current(); }

            const unsub = subscribeToMessages(myId, peerId, (msgs) => {
                setMessages(msgs);
                setLoadingMsgs(false);
                setError(null);
            });
            unsubMsgsRef.current = unsub;
        });

        // Typing indicator
        const unsubTyping = onTyping(({ senderId, isTyping }) => {
            if (senderId === peerId) setTypingPeer(isTyping);
        });

        return () => {
            if (unsubMsgsRef.current) { unsubMsgsRef.current(); unsubMsgsRef.current = null; }
            unsubTyping();
        };
    }, [activeThread?.peerId, myId, seedMockMessages]);

    // Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, typingPeer]);

    const handleSend = async () => {
        const text = input.trim();
        if (!text || sending) return;

        setSending(true);
        setInput('');
        emitTyping(myId, activeThread.peerId, false);

        try {
            await sendMessage({
                senderId: myId,
                senderName: myName,
                senderRole: myRole,
                receiverId: activeThread.peerId,
                patientId: activeThread.patientId || null,
                message: text,
            });
            setError(null);
        } catch (err) {
            console.error('[Send error]', err);
            setError('Failed to send. Please try again.');
            setInput(text); // restore
        } finally {
            setSending(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    };

    const handleInputChange = (e) => {
        setInput(e.target.value);
        if (!activeThread?.peerId) return;
        emitTyping(myId, activeThread.peerId, true);
        clearTimeout(typingTimerRef.current);
        typingTimerRef.current = setTimeout(() => emitTyping(myId, activeThread.peerId, false), 2000);
    };

    return (
        <DoctorShell alertCount={alertCount}>
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden', backgroundColor: DS.surface, fontFamily: 'Inter, sans-serif' }}>

                {/* ─── Thread Sidebar ─── */}
                <div style={{ width: '260px', minWidth: '260px', backgroundColor: DS.surfaceLow, borderRight: `1px solid ${DS.outlineVariant}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <div style={{ padding: '20px 16px 12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ fontSize: '18px', fontWeight: '900', color: DS.textPrimary, margin: 0 }}>Messages</h2>
                            {/* Connection indicator */}
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: '700', color: isConnected ? DS.success : DS.textMuted }}>
                                {isConnected ? <Wifi size={13} /> : <WifiOff size={13} />}
                                {isConnected ? 'Live' : 'Offline'}
                            </span>
                        </div>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', padding: '0 10px 16px' }}>
                        {threads.map(thread => {
                            const isActive = activeThread?.peerId === thread.peerId;
                            return (
                                <div key={thread.peerId} onClick={() => setActiveThread(thread)} style={{
                                    display: 'flex', alignItems: 'center', gap: '10px', padding: '12px',
                                    borderRadius: '14px', cursor: 'pointer', marginBottom: '4px',
                                    backgroundColor: isActive ? DS.surfaceLowest : 'transparent',
                                    boxShadow: isActive ? '0 2px 12px rgba(25,28,30,0.06)' : 'none',
                                    transition: 'all 0.2s',
                                }}>
                                    <div style={{ position: 'relative', flexShrink: 0 }}>
                                        <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: thread.bg, color: thread.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '900' }}>
                                            {thread.avatar}
                                        </div>
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: '14px', fontWeight: '800', color: DS.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{thread.peerName}</div>
                                        <div style={{ fontSize: '11px', color: DS.textMuted, fontWeight: '600' }}>{thread.peerRole}</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ─── Chat Area ─── */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    {activeThread ? (
                        <>
                            {/* Chat Header */}
                            <div style={{ backgroundColor: DS.surfaceLowest, borderBottom: `1px solid ${DS.outlineVariant}`, padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: activeThread.bg, color: activeThread.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '900' }}>
                                        {activeThread.avatar}
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '16px', fontWeight: '800', color: DS.textPrimary }}>{activeThread.peerName}</div>
                                        <div style={{ fontSize: '12px', color: DS.success, fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Circle size={7} fill={DS.success} /> Active
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: isConnected ? DS.success : DS.warning, fontWeight: '700', backgroundColor: isConnected ? '#DCFCE7' : '#FEF3C7', padding: '5px 12px', borderRadius: '20px' }}>
                                    {isConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
                                    {isConnected ? 'Real-time' : 'Firestore sync'}
                                </div>
                            </div>

                            {/* Error banner */}
                            {error && (
                                <div style={{ backgroundColor: '#FEF2F2', borderBottom: `1px solid rgba(239,68,68,0.2)`, padding: '10px 24px', fontSize: '13px', color: DS.danger, fontWeight: '600' }}>
                                    ⚠ {error}
                                </div>
                            )}

                            {/* Messages */}
                            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: DS.surface }}>
                                {loadingMsgs && (
                                    <div style={{ textAlign: 'center', color: DS.textMuted, fontSize: '13px', fontWeight: '600', padding: '40px' }}>Loading messages...</div>
                                )}

                                {!loadingMsgs && messages.length === 0 && (
                                    <div style={{ textAlign: 'center', padding: '60px', color: DS.textMuted }}>
                                        <MessageSquare size={40} color={DS.surfaceHigh} style={{ display: 'block', margin: '0 auto 12px' }} />
                                        <p style={{ fontWeight: '700', margin: 0 }}>No messages yet</p>
                                        <p style={{ fontSize: '13px', margin: '4px 0 0' }}>Send the first message to {activeThread.peerName}</p>
                                    </div>
                                )}

                                {messages.map((msg, i) => {
                                    const isMe = msg.senderId === myId;
                                    const ts = msg.timestamp instanceof Date ? msg.timestamp : msg.timestamp?.toDate?.() || new Date();
                                    const showDate = i === 0 || (
                                        (messages[i - 1]?.timestamp?.toDate?.() || messages[i - 1]?.timestamp)
                                        && Math.abs(ts - (messages[i - 1]?.timestamp?.toDate?.() || new Date(messages[i - 1]?.timestamp || 0))) > 300000
                                    );

                                    return (
                                        <React.Fragment key={msg.id || i}>
                                            {showDate && (
                                                <div style={{ textAlign: 'center', fontSize: '11px', color: DS.textMuted, fontWeight: '700', padding: '4px 0' }}>
                                                    {ts.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                                                </div>
                                            )}
                                            <div style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                                                <div style={{ maxWidth: '68%' }}>
                                                    {!isMe && (
                                                        <div style={{ fontSize: '11px', color: DS.textMuted, fontWeight: '700', marginBottom: '4px', paddingLeft: '4px' }}>
                                                            {msg.senderName || activeThread.peerName}
                                                        </div>
                                                    )}
                                                    <div style={{
                                                        padding: '11px 15px',
                                                        borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                                                        backgroundColor: isMe ? DS.primaryContainer : DS.surfaceLowest,
                                                        color: isMe ? 'white' : DS.textPrimary,
                                                        fontSize: '14px', fontWeight: '500', lineHeight: 1.55,
                                                        boxShadow: '0 1px 4px rgba(25,28,30,0.07)',
                                                    }}>
                                                        {msg.message}
                                                    </div>
                                                    <div style={{ fontSize: '11px', color: DS.textMuted, fontWeight: '600', marginTop: '3px', padding: '0 4px', textAlign: isMe ? 'right' : 'left' }}>
                                                        {timeStr(ts)}
                                                    </div>
                                                </div>
                                            </div>
                                        </React.Fragment>
                                    );
                                })}

                                {/* Typing indicator */}
                                {typingPeer && (
                                    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                                        <div style={{ backgroundColor: DS.surfaceLowest, borderRadius: '18px 18px 18px 4px', padding: '11px 16px', boxShadow: '0 1px 4px rgba(25,28,30,0.07)' }}>
                                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                                {[0, 1, 2].map(n => (
                                                    <span key={n} style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: DS.textMuted, display: 'inline-block', animation: `typingBounce 1s infinite ${n * 0.2}s` }} />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input Area */}
                            <div style={{ backgroundColor: DS.surfaceLowest, borderTop: `1px solid ${DS.outlineVariant}`, padding: '14px 20px', display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                                <textarea
                                    value={input}
                                    onChange={handleInputChange}
                                    onKeyDown={handleKeyDown}
                                    placeholder={`Message ${activeThread.peerName}... (Enter to send)`}
                                    disabled={sending}
                                    rows={1}
                                    style={{
                                        flex: 1, padding: '12px 16px', borderRadius: '16px',
                                        border: 'none', backgroundColor: DS.surfaceHigh,
                                        fontSize: '14px', fontFamily: 'inherit', outline: 'none',
                                        resize: 'none', color: DS.textPrimary, lineHeight: 1.5,
                                        opacity: sending ? 0.6 : 1,
                                    }}
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!input.trim() || sending}
                                    style={{
                                        width: '44px', height: '44px', borderRadius: '14px', border: 'none',
                                        background: !input.trim() || sending
                                            ? DS.surfaceHigh
                                            : `linear-gradient(135deg, ${DS.primary}, ${DS.primaryContainer})`,
                                        color: !input.trim() || sending ? DS.textMuted : 'white',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        cursor: !input.trim() || sending ? 'not-allowed' : 'pointer',
                                        transition: 'all 0.2s', flexShrink: 0,
                                        boxShadow: input.trim() && !sending ? `0 4px 16px ${DS.primaryContainer}40` : 'none',
                                    }}
                                >
                                    <Send size={18} />
                                </button>
                            </div>
                        </>
                    ) : (
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: DS.textMuted }}>
                            <div style={{ textAlign: 'center' }}>
                                <MessageSquare size={48} color={DS.surfaceHigh} style={{ marginBottom: '12px' }} />
                                <p style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>Select a thread to start messaging</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes typingBounce {
                    0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
                    30% { transform: translateY(-5px); opacity: 1; }
                }
            `}</style>
        </DoctorShell>
    );
}
