import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, updateDoc, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase/config';
import { useAuthContext } from '../../context/AuthContext';
import { getTodayDateString } from '../../utils/dateHelpers';
import { checkCriticalObservationAndAlert } from '../../utils/alertChecker';
import TopHeader from '../common/TopHeader';
import PrimaryButton from '../common/PrimaryButton';
import { colors } from '../../styles/colors';
import { typography } from '../../styles/typography';
import { spacing } from '../../styles/spacing';
import { Mic, Play, Trash2, Pause } from 'lucide-react';

const emojis = [
    { label: 'Very Sad', symbol: '😫' },
    { label: 'Sad', symbol: '😔' },
    { label: 'Neutral', symbol: '😐' },
    { label: 'Happy', symbol: '🙂' },
    { label: 'Very Happy', symbol: '😄' }
];

export default function ObservationsScreen() {
    const navigate = useNavigate();
    const { user, patientId } = useAuthContext();

    // State
    const [mood, setMood] = useState(null);
    const [isCritical, setIsCritical] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [toast, setToast] = useState(null);
    const [caretakerName, setCaretakerName] = useState('');

    // Audio Recording State
    const [isRecording, setIsRecording] = useState(false);
    const [audioUrl, setAudioUrl] = useState(null);
    const [audioBlob, setAudioBlob] = useState(null);
    const [recordTimer, setRecordTimer] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);

    const mediaRecorder = useRef(null);
    const audioChunks = useRef([]);
    const timerInterval = useRef(null);
    const audioRef = useRef(new Audio());

    useEffect(() => {
        // Get caretaker name for the log
        const getCaretaker = async () => {
            try {
                const uDoc = await getDocs(query(collection(db, 'users'), where('__name__', '==', user.uid)));
                if (!uDoc.empty) setCaretakerName(uDoc.docs[0].data().name);
            } catch (e) {
                console.error(e);
            }
        };
        if (user) getCaretaker();

        // Clean up audio
        return () => {
            if (timerInterval.current) clearInterval(timerInterval.current);
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.src = "";
            }
        };
    }, [user]);

    const showToast = (message, type) => {
        setToast({ message, type });
        setTimeout(() => {
            setToast(null);
            if (type === 'success') navigate('/caretaker/dashboard');
        }, 2000);
    };

    // Recording Logic
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder.current = new MediaRecorder(stream);
            audioChunks.current = [];

            mediaRecorder.current.ondataavailable = (event) => {
                if (event.data.size > 0) audioChunks.current.push(event.data);
            };

            mediaRecorder.current.onstop = () => {
                const audioBlobRecord = new Blob(audioChunks.current, { type: 'audio/webm' });
                const audioUrlRecord = URL.createObjectURL(audioBlobRecord);
                setAudioBlob(audioBlobRecord);
                setAudioUrl(audioUrlRecord);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.current.start();
            setIsRecording(true);
            setRecordTimer(0);
            timerInterval.current = setInterval(() => {
                setRecordTimer(prev => prev + 1);
            }, 1000);
        } catch (err) {
            console.error('Error accessing microphone', err);
            alert('Microphone access denied or unavailable.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorder.current && mediaRecorder.current.state === "recording") {
            mediaRecorder.current.stop();
            setIsRecording(false);
            clearInterval(timerInterval.current);
        }
    };

    // Playback Logic
    const togglePlayback = () => {
        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
        } else {
            audioRef.current.src = audioUrl;
            audioRef.current.play();
            setIsPlaying(true);
            audioRef.current.onended = () => setIsPlaying(false);
        }
    };

    const deleteRecording = () => {
        setAudioBlob(null);
        setAudioUrl(null);
        setRecordTimer(0);
        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
        }
    };

    const formatTime = (secs) => {
        const min = Math.floor(secs / 60);
        const s = secs % 60;
        return min + ':' + (s < 10 ? '0' : '') + s;
    };

    const getDayLogRef = async (todayString) => {
        const q = query(collection(db, 'dailyLogs'), where('patientId', '==', patientId), where('date', '==', todayString));
        const snap = await getDocs(q);
        if (snap.empty) {
            const newRef = doc(collection(db, 'dailyLogs'));
            await setDoc(newRef, {
                patientId,
                date: todayString,
                createdAt: serverTimestamp(),
                observations: []
            });
            return newRef;
        }
        return snap.docs[0].ref;
    };

    const handleSave = async () => {
        if (!mood && !audioBlob) {
            alert("Please select a mood or add a voice recording.");
            return;
        }
        setSubmitting(true);
        try {
            let finalAudioUrl = "";

            // Step 0: Upload Audio if exists
            if (audioBlob) {
                const audioRefTarget = ref(storage, `recordings/${patientId}_${Date.now()}.webm`);
                await uploadBytes(audioRefTarget, audioBlob);
                finalAudioUrl = await getDownloadURL(audioRefTarget);
            }

            const todayString = getTodayDateString();
            const logRef = await getDayLogRef(todayString);

            const logSnap = await getDocs(query(collection(db, 'dailyLogs'), where('__name__', '==', logRef.id)));
            const existingData = logSnap.docs[0].data();
            const currentObservations = existingData.observations || [];

            // Step 1: Write Observation safely into today's log array
            const newObservation = {
                mood: mood || null,
                audioUrl: finalAudioUrl || null,
                isCritical: isCritical,
                caretakerName: caretakerName || 'Caretaker',
                recordedAt: new Date().toISOString()
            };

            await updateDoc(logRef, {
                observations: [...currentObservations, newObservation]
            });

            // Step 2: Write Critical Alert if requested via abstraction
            await checkCriticalObservationAndAlert(patientId, newObservation);

            // Step 3: Show Success Toast
            showToast('Observation recorded successfully!', 'success');

        } catch (error) {
            console.error(error);
            alert('Failed to save observation.');
            setSubmitting(false);
        }
    };

    return (
        <div style={{ backgroundColor: colors.white, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

            {toast && (
                <div style={{
                    position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
                    backgroundColor: toast.type === 'success' ? colors.successGreen : colors.alertRed,
                    color: toast.type === 'success' ? colors.primaryGreen : colors.white,
                    padding: '12px 24px', borderRadius: spacing.borderRadius.badge, fontWeight: '600',
                    boxShadow: spacing.shadows.card, zIndex: 100, animation: 'slideDown 0.3s ease-out'
                }}>
                    {toast.message}
                </div>
            )}

            <TopHeader title="Today's Observations" showBack onBack={() => navigate(-1)} />

            <div style={{ padding: spacing.pagePadding, flex: 1, display: 'flex', flexDirection: 'column', gap: '32px' }}>

                {/* Mood Section */}
                <div>
                    <h2 style={{ fontSize: '14px', fontWeight: '600', color: colors.textPrimary, marginBottom: '16px' }}>How is the patient feeling today?</h2>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        {emojis.map((em) => (
                            <div
                                key={em.label}
                                onClick={() => setMood(em.label)}
                                style={{
                                    width: '56px',
                                    height: '56px',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    fontSize: '32px',
                                    cursor: 'pointer',
                                    backgroundColor: mood === em.label ? colors.primaryBlue : 'transparent',
                                    transform: mood === em.label ? 'scale(1.15)' : 'scale(1)',
                                    transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                                }}
                            >
                                <div style={{
                                    transform: mood === em.label ? 'translateY(-2px)' : 'none',
                                    transition: 'transform 0.2s'
                                }}>
                                    {em.symbol}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div style={{ height: '1px', backgroundColor: colors.border, width: '100%' }} />

                {/* Voice Recording Section */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: '100%', marginBottom: '24px' }}>
                        <h2 style={{ fontSize: '14px', fontWeight: '600', color: colors.textPrimary, marginBottom: '4px' }}>Record Your Observation</h2>
                        <p style={{ fontSize: '12px', color: colors.textSecondary }}>Tap and hold the mic to record</p>
                    </div>

                    {!audioUrl ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div
                                onPointerDown={(e) => { e.preventDefault(); startRecording(); }}
                                onPointerUp={stopRecording}
                                onPointerLeave={stopRecording}
                                onContextMenu={(e) => e.preventDefault()}
                                style={{
                                    width: '80px',
                                    height: '80px',
                                    borderRadius: '50%',
                                    backgroundColor: isRecording ? colors.alertRed : colors.lightBlue,
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    cursor: 'pointer',
                                    boxShadow: isRecording ? `0 0 20px ${colors.alertRed}` : 'none',
                                    transition: 'background-color 0.2s, box-shadow 0.2s',
                                    userSelect: 'none',
                                    WebkitUserSelect: 'none',
                                    touchAction: 'none'
                                }}
                            >
                                <Mic size={40} color={isRecording ? colors.white : colors.primaryBlue} />
                            </div>

                            {isRecording && (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '24px', animation: 'fadeIn 0.2s' }}>
                                    <span style={{ fontSize: '24px', fontWeight: 'bold', color: colors.alertRed, marginBottom: '16px', fontVariantNumeric: 'tabular-nums' }}>
                                        {formatTime(recordTimer)}
                                    </span>
                                    <div style={{ display: 'flex', gap: '4px', height: '20px', alignItems: 'center' }}>
                                        {[...Array(9)].map((_, i) => (
                                            <div key={i} style={{
                                                width: '4px',
                                                backgroundColor: colors.primaryBlue,
                                                borderRadius: '2px',
                                                animation: `waveform ${0.5 + Math.random()}s infinite ease-in-out alternate`,
                                                animationDelay: `${i * 0.1}s`
                                            }} />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '24px', marginBottom: '12px' }}>

                                <div onClick={deleteRecording} style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: colors.background, display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', border: `1px solid ${colors.border}` }}>
                                    <Trash2 size={24} color={colors.alertRed} />
                                </div>

                                <div onClick={togglePlayback} style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: colors.primaryBlue, display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', boxShadow: spacing.shadows.button }}>
                                    {isPlaying ? <Pause size={28} color={colors.white} /> : <Play size={28} color={colors.white} style={{ marginLeft: '4px' }} />}
                                </div>

                            </div>
                            <span style={{ fontSize: '14px', fontWeight: '600', color: colors.textPrimary, fontVariantNumeric: 'tabular-nums' }}>{formatTime(recordTimer)}</span>
                        </div>
                    )}
                </div>

                <div style={{ height: '1px', backgroundColor: colors.border, width: '100%' }} />

                {/* Critical Toggle Section */}
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <h2 style={{ fontSize: '14px', fontWeight: '600', color: colors.alertRed }}>Critical Observation</h2>
                            {!isCritical && <p style={{ fontSize: '12px', color: colors.textSecondary, marginTop: '2px' }}>Turn on if patient needs immediate attention</p>}
                        </div>

                        <label style={{ position: 'relative', display: 'inline-block', width: '50px', height: '28px', flexShrink: 0 }}>
                            <input type="checkbox" checked={isCritical} onChange={(e) => setIsCritical(e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
                            <span style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: isCritical ? colors.alertRed : colors.grey300, borderRadius: '34px', cursor: 'pointer', transition: '.4s' }}>
                                <span style={{ position: 'absolute', content: '""', height: '20px', width: '20px', left: isCritical ? '26px' : '4px', bottom: '4px', backgroundColor: 'white', borderRadius: '50%', transition: '.4s' }} />
                            </span>
                        </label>
                    </div>

                    {isCritical && (
                        <div style={{ backgroundColor: colors.lightOrange, border: `1px solid ${colors.alertOrange}`, padding: '12px', borderRadius: spacing.borderRadius.badge, marginTop: '12px', animation: 'slideDown 0.2s ease' }}>
                            <span style={{ fontSize: '12px', color: colors.alertOrange, fontWeight: '600' }}>Turning this on will send an immediate alert to the family and doctor.</span>
                        </div>
                    )}
                </div>

                <div style={{ marginTop: 'auto', marginBottom: '16px' }}>
                    <PrimaryButton label="Save Observations" onClick={handleSave} isLoading={submitting} disabled={submitting} />
                </div>

            </div>

            <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideDown { from { transform: translateY(-10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes waveform {
          0% { height: 4px; }
          100% { height: 24px; }
        }
      `}</style>
        </div>
    );
}
