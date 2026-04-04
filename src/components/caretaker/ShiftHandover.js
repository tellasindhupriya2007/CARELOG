import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../context/AuthContext';
import { collection, query, where, getDocs, updateDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { getTodayDateString } from '../../utils/dateHelpers';
import ScreenHeader from '../../components/common/ScreenHeader';
import PrimaryButton from '../common/PrimaryButton';
import SecondaryButton from '../common/SecondaryButton';
import DangerButton from '../common/DangerButton';
import Card from '../common/Card';
import SkeletonCard from '../common/SkeletonCard';
import { colors } from '../../styles/colors';
import { spacing } from '../../styles/spacing';
import { CheckCircle2, XCircle, HeartPulse, Smile, Pill, Loader2, Thermometer, Activity } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { subscribeToDailyLogs, subscribeToTasks } from '../../services/taskService';

export default function ShiftHandover() {
    const navigate = useNavigate();
    const { user, patientId, logout } = useAuthContext();

    const [loading, setLoading] = useState(true);
    const [caretakerName, setCaretakerName] = useState('');
    const [dailyLog, setDailyLog] = useState(null);
    const [showConfirm, setShowConfirm] = useState(false);
    const [ending, setEnding] = useState(false);

    const [tasks, setTasks] = useState([]);
    const [completions, setCompletions] = useState({});

    useEffect(() => {
        const fetchHandoverData = async () => {
            if (!user || !patientId) return;
            try {
                // Get caretaker name
                const uDoc = await getDoc(doc(db, 'users', user.uid));
                if (uDoc.exists()) setCaretakerName(uDoc.data().name || 'Caretaker');

                // Initial fetch for vitals and observations specifically for handover summary
                const q = query(collection(db, 'dailyLogs'), where('patientId', '==', patientId), where('date', '==', getTodayDateString()));
                const snap = await getDocs(q);
                if (!snap.empty) {
                    setDailyLog(snap.docs[0].data());
                }
            } catch (err) {
                console.error(err);
            }
            setLoading(false);
        };
        fetchHandoverData();

        // Real-time completions & tasks
        const unsubTasks = subscribeToTasks(patientId, setTasks);
        const unsubLogs = subscribeToDailyLogs(patientId, setCompletions);

        return () => {
            unsubTasks();
            unsubLogs();
        };
    }, [user, patientId]);

    const handleEndShift = async () => {
        setEnding(true);
        try {
            // Write timestamp to dailyLog
            const q = query(collection(db, 'dailyLogs'), where('patientId', '==', patientId), where('date', '==', getTodayDateString()));
            const snap = await getDocs(q);
            if (!snap.empty) {
                await updateDoc(snap.docs[0].ref, {
                    shiftEndedAt: new Date().toISOString()
                });
            }

            // End Auth state and route to splash
            await logout();
            navigate('/auth/splash', { replace: true });
        } catch (err) {
            console.error("Failed to end shift:", err);
            setShowConfirm(false);
            setEnding(false);
        }
    };

    const getScoreColor = (score) => {
        if (score >= 8) return colors.primaryGreen;
        if (score >= 5) return colors.alertYellow;
        return colors.alertRed;
    };

    const scoreData = dailyLog ? [
        { name: 'Score', value: dailyLog.careScore || 0, color: getScoreColor(dailyLog.careScore) },
        { name: 'Remaining', value: Math.max(0, 10 - (dailyLog.careScore || 0)), color: colors.border }
    ] : [];

    // Derive mapped elements using new task service data
    const completedTasks = tasks.filter(t => completions[t.id]?.completed);
    const missedTasks = tasks.filter(t => !completions[t.id]?.completed);

    const vitals = dailyLog?.vitals || [];
    const observations = dailyLog?.observations || [];

    const emMap = { "Very Low": '😫', "Low": '😔', "Neutral": '😐', "Good": '🙂', "Excellent": '😄' };

    return (
        <div style={{ backgroundColor: colors.background, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <ScreenHeader title="Shift Handover" showBack onBack={() => navigate(-1)} />

            {/* Standardized Main Container */}
            <div 
                className="main-content" 
                style={{ 
                    padding: 'calc(var(--header-h) + 24px + env(safe-area-inset-top)) 20px 140px 20px', 
                    flex: 1, 
                    width: '100%',
                    maxWidth: '1200px',
                    margin: '0 auto', 
                    alignSelf: 'center',
                    boxSizing: 'border-box'
                }}
            >
                {loading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <SkeletonCard style={{ height: '80px' }} />
                        <SkeletonCard style={{ height: '240px' }} />
                        <SkeletonCard style={{ height: '180px' }} />
                    </div>
                ) : (
                    <>
                        {/* Summary Header */}
                        <Card style={{ padding: '24px', borderLeft: `6px solid ${colors.primaryBlue}` }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <span style={{ fontSize: '18px', fontWeight: '900', color: colors.textPrimary }}>Clinical Shift Summary</span>
                                <span style={{ fontSize: '11px', fontWeight: '800', color: colors.textSecondary, backgroundColor: colors.lightBlue, padding: '4px 8px', borderRadius: '4px' }}>
                                    {getTodayDateString()}
                                </span>
                            </div>
                            <span style={{ fontSize: '14px', color: colors.textSecondary, fontWeight: '700' }}>Caretaker: {caretakerName}</span>
                        </Card>

                        {/* Shift Stats Grid - Equal Height */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', width: '100%' }}>
                            <Card style={{ 
                                padding: '24px', backgroundColor: '#F0FDF4', border: '1.5px solid #BBF7D0', 
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' 
                            }}>
                                <CheckCircle2 size={24} color="#166534" />
                                <span style={{ fontSize: '32px', fontWeight: '900', color: '#166534' }}>{completedTasks.length}</span>
                                <span style={{ fontSize: '10px', fontWeight: '800', color: '#166534', opacity: 0.8, textTransform: 'uppercase' }}>Tasks Done</span>
                            </Card>
                            <Card style={{ 
                                padding: '24px', backgroundColor: missedTasks.length > 0 ? '#FEF2F2' : '#F8FAFC', 
                                border: missedTasks.length > 0 ? '1.5px solid #FECACA' : `1.5px solid ${colors.border}`, 
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' 
                            }}>
                                <XCircle size={24} color={missedTasks.length > 0 ? '#991B1B' : colors.textSecondary} />
                                <span style={{ fontSize: '32px', fontWeight: '900', color: missedTasks.length > 0 ? '#991B1B' : colors.textPrimary }}>{missedTasks.length}</span>
                                <span style={{ fontSize: '10px', fontWeight: '800', color: missedTasks.length > 0 ? '#991B1B' : colors.textSecondary, opacity: 0.8, textTransform: 'uppercase' }}>Pending</span>
                            </Card>
                        </div>

                        {/* Categorical Observations */}
                        <Card style={{ padding: '24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                                <Smile size={20} color={colors.primaryBlue} /> 
                                <h3 style={{ fontSize: '16px', fontWeight: '900', color: colors.textPrimary }}>General Status</h3>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {[
                                    { label: 'Speech', status: 'CLEAR', color: colors.primaryGreen },
                                    { label: 'Appetite', status: 'NORMAL', color: colors.primaryGreen },
                                    { label: 'Activity', status: 'STABLE', color: colors.primaryBlue }
                                ].map((item, id) => (
                                    <div key={id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', backgroundColor: '#F8FAFC', borderRadius: '12px', border: `1px solid ${colors.border}` }}>
                                        <span style={{ fontSize: '14px', fontWeight: '700', color: colors.textPrimary }}>{item.label}</span>
                                        <span style={{ fontSize: '12px', fontWeight: '900', color: item.color, backgroundColor: colors.white, padding: '4px 12px', borderRadius: '8px', border: `1px solid ${colors.border}` }}>
                                            {item.status}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </Card>

                        {/* Medication Adherence */}
                        <Card style={{ padding: '24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                                <Pill size={20} color={colors.primaryBlue} /> 
                                <h3 style={{ fontSize: '16px', fontWeight: '900', color: colors.textPrimary }}>Medication Tracker</h3>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {tasks.filter(t => t.category === 'Medication').length > 0 ? (
                                    tasks.filter(t => t.category === 'Medication').map((m, idx) => (
                                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', backgroundColor: '#F8FAFC', borderRadius: '12px', border: `1px solid ${colors.border}` }}>
                                            <div>
                                                <div style={{ fontSize: '14px', fontWeight: '800', color: colors.textPrimary }}>{m.title}</div>
                                                <div style={{ fontSize: '12px', color: colors.textSecondary, fontWeight: '700' }}>{m.time}</div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                {completions[m.id]?.completed ? (
                                                    <CheckCircle2 size={16} color={colors.primaryGreen} />
                                                ) : (
                                                    <XCircle size={16} color={colors.alertRed} />
                                                )}
                                                <span style={{ fontSize: '12px', fontWeight: '900', color: completions[m.id]?.completed ? colors.primaryGreen : colors.alertRed }}>
                                                    {completions[m.id]?.completed ? 'ADMINISTERED' : 'PENDING'}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p style={{ fontSize: '13px', color: colors.textSecondary, textAlign: 'center', padding: '12px' }}>No medication tasks scheduled.</p>
                                )}
                            </div>
                        </Card>

                        {/* Vitals Summary Table */}
                        <Card style={{ padding: '24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                                <Activity size={20} color={colors.primaryBlue} /> 
                                <h3 style={{ fontSize: '16px', fontWeight: '900', color: colors.textPrimary }}>Vitals Trend</h3>
                            </div>
                            {vitals.length === 0 ? (
                                <p style={{ fontSize: '13px', color: colors.textSecondary, textAlign: 'center', padding: '20px' }}>No vitals recorded.</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {vitals.map((v, idx) => (
                                        <div key={idx} style={{ 
                                            display: 'flex', justifyContent: 'space-between', padding: '14px 16px', 
                                            borderBottom: idx !== vitals.length - 1 ? `1px solid ${colors.border}` : 'none' 
                                        }}>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontSize: '14px', fontWeight: '800', color: colors.textPrimary }}>BP: {v.bpSystolic}/{v.bpDiastolic}</span>
                                                <span style={{ fontSize: '12px', fontWeight: '600', color: colors.textSecondary }}>HR: {v.heartRate} bpm</span>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                                <span style={{ fontSize: '14px', fontWeight: '800', color: v.alertTriggered ? colors.alertRed : colors.primaryGreen }}>{v.alertTriggered ? 'Abnormal' : 'Stable'}</span>
                                                <span style={{ fontSize: '11px', fontWeight: '800', color: colors.textSecondary }}>{new Date(v.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Card>

                        {/* Recent Observations */}
                        <Card style={{ padding: '24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                                <Loader2 size={20} color={colors.primaryBlue} /> 
                                <h3 style={{ fontSize: '16px', fontWeight: '900', color: colors.textPrimary }}>Observation Log</h3>
                            </div>
                            {observations.length === 0 ? (
                                <p style={{ fontSize: '13px', color: colors.textSecondary, textAlign: 'center', padding: '20px' }}>No session notes available.</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {observations.map((o, idx) => (
                                        <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '16px', backgroundColor: '#F8FAFC', borderRadius: '12px', border: `1px solid ${colors.border}` }}>
                                            <span style={{ fontSize: '24px' }}>{o.mood ? emMap[o.mood] : '📝'}</span>
                                            <div style={{ flex: 1 }}>
                                                <span style={{ fontSize: '14px', fontWeight: '800', color: o.isCritical ? colors.alertRed : colors.textPrimary }}>
                                                    {o.isCritical ? 'Critical clinical flag' : (o.mood ? `Mood: ${o.mood}` : 'Observation Note')}
                                                </span>
                                                <p style={{ fontSize: '12px', color: colors.textSecondary, marginTop: '4px', fontWeight: '600' }}>
                                                    Clocked at {new Date(o.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Card>
                    </>
                )}
            </div>

            {/* Bottom Button Fixed in Viewport */}
            <div style={{ 
                position: 'fixed', bottom: 0, left: 0, right: 0, 
                backgroundColor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)', 
                padding: '24px 24px calc(24px + env(safe-area-inset-bottom))', 
                borderTop: `1px solid ${colors.border}`, zIndex: 1001, 
                display: 'flex', justifyContent: 'center' 
            }}>
                <div style={{ width: '100%', maxWidth: '440px' }}>
                    <button 
                        onClick={() => setShowConfirm(true)} 
                        disabled={loading}
                        style={{
                            width: '100%', height: '56px', backgroundColor: colors.primaryGreen, color: colors.white,
                            borderRadius: '16px', border: 'none', fontSize: '16px', fontWeight: '900',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
                            boxShadow: `0 8px 24px ${colors.primaryGreen}33`
                        }}
                    >
                        <CheckCircle2 size={24} />
                        RECORD SHIFT HANDOFF
                    </button>
                </div>
            </div>

            {/* Confirmation Modal */}
            {showConfirm && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', animation: 'fadeIn 0.2s' }}>
                    <div style={{ backgroundColor: colors.white, width: '100%', maxWidth: '360px', borderRadius: '16px', padding: '32px', animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
                        <h3 style={{ fontSize: '20px', fontWeight: '900', marginBottom: '16px', textAlign: 'center' }}>End Session?</h3>
                        <p style={{ fontSize: '14px', color: colors.textSecondary, textAlign: 'center', marginBottom: '32px', lineHeight: '1.6', fontWeight: '600' }}>
                            Are you ready to finalize this shift record? All logged vitals and activities will be summarized for the clinical team.
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <button
                                onClick={handleEndShift}
                                disabled={ending}
                                style={{
                                    width: '100%', height: '56px', backgroundColor: colors.alertRed, color: colors.white,
                                    fontSize: '16px', fontWeight: '900', borderRadius: '12px', border: 'none', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 8px 24px ${colors.alertRed}22`
                                }}
                            >
                                {ending ? <Loader2 size={24} className="spinner" /> : "YES, FINALIZE SHIFT"}
                            </button>
                            <button 
                                onClick={() => setShowConfirm(false)} 
                                disabled={ending}
                                style={{ background: 'none', border: 'none', color: colors.textSecondary, fontWeight: '800', fontSize: '14px', padding: '12px', cursor: 'pointer' }}
                            >
                                CANCEL
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .spinner { animation: spin 1s linear infinite; }
                @keyframes spin { 100% { transform: rotate(360deg); } }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            `}</style>
        </div>
    );
}
