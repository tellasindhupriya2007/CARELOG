import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../context/AuthContext';
import { collection, query, where, onSnapshot, getDoc, doc, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { getTodayDateString } from '../../utils/dateHelpers';
import { calculateAndSaveCareScore } from '../../utils/careScoreCalculator';
import { listenToPatientAlerts } from '../../utils/realtimeAlerts';
import TopHeader from '../common/TopHeader';
import SkeletonCard from '../common/SkeletonCard';
import ErrorCard from '../common/ErrorCard';
import FamilyBottomNav from '../common/FamilyBottomNav';
import Sidebar from '../common/Sidebar';
import { colors } from '../../styles/colors';
import { typography } from '../../styles/typography';
import { spacing } from '../../styles/spacing';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Bell, Pill, HeartPulse, Smile, AlertTriangle, FileText } from 'lucide-react';

export default function FamilyDashboard() {
    const navigate = useNavigate();
    const { user, patientId, setPatientId } = useAuthContext();

    const [loading, setLoading] = useState(true);
    const [patientName, setPatientName] = useState('');
    const [data, setData] = useState(null);
    const [alerts, setAlerts] = useState([]);
    const [error, setError] = useState(null);

    // 1. Fetch patient
    useEffect(() => {
        if (!user) return;
        const fetchPatient = async () => {
            try {
                let pId = patientId;
                if (!pId) {
                    // Find family's patient
                    const q = query(collection(db, 'patients'), where('familyId', '==', user.uid));
                    const unsub = onSnapshot(q, (snap) => {
                        if (!snap.empty) {
                            const pDoc = snap.docs[0];
                            setPatientId(pDoc.id);
                            setPatientName(pDoc.data().name);
                        } else {
                            setError("No patient profile found. Please complete setup.");
                            setLoading(false);
                        }
                    });
                    return () => unsub();
                } else {
                    const pDoc = await getDoc(doc(db, 'patients', pId));
                    if (pDoc.exists()) setPatientName(pDoc.data().name);
                }
            } catch (err) {
                console.error(err);
                setError("Error fetching patient.");
                setLoading(false);
            }
        };
        fetchPatient();
    }, [user, patientId, setPatientId]);

    // 2. Fetch dailyLogs and alerts
    useEffect(() => {
        if (!patientId) return;
        setLoading(true);
        const todayString = getTodayDateString();

        // Calculate and sync Care Score automatically
        calculateAndSaveCareScore(patientId, todayString);

        // Logs listener
        const logsQuery = query(collection(db, 'dailyLogs'), where('patientId', '==', patientId), where('date', '==', todayString));
        const unsubLogs = onSnapshot(logsQuery, (snapshot) => {
            if (!snapshot.empty) {
                setData(snapshot.docs[0].data());
            } else {
                setData({ careScore: 0, tasks: [], completedTasks: 0, totalTasks: 0, vitals: [], observations: [] });
            }
            setLoading(false);
        });

        // External Hook Real-time Alerts Listener
        const unsubAlerts = listenToPatientAlerts(patientId, (activeAlerts) => {
            setAlerts(activeAlerts.slice(0, 5));
        });

        return () => {
            unsubLogs();
            unsubAlerts();
        };
    }, [patientId]);

    const getScoreColor = (score) => {
        if (score >= 8) return colors.primaryGreen;
        if (score >= 5) return colors.alertYellow;
        return colors.alertRed;
    };

    const scoreData = data ? [
        { name: 'Score', value: data.careScore || 0, color: getScoreColor(data.careScore) },
        { name: 'Remaining', value: Math.max(0, 10 - (data.careScore || 0)), color: colors.border }
    ] : [];

    const unreadAlertsCount = alerts.length;
    const hasAlertToday = alerts.length > 0;

    // Process data for Summary Cards
    const totalMeds = data?.tasks?.filter(t => t.icon === 'Pill')?.length || 0;
    const completedMeds = data?.tasks?.filter(t => t.icon === 'Pill' && t.status === 'Completed')?.length || 0;

    const hasVitalsAlert = data?.vitals?.some(v => v.alertTriggered);
    const vitalsText = data?.vitals?.length > 0 ? (hasVitalsAlert ? "Alert" : "Normal") : "No Data";
    const vitalsColor = data?.vitals?.length > 0 ? (hasVitalsAlert ? colors.alertRed : colors.primaryGreen) : colors.textSecondary;

    const getMoodEmoji = () => {
        if (!data?.observations || data.observations.length === 0) return "--";
        const lastObs = data.observations[data.observations.length - 1];
        const emMap = { "Very Sad": '😫', "Sad": '😔', "Neutral": '😐', "Happy": '🙂', "Very Happy": '😄' };
        return emMap[lastObs.mood] || "--";
    };

    // Compile specific Activity Timeline from tasks and observations/vitals
    const buildTimeline = () => {
        if (!data) return [];
        const activities = [];

        data.tasks?.forEach(t => {
            if (t.status === 'Completed' && t.completedAt) {
                activities.push({
                    id: t.taskId, text: `Completed: ${t.name}`,
                    timeStr: new Date(t.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    timestamp: new Date(t.completedAt).getTime(),
                    type: 'success', caretaker: 'Caretaker'
                });
            }
        });

        data.observations?.forEach((obs, i) => {
            activities.push({
                id: `obs-${i}`, text: obs.isCritical ? "Critical Observation" : "Logged Observation",
                timeStr: new Date(obs.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                timestamp: new Date(obs.recordedAt).getTime(),
                type: obs.isCritical ? 'alert' : 'success', caretaker: obs.caretakerName || 'Caretaker'
            });
        });

        data.vitals?.forEach((v, i) => {
            activities.push({
                id: `vit-${i}`, text: v.alertTriggered ? "Abnormal Vitals" : "Vitals Recorded",
                timeStr: new Date(v.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                timestamp: new Date(v.recordedAt).getTime(),
                type: v.alertTriggered ? 'alert' : 'success', caretaker: 'Caretaker'
            });
        });

        return activities.sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);
    };
    const timeline = buildTimeline();

    const sidebarItems = [
        { icon: 'Home', label: 'Dashboard', path: '/family/dashboard' },
        { icon: 'FileText', label: 'Reports', path: '/family/report' },
        { icon: 'Pill', label: 'Prescriptions', path: '/family/prescriptions' },
        { icon: 'Bell', label: 'Alerts', path: '/family/alerts' }
    ];

    const renderAlertBanner = () => {
        if (hasAlertToday) {
            return (
                <div
                    onClick={() => navigate('/family/alerts', { state: { alert: alerts[0] } })}
                    style={{
                        backgroundColor: colors.alertRed, color: colors.white, padding: '16px', borderRadius: spacing.borderRadius.card,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer',
                        animation: 'pulse 2s infinite', boxShadow: spacing.shadows.button, width: '100%', marginBottom: '16px'
                    }}
                >
                    <AlertTriangle size={20} color={colors.white} />
                    <span style={{ fontSize: '14px', fontWeight: '700' }}>Alert triggered - Tap to view</span>
                    <style>{`@keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.02); } 100% { transform: scale(1); } }`}</style>
                </div>
            );
        }
        return (
            <div style={{ backgroundColor: colors.successGreen, color: colors.primaryGreen, padding: '16px', borderRadius: spacing.borderRadius.card, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', marginBottom: '16px' }}>
                <span style={{ fontSize: '14px', fontWeight: '700' }}>All clear today</span>
            </div>
        );
    };

    return (
        <div className="desktop-layout" style={{ backgroundColor: colors.background, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <Sidebar navItems={sidebarItems} />
            <div className="desktop-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0 }}>


                <TopHeader
                    title={patientName || "Loading..."}
                    rightIcon={
                        <div style={{ position: 'relative' }} onClick={() => navigate('/family/alerts')}>
                            <Bell size={24} color={colors.textPrimary} />
                            {unreadAlertsCount > 0 && (
                                <span style={{
                                    position: 'absolute', top: '-4px', right: '-4px', backgroundColor: colors.alertRed, color: colors.white,
                                    fontSize: '10px', fontWeight: 'bold', width: '16px', height: '16px', borderRadius: '50%', display: 'flex',
                                    alignItems: 'center', justifyContent: 'center'
                                }}>
                                    {unreadAlertsCount}
                                </span>
                            )}
                        </div>
                    }
                />

                <div style={{ padding: spacing.pagePadding, flex: 1, overflowY: 'auto' }}>

                    {error ? (
                        <ErrorCard message={error} />
                    ) : loading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <SkeletonCard style={{ height: '240px' }} />
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <SkeletonCard style={{ flex: 1, height: '100px' }} />
                                <SkeletonCard style={{ flex: 1, height: '100px' }} />
                                <SkeletonCard style={{ flex: 1, height: '100px' }} />
                            </div>
                            <SkeletonCard style={{ height: '200px' }} />
                        </div>
                    ) : (
                        <div className="family-grid">

                            {/* LEFT COLUMN */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                {/* Care Score Gauge */}
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '8px' }}>
                                    <span style={{ fontSize: '12px', color: colors.textSecondary, marginBottom: '-8px', zIndex: 1 }}>Today</span>
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
                                            <span style={{ fontSize: '36px', fontWeight: '700', color: getScoreColor(data?.careScore) }}>{data?.careScore || 0}</span>
                                            <span style={{ fontSize: '12px', color: colors.textSecondary }}>Care Score</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Three Summary Cards */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                                    <div style={{ flex: 1, backgroundColor: colors.white, borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: spacing.shadows.card }}>
                                        <div style={{ backgroundColor: colors.lightBlue, width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                                            <Pill size={18} color={colors.primaryBlue} />
                                        </div>
                                        <span style={{ fontSize: '12px', color: colors.textSecondary, marginBottom: '2px' }}>Medicines</span>
                                        <span style={{ fontSize: '14px', fontWeight: '600', color: completedMeds === totalMeds && totalMeds > 0 ? colors.primaryGreen : colors.textPrimary }}>{completedMeds}/{totalMeds}</span>
                                    </div>
                                    <div style={{ flex: 1, backgroundColor: colors.white, borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: spacing.shadows.card }}>
                                        <div style={{ backgroundColor: colors.lightGreen, width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                                            <HeartPulse size={18} color={colors.primaryGreen} />
                                        </div>
                                        <span style={{ fontSize: '12px', color: colors.textSecondary, marginBottom: '2px' }}>Vitals</span>
                                        <span style={{ fontSize: '14px', fontWeight: '600', color: vitalsColor }}>{vitalsText}</span>
                                    </div>
                                    <div style={{ flex: 1, backgroundColor: colors.white, borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: spacing.shadows.card }}>
                                        <div style={{ backgroundColor: colors.lightOrange, width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                                            <Smile size={18} color={colors.alertOrange} />
                                        </div>
                                        <span style={{ fontSize: '12px', color: colors.textSecondary, marginBottom: '2px' }}>Mood</span>
                                        <span style={{ fontSize: '18px', fontWeight: '600' }}>{getMoodEmoji()}</span>
                                    </div>
                                </div>
                            </div>

                            {/* MIDDLE COLUMN */}
                            <div>
                                {/* Activity Timeline */}
                                <div>
                                    <h3 style={{ fontSize: '16px', fontWeight: '600', color: colors.textPrimary, marginBottom: '16px' }}>Today's Activity</h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        {timeline.length === 0 ? (
                                            <span style={{ fontSize: '14px', color: colors.textSecondary }}>No activities recorded today yet.</span>
                                        ) : (
                                            timeline.map((act) => (
                                                <div key={act.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                                                    <div style={{ marginTop: '6px', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: act.type === 'alert' ? colors.alertRed : colors.primaryGreen }} />
                                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                                        <span style={{ fontSize: '14px', color: colors.textPrimary }}>{act.text}</span>
                                                        <span style={{ fontSize: '12px', color: colors.textSecondary }}>{act.caretaker}</span>
                                                    </div>
                                                    <span style={{ fontSize: '12px', color: colors.textSecondary }}>{act.timeStr}</span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT COLUMN (Desktop Only) */}
                            <div className="desktop-only" style={{ flexDirection: 'column' }}>
                                {renderAlertBanner()}

                                <div style={{ backgroundColor: colors.white, padding: '20px', borderRadius: '12px', boxShadow: spacing.shadows.card, cursor: 'pointer' }} onClick={() => navigate('/family/report')}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                                        <div style={{ backgroundColor: colors.lightBlue, padding: '8px', borderRadius: '8px' }}>
                                            <FileText size={20} color={colors.primaryBlue} />
                                        </div>
                                        <span style={{ fontSize: '16px', fontWeight: '600', color: colors.textPrimary }}>Weekly Report Snapshot</span>
                                    </div>
                                    <span style={{ fontSize: '14px', color: colors.textSecondary }}>
                                        A quick summary of this week's compliance and averages is available. Click to view detailed analysis.
                                    </span>
                                </div>
                            </div>

                        </div>
                    )}
                </div>

                {/* Bottom Banner positioned above BottomNav (Mobile Only) */}
                <div className="mobile-only" style={{ padding: '0 16px', marginBottom: '16px' }}>
                    {renderAlertBanner()}
                </div>

                <div className="mobile-only">
                    <FamilyBottomNav />
                </div>
            </div>
        </div>
    );
}
