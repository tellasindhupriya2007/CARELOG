import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../context/AuthContext';
import { collection, query, where, onSnapshot, getDoc, getDocs, updateDoc, doc, setDoc, serverTimestamp, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { getTodayDateString } from '../../utils/dateHelpers';
import { calculateAndSaveCareScore } from '../../utils/careScoreCalculator';
import { generatePatientId } from '../../utils/idGenerator';
import { listenToAlerts } from '../../services/alertService';
import ScreenHeader from '../../components/common/ScreenHeader';
import SkeletonCard from '../common/SkeletonCard';
import ErrorCard from '../common/ErrorCard';
import FamilyBottomNav from '../common/FamilyBottomNav';
import Sidebar from '../common/Sidebar';
import { colors } from '../../styles/colors';
import { typography } from '../../styles/typography';
import { spacing } from '../../styles/spacing';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { 
    Bell, Pill, HeartPulse, Smile, AlertTriangle, Info, 
    FileText, ChevronRight, Mic, Camera, Users, User, 
    Home, MessageSquare, LogOut, ShieldAlert 
} from 'lucide-react';
import TaskManager from './TaskManager';
import { generateWeeklyReport } from '../../services/reportService';
import { createDefaultWorkflow } from '../../services/taskService';

const LucideIcons = { 
    Bell, Pill, HeartPulse, Smile, AlertTriangle, Info, 
    FileText, ChevronRight, Mic, Camera, Users, User, 
    Home, MessageSquare, LogOut, ShieldAlert 
};

export default function FamilyDashboard() {
    const navigate = useNavigate();
    const { user, patientId, setPatientId } = useAuthContext();

    const [loading, setLoading] = useState(true);
    const [patientName, setPatientName] = useState('');
    const [patientHumanId, setPatientHumanId] = useState('');
    const [patientData, setPatientData] = useState(null);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [data, setData] = useState(null);
    const [alerts, setAlerts] = useState([]);
    const [error, setError] = useState(null);
    const [creating, setCreating] = useState(false);
    const [previewUrl, setPreviewUrl] = useState(null);

    // 1. Fetch patient
    useEffect(() => {
        if (!user) return;
        const fetchPatient = async () => {
            try {
                let pId = patientId;
                if (!pId) {
                    // Try to find if user is familyId of any patient
                    const q = query(collection(db, 'patients'), where('familyId', '==', user.uid));
                    const unsub = onSnapshot(q, (snap) => {
                        if (!snap.empty) {
                            const pDoc = snap.docs[0];
                            const pData = pDoc.data();
                            setPatientId(pDoc.id);
                            setPatientName(pData.name);
                            setPatientHumanId(pData.patientId || '');
                        } else {
                            // If user is a returning family but case not setup yet, we handle setup UI later
                            setLoading(false);
                        }
                    });
                    return () => unsub();
                } else {
                    const pDoc = await getDoc(doc(db, 'patients', pId));
                    if (pDoc.exists()) {
                        const pData = pDoc.data();
                        setPatientName(pData.name);
                        setPatientHumanId(pData.patientId || '');
                        setPatientData(pData);
                    }
                }
            } catch (err) {
                console.error(err);
                setError("Error fetching patient.");
                setLoading(false);
            }
        };
        fetchPatient();
    }, [user, patientId, setPatientId]);

    const handleCreateProfile = async (name) => {
        if (!name) return;
        setCreating(true);
        try {
            const hId = generatePatientId();
            const newPatRef = doc(collection(db, 'patients'));
            await setDoc(newPatRef, {
                name: name,
                patientId: hId,
                familyId: user.uid,
                caretakerIds: [],
                healthDetails: {},
                createdAt: serverTimestamp()
            });

            await setDoc(doc(db, 'users', user.uid), { 
                assignedPatientId: newPatRef.id,
                role: 'family' 
            }, { merge: true });

            await createDefaultWorkflow(newPatRef.id);
            setPatientId(newPatRef.id);
            setPatientName(name);
            setPatientHumanId(hId);
        } catch (e) {
            console.error(e);
            alert("Failed to create profile.");
        }
        setCreating(false);
    };

    const handleLinkProfile = async (humanId) => {
        if (!humanId) return;
        setCreating(true);
        try {
            const q = query(collection(db, 'patients'), where('patientId', '==', humanId.trim().toUpperCase()));
            const snap = await getDocs(q);
            if (snap.empty) {
                alert("Patient ID not found.");
            } else {
                const pDoc = snap.docs[0];
                const pId = pDoc.id;
                
                await updateDoc(doc(db, 'patients', pId), { familyId: user.uid });
                await setDoc(doc(db, 'users', user.uid), { assignedPatientId: pId, role: 'family' }, { merge: true });
                
                setPatientId(pId);
                setPatientName(pDoc.data().name);
                setPatientHumanId(pDoc.data().patientId);
            }
        } catch (e) {
            console.error(e);
            alert("Failed to link profile.");
        }
        setCreating(false);
    };

    const [setupMode, setSetupMode] = useState('create'); // 'create' or 'link'
    const [setupInput, setSetupInput] = useState('');

    // 2. Fetch dailyLogs and alerts
    useEffect(() => {
        if (!patientId) return;
        setLoading(true);
        const todayString = getTodayDateString();

        // Calculate and sync Care Score automatically
        calculateAndSaveCareScore(patientId, todayString);

        // External Hook Real-time Alerts Listener
        const unsubAlerts = listenToAlerts(patientId, (fetchedAlerts) => {
            // Keep only unread active alerts or top 2
            const active = fetchedAlerts.filter(a => !a.isRead);
            setAlerts(active);
        });

        const { subscribeToTasks } = require('../../services/taskService');
        
        let loadedTasks = [];
        let loadedCompletions = {};
        let loadedVitals = [];
        let loadedObservations = [];

        const unsubTasks = subscribeToTasks(patientId, (allTasks) => {
            loadedTasks = allTasks;
            updateLocalData();
        });

        const qLogs = query(collection(db, 'dailyLogs'), where('patientId', '==', patientId), where('date', '==', todayString));
        const unsubLogs = onSnapshot(qLogs, (snap) => {
            if (!snap.empty) {
                const logData = snap.docs[0].data();
                loadedCompletions = logData.completions || {};
                loadedVitals = logData.vitals || [];
                loadedObservations = logData.observations || [];
            } else {
                loadedCompletions = {};
                loadedVitals = [];
                loadedObservations = [];
            }
            updateLocalData();
        });

        const updateLocalData = () => {
            const completedCount = Object.keys(loadedCompletions).length;
            const totalCount = loadedTasks.length;
            const taskScore = totalCount > 0 ? (completedCount / totalCount) * 5 : 0;
            const finalScore = Number((taskScore + 3 + 2).toFixed(1)); // Assuming perfect vitals/obs for now
            
            // Map completions back to tasks for timeline rendering
            const mappedTasks = loadedTasks.map(t => ({
                ...t,
                taskId: t.id,
                name: t.title,
                status: loadedCompletions[t.id]?.completed ? 'Completed' : 'Pending',
                completedAt: loadedCompletions[t.id]?.completedAt
            }));

            setData(prev => ({
                ...prev,
                careScore: finalScore,
                tasks: mappedTasks,
                completedTasks: completedCount,
                totalTasks: totalCount,
                vitals: loadedVitals,
                observations: loadedObservations 
            }));
            setLoading(false);
        };

        return () => {
            unsubAlerts();
            unsubTasks();
            unsubLogs();
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
    const totalMeds = data?.tasks?.filter(t => t.category === 'Medication')?.length || 0;
    const completedMeds = data?.tasks?.filter(t => t.category === 'Medication' && t.status === 'Completed')?.length || 0;

    const hasVitalsAlert = data?.vitals?.some(v => v.alertTriggered);
    const vitalsText = data?.vitals?.length > 0 ? (hasVitalsAlert ? "Alert" : "Normal") : "No Data";
    const vitalsColor = data?.vitals?.length > 0 ? (hasVitalsAlert ? colors.alertRed : colors.primaryGreen) : colors.textSecondary;

    const getMoodEmoji = () => {
        if (!data?.observations || data.observations.length === 0) return "--";
        const lastObs = data.observations[data.observations.length - 1];
        const emMap = { "Very Low": '😫', "Low": '😔', "Neutral": '😐', "Good": '🙂', "Excellent": '😄' };
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
                id: `obs-${i}`, 
                text: obs.isCritical ? "Critical Observation" : "Logged Observation",
                timeStr: new Date(obs.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                timestamp: new Date(obs.recordedAt).getTime(),
                type: obs.isCritical ? 'alert' : 'success', 
                caretaker: obs.caretakerName || 'Caretaker',
                hasVoice: obs.hasVoice,
                hasImage: obs.hasImage
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
        { icon: 'Home', label: 'Dashboard', onClick: () => setActiveTab('dashboard'), active: activeTab === 'dashboard' },
        { icon: 'User', label: 'Patient Profile', onClick: () => setActiveTab('profile'), active: activeTab === 'profile' },
        { icon: 'FileText', label: 'Reports', path: '/family/report' },
        { icon: 'Pill', label: 'Prescriptions', path: '/family/prescriptions' },
        { icon: 'Bell', label: 'Alerts', path: '/family/alerts' },
        { icon: 'MessageSquare', label: 'Messages', path: '/family/messages' }
    ];

    const renderAlertBanner = () => {
        if (hasAlertToday) {
            const displayAlerts = alerts.slice(0, 2);
            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px', width: '100%' }}>
                    {displayAlerts.map(alert => {
                        const isRed = alert.type === 'critical';
                        const isYellow = alert.type === 'warning';
                        return (
                            <div
                                key={alert.id}
                                onClick={() => navigate('/family/alerts')}
                                style={{
                                    backgroundColor: isRed ? colors.alertRed : (isYellow ? '#F59E0B' : colors.white),
                                    color: (isRed || isYellow) ? colors.white : colors.textPrimary,
                                    padding: '16px', borderRadius: spacing.borderRadius.card,
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', cursor: 'pointer',
                                    boxShadow: spacing.shadows.card, border: (!isRed && !isYellow) ? `1px solid ${colors.border}` : 'none'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    {(isRed || isYellow) ? <AlertTriangle size={20} color={colors.white} /> : 
                                     <Info size={20} color={colors.primaryBlue} />}
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontSize: '14px', fontWeight: '700', lineHeight: '1.3' }}>{alert.message}</span>
                                        <span style={{ fontSize: '11px', opacity: 0.8, marginTop: '2px', textTransform: 'uppercase' }}>
                                            {alert.source ? alert.source : 'SYSTEM'} ALERT
                                        </span>
                                    </div>
                                </div>
                                <ChevronRight size={20} opacity={0.6} />
                            </div>
                        );
                    })}
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
            <div className="sidebar">
                {/* Logo */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px', paddingLeft: '8px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: colors.primaryBlue, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ color: colors.white, fontWeight: 'bold', fontSize: '18px' }}>C</span>
                    </div>
                    <span style={{ fontSize: '20px', fontWeight: 'bold', color: colors.primaryBlue }}>CareLog</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {sidebarItems.map((item, index) => {
                        const bg = item.active ? '#EFF6FF' : 'transparent';
                        const color = item.active ? colors.primaryBlue : colors.textSecondary;
                        const Icon = LucideIcons[item.icon];
                        return (
                            <div key={index} onClick={item.onClick || (() => navigate(item.path))} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '8px', backgroundColor: bg, cursor: 'pointer', transition: 'all 0.2s', minHeight: '44px' }}>
                                {Icon && <Icon size={20} color={color} />}
                                <span style={{ fontSize: '15px', color: color, fontWeight: item.active ? '600' : '500' }}>{item.label}</span>
                            </div>
                        );
                    })}
                </div>

                <div style={{ marginTop: 'auto', borderTop: `1px solid ${colors.border}`, paddingTop: '16px' }}>
                    <div onClick={() => navigate('/auth/splash')} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '8px', cursor: 'pointer', color: colors.alertRed }}>
                        <LucideIcons.LogOut size={20} color={colors.alertRed} />
                        <span style={{ fontSize: '15px', fontWeight: '600' }}>Log Out</span>
                    </div>
                </div>
            </div>
            <div className="desktop-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0 }}>


                <ScreenHeader
                    title="Good Morning,"
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

                <div className="main-content scroll-y" style={{ padding: spacing.pagePadding }}>

                    {error ? (
                        <ErrorCard message={error} />
                    ) : !patientId && !loading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '24px' }}>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ width: '64px', height: '64px', borderRadius: '20px', backgroundColor: colors.lightBlue, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                                    <Users size={32} color={colors.primaryBlue} />
                                </div>
                                <h1 style={{ fontSize: '28px', fontWeight: '900', color: colors.textPrimary, margin: '0 0 8px', letterSpacing: '-0.5px' }}>Patient Setup</h1>
                                <p style={{ fontSize: '15px', color: colors.textSecondary, maxWidth: '400px', margin: '0 auto' }}>
                                    {setupMode === 'create' ? 'Start fresh with a new clinical care profile.' : 'Connect to a profile already created by your doctor.'}
                                </p>
                            </div>

                            <div style={{ display: 'flex', backgroundColor: colors.white, padding: '4px', borderRadius: '12px', border: `1px solid ${colors.border}`, marginBottom: '12px' }}>
                                <button onClick={() => { setSetupMode('create'); setSetupInput(''); }} style={{ padding: '10px 24px', borderRadius: '10px', border: 'none', backgroundColor: setupMode === 'create' ? colors.primaryBlue : 'transparent', color: setupMode === 'create' ? 'white' : colors.textSecondary, fontSize: '14px', fontWeight: '800', cursor: 'pointer' }}>Create New</button>
                                <button onClick={() => { setSetupMode('link'); setSetupInput(''); }} style={{ padding: '10px 24px', borderRadius: '10px', border: 'none', backgroundColor: setupMode === 'link' ? colors.primaryBlue : 'transparent', color: setupMode === 'link' ? 'white' : colors.textSecondary, fontSize: '14px', fontWeight: '800', cursor: 'pointer' }}>Link via ID</button>
                            </div>

                            <div style={{ width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <input 
                                    type="text" 
                                    placeholder={setupMode === 'create' ? "Patient's Full Name" : "CL-YYYY-XXXX"}
                                    value={setupInput}
                                    onChange={(e) => setSetupInput(setupMode === 'link' ? e.target.value.toUpperCase() : e.target.value)}
                                    style={{ width: '100%', padding: '16px', borderRadius: '14px', border: `2.5px solid ${colors.border}`, fontSize: '16px', fontWeight: '700', boxSizing: 'border-box' }}
                                />
                                <button 
                                    onClick={() => setupMode === 'create' ? handleCreateProfile(setupInput) : handleLinkProfile(setupInput)}
                                    disabled={creating}
                                    style={{ width: '100%', padding: '18px', backgroundColor: colors.primaryBlue, color: 'white', border: 'none', borderRadius: '14px', fontWeight: '900', cursor: 'pointer', fontSize: '16px', boxShadow: `0 8px 16px ${colors.primaryBlue}30` }}
                                >
                                    {creating ? 'Processing...' : (setupMode === 'create' ? 'Generate Profile' : 'Verify & Link')}
                                </button>
                            </div>
                        </div>
                    ) : loading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <SkeletonCard style={{ height: '140px' }} />
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <SkeletonCard style={{ flex: 1, height: '80px' }} />
                                <SkeletonCard style={{ flex: 1, height: '80px' }} />
                                <SkeletonCard style={{ flex: 1, height: '80px' }} />
                            </div>
                            <SkeletonCard style={{ height: '300px' }} />
                        </div>
                    ) : (
                        <div className="dashboard-structure" style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%', maxWidth: '840px', margin: '0 auto' }}>
                           
                           {activeTab === 'profile' ? (
                               <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                    <div style={{ backgroundColor: colors.white, borderRadius: '24px', padding: '32px', boxShadow: spacing.shadows.card, position: 'relative', overflow: 'hidden' }}>
                                        <div style={{ position: 'absolute', top: 0, right: 0, width: '150px', height: '150px', background: `linear-gradient(135deg, ${colors.primaryBlue}10, transparent)`, borderRadius: '0 0 0 100%' }} />
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', position: 'relative' }}>
                                            <div style={{ width: '80px', height: '80px', borderRadius: '24px', backgroundColor: colors.lightBlue, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: '900', color: colors.primaryBlue }}>
                                                {patientName ? patientName.charAt(0) : 'P'}
                                            </div>
                                            <div>
                                                <h1 style={{ fontSize: '28px', fontWeight: '900', color: colors.textPrimary, margin: '0 0 4px' }}>{patientName}</h1>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{ padding: '4px 10px', backgroundColor: colors.primaryBlue, color: 'white', borderRadius: '8px', fontSize: '12px', fontWeight: '800', letterSpacing: '0.5px' }}>{patientHumanId}</span>
                                                    <span style={{ color: colors.textMuted, fontSize: '14px', fontWeight: '600' }}>Patient ID</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '32px', marginTop: '40px' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                                <h3 style={{ fontSize: '14px', fontWeight: '800', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: '1px' }}>Identity</h3>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                        <span style={{ fontSize: '14px', color: colors.textMuted, fontWeight: '600' }}>Age</span>
                                                        <span style={{ fontSize: '14px', color: colors.textPrimary, fontWeight: '700' }}>{patientData?.age || '--'} yrs</span>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                        <span style={{ fontSize: '14px', color: colors.textMuted, fontWeight: '600' }}>Gender</span>
                                                        <span style={{ fontSize: '14px', color: colors.textPrimary, fontWeight: '700' }}>{patientData?.gender || '--'}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                        <span style={{ fontSize: '14px', color: colors.textMuted, fontWeight: '600' }}>Blood Group</span>
                                                        <span style={{ fontSize: '14px', color: colors.alertRed, fontWeight: '800' }}>{patientData?.bloodGroup || '--'}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                                <h3 style={{ fontSize: '14px', fontWeight: '800', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: '1px' }}>Clinical Status</h3>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                        <span style={{ fontSize: '12px', color: colors.textMuted, fontWeight: '600', marginBottom: '4px' }}>Conditions</span>
                                                        <span style={{ fontSize: '14px', color: colors.textPrimary, fontWeight: '700' }}>{patientData?.conditions || 'No conditions listed'}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                        <span style={{ fontSize: '12px', color: colors.textMuted, fontWeight: '600', marginBottom: '4px' }}>Allergies</span>
                                                        <span style={{ fontSize: '14px', color: colors.alertOrange, fontWeight: '800' }}>{patientData?.allergies || 'None identified'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ backgroundColor: colors.white, borderRadius: '24px', padding: '24px', boxShadow: spacing.shadows.card }}>
                                        <h3 style={{ fontSize: '16px', fontWeight: '800', color: colors.textPrimary, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <LucideIcons.ShieldAlert size={18} color={colors.alertRed} /> Emergency Contact
                                        </h3>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <div style={{ fontSize: '15px', fontWeight: '800', color: colors.textPrimary }}>{patientData?.emergencyContact || '--'}</div>
                                                <div style={{ fontSize: '13px', color: colors.textSecondary, fontWeight: '600' }}>Primary Contact</div>
                                            </div>
                                            <div style={{ fontSize: '16px', fontWeight: '900', color: colors.primaryBlue, backgroundColor: colors.lightBlue, padding: '10px 16px', borderRadius: '12px' }}>
                                                {patientData?.emergencyPhone || '--'}
                                            </div>
                                        </div>
                                    </div>
                               </div>
                           ) : (
                               <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            {/* Alert Banner for Desktop (if any) */}
                            <div className="desktop-only">
                                {renderAlertBanner()}
                            </div>

                            {/* CARE SCORE & TODAY'S ACTIVITY (Horizontal Compact Card) */}
                            <div style={{ display: 'flex', flexDirection: 'row', backgroundColor: colors.white, borderRadius: '16px', padding: '20px', boxShadow: spacing.shadows.card, gap: '24px', alignItems: 'stretch' }}>
                                
                                {/* Care Score Mini */}
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '120px' }}>
                                    <div style={{ position: 'relative', width: '100px', height: '100px' }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={scoreData}
                                                    cx="50%" cy="50%" innerRadius={35} outerRadius={50}
                                                    startAngle={225} endAngle={-45} stroke="none" cornerRadius={8}
                                                    dataKey="value"
                                                >
                                                    {scoreData.map((e, index) => <Cell key={index} fill={e.color} />)}
                                                </Pie>
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                            <span style={{ fontSize: '24px', fontWeight: '800', color: getScoreColor(data?.careScore) }}>{data?.careScore || 0}</span>
                                        </div>
                                    </div>
                                    <span style={{ fontSize: '13px', fontWeight: '600', color: colors.textSecondary, marginTop: '4px' }}>Care Score</span>
                                </div>

                                {/* Divider */}
                                <div style={{ width: '1px', backgroundColor: colors.border, margin: '8px 0' }} />

                                {/* Today's Activity Mini */}
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                    <h3 style={{ fontSize: '14px', fontWeight: '800', color: colors.textPrimary, marginBottom: '12px' }}>Today's Activity</h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {timeline.length === 0 ? (
                                            <span style={{ fontSize: '13px', color: colors.textSecondary }}>No activities recorded yet.</span>
                                        ) : (
                                            timeline.slice(0, 3).map((act) => (
                                                <div key={act.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                                    <div style={{ marginTop: '5px', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: act.type === 'alert' ? colors.alertRed : colors.primaryGreen }} />
                                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                            <span style={{ fontSize: '13px', fontWeight: '600', color: colors.textPrimary, lineHeight: '1.2' }}>{act.text}</span>
                                                            <span style={{ fontSize: '11px', color: colors.textSecondary }}>{act.caretaker} • {act.timeStr}</span>
                                                        </div>
                                                        <div style={{ display: 'flex', gap: '6px' }}>
                                                            {act.hasVoice && <Mic size={14} color={colors.primaryBlue} />}
                                                            {act.hasImage && <Camera size={14} color={colors.primaryBlue} />}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* STATS CARDS ROW */}
                            <div style={{ display: 'flex', gap: '16px', width: '100%' }}>
                                <div style={{ flex: 1, backgroundColor: colors.white, borderRadius: '16px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: spacing.shadows.card }}>
                                    <div style={{ backgroundColor: colors.lightBlue, minWidth: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Pill size={20} color={colors.primaryBlue} />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontSize: '12px', color: colors.textSecondary, fontWeight: '700' }}>Medicines</span>
                                        <span style={{ fontSize: '16px', fontWeight: '800', color: completedMeds === totalMeds && totalMeds > 0 ? colors.primaryGreen : colors.textPrimary }}>{completedMeds}/{totalMeds}</span>
                                    </div>
                                </div>
                                <div style={{ flex: 1, backgroundColor: colors.white, borderRadius: '16px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: spacing.shadows.card }}>
                                    <div style={{ backgroundColor: colors.lightGreen, minWidth: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <HeartPulse size={20} color={colors.primaryGreen} />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontSize: '12px', color: colors.textSecondary, fontWeight: '700' }}>Vitals</span>
                                        <span style={{ fontSize: '16px', fontWeight: '800', color: vitalsColor }}>{vitalsText}</span>
                                    </div>
                                </div>
                                <div style={{ flex: 1, backgroundColor: colors.white, borderRadius: '16px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: spacing.shadows.card }}>
                                    <div style={{ backgroundColor: colors.lightOrange, minWidth: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Smile size={20} color={colors.alertOrange} />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontSize: '12px', color: colors.textSecondary, fontWeight: '700' }}>Mood</span>
                                        <span style={{ fontSize: '20px', fontWeight: '800', lineHeight: 1 }}>{getMoodEmoji()}</span>
                                    </div>
                                </div>
                            </div>

                            {/* PRESCRIBED CARE SECTION (Formerly Right Column) */}
                            <TaskManager patientId={patientId} />

                            {/* WEEKLY REPORT ACTION */}
                            <div style={{ backgroundColor: colors.white, padding: '20px', borderRadius: '16px', boxShadow: spacing.shadows.card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <div style={{ backgroundColor: colors.lightBlue, padding: '12px', borderRadius: '12px' }}>
                                        <FileText size={24} color={colors.primaryBlue} />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <span style={{ fontSize: '16px', fontWeight: '800', color: colors.textPrimary }}>Weekly Clinical Report</span>
                                        <span style={{ fontSize: '13px', color: colors.textSecondary }}>Download a full PDF summary of compliance and vitals.</span>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button 
                                        onClick={async () => {
                                            // Instant override using default mocks if missing
                                            const url = await generateWeeklyReport(patientId || 'mock_patient_id', patientName || 'Preview Patient', 'dataurl');
                                            setPreviewUrl(url);
                                        }}
                                        style={{ 
                                            padding: '12px 16px', backgroundColor: colors.white, color: colors.textSecondary, 
                                            border: `1.5px solid ${colors.border}`, borderRadius: '10px', fontWeight: '700', 
                                            cursor: 'pointer', fontSize: '13px', transition: 'all 0.2s', whiteSpace: 'nowrap'
                                        }}
                                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = colors.background; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = colors.white; }}
                                    >
                                        Template Preview
                                    </button>
                                    <button 
                                        onClick={async () => {
                                            if (patientName || patientId) {
                                                await generateWeeklyReport(patientId || 'mock_patient_id', patientName || 'Patient', 'download');
                                            } else {
                                                alert("Patient profile found but name not loaded yet. Click 'Template Preview' instead to bypass.");
                                            }
                                        }}
                                        style={{ 
                                            padding: '12px 24px', backgroundColor: colors.background, color: colors.primaryBlue, 
                                            border: `1.5px solid ${colors.border}`, borderRadius: '10px', fontWeight: '700', 
                                            cursor: 'pointer', fontSize: '14px', transition: 'all 0.2s', whiteSpace: 'nowrap'
                                        }}
                                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = colors.lightBlue; e.currentTarget.style.borderColor = colors.primaryBlue; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = colors.background; e.currentTarget.style.borderColor = colors.border; }}
                                    >
                                        Generate PDF
                                    </button>
                                </div>
                                    </div>
                               </div>
                           )}
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

            {/* PREVIEW MODAL */}
            {previewUrl && (
                <div 
                    onClick={() => setPreviewUrl(null)}
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div 
                        onClick={(e) => e.stopPropagation()}
                        style={{ width: '100%', maxWidth: '800px', height: '90vh', backgroundColor: colors.white, borderRadius: '16px', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: spacing.shadows.modal }}>
                        
                        <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${colors.border}` }}>
                            <div>
                                <h3 style={{ fontSize: '18px', fontWeight: '800', margin: 0, color: colors.textPrimary }}>Report Preview</h3>
                                <p style={{ fontSize: '13px', color: colors.textSecondary, margin: '4px 0 0 0' }}>This is an interactive preview. Click outside to close.</p>
                            </div>
                            <button 
                                onClick={() => setPreviewUrl(null)}
                                style={{
                                    padding: '8px 16px', backgroundColor: colors.background, color: colors.textPrimary, border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700'
                                }}>
                                Close
                            </button>
                        </div>
                        
                        <iframe 
                            src={previewUrl} 
                            style={{ flex: 1, width: '100%', border: 'none' }}
                            title="PDF Preview"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
