import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useAuthContext } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import {
    collection, query, where,
    addDoc, serverTimestamp, getDocs, getDoc, doc
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { sendMessage, subscribeToMessages, emitTyping, onTyping } from '../../services/socketService';
import Sidebar from '../common/Sidebar';
import {
    MessageSquare, Send, Wifi, WifiOff, Circle,
    User, Stethoscope, Home
} from 'lucide-react';

// ─── Shared design tokens (matches doctor look) ───────────
const C = {
    surface: '#F8FAFC',
    surfaceLow: '#F1F5F9',
    surfaceLowest: '#FFFFFF',
    surfaceHigh: '#E2E8F0',
    primary: '#1E3A8A',
    primaryLight: '#3B82F6',
    text: '#0F172A',
    textSub: '#475569',
    textMuted: '#94A3B8',
    danger: '#EF4444',
    success: '#10B981',
    warning: '#F59E0B',
    outline: '#E2E8F0',
};

const sidebarItems = [
    { icon: 'Home', label: 'Dashboard', path: '/caretaker/dashboard' },
    { icon: 'HeartPulse', label: 'Vitals', path: '/caretaker/vitals' },
    { icon: 'Clipboard', label: 'Observations', path: '/caretaker/observations' },
    { icon: 'Bell', label: 'Alerts', path: '/caretaker/alerts' },
    { icon: 'Clock', label: 'Shift Handover', path: '/caretaker/handover' },
    { icon: 'MessageSquare', label: 'Messages', path: '/caretaker/messages' },
];

function timeStr(ts) {
    if (!ts) return '';
    const d = ts instanceof Date ? ts : (ts?.toDate ? ts.toDate() : new Date(ts));
    if (isNaN(d)) return '';
    const diffMins = Math.floor((Date.now() - d) / 60000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function CaretakerMessages() {
    const { user, patientId } = useAuthContext();
    const { isConnected } = useSocket();

    // Contacts derived from assigned patient's doctorId + familyIds
    const [contacts, setContacts] = useState([]);
    const [activeContact, setActiveContact] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const [loadingContacts, setLoadingContacts] = useState(true);
    const [loadingMsgs, setLoadingMsgs] = useState(false);
    const [typingPeer, setTypingPeer] = useState(false);
    const [error, setError] = useState(null);

    const messagesEndRef = useRef(null);
    const typingTimer = useRef(null);
    const unsubMsgs = useRef(null);

    const myId = user?.uid || 'dev-caretaker';
    const myName = user?.displayName || 'Caretaker';
    const myRole = 'caretaker';

    // ── Load patient contacts (doctor + family) ──────────────
    useEffect(() => {
        if (!patientId) {
            setLoadingContacts(false);
            return;
        }

        const loadContacts = async () => {
            try {
                const patSnap = await getDoc(doc(db, 'patients', patientId));
                if (!patSnap.exists()) { setLoadingContacts(false); return; }
                const pat = patSnap.data();

                const built = [];

                // Doctor contact
                if (pat.doctorId) {
                    let doctorName = 'Assigned Doctor';
                    try {
                        const dSnap = await getDoc(doc(db, 'users', pat.doctorId));
                        if (dSnap.exists()) doctorName = dSnap.data().name || dSnap.data().displayName || 'Dr. Smith';
                    } catch { /* use default */ }
                    built.push({
                        peerId: pat.doctorId,
                        peerName: doctorName,
                        peerRole: 'Doctor',
                        avatar: doctorName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(),
                        color: '#1E40AF', bg: '#EEF2FF',
                        Icon: Stethoscope,
                    });
                }

                // Family contacts
                const familyIds = pat.familyIds || (pat.familyId ? [pat.familyId] : []);
                for (const fid of familyIds) {
                    let famName = 'Family Member';
                    try {
                        const fSnap = await getDoc(doc(db, 'users', fid));
                        if (fSnap.exists()) famName = fSnap.data().name || fSnap.data().displayName || 'Family';
                    } catch { /* use default */ }
                    built.push({
                        peerId: fid,
                        peerName: famName,
                        peerRole: 'Family',
                        avatar: famName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(),
                        color: '#059669', bg: '#DCFCE7',
                        Icon: Home,
                    });
                }

                // Fallback: if no contacts found from patient doc, use dev mock contacts
                if (built.length === 0) {
                    built.push(
                        { peerId: 'dev-doctor', peerName: 'Dr. Smith', peerRole: 'Doctor', avatar: 'DS', color: '#1E40AF', bg: '#EEF2FF', Icon: Stethoscope },
                        { peerId: 'family-user-1', peerName: 'Tella Family', peerRole: 'Family', avatar: 'TF', color: '#059669', bg: '#DCFCE7', Icon: Home },
                    );
                }

                setContacts(built);
                setActiveContact(built[0]);
            } catch (e) {
                console.error('[CaretakerMessages] loadContacts error:', e);
            } finally {
                setLoadingContacts(false);
            }
        };

        loadContacts();
    }, [patientId]);

    // ── Seed mock messages if empty ───────────────────────────
    const seedMockMessages = useCallback(async (peerId) => {
        const q1 = query(collection(db, 'messages'), where('senderId', '==', myId), where('receiverId', '==', peerId));
        const q2 = query(collection(db, 'messages'), where('senderId', '==', peerId), where('receiverId', '==', myId));
        try {
            const [s1, s2] = await Promise.all([getDocs(q1), getDocs(q2)]);
            if (!s1.empty || !s2.empty) return; // already seeded
        } catch { return; }

        const mockMap = {
            'dev-doctor': [
                { from: peerId, text: 'Good morning! How is the patient doing today?' },
                { from: myId, text: 'Morning doctor. BP is 130/85, slightly elevated. Patient ate well.' },
                { from: peerId, text: 'Keep monitoring. Please log vitals every 4 hours and note any discomfort.' },
                { from: myId, text: 'Understood. Will update after the afternoon check.' },
            ],
            'family-user-1': [
                { from: peerId, text: 'Hello! Did dad take his morning medicines?' },
                { from: myId, text: 'Yes, all medications given at 8 AM as scheduled. He is resting comfortably.' },
                { from: peerId, text: 'Thank you so much! Please let us know if anything changes.' },
            ],
        };

        const convos = mockMap[peerId] || [
            { from: peerId, text: 'Hi, any updates on the patient today?' },
            { from: myId, text: 'All stable. Meals completed, medications given on time.' },
        ];

        const peerContact = contacts.find(c => c.peerId === peerId);
        for (const m of convos) {
            await addDoc(collection(db, 'messages'), {
                senderId: m.from,
                senderName: m.from === myId ? myName : (peerContact?.peerName || peerId),
                senderRole: m.from === myId ? 'caretaker' : (peerContact?.peerRole?.toLowerCase() || 'unknown'),
                receiverId: m.from === myId ? peerId : myId,
                message: m.text,
                timestamp: serverTimestamp(),
                isRead: true,
                patientId: patientId || null,
            });
        }
    }, [myId, myName, contacts, patientId]);

    // ── Subscribe to messages when contact changes ────────────
    useEffect(() => {
        if (!activeContact?.peerId) return;
        const peerId = activeContact.peerId;

        setLoadingMsgs(true);
        setMessages([]);

        seedMockMessages(peerId).finally(() => {
            if (unsubMsgs.current) { unsubMsgs.current(); }
            const unsub = subscribeToMessages(myId, peerId, (msgs) => {
                setMessages(msgs);
                setLoadingMsgs(false);
                setError(null);
            });
            unsubMsgs.current = unsub;
        });

        const unsubTyping = onTyping(({ senderId, isTyping }) => {
            if (senderId === peerId) setTypingPeer(isTyping);
        });

        return () => {
            if (unsubMsgs.current) { unsubMsgs.current(); unsubMsgs.current = null; }
            unsubTyping();
        };
    }, [activeContact?.peerId, myId, seedMockMessages]);

    // ── Auto-scroll ───────────────────────────────────────────
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, typingPeer]);

    const handleSend = async () => {
        const text = input.trim();
        if (!text || sending) return;
        setSending(true);
        setInput('');
        emitTyping(myId, activeContact.peerId, false);

        try {
            await sendMessage({
                senderId: myId,
                senderName: myName,
                senderRole: myRole,
                receiverId: activeContact.peerId,
                patientId: patientId || null,
                message: text,
            });
            setError(null);
        } catch (err) {
            setError('Failed to send. Try again.');
            setInput(text);
        } finally {
            setSending(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    };

    const handleInputChange = (e) => {
        setInput(e.target.value);
        if (!activeContact?.peerId) return;
        emitTyping(myId, activeContact.peerId, true);
        clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => emitTyping(myId, activeContact.peerId, false), 2000);
    };

    return (
        <div style={{ display: 'flex', height: '100vh', backgroundColor: C.surface, fontFamily: 'Inter, sans-serif' }}>

            {/* ─── Caretaker Sidebar ─── */}
            <Sidebar navItems={sidebarItems} />

            {/* ─── Main Messages Area ─── */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

                {/* Thread List */}
                <div style={{ width: '260px', minWidth: '260px', backgroundColor: C.surfaceLowest, borderRight: `1px solid ${C.outline}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <div style={{ padding: '20px 16px 12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ fontSize: '18px', fontWeight: '900', color: C.text, margin: 0 }}>Messages</h2>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: '700', color: isConnected ? C.success : C.textMuted }}>
                                {isConnected ? <Wifi size={13} /> : <WifiOff size={13} />}
                                {isConnected ? 'Live' : 'Offline'}
                            </span>
                        </div>
                        <p style={{ fontSize: '12px', color: C.textMuted, fontWeight: '500', margin: '4px 0 0' }}>Your patient's care team</p>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', padding: '0 10px 16px' }}>
                        {loadingContacts && (
                            <div style={{ padding: '20px', textAlign: 'center', color: C.textMuted, fontSize: '13px' }}>Loading contacts...</div>
                        )}

                        {!loadingContacts && contacts.length === 0 && (
                            <div style={{ padding: '24px 12px', textAlign: 'center' }}>
                                <User size={32} color={C.surfaceHigh} style={{ margin: '0 auto 8px', display: 'block' }} />
                                <p style={{ fontSize: '13px', color: C.textMuted, fontWeight: '600', margin: 0 }}>No contacts yet</p>
                                <p style={{ fontSize: '12px', color: C.textMuted, margin: '4px 0 0' }}>Link to a patient to see your care team</p>
                            </div>
                        )}

                        {contacts.map(contact => {
                            const isActive = activeContact?.peerId === contact.peerId;
                            return (
                                <div key={contact.peerId} onClick={() => setActiveContact(contact)} style={{
                                    display: 'flex', alignItems: 'center', gap: '10px',
                                    padding: '12px', borderRadius: '14px', cursor: 'pointer',
                                    marginBottom: '4px',
                                    backgroundColor: isActive ? '#EEF2FF' : 'transparent',
                                    boxShadow: isActive ? '0 2px 12px rgba(25,28,30,0.06)' : 'none',
                                    transition: 'all 0.2s',
                                }}>
                                    <div style={{ width: '42px', height: '42px', borderRadius: '12px', backgroundColor: contact.bg, color: contact.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '900', flexShrink: 0 }}>
                                        {contact.avatar}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: '14px', fontWeight: '800', color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{contact.peerName}</div>
                                        <div style={{ fontSize: '11px', color: C.textMuted, fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <contact.Icon size={11} /> {contact.peerRole}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Chat Window */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    {activeContact ? (
                        <>
                            {/* Chat Header */}
                            <div style={{ backgroundColor: C.surfaceLowest, borderBottom: `1px solid ${C.outline}`, padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ width: '42px', height: '42px', borderRadius: '12px', backgroundColor: activeContact.bg, color: activeContact.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '900' }}>
                                        {activeContact.avatar}
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '16px', fontWeight: '800', color: C.text }}>{activeContact.peerName}</div>
                                        <div style={{ fontSize: '12px', color: C.success, fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Circle size={7} fill={C.success} /> Active · {activeContact.peerRole}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ fontSize: '12px', fontWeight: '700', color: isConnected ? C.success : C.warning, backgroundColor: isConnected ? '#DCFCE7' : '#FEF3C7', padding: '5px 12px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    {isConnected ? <Wifi size={13} /> : <WifiOff size={13} />}
                                    {isConnected ? 'Real-time' : 'Firestore sync'}
                                </div>
                            </div>

                            {/* Error banner */}
                            {error && (
                                <div style={{ backgroundColor: '#FEF2F2', borderBottom: '1px solid rgba(239,68,68,0.2)', padding: '10px 24px', fontSize: '13px', color: C.danger, fontWeight: '600' }}>
                                    ⚠ {error}
                                </div>
                            )}

                            {/* Messages area */}
                            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: C.surface }}>
                                {loadingMsgs && (
                                    <div style={{ textAlign: 'center', color: C.textMuted, fontSize: '13px', fontWeight: '600', padding: '40px' }}>Loading messages...</div>
                                )}

                                {!loadingMsgs && messages.length === 0 && (
                                    <div style={{ textAlign: 'center', padding: '60px 20px', color: C.textMuted }}>
                                        <MessageSquare size={40} color={C.surfaceHigh} style={{ display: 'block', margin: '0 auto 12px' }} />
                                        <p style={{ fontWeight: '700', margin: 0 }}>No messages yet</p>
                                        <p style={{ fontSize: '13px', margin: '4px 0 0' }}>Send the first message to {activeContact.peerName}</p>
                                    </div>
                                )}

                                {messages.map((msg, i) => {
                                    const isMe = msg.senderId === myId;
                                    const ts = msg.timestamp instanceof Date ? msg.timestamp : msg.timestamp?.toDate?.() || new Date();

                                    const showDate = i === 0 || (
                                        Math.abs(ts - (
                                            messages[i - 1]?.timestamp instanceof Date
                                                ? messages[i - 1].timestamp
                                                : messages[i - 1]?.timestamp?.toDate?.() || new Date(0)
                                        )) > 300000
                                    );

                                    return (
                                        <React.Fragment key={msg.id || i}>
                                            {showDate && (
                                                <div style={{ textAlign: 'center', fontSize: '11px', color: C.textMuted, fontWeight: '700', padding: '4px 0' }}>
                                                    {ts.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                                                </div>
                                            )}
                                            <div style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                                                <div style={{ maxWidth: '68%' }}>
                                                    {!isMe && (
                                                        <div style={{ fontSize: '11px', color: C.textMuted, fontWeight: '700', marginBottom: '4px', paddingLeft: '4px' }}>
                                                            {msg.senderName || activeContact.peerName}
                                                        </div>
                                                    )}
                                                    <div style={{
                                                        padding: '11px 15px',
                                                        borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                                                        backgroundColor: isMe ? '#1E3A8A' : C.surfaceLowest,
                                                        color: isMe ? 'white' : C.text,
                                                        fontSize: '14px', fontWeight: '500', lineHeight: 1.55,
                                                        boxShadow: '0 1px 4px rgba(25,28,30,0.07)',
                                                    }}>
                                                        {msg.message}
                                                    </div>
                                                    <div style={{ fontSize: '11px', color: C.textMuted, fontWeight: '600', marginTop: '3px', padding: '0 4px', textAlign: isMe ? 'right' : 'left' }}>
                                                        {timeStr(ts)}
                                                    </div>
                                                </div>
                                            </div>
                                        </React.Fragment>
                                    );
                                })}

                                {typingPeer && (
                                    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                                        <div style={{ backgroundColor: C.surfaceLowest, borderRadius: '18px 18px 18px 4px', padding: '11px 16px', boxShadow: '0 1px 4px rgba(25,28,30,0.07)' }}>
                                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                                {[0, 1, 2].map(n => (
                                                    <span key={n} style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: C.textMuted, display: 'inline-block', animation: `typingBounce 1s infinite ${n * 0.2}s` }} />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input area */}
                            <div style={{ backgroundColor: C.surfaceLowest, borderTop: `1px solid ${C.outline}`, padding: '14px 20px', display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                                <textarea
                                    value={input}
                                    onChange={handleInputChange}
                                    onKeyDown={handleKeyDown}
                                    placeholder={`Message ${activeContact.peerName}... (Enter to send)`}
                                    disabled={sending}
                                    rows={1}
                                    style={{
                                        flex: 1, padding: '12px 16px', borderRadius: '16px',
                                        border: 'none', backgroundColor: C.surfaceLow,
                                        fontSize: '14px', fontFamily: 'inherit', outline: 'none',
                                        resize: 'none', color: C.text, lineHeight: 1.5,
                                        opacity: sending ? 0.7 : 1,
                                    }}
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!input.trim() || sending}
                                    style={{
                                        width: '44px', height: '44px', borderRadius: '14px', border: 'none',
                                        background: !input.trim() || sending
                                            ? C.surfaceHigh
                                            : 'linear-gradient(135deg, #1E3A8A, #3B82F6)',
                                        color: !input.trim() || sending ? C.textMuted : 'white',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        cursor: !input.trim() || sending ? 'not-allowed' : 'pointer',
                                        transition: 'all 0.2s', flexShrink: 0,
                                        boxShadow: input.trim() && !sending ? '0 4px 16px rgba(59,130,246,0.4)' : 'none',
                                    }}
                                >
                                    <Send size={18} />
                                </button>
                            </div>
                        </>
                    ) : (
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textMuted }}>
                            <div style={{ textAlign: 'center' }}>
                                <MessageSquare size={48} color={C.surfaceHigh} style={{ marginBottom: '12px', display: 'block', margin: '0 auto 12px' }} />
                                <p style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>
                                    {loadingContacts ? 'Loading your care team...' : 'Select a contact to start messaging'}
                                </p>
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
                .sidebar { width: 220px; min-width: 220px; background: white; border-right: 1px solid #E2E8F0; padding: 24px 16px; display: flex; flex-direction: column; height: 100vh; position: sticky; top: 0; overflow-y: auto; }
            `}</style>
        </div>
    );
}
