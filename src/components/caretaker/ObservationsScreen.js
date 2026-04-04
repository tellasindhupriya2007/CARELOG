import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, updateDoc, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase/config';
import { useAuthContext } from '../../context/AuthContext';
import { getTodayDateString } from '../../utils/dateHelpers';
import { checkCriticalObservationAndAlert } from '../../utils/alertChecker';
import ScreenHeader from '../../components/common/ScreenHeader';
import { colors } from '../../styles/colors';
import { spacing } from '../../styles/spacing';
import { 
    Mic, Play, Trash2, Pause, Loader2, Smile, Meh, Frown, 
    AlertTriangle, Heart, CheckCircle2, Camera, Image as ImageIcon, X 
} from 'lucide-react';
import { uploadPatientMedia } from '../../services/mediaService';

const moodOptions = [
    { label: 'Very Low', color: '#EF4444', icon: AlertTriangle }, 
    { label: 'Low', color: '#F97316', icon: Frown },      
    { label: 'Neutral', color: '#94A3B8', icon: Meh },  
    { label: 'Good', color: '#3B82F6', icon: Smile },     
    { label: 'Excellent', color: '#10B981', icon: Heart } 
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

    // Image Upload State
    const [selectedImage, setSelectedImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [imageDescription, setImageDescription] = useState('');

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

    const handleImageSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedImage(file);
            const reader = new FileReader();
            reader.onloadend = () => setImagePreview(reader.result);
            reader.readAsDataURL(file);
        }
    };

    const removeImage = () => {
        setSelectedImage(null);
        setImagePreview(null);
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
        if (!mood && !audioBlob && !selectedImage) {
            alert("Please record something: mood, voice, or image.");
            return;
        }
        setSubmitting(true);
        try {
            let finalAudioUrl = "";
            if (audioBlob) {
                const audioRefTarget = ref(storage, `recordings/${patientId}_${Date.now()}.webm`);
                await uploadBytes(audioRefTarget, audioBlob);
                finalAudioUrl = await getDownloadURL(audioRefTarget);
            }

            // Handle Image Upload via service
            if (selectedImage) {
                await uploadPatientMedia(patientId, selectedImage, mood || "Clinical Photo", user.uid);
            }

            const todayString = getTodayDateString();
            const logRef = await getDayLogRef(todayString);
            const logSnap = await getDocs(query(collection(db, 'dailyLogs'), where('__name__', '==', logRef.id)));
            const existingData = logSnap.docs[0].data();
            const currentObservations = existingData.observations || [];

            const newObservation = {
                mood: mood || null,
                audioUrl: finalAudioUrl || null,
                hasImage: !!selectedImage,
                isCritical: isCritical,
                caretakerName: caretakerName || 'Caretaker',
                recordedAt: new Date().toISOString()
            };

            await updateDoc(logRef, {
                observations: [...currentObservations, newObservation]
            });

            await checkCriticalObservationAndAlert(patientId, newObservation);
            showToast('Observation recorded successfully!', 'success');
        } catch (error) {
            console.error(error);
            alert('Failed to save observation.');
            setSubmitting(false);
        }
    };

    return (
        <div style={{ backgroundColor: colors.background, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            {toast && (
                <div style={{
                    position: 'fixed', top: 'calc(var(--header-h) + 16px + env(safe-area-inset-top))', left: '50%', transform: 'translateX(-50%)',
                    backgroundColor: toast.type === 'success' ? colors.primaryGreen : colors.alertRed,
                    color: colors.white, padding: '12px 32px', borderRadius: '12px', fontWeight: '800',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', zIndex: 2001, textAlign: 'center',
                    animation: 'slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                }}>
                    {toast.message}
                </div>
            )}

            <ScreenHeader 
                title="Clinical Observation" 
                subtitle={`Patient ID: ${patientId}`} 
                showBack 
                onBack={() => navigate(-1)} 
                rightIcon={
                    <button 
                        onPointerDown={(e) => { e.preventDefault(); !audioUrl && startRecording(); }}
                        onPointerUp={stopRecording}
                        onPointerLeave={stopRecording}
                        style={{ 
                            width: '40px', height: '40px', borderRadius: '50%', 
                            backgroundColor: isRecording ? colors.alertRed : colors.lightBlue, 
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: 'none', cursor: audioUrl ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: isRecording ? `0 0 12px ${colors.alertRed}44` : 'none'
                        }}
                    >
                        <Mic size={18} color={isRecording ? colors.white : colors.primaryBlue} className={isRecording ? 'pulse' : ''} />
                    </button>
                }
            />

            <div 
                className="main-content" 
                style={{ 
                    padding: 'calc(var(--header-h) + 24px + env(safe-area-inset-top)) 20px 40px 20px', 
                    flex: 1, 
                    width: '100%',
                    maxWidth: '1200px',
                    margin: '0 auto',
                    alignSelf: 'center'
                }}
            >
                
                {/* Patient Wellness Score */}
                <div style={{ backgroundColor: colors.white, padding: '20px', borderRadius: '16px', border: `1px solid ${colors.border}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h2 style={{ fontSize: '13px', fontWeight: '800', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Wellness Status</h2>
                        <span style={{ fontSize: '12px', fontWeight: '700', color: colors.primaryBlue }}>{mood || 'Not Selected'}</span>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '8px', width: '100%', overflowX: 'auto', paddingBottom: '8px' }}>
                        {moodOptions.map((opt) => {
                            const Icon = opt.icon;
                            return (
                                <button
                                    key={opt.label}
                                    onClick={() => setMood(opt.label)}
                                    style={{
                                        flex: 1, minHeight: '80px', borderRadius: '16px', border: `1.5px solid ${mood === opt.label ? opt.color : '#F1F5F9'}`,
                                        backgroundColor: mood === opt.label ? opt.color : colors.white,
                                        color: mood === opt.label ? colors.white : colors.textSecondary,
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                        cursor: 'pointer', transition: 'all 0.2s',
                                        boxShadow: mood === opt.label ? `0 8px 16px ${opt.color}33` : 'none',
                                        minWidth: '70px'
                                    }}
                                >
                                    <Icon size={24} color={mood === opt.label ? colors.white : opt.color} />
                                    <span style={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase' }}>{opt.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Voice Log Section */}
                <div style={{ backgroundColor: colors.white, padding: '20px', borderRadius: '16px', border: `1px solid ${colors.border}` }}>
                    <h2 style={{ fontSize: '13px', fontWeight: '800', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '16px' }}>Log Evidence</h2>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        {/* Audio Button */}
                        <div style={{ 
                            backgroundColor: '#F8FAFC', padding: '12px', borderRadius: '12px', border: `1px solid ${colors.border}`,
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px'
                        }}>
                            {!audioUrl ? (
                                <button
                                    onPointerDown={(e) => { e.preventDefault(); startRecording(); }}
                                    onPointerUp={stopRecording}
                                    style={{
                                        width: '40px', height: '40px', borderRadius: '50%', border: 'none',
                                        backgroundColor: isRecording ? colors.alertRed : colors.primaryBlue,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                                    }}
                                >
                                    <Mic size={20} color={colors.white} />
                                </button>
                            ) : (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button onClick={togglePlayback} style={{ background: colors.primaryBlue, border: 'none', borderRadius: '50%', padding: '8px' }}>
                                        {isPlaying ? <Pause size={16} color="white" /> : <Play size={16} color="white" />}
                                    </button>
                                    <button onClick={deleteRecording} style={{ background: 'none', border: 'none', color: colors.alertRed }}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            )}
                            <span style={{ fontSize: '11px', fontWeight: '800', color: colors.textSecondary }}>VOICE LOG</span>
                        </div>

                        {/* Image Button */}
                        <div style={{ 
                            backgroundColor: '#F8FAFC', padding: '12px', borderRadius: '12px', border: `1px solid ${colors.border}`,
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', position: 'relative'
                        }}>
                            {!imagePreview ? (
                                <label style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ 
                                        width: '40px', height: '40px', borderRadius: '50%', backgroundColor: colors.lightBlue,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        <Camera size={20} color={colors.primaryBlue} />
                                    </div>
                                    <span style={{ fontSize: '11px', fontWeight: '800', color: colors.textSecondary }}>CAPTURE IMAGE</span>
                                    <input type="file" accept="image/*" capture="environment" onChange={handleImageSelect} style={{ display: 'none' }} />
                                </label>
                            ) : (
                                <div style={{ position: 'relative', width: '40px', height: '40px' }}>
                                    <img src={imagePreview} style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover' }} alt="Preview" />
                                    <button 
                                        onClick={removeImage}
                                        style={{ position: 'absolute', top: '-6px', right: '-6px', backgroundColor: colors.alertRed, color: 'white', border: 'none', borderRadius: '50%', padding: '2px' }}
                                    >
                                        <X size={10} />
                                    </button>
                                    <span style={{ fontSize: '10px', marginTop: '4px', display: 'block', textAlign: 'center', color: colors.primaryGreen }}>READY</span>
                                </div>
                            )}
                            {!imagePreview && <span style={{ fontSize: '11px', fontWeight: '800', color: colors.textSecondary }}>CLINICAL PHOTO</span>}
                        </div>
                    </div>
                </div>

                {/* Critical Toggle Row */}
                <div style={{ 
                    backgroundColor: colors.white, padding: '20px', borderRadius: '16px', border: `1px solid ${isCritical ? colors.alertRed : colors.border}`,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.3s'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ 
                            width: '40px', height: '40px', borderRadius: '10px', 
                            backgroundColor: isCritical ? '#FEE2E2' : '#F1F5F9',
                            display: 'flex', alignItems: 'center', justifyContent: 'center' 
                        }}>
                            <Loader2 size={20} color={isCritical ? colors.alertRed : colors.textSecondary} className={isCritical ? 'pulse' : ''} />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '14px', fontWeight: '800', color: colors.textPrimary }}>Critical Observation</h2>
                            <p style={{ fontSize: '12px', color: colors.textSecondary }}>Flash alert to medical personnel</p>
                        </div>
                    </div>

                    <button 
                        onClick={() => setIsCritical(!isCritical)}
                        style={{ 
                            position: 'relative', width: '64px', height: '32px', backgroundColor: isCritical ? colors.alertRed : '#E2E8F0', 
                            borderRadius: '30px', border: `1px solid ${isCritical ? colors.alertRed : colors.border}`, cursor: 'pointer', transition: 'all 0.3s'
                        }}
                    >
                        <div style={{ 
                            position: 'absolute', top: '2px', left: isCritical ? '34px' : '2px', 
                            width: '26px', height: '26px', backgroundColor: 'white', borderRadius: '50%', 
                            boxShadow: '0 2px 4px rgba(0,0,0,0.15)', transition: 'all 0.3s'
                        }} />
                    </button>
                </div>

                {/* Action Footer */}
                <div style={{ marginTop: 'auto', padding: '24px 0', borderTop: `1px solid ${colors.border}` }}>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button 
                            onClick={() => navigate(-1)} 
                            style={{ 
                                flex: 1, height: '48px', borderRadius: '12px', border: `1.5px solid ${colors.border}`,
                                color: colors.textSecondary, fontWeight: '800', backgroundColor: colors.white, cursor: 'pointer'
                            }}
                        >
                            CANCEL
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={submitting || (!mood && !audioBlob)}
                            style={{
                                flex: 2, height: '48px', backgroundColor: (submitting || (!mood && !audioBlob)) ? '#E2E8F0' : (isCritical ? colors.alertRed : colors.primaryBlue),
                                color: colors.white, fontSize: '14px', fontWeight: '900', borderRadius: '12px', border: 'none',
                                cursor: (submitting || (!mood && !audioBlob)) ? 'not-allowed' : 'pointer', transition: 'all 0.3s ease',
                                boxShadow: (!mood && !audioBlob) ? 'none' : `0 8px 20px ${isCritical ? colors.alertRed : colors.primaryBlue}44`
                            }}
                        >
                            {submitting ? <Loader2 size={20} className="spinner" /> : (isCritical ? "TRANSMIT CRITICAL LOG" : "SUBMIT OBSERVATION")}
                        </button>
                    </div>
                    <p style={{ fontSize: '11px', color: colors.textSecondary, textAlign: 'center', marginTop: '16px' }}>
                        * Log entry will be time-stamped and signed by {caretakerName || 'you'}
                    </p>
                </div>
            </div>

            <style>{`
                @keyframes slideDown { from { transform: translate(-50%, -10px); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
                @keyframes wave { from { height: 4px; } to { height: 16px; } }
                @keyframes spin { 100% { transform: rotate(360deg); } }
                @keyframes pulse { from { opacity: 0.6; transform: scale(0.95); } to { opacity: 1; transform: scale(1.05); } }
                .spinner { animation: spin 1s linear infinite; }
                .pulse { animation: pulse 0.8s infinite ease-in-out alternate; }
            `}</style>
        </div>
    );
}
