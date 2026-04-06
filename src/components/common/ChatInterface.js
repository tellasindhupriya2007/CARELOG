import React, { useEffect, useState, useRef, useCallback } from 'react';
import { collection, doc, getDoc, query, where, getDocs, serverTimestamp, addDoc } from 'firebase/firestore';
import { db, storage } from '../../firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useSocket } from '../../context/SocketContext';
import { sendMessage as sendSocketMessage, subscribeToMessages, emitTyping, onTyping } from '../../services/socketService';
import { MessageSquare, Send, Wifi, WifiOff, Circle, User, Stethoscope, Home, Mic, Square } from 'lucide-react';
import { colors } from '../../styles/colors';

const C = {
    surface: '#F8FAFC',
    surfaceLow: '#F1F5F9',
    surfaceLowest: '#FFFFFF',
    surfaceHigh: '#E2E8F0',
    primary: '#1E3A8A',
    primaryContainer: '#EEF2FF',
    primaryLight: '#3B82F6',
    text: '#0F172A',
    textSub: '#475569',
    textMuted: '#94A3B8',
    danger: '#EF4444',
    success: '#10B981',
    warning: '#F59E0B',
    outline: '#E2E8F0',
};

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

export default function ChatInterface({ currentUser, patientId, userRole }) {
    const { isConnected } = useSocket();

    const [contacts, setContacts] = useState([]);
    const [activeContact, setActiveContact] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const [loadingContacts, setLoadingContacts] = useState(true);
    const [loadingMsgs, setLoadingMsgs] = useState(false);
    const [typingPeer, setTypingPeer] = useState(false);
    const [error, setError] = useState(null);

    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef(null);
    const audioChunks = useRef([]);

    const messagesEndRef = useRef(null);
    const typingTimer = useRef(null);
    const unsubMsgs = useRef(null);

    const myId = currentUser?.uid;
    const myName = currentUser?.displayName || currentUser?.name || 'User';

    // 1. Resolve Contacts
    useEffect(() => {
        if (!patientId || !myId) {
            console.warn('[ChatInterface] Missing patientId or myId', { patientId, myId });
            setLoadingContacts(false);
            return;
        }

        const buildContacts = async () => {
            try {
                console.log("[ChatInterface] Resolving contacts for patientId:", patientId);
                const pDoc = await getDoc(doc(db, 'patients', patientId));
                
                if (!pDoc.exists()) { 
                    console.error("[ChatInterface] ERROR: Patient document not found for ID:", patientId);
                    setError("Patient data could not be loaded.");
                    setLoadingContacts(false); 
                    return; 
                }
                
                const pat = pDoc.data();
                console.log("[ChatInterface] Retrieved patient data:", pat);

                const cMap = [];

                const addPeer = async (id, role, defaultName, Icon, bg, color) => {
                    if (id === myId) return; // don't message self
                    let name = defaultName;
                    try {
                        const uSnap = await getDoc(doc(db, 'users', id));
                        if (uSnap.exists()) {
                           const udata = uSnap.data();
                           name = udata.name || udata.displayName || defaultName;
                        }
                    } catch { } // fallback to default
                    
                    cMap.push({
                        peerId: id,
                        peerName: name,
                        peerRole: role,
                        avatar: name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(),
                        bg, color, Icon
                    });
                };

                const tasks = [];
                // 1. Doctor
                if (pat.doctorId && pat.doctorId !== myId) {
                    tasks.push(addPeer(pat.doctorId, 'Doctor', 'Attending Doctor', Stethoscope, '#EEF2FF', '#1E40AF'));
                }

                // 2. Caregiver / Caretaker (Handle both singular and plural keys)
                const caretakerIds = new Set();
                if (pat.caretakerId) caretakerIds.add(pat.caretakerId);
                if (pat.caregiverId) caretakerIds.add(pat.caregiverId);
                if (Array.isArray(pat.caretakerIds)) pat.caretakerIds.forEach(id => caretakerIds.add(id));
                if (Array.isArray(pat.caregiverIds)) pat.caregiverIds.forEach(id => caretakerIds.add(id));

                caretakerIds.forEach(cid => {
                    if (cid !== myId) {
                        tasks.push(addPeer(cid, 'Caregiver', 'Caregiver', User, '#EDE9FE', '#712AE2'));
                    }
                });

                // 3. Family members
                const familyIds = new Set();
                if (pat.familyId) familyIds.add(pat.familyId);
                if (Array.isArray(pat.familyIds)) pat.familyIds.forEach(id => familyIds.add(id));

                familyIds.forEach(fid => {
                    if (fid !== myId) {
                        tasks.push(addPeer(fid, 'Family', 'Family Member', Home, '#DCFCE7', '#059669'));
                    }
                });

                await Promise.all(tasks);
                
                console.log("[ChatInterface] Final contacts array built:", cMap);

                setContacts(cMap);
                if (cMap.length > 0) setActiveContact(cMap[0]);
            } catch (err) {
                console.error("[ChatInterface] Failed to load contacts:", err);
                setError("Failed to load contacts.");
            } finally {
                setLoadingContacts(false);
            }
        };

        buildContacts();
    }, [patientId, myId]);

    // 2. Subscribe to messages when contact changes
    useEffect(() => {
        if (!activeContact?.peerId) return;
        const peerId = activeContact.peerId;

        setLoadingMsgs(true);
        setMessages([]);

        if (unsubMsgs.current) { unsubMsgs.current(); }
        const unsub = subscribeToMessages(myId, peerId, (msgs) => {
            // Filter by patientId to ensure contextual communication
            // (If you want cross-patient chat between same peers, remove this filter)
            // It's safer to filter to keep patient context clean
            const filtered = msgs.filter(m => m.patientId === patientId || m.patientId === null);
            setMessages(filtered);
            setLoadingMsgs(false);
            setError(null);
        });
        unsubMsgs.current = unsub;

        const unsubTyping = onTyping(({ senderId, isTyping }) => {
            if (senderId === peerId) setTypingPeer(isTyping);
        });

        return () => {
            if (unsubMsgs.current) { unsubMsgs.current(); unsubMsgs.current = null; }
            unsubTyping();
        };
    }, [activeContact?.peerId, myId, patientId]);

    // Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, typingPeer]);

    // 3. Audio Recording
    const handleVoiceStart = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunks.current = [];
            
            mediaRecorderRef.current.ondataavailable = e => {
                if (e.data.size > 0) audioChunks.current.push(e.data);
            };

            mediaRecorderRef.current.onstop = async () => {
                const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
                audioChunks.current = [];
                await uploadAndSendVoice(audioBlob);
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch (err) {
            console.error("Mic error:", err);
            setError("Could not access microphone.");
        }
    };

    const handleVoiceStop = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
            setIsRecording(false);
            setSending(true); // show sending indicator while uploading
        }
    };

    const uploadAndSendVoice = async (blob) => {
        try {
            const filename = `voice_msgs/${Date.now()}_${myId}.webm`;
            const storageRef = ref(storage, filename);
            await uploadBytes(storageRef, blob);
            const url = await getDownloadURL(storageRef);

            await sendSocketMessage({
                senderId: myId,
                senderName: myName,
                senderRole: userRole,
                receiverId: activeContact.peerId,
                patientId: patientId || null,
                type: 'voice',
                audioUrl: url,
                message: ''
            });
            setError(null);
        } catch (err) {
            console.error("Voice send failed", err);
            setError("Failed to send voice message.");
        } finally {
            setSending(false);
        }
    };

    // 4. Send text
    const handleSendText = async () => {
        const text = input.trim();
        if (!text || sending) return;
        setSending(true);
        setInput('');
        emitTyping(myId, activeContact.peerId, false);

        try {
            await sendSocketMessage({
                senderId: myId,
                senderName: myName,
                senderRole: userRole,
                receiverId: activeContact.peerId,
                patientId: patientId || null,
                type: 'text',
                message: text,
            });
            setError(null);
        } catch (err) {
            setError('Failed to send text.');
            setInput(text);
        } finally {
            setSending(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendText(); }
    };

    const handleInputChange = (e) => {
        setInput(e.target.value);
        if (!activeContact?.peerId) return;
        emitTyping(myId, activeContact.peerId, true);
        clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => emitTyping(myId, activeContact.peerId, false), 2000);
    };

    return (
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', backgroundColor: C.surface, fontFamily: 'Inter, sans-serif' }}>
            
            {/* Thread List */}
            <div style={{ width: '280px', minWidth: '280px', backgroundColor: C.surfaceLowest, borderRight: `1px solid ${C.outline}`, display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '20px 16px 12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h2 style={{ fontSize: '18px', fontWeight: '900', color: C.text, margin: 0 }}>Contacts</h2>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: '700', color: isConnected ? C.success : C.textMuted }}>
                            {isConnected ? <Wifi size={13} /> : <WifiOff size={13} />}
                            {isConnected ? 'Live' : 'Offline'}
                        </span>
                    </div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '0 10px 16px' }}>
                    {loadingContacts && (
                        <div style={{ padding: '20px', textAlign: 'center', color: C.textMuted, fontSize: '13px' }}>Loading contacts...</div>
                    )}

                    {!loadingContacts && contacts.length === 0 && (
                        <div style={{ padding: '32px 16px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                            <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: C.surfaceHigh, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                                <User size={28} color={C.textMuted} />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '16px', fontWeight: '800', color: C.text, margin: '0 0 8px 0' }}>No Contacts Yet</h3>
                                <p style={{ fontSize: '13px', color: C.textSub, lineHeight: '1.5', margin: 0 }}>
                                    Your care team (Doctor & Caregiver) will appear here once they link to this patient.
                                </p>
                            </div>
                            
                            <div style={{ 
                                backgroundColor: C.primaryContainer, padding: '16px', borderRadius: '12px', width: '100%', 
                                border: `1px dashed ${C.primaryLight}`, marginTop: '8px' 
                            }}>
                                <span style={{ fontSize: '11px', fontWeight: '700', color: C.primaryLight, textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Share Patient ID</span>
                                <span style={{ fontSize: '18px', fontWeight: '900', color: C.primary, letterSpacing: '1px' }}>
                                    {patientId?.slice(-8).toUpperCase() || '---'}
                                </span>
                            </div>
                            
                            <p style={{ fontSize: '12px', color: C.textMuted, fontStyle: 'italic' }}>
                                Give this ID to your doctor or caretaker so they can join the patient record.
                            </p>
                        </div>
                    )}

                    {contacts.map(contact => {
                        const isActive = activeContact?.peerId === contact.peerId;
                        return (
                            <div key={contact.peerId} onClick={() => setActiveContact(contact)} style={{
                                display: 'flex', alignItems: 'center', gap: '12px',
                                padding: '12px', borderRadius: '14px', cursor: 'pointer',
                                marginBottom: '4px',
                                backgroundColor: isActive ? '#EEF2FF' : 'transparent',
                                boxShadow: isActive ? '0 2px 12px rgba(25,28,30,0.06)' : 'none',
                                transition: 'all 0.2s'
                            }}>
                                <div style={{ width: '42px', height: '42px', borderRadius: '12px', backgroundColor: contact.bg, color: contact.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '900', flexShrink: 0 }}>
                                    {contact.avatar}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: '14px', fontWeight: '800', color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{contact.peerName}</div>
                                    <div style={{ fontSize: '11px', color: C.textMuted, fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        {contact.peerRole}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Chat Window */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: C.surface, overflow: 'hidden' }}>
                {activeContact ? (
                    <>
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
                        </div>

                        {error && (
                            <div style={{ backgroundColor: '#FEF2F2', padding: '10px 24px', fontSize: '13px', color: C.danger, fontWeight: '600', borderBottom: `1px solid #FECACA` }}>
                                ⚠ {error}
                            </div>
                        )}

                        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {loadingMsgs && (
                                <div style={{ textAlign: 'center', color: C.textMuted, fontSize: '13px', padding: '40px' }}>Loading messages...</div>
                            )}

                            {!loadingMsgs && messages.length === 0 && (
                                <div style={{ textAlign: 'center', padding: '60px 20px', color: C.textMuted }}>
                                    <MessageSquare size={40} color={C.surfaceHigh} style={{ margin: '0 auto 12px' }} />
                                    <p style={{ fontWeight: '700', margin: 0 }}>Start a conversation</p>
                                </div>
                            )}

                            {messages.map((msg, i) => {
                                const isMe = msg.senderId === myId;
                                const ts = msg.timestamp instanceof Date ? msg.timestamp : msg.timestamp?.toDate?.() || new Date();
                                const showDate = i === 0 || (
                                    Math.abs(ts - (messages[i - 1]?.timestamp?.toDate?.() || new Date(0))) > 300000
                                );

                                return (
                                    <React.Fragment key={msg.id || i}>
                                        {showDate && (
                                            <div style={{ textAlign: 'center', fontSize: '11px', color: C.textMuted, fontWeight: '700', padding: '10px 0 4px' }}>
                                                {ts.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        )}
                                        <div style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                                            <div style={{ maxWidth: '70%' }}>
                                                {!isMe && (
                                                    <div style={{ fontSize: '11px', color: C.textMuted, fontWeight: '700', marginBottom: '4px', marginLeft: '4px' }}>
                                                        {msg.senderName}
                                                    </div>
                                                )}
                                                <div style={{
                                                    padding: (msg.type === 'image' || msg.type === 'photo') ? '4px' : '12px 16px',
                                                    borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                                                    backgroundColor: isMe ? C.primary : C.surfaceLowest,
                                                    color: isMe ? 'white' : C.text,
                                                    fontSize: '14px', fontWeight: '500', lineHeight: 1.5,
                                                    boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
                                                    overflow: 'hidden'
                                                }}>
                                                    {(msg.type === 'voice' || msg.type === 'audio') && (msg.audioUrl || msg.url) ? (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                            {msg.message && <div style={{ fontSize: '12px', opacity: 0.9, marginBottom: '2px' }}>{msg.message}</div>}
                                                            <audio controls src={msg.audioUrl || msg.url} style={{ height: '36px', width: '220px' }} />
                                                        </div>
                                                    ) : (msg.type === 'image' || msg.type === 'photo' || msg.imageUrl || (msg.url && !msg.audioUrl)) ? (
                                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                            {(msg.imageUrl || msg.url) && (
                                                                <img 
                                                                    src={msg.imageUrl || msg.url} 
                                                                    alt="Attachment" 
                                                                    style={{ maxWidth: '100%', borderRadius: '14px', display: 'block', maxHeight: '300px', objectFit: 'cover' }} 
                                                                    onClick={() => window.open(msg.imageUrl || msg.url, '_blank')}
                                                                />
                                                            )}
                                                            {msg.message && <div style={{ padding: '8px 12px', fontSize: '13px' }}>{msg.message}</div>}
                                                        </div>
                                                    ) : (
                                                        msg.message
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </React.Fragment>
                                );
                            })}
                            
                            {typingPeer && (
                                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                                    <div style={{ backgroundColor: C.surfaceLowest, borderRadius: '18px 18px 18px 4px', padding: '12px 18px', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>
                                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                            {[0, 1, 2].map(n => (
                                                <span key={n} style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: C.textMuted, display: 'inline-block', animation: `typingBounce 1s infinite ${n * 0.2}s` }} />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div style={{ backgroundColor: C.surfaceLowest, borderTop: `1px solid ${C.outline}`, padding: '16px 24px', display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                            {isRecording ? (
                                <div style={{ flex: 1, backgroundColor: '#FEF2F2', padding: '14px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '10px', color: '#DC2626', fontWeight: '800' }}>
                                    <span style={{ animation: 'pulse 1s infinite', width: '10px', height: '10px', backgroundColor: '#DC2626', borderRadius: '50%', display: 'block' }} />
                                    Recording Voice Message...
                                </div>
                            ) : (
                                <textarea
                                    value={input}
                                    onChange={handleInputChange}
                                    onKeyDown={handleKeyDown}
                                    placeholder={`Message ${activeContact.peerName}...`}
                                    disabled={sending}
                                    rows={1}
                                    style={{
                                        flex: 1, padding: '14px 18px', borderRadius: '16px',
                                        border: 'none', backgroundColor: C.surfaceLow,
                                        fontSize: '14px', fontFamily: 'inherit', outline: 'none',
                                        resize: 'none', color: C.text, lineHeight: 1.5,
                                    }}
                                />
                            )}

                            <div style={{ display: 'flex', gap: '8px' }}>
                                {input.trim() ? (
                                    <button
                                        onClick={handleSendText}
                                        disabled={sending}
                                        style={{ width: '48px', height: '48px', borderRadius: '50%', border: 'none', backgroundColor: C.primary, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
                                    >
                                        <Send size={20} />
                                    </button>
                                ) : (
                                    <button
                                        onMouseDown={handleVoiceStart}
                                        onTouchStart={handleVoiceStart}
                                        onMouseUp={handleVoiceStop}
                                        onTouchEnd={handleVoiceStop}
                                        disabled={sending}
                                        style={{ width: '48px', height: '48px', borderRadius: '50%', border: 'none', backgroundColor: isRecording ? '#DC2626' : C.primaryLight, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, transition: 'all 0.2s' }}
                                    >
                                        {isRecording ? <Square size={18} fill="white" /> : <Mic size={20} />}
                                    </button>
                                )}
                            </div>
                        </div>
                    </>
                ) : (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textMuted }}>
                         <p style={{ fontWeight: '700' }}>{contacts.length === 0 ? "No contacts available for this patient" : "Select a contact to chat"}</p>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes typingBounce {
                    0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
                    30% { transform: translateY(-4px); opacity: 1; }
                }
                @keyframes pulse {
                    0% { opacity: 1; }
                    50% { opacity: 0.5; }
                    100% { opacity: 1; }
                }
            `}</style>
        </div>
    );
}
