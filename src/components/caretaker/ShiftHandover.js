import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../context/AuthContext';
import { collection, query, where, getDocs, updateDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { getTodayDateString } from '../../utils/dateHelpers';
import TopHeader from '../common/TopHeader';
import PrimaryButton from '../common/PrimaryButton';
import SecondaryButton from '../common/SecondaryButton';
import DangerButton from '../common/DangerButton';
import Card from '../common/Card';
import SkeletonCard from '../common/SkeletonCard';
import { colors } from '../../styles/colors';
import { spacing } from '../../styles/spacing';
import { CheckCircle2, XCircle, HeartPulse, Smile, Loader2 } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function ShiftHandover() {
    const navigate = useNavigate();
    const { user, patientId, logout } = useAuthContext();

    const [loading, setLoading] = useState(true);
    const [caretakerName, setCaretakerName] = useState('');
    const [dailyLog, setDailyLog] = useState(null);
    const [showConfirm, setShowConfirm] = useState(false);
    const [ending, setEnding] = useState(false);

    useEffect(() => {
        const fetchHandoverData = async () => {
            if (!user || !patientId) return;
            try {
                // Get name
                const uDoc = await getDoc(doc(db, 'users', user.uid));
                if (uDoc.exists()) setCaretakerName(uDoc.data().name || 'Caretaker');

                // Get log
                const q = query(collection(db, 'dailyLogs'), where('patientId', '==', patientId), where('date', '==', getTodayDateString()));
                const snap = await getDocs(q);
                if (!snap.empty) {
                    setDailyLog(snap.docs[0].data());
                } else {
                    setDailyLog({ tasks: [], vitals: [], observations: [], careScore: 0 });
                }
            } catch (err) {
                console.error(err);
            }
            setLoading(false);
        };
        fetchHandoverData();
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

    // Derive mapped elements
    const completedTasks = dailyLog?.tasks?.filter(t => t.status === 'Completed') || [];
    const missedTasks = dailyLog?.tasks?.filter(t => t.status !== 'Completed') || [];

    const vitals = dailyLog?.vitals || [];
    const observations = dailyLog?.observations || [];

    const emMap = { "Very Sad": '😫', "Sad": '😔', "Neutral": '😐', "Happy": '🙂', "Very Happy": '😄' };

    return (
        <div style={{ backgroundColor: colors.background, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <TopHeader title="Shift Handover" showBack onBack={() => navigate(-1)} />

            <div style={{ padding: spacing.pagePadding, flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '90px' }}>
                {loading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <SkeletonCard style={{ height: '80px' }} />
                        <SkeletonCard style={{ height: '240px' }} />
                        <SkeletonCard style={{ height: '180px' }} />
                    </div>
                ) : (
                    <>
                        {/* Summary Header */}
                        <Card style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '16px' }}>
                            <span style={{ fontSize: '16px', fontWeight: '600', color: colors.textPrimary }}>Today's Shift</span>
                            <span style={{ fontSize: '14px', color: colors.textSecondary }}>Caretaker: {caretakerName}</span>
                            <span style={{ fontSize: '12px', color: colors.textSecondary }}>Date: {new Date().toLocaleDateString()}</span>
                        </Card>

                        {/* Care Score Gauge */}
                        <Card style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 16px' }}>
                            <span style={{ fontSize: '14px', fontWeight: '600', color: colors.textPrimary, marginBottom: '8px' }}>Care Score</span>
                            <div style={{ position: 'relative', width: '160px', height: '160px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={scoreData}
                                            cx="50%" cy="50%" innerRadius={65} outerRadius={80}
                                            startAngle={225} endAngle={-45} stroke="none" cornerRadius={12}
                                            dataKey="value"
                                        >
                                            {scoreData.map((e, index) => <Cell key={index} fill={e.color} />)}
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <span style={{ fontSize: '36px', fontWeight: '700', color: getScoreColor(dailyLog?.careScore) }}>{dailyLog?.careScore || 0}</span>
                                </div>
                            </div>
                        </Card>

                        {/* Completed Tasks */}
                        {completedTasks.length > 0 && (
                            <Card style={{ padding: '16px' }}>
                                <span style={{ fontSize: '14px', fontWeight: '600', color: colors.primaryGreen, marginBottom: '12px', display: 'block' }}>Completed Tasks</span>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {completedTasks.map((t, idx) => (
                                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <CheckCircle2 size={16} color={colors.primaryGreen} />
                                            <span style={{ fontSize: '14px', color: colors.textPrimary }}>{t.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        )}

                        {/* Missed Tasks */}
                        {missedTasks.length > 0 && (
                            <Card style={{ padding: '16px' }}>
                                <span style={{ fontSize: '14px', fontWeight: '600', color: colors.alertRed, marginBottom: '12px', display: 'block' }}>Missed / Pending Tasks</span>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {missedTasks.map((t, idx) => (
                                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <XCircle size={16} color={colors.alertRed} />
                                            <span style={{ fontSize: '14px', color: colors.textPrimary }}>{t.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        )}

                        {/* Vitals Summary */}
                        <Card style={{ padding: '16px' }}>
                            <span style={{ fontSize: '14px', fontWeight: '600', color: colors.textPrimary, marginBottom: '12px', display: 'block' }}>Vitals Logged</span>
                            {vitals.length === 0 ? (
                                <span style={{ fontSize: '14px', color: colors.textSecondary }}>No vitals recorded today.</span>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {vitals.map((v, idx) => (
                                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: idx !== vitals.length - 1 ? `1px solid ${colors.border}` : 'none', paddingBottom: '8px', marginBottom: '4px' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontSize: '14px', fontWeight: '500', color: colors.textPrimary }}>BP: {v.bpSystolic}/{v.bpDiastolic}</span>
                                                <span style={{ fontSize: '12px', color: colors.textSecondary }}>{new Date(v.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                                <span style={{ fontSize: '14px', color: v.alertTriggered ? colors.alertRed : colors.primaryGreen }}>{v.alertTriggered ? 'Abnormal' : 'Normal'}</span>
                                                <span style={{ fontSize: '12px', color: colors.textSecondary }}>HR: {v.heartRate} | Temp: {v.temperature}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Card>

                        {/* Observations Summary */}
                        <Card style={{ padding: '16px' }}>
                            <span style={{ fontSize: '14px', fontWeight: '600', color: colors.textPrimary, marginBottom: '12px', display: 'block' }}>Observations Logged</span>
                            {observations.length === 0 ? (
                                <span style={{ fontSize: '14px', color: colors.textSecondary }}>No observations recorded today.</span>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {observations.map((o, idx) => (
                                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <span style={{ fontSize: '24px' }}>{o.mood ? emMap[o.mood] : '📝'}</span>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontSize: '14px', color: o.isCritical ? colors.alertRed : colors.textPrimary, fontWeight: o.isCritical ? '600' : '400' }}>
                                                    {o.isCritical ? 'Critical Warning Flagged' : (o.mood ? `Mood: ${o.mood}` : 'Audio Note Logged')}
                                                </span>
                                                <span style={{ fontSize: '12px', color: colors.textSecondary }}>{new Date(o.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Card>

                    </>
                )}
            </div>

            {/* Bottom Button Always Visible */}
            <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, backgroundColor: colors.white, padding: '16px', borderTop: `1px solid ${colors.border}`, zIndex: 10 }}>
                <div style={{ width: '100%', maxWidth: '430px', margin: '0 auto' }}>
                    <DangerButton label="End Shift" onClick={() => setShowConfirm(true)} disabled={loading} />
                </div>
            </div>

            {/* Confirmation Dialog */}
            {showConfirm && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: spacing.pagePadding, animation: 'fadeIn 0.2s' }}>
                    <div style={{ backgroundColor: colors.white, width: '100%', maxWidth: '340px', borderRadius: spacing.borderRadius.card, padding: '24px', animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px', textAlign: 'center' }}>End Shift?</h3>
                        <p style={{ fontSize: '14px', color: colors.textSecondary, textAlign: 'center', marginBottom: '24px', lineHeight: '1.5' }}>
                            Are you sure you want to end your shift? The next caretaker will see this summary.
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <button
                                onClick={handleEndShift}
                                disabled={ending}
                                style={{
                                    width: '100%', height: '52px', backgroundColor: colors.alertRed, color: colors.white,
                                    fontSize: '16px', fontWeight: '600', borderRadius: spacing.borderRadius.button, border: 'none', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}
                            >
                                {ending ? <Loader2 size={24} className="spinner" /> : "Confirm End Shift"}
                                <style>{`.spinner { animation: spin 1s linear infinite; } @keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
                            </button>
                            <SecondaryButton label="Cancel" onClick={() => setShowConfirm(false)} disabled={ending} />
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            `}</style>
        </div>
    );
}
