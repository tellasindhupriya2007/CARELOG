import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../context/AuthContext';
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { getTodayDateString, formatDisplayDate } from '../../utils/dateHelpers';
import ScreenHeader from '../../components/common/ScreenHeader';
import Card from '../../components/common/Card';
import ErrorCard from '../../components/common/ErrorCard';
import SkeletonCard from '../../components/common/SkeletonCard';
import PrimaryButton from '../../components/common/PrimaryButton';
import SecondaryButton from '../../components/common/SecondaryButton';
import CaretakerBottomNav from '../../components/common/CaretakerBottomNav';
import InputField from '../../components/common/InputField';
import Sidebar from '../../components/common/Sidebar';
import { colors } from '../../styles/colors';
import { spacing } from '../../styles/spacing';
import { typography } from '../../styles/typography';
import { 
    Bell, CheckCircle2, Clock, Plus, X, Pill, Heart, Smile, Activity, ShieldCheck,
    Calendar, ChevronRight, TrendingUp, Utensils, HeartPulse, Mic, User, Check 
} from 'lucide-react';
import { subscribeToTasks, subscribeToDailyLogs, toggleTaskCompletion } from '../../services/taskService';
import { listenToAlerts } from '../../services/alertService';
import CaretakerSidePanel from './CaretakerSidePanel';

export default function CaretakerDashboard() {
    const navigate = useNavigate();
    const { user, patientId, setPatientId } = useAuthContext();

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [firstName, setFirstName] = useState('');
    const [alertCount, setAlertCount] = useState(0);

    // Bottom Sheets
    const [toast, setToast] = useState(null);
    const [humanPatientId, setHumanPatientId] = useState('');

    const [patientInfo, setPatientInfo] = useState({ name: '', allergies: 'None', lastShiftSummary: '' });

    // For unlinked caretaker inline linking
    const [linkIdInput, setLinkIdInput] = useState('');
    const [linkError, setLinkError] = useState('');
    const [linking, setLinking] = useState(false);

    const pressTimer = useRef(null);

    const showToast = (message, type) => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    // 1. Fetch User Data to get assignedPatientId & Name
    useEffect(() => {
        const initUser = async () => {
            try {
                const uDoc = await getDoc(doc(db, 'users', user.uid));
                if (uDoc.exists()) {
                    const userData = uDoc.data();
                    setFirstName(userData.name.split(' ')[0]);
                    if (!patientId && userData.assignedPatientId) {
                        setPatientId(userData.assignedPatientId);
                    } else if (!userData.assignedPatientId && !patientId) {
                        // No patient linked — show linking screen (not an error)
                        setLoading(false);
                    }
                }
            } catch (err) {
                console.error(err);
                setError("Failed to fetch user profile.");
                setLoading(false);
            }
        };
        if (user) initUser();
    }, [user, patientId, setPatientId]);

    // Fetch human-readable Patient ID for pill badge
    useEffect(() => {
        const fetchHumanId = async () => {
            if (!patientId) return;
            try {
                const patDoc = await getDoc(doc(db, 'patients', patientId));
                if (patDoc.exists()) {
                    const pData = patDoc.data();
                    setHumanPatientId(pData.patientId || '');
                    setPatientInfo({
                        name: pData.name,
                        allergies: pData.allergies || 'None',
                        lastShiftSummary: pData.lastShiftSummary || "Patient is stable. No incidents reported."
                    });
                }
            } catch (err) {
                console.error('Could not fetch patient info', err);
            }
        };
        fetchHumanId();
    }, [patientId]);

    // Inline link handler for unlinked caretakers
    const handleLinkPatient = async () => {
        if (!linkIdInput.trim()) return;
        setLinking(true);
        setLinkError('');
        try {
            const { collection: col, query: q, where: wh, getDocs: gds, doc: d, updateDoc: upd, arrayUnion: au } = await import('firebase/firestore');
            const snap = await gds(q(col(db, 'patients'), wh('patientId', '==', linkIdInput.trim().toUpperCase())));
            if (snap.empty) {
                setLinkError('Invalid Patient ID. Please check with your family.');
            } else {
                const patDoc = snap.docs[0];
                await upd(d(db, 'patients', patDoc.id), { caretakerIds: au(user.uid) });
                await upd(d(db, 'users', user.uid), { assignedPatientId: patDoc.id, patientId: patDoc.id });
                setPatientId(patDoc.id);
                setHumanPatientId(patDoc.data().patientId);
                showToast(`Successfully linked to ${patDoc.data().name}'s care profile`, 'success');
            }
        } catch (err) {
            console.error(err);
            setLinkError('Something went wrong. Try again.');
        }
        setLinking(false);
    };

    const [tasks, setTasks] = useState([]);
    const [completions, setCompletions] = useState({});

    // Real-time synchronization
    useEffect(() => {
        if (!patientId) return;

        // Safety: If data loading hangs for too long, just show what we have (or empty state)
        const dashboardTimeout = setTimeout(() => {
            console.warn("[Dashboard] Data subscription timed out. Forcing loading false.");
            setLoading(false);
        }, 3000);

        const unsubTasks = subscribeToTasks(patientId, (allTasks) => {
            setTasks(allTasks);
            setLoading(false);
            clearTimeout(dashboardTimeout);
        });

        const unsubLogs = subscribeToDailyLogs(patientId, (dailyCompletions) => {
            setCompletions(dailyCompletions);
        });

        const unsubAlerts = listenToAlerts(patientId, (fetchedAlerts) => {
            const unreadCount = fetchedAlerts.filter(a => !a.isRead).length;
            setAlertCount(unreadCount);
        });

        return () => {
            unsubTasks();
            unsubLogs();
            unsubAlerts();
            clearTimeout(dashboardTimeout);
        };
    }, [patientId]);

    const totalCount = tasks.length;
    const completedCount = tasks.filter(t => completions[t.id]?.completed).length;
    const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

    const handleTaskCheck = async (taskId, currentStatus) => {
        try {
            await toggleTaskCompletion(patientId, taskId, user.uid, !currentStatus);
            showToast(currentStatus ? "Entry removed" : "Task logged successfully", 'success');
        } catch (err) {
            showToast("Failed to update task", 'error');
        }
    };

    const renderTask = (task) => {
        const isDone = completions[task.id]?.completed;
        const completedAt = completions[task.id]?.completedAt;
        const completedTimeStr = completedAt ? new Date(completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null;
        const catColorMap = {
            'Medication': { bg: colors.lightBlue, text: colors.primaryBlue },
            'Vitals Monitoring': { bg: '#F3E8FF', text: '#8B5CF6' },
            'Nutrition': { bg: colors.lightGreen, text: colors.primaryGreen }
        };
        const catStyle = catColorMap[task.category] || { bg: '#F1F5F9', text: '#475569' };

        return (
            <div 
                key={task.id} 
                onClick={() => handleTaskCheck(task.id, isDone)}
                style={{ 
                    display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', borderRadius: '12px',
                    backgroundColor: isDone ? '#F0FDF4' : colors.white, 
                    border: `1.5px solid ${isDone ? '#BBF7D0' : '#E2E8F0'}`,
                    cursor: 'pointer', transition: 'all 0.2s',
                    boxShadow: isDone ? 'none' : '0 2px 4px rgba(0,0,0,0.02)',
                }}
                className="task-card-hover"
            >
                <div style={{ 
                    width: '26px', height: '26px', borderRadius: '8px', flexShrink: 0,
                    border: `2.5px solid ${isDone ? '#10B981' : '#CBD5E1'}`,
                    backgroundColor: isDone ? '#10B981' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.2s'
                }}>
                    {isDone && <Check size={16} color="white" strokeWidth={3} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <h4 style={{ fontSize: '15px', fontWeight: '800', color: isDone ? '#065F46' : colors.textPrimary, textDecoration: isDone ? 'line-through' : 'none', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{task.title}</h4>
                        <span style={{ fontSize: '10px', padding: '3px 6px', borderRadius: '4px', backgroundColor: catStyle.bg, color: catStyle.text, fontWeight: '800', whiteSpace: 'nowrap' }}>{task.category}</span>
                    </div>
                    {task.time && <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: colors.textSecondary }}><Clock size={12} /><span style={{ fontSize: '12px', fontWeight: '700' }}>{task.time}</span></div>}
                    {isDone && completedTimeStr && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#065F46', marginTop: '4px' }}>
                            <CheckCircle2 size={12} />
                            <span style={{ fontSize: '11px', fontWeight: '700', textDecoration: 'none' }}>Completed at {completedTimeStr}</span>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const getGroupedTasks = () => {
        const morning = [], afternoon = [], evening = [];
        [...tasks].sort((a,b) => (a.time || '').localeCompare(b.time || '')).forEach(t => {
            if (!t.time || t.time === 'As needed') { morning.push(t); return; }
            const hour = parseInt(t.time.split(':')[0], 10);
            if (hour < 12) morning.push(t);
            else if (hour < 17) afternoon.push(t);
            else evening.push(t);
        });
        return { morning, afternoon, evening };
    };

    const groupedTasks = getGroupedTasks();

    const renderTaskGroup = (title, groupTasks) => {
        if (groupTasks.length === 0) return null;
        return (
            <div style={{ marginBottom: '24px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: '800', color: colors.textSecondary, textTransform: 'uppercase', marginBottom: '16px', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {title} <div style={{ flex: 1, height: '1px', backgroundColor: colors.border }}></div>
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
                    {groupTasks.map(renderTask)}
                </div>
            </div>
        );
    };

    const ProgressGauge = ({ completed, total }) => {
        const percentage = (completed / total) * 100;
        const radius = 60;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (percentage / 100) * circumference;

        return (
            <Card style={{ 
                padding: '24px', display: 'flex', alignItems: 'center', gap: '24px', 
                background: 'linear-gradient(135deg, #FFFFFF 0%, #F0FDF4 100%)' 
            }}>
                <div style={{ position: 'relative', width: '120px', height: '120px' }}>
                    <svg width="120" height="120" viewBox="0 0 140 140" style={{ transform: 'rotate(-90deg)' }}>
                        <circle cx="70" cy="70" r={radius} fill="transparent" stroke="#E2E8F0" strokeWidth="10" />
                        <circle 
                            cx="70" cy="70" r={radius} fill="transparent" 
                            stroke="#10B981" strokeWidth="10" strokeDasharray={circumference} 
                            strokeDashoffset={offset} strokeLinecap="round" 
                        />
                    </svg>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                        <span style={{ fontSize: '24px', fontWeight: '800' }}>{completed}/{total}</span>
                        <span style={{ fontSize: '10px', fontWeight: '700', color: colors.textSecondary }}>TASKS</span>
                    </div>
                </div>
                <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '800', color: colors.textPrimary, marginBottom: '4px' }}>Today's Progress</h3>
                    <p style={{ fontSize: '14px', color: colors.textSecondary }}>You've completed {percentage}% of scheduled tasks.</p>
                </div>
            </Card>
        );
    };

    const pendingTasks = tasks.filter(t => !completions[t.id]?.completed);
    const completedTasks = tasks.filter(t => completions[t.id]?.completed);

    const sidebarItems = [
        { icon: 'Home', label: 'Dashboard', path: '/caretaker/dashboard' },
        { icon: 'Pill', label: 'Prescriptions', path: '/caretaker/prescriptions' },
        { icon: 'HeartPulse', label: 'Vitals', path: '/caretaker/vitals' },
        { icon: 'Clipboard', label: 'Observations', path: '/caretaker/observations' },
        { icon: 'Bell', label: 'Alerts', path: '/caretaker/alerts' },
        { icon: 'Clock', label: 'Shift Handover', path: '/caretaker/handover' },
        { icon: 'MessageSquare', label: 'Messages', path: '/caretaker/messages' },
    ];

    return (
        <div className="desktop-layout" style={{ backgroundColor: colors.background, minHeight: '100vh', display: 'flex', flexDirection: 'row', position: 'relative' }}>
            <Sidebar navItems={sidebarItems} />
            <div className="desktop-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0 }}>
                
                <ScreenHeader
                    title={`Good Morning, ${firstName}`}
                    rightIcon={
                        <div style={{ position: 'relative', cursor: 'pointer', display: 'flex', alignItems: 'center' }} onClick={() => navigate('/caretaker/alerts')}>
                            <Bell size={20} color={colors.textPrimary} />
                            {alertCount > 0 && (
                                <span style={{ position: 'absolute', top: '-4px', right: '-4px', backgroundColor: colors.alertRed, color: colors.white, fontSize: '10px', fontWeight: 'bold', width: '16px', height: '16px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {alertCount}
                                </span>
                            )}
                        </div>
                    }
                />


                {toast && (
                    <div className="toast-notification" style={{
                        backgroundColor: toast.type === 'success' ? colors.successGreen : colors.alertRed,
                        color: toast.type === 'success' ? colors.primaryGreen : colors.white,
                        padding: '12px 24px', borderRadius: spacing.borderRadius.badge, fontWeight: '600',
                        boxShadow: spacing.shadows.card, textAlign: 'center', animation: 'slideDown 0.3s ease-out'
                    }}>
                        {toast.message}
                    </div>
                )}

                {/* Main Dashboard Content */}
                <div 
                    className="main-content scroll-y" 
                    style={{ 
                        padding: 'calc(var(--header-h) + 24px + env(safe-area-inset-top)) 20px 100px 20px', 
                        flex: 1, 
                        overflowY: 'auto' 
                    }}
                >
                    {/* Unlinked State */}
                    {!loading && !patientId && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '24px' }}>
                            <div style={{ textAlign: 'center' }}>
                                <ShieldCheck size={48} color={colors.primaryBlue} style={{ marginBottom: '16px' }} />
                                <h2 style={{ fontSize: '20px', fontWeight: '800', color: colors.textPrimary }}>Patient Linking Required</h2>
                                <p style={{ fontSize: '14px', color: colors.textSecondary, maxWidth: '320px', margin: '8px auto' }}>
                                    Enter the Patient ID provided by the family to access the care dashboard.
                                </p>
                            </div>
                            <div style={{ width: '100%', maxWidth: '360px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <InputField
                                    placeholder="Enter Patient ID (e.g. CL-2026-XXXX)"
                                    value={linkIdInput}
                                    onChange={(e) => setLinkIdInput(e.target.value.toUpperCase())}
                                />
                                <PrimaryButton label={linking ? "Linking..." : "Link Profile"} onClick={handleLinkPatient} disabled={linking} />
                            </div>
                        </div>
                    )}

                    {patientId && (
                        <div className="caretaker-responsive-grid">
                            <div className="caretaker-main-col">
                                {/* Header Summary */}
                                <div style={{ 
                                    backgroundColor: colors.white, padding: '24px', borderRadius: '16px', 
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' 
                                }}>
                                    <div>
                                        <h1 style={{ fontSize: '28px', fontWeight: '900', color: colors.textPrimary, letterSpacing: '-0.5px', marginBottom: '4px' }}>{loading ? "..." : patientInfo.name}</h1>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <span style={{ fontSize: '12px', fontWeight: '800', color: colors.primaryBlue, backgroundColor: colors.lightBlue, padding: '4px 10px', borderRadius: '6px' }}>{humanPatientId}</span>
                                            <span style={{ fontSize: '11px', fontWeight: '700', color: '#991B1B', textTransform: 'uppercase' }}>Allergies: {patientInfo.allergies}</span>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: colors.textSecondary }}>
                                            <Calendar size={14} />
                                            <span style={{ fontSize: '13px', fontWeight: '600' }}>{formatDisplayDate(getTodayDateString())}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Progress & Summary Section */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px' }}>
                                    <Card style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '20px', backgroundColor: '#F0F9FF', border: 'none', height: '100%' }}>
                                        <div style={{ position: 'relative', width: '64px', height: '64px' }}>
                                            <svg width="64" height="64" viewBox="0 0 80 80" style={{ transform: 'rotate(-90deg)' }}>
                                                <circle cx="40" cy="40" r="32" fill="transparent" stroke="#E2E8F0" strokeWidth="6" />
                                                <circle 
                                                    cx="40" cy="40" r="32" fill="transparent" 
                                                    stroke={colors.primaryBlue} strokeWidth="6" 
                                                    strokeDasharray={2 * Math.PI * 32} 
                                                    strokeDashoffset={(2 * Math.PI * 32) - (progressPercent / 100) * (2 * Math.PI * 32)} 
                                                    strokeLinecap="round" 
                                                />
                                            </svg>
                                            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                                <span style={{ fontSize: '14px', fontWeight: '900', color: colors.primaryBlue }}>{Math.round(progressPercent)}%</span>
                                            </div>
                                        </div>
                                        <div>
                                            <h4 style={{ fontSize: '14px', fontWeight: '800', color: '#0369A1', marginBottom: '2px' }}>Day Completion</h4>
                                            <p style={{ fontSize: '12px', color: '#0C4A6E', opacity: 0.8 }}>{completedCount} of {totalCount} tasks verified</p>
                                        </div>
                                    </Card>

                                    <Card style={{ padding: '20px', height: '100%', backgroundColor: colors.white }}>
                                        <h4 style={{ fontSize: '11px', fontWeight: '800', color: colors.textSecondary, textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>Latest Handover</h4>
                                        <p style={{ fontSize: '13px', color: colors.textPrimary, fontStyle: 'italic', lineHeight: '1.5', opacity: 0.8 }}>
                                            "{loading ? "..." : (patientInfo.lastShiftSummary ? patientInfo.lastShiftSummary.substring(0, 100) : "No handover yet")}"
                                        </p>
                                    </Card>
                                </div>

                                {/* Main Task List */}
                                <div style={{ backgroundColor: colors.white, padding: '24px', borderRadius: '16px', border: `1px solid ${colors.border}` }}>
                                    <h3 style={{ fontSize: '18px', fontWeight: '900', color: colors.textPrimary, marginBottom: '24px' }}>Prescribed Care Checklist</h3>
                                    <div>
                                        {loading ? (
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
                                                {[1, 2, 3, 4].map(i => <SkeletonCard key={i} style={{ height: '72px' }} />)}
                                            </div>
                                        ) : tasks.length > 0 ? (
                                            <>
                                                {renderTaskGroup('Morning', groupedTasks.morning)}
                                                {renderTaskGroup('Afternoon', groupedTasks.afternoon)}
                                                {renderTaskGroup('Evening', groupedTasks.evening)}
                                            </>
                                        ) : (
                                            <div style={{ textAlign: 'center', padding: '40px', border: `1px dashed ${colors.border}`, borderRadius: '12px' }}>
                                                <p style={{ color: colors.textSecondary, fontWeight: '600' }}>No active tasks scheduled.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                
                                {/* Quick Access Actions Grid */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                                    {/* Shift Status */}
                                <div style={{ backgroundColor: '#ECFDF5', padding: '20px', borderRadius: '16px', border: '1.5px solid #A7F3D0' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                                        <div style={{ padding: '8px', backgroundColor: '#A7F3D0', borderRadius: '8px' }}>
                                            <Clock size={16} color="#065F46" />
                                        </div>
                                        <h4 style={{ fontSize: '14px', fontWeight: '800', color: '#065F46' }}>Shift Management</h4>
                                    </div>
                                    <button 
                                        onClick={() => navigate('/caretaker/handover')}
                                        style={{ 
                                            width: '100%', height: '44px', backgroundColor: '#10B981', color: 'white', 
                                            borderRadius: '10px', border: 'none', fontWeight: '800', cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                        }}
                                    >
                                        Log Handover
                                    </button>
                                </div>

                                {/* Vital Signs Summary */}
                                <Card style={{ padding: '20px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                        <h3 style={{ fontSize: '14px', fontWeight: '800', color: colors.textPrimary, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <HeartPulse size={16} color={colors.primaryBlue} /> Vital Signs
                                        </h3>
                                        <button onClick={() => navigate('/caretaker/vitals')} style={{ background: 'none', border: 'none', color: colors.primaryBlue, fontSize: '12px', fontWeight: '800', cursor: 'pointer' }}>Update</button>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                        <div style={{ padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '10px', textAlign: 'center' }}>
                                            <p style={{ fontSize: '10px', fontWeight: '800', color: colors.textSecondary, marginBottom: '4px' }}>BP</p>
                                            <p style={{ fontSize: '15px', fontWeight: '900', color: colors.textPrimary }}>120/80</p>
                                        </div>
                                        <div style={{ padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '10px', textAlign: 'center' }}>
                                            <p style={{ fontSize: '10px', fontWeight: '800', color: colors.textSecondary, marginBottom: '4px' }}>HR</p>
                                            <p style={{ fontSize: '15px', fontWeight: '900', color: colors.textPrimary }}>72 bpm</p>
                                        </div>
                                    </div>
                                </Card>

                                {/* Observations Activity */}
                                <Card style={{ padding: '20px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                        <h3 style={{ fontSize: '14px', fontWeight: '800', color: colors.textPrimary, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Mic size={16} color={colors.primaryBlue} /> Observations
                                        </h3>
                                    </div>
                                    <button 
                                        onClick={() => navigate('/caretaker/observations')}
                                        style={{ 
                                            width: '100%', height: '44px', backgroundColor: '#F1F5F9', border: 'none', borderRadius: '10px', 
                                            color: colors.textPrimary, fontWeight: '800', fontSize: '13px', cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                        }}
                                    >
                                        <Mic size={14} /> Start Voice Log
                                    </button>
                                </Card>

                                {/* Clinical Alert Box */}
                                <div style={{ backgroundColor: '#FFF7ED', padding: '20px', borderRadius: '16px', border: '1px solid #FFEDD5' }}>
                                    <h4 style={{ fontSize: '13px', fontWeight: '900', color: '#9A3412', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                                        <Bell size={14} /> Care Instructions
                                    </h4>
                                    <p style={{ fontSize: '12px', color: '#9A3412', lineHeight: '1.6', fontWeight: '500' }}>
                                        Check temperature every 4 hours if fever persists. Administer paracetamol as per SOS instructions.
                                    </p>
                                </div>
                                </div>
                            </div>

                            {/* Right Column: Unified Side Panel (1/3 width) */}
                            <div className="caretaker-side-col">
                                <CaretakerSidePanel />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
                @keyframes slideDown { from { top: -50px; opacity: 0; } to { top: 20px; opacity: 1; } }
                
                .card-hover:hover {
                    box-shadow: 0 4px 12px rgba(0,0,0,0.08) !important;
                    transform: translateY(-1px);
                }
            `}</style>

        </div>
    );
}
