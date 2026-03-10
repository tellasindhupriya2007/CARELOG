import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../context/AuthContext';
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { getTodayDateString, formatDisplayDate } from '../../utils/dateHelpers';
import TopHeader from '../../components/common/TopHeader';
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
import * as LucideIcons from 'lucide-react';
import { Bell, CheckCircle2, Clock, Plus, X } from 'lucide-react';

export default function CaretakerDashboard() {
    const navigate = useNavigate();
    const { user, patientId, setPatientId } = useAuthContext();

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [firstName, setFirstName] = useState('');
    const [alertCount, setAlertCount] = useState(0);

    // Bottom Sheets
    const [selectedTask, setSelectedTask] = useState(null);
    const [showConfirmSheet, setShowConfirmSheet] = useState(false);
    const [showNoteSheet, setShowNoteSheet] = useState(false);
    const [taskNote, setTaskNote] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [toast, setToast] = useState(null);
    const [humanPatientId, setHumanPatientId] = useState('');

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
                    } else if (!userData.assignedPatientId) {
                        setError("No patient assigned to this account.");
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
                    setHumanPatientId(patDoc.data().patientId || '');
                }
            } catch (err) {
                console.error('Could not fetch patient humanId', err);
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

    // 2. Real-time Listening to Today's Tasks & Alerts
    useEffect(() => {
        if (!patientId) return;

        setLoading(true);
        const todayString = getTodayDateString();

        const qLogs = query(collection(db, 'dailyLogs'), where('patientId', '==', patientId), where('date', '==', todayString));

        const unsubLogs = onSnapshot(qLogs, async (snapshot) => {
            if (snapshot.empty) {
                // Auto-generate today's log from carePlans if it doesn't exist to simulate the midnight Cloud Function
                try {
                    const planDoc = await getDoc(doc(db, 'carePlans', patientId));
                    if (planDoc.exists()) {
                        const plan = planDoc.data();
                        const defaultTasks = [
                            ...(plan.medicines || []).map(m => ({
                                taskId: `med-${m.medicineId || Date.now()}`,
                                name: `${m.name} (${m.dosage})`,
                                icon: 'Pill',
                                scheduledTime: m.scheduledTimes?.[0] || '12:00',
                                status: 'Pending',
                                isCritical: false
                            })),
                            ...(plan.tasks || []).map(t => ({
                                taskId: t.taskId || `task-${Date.now()}`,
                                name: t.name,
                                icon: t.icon || 'Activity',
                                scheduledTime: t.scheduledTime || '12:00',
                                status: 'Pending',
                                isCritical: t.isCritical || false
                            }))
                        ];

                        const newLogRef = doc(collection(db, 'dailyLogs'));
                        await setDoc(newLogRef, {
                            patientId,
                            date: todayString,
                            tasks: defaultTasks,
                            completedTasks: 0,
                            totalTasks: defaultTasks.length,
                            careScore: 0
                        });
                        // onSnapshot will re-fire on this insertion
                    } else {
                        setData({ id: 'dummy', tasks: [], completedTasks: 0, totalTasks: 0 });
                        setLoading(false);
                    }
                } catch (err) {
                    console.error("Error generating daily log:", err);
                    setError("Failed to initialize today's schedule.");
                    setLoading(false);
                }
            } else {
                const docSnap = snapshot.docs[0];
                setData({ id: docSnap.id, ...docSnap.data() });
                setLoading(false);
            }
        }, (err) => {
            console.error(err);
            setError("Failed to load today's schedule.");
            setLoading(false);
        });

        // Sub to active alerts to show badge
        const qAlerts = query(collection(db, 'alerts'), where('patientId', '==', patientId));
        const unsubAlerts = onSnapshot(qAlerts, (snap) => {
            setAlertCount(snap.docs.length); // Simplified length count for UI
        });

        return () => {
            unsubLogs();
            unsubAlerts();
        };
    }, [patientId]);

    // Handle Complete Task
    const confirmCompletion = async () => {
        setSubmitting(true);
        try {
            const logRef = doc(db, 'dailyLogs', data.id);
            const updatedTasks = data.tasks.map(t => {
                if (t.taskId === selectedTask.taskId) {
                    return { ...t, status: 'Completed', completedAt: new Date().toISOString() };
                }
                return t;
            });

            const completedCount = updatedTasks.filter(t => t.status === 'Completed').length;

            await updateDoc(logRef, {
                tasks: updatedTasks,
                completedTasks: completedCount
            });

            showToast(`Task completed!`, 'success');
            setShowConfirmSheet(false);
            setSelectedTask(null);
        } catch (err) {
            console.error(err);
            showToast('Failed to complete task.', 'error');
        }
        setSubmitting(false);
    };

    // Handle Add Note
    const saveTaskNote = async () => {
        setSubmitting(true);
        try {
            const logRef = doc(db, 'dailyLogs', data.id);
            const updatedTasks = data.tasks.map(t => {
                if (t.taskId === selectedTask.taskId) {
                    return { ...t, note: taskNote };
                }
                return t;
            });

            await updateDoc(logRef, { tasks: updatedTasks });
            showToast('Note added securely.', 'success');
            setShowNoteSheet(false);
            setSelectedTask(null);
            setTaskNote('');
        } catch (err) {
            console.error(err);
            showToast('Failed to add note.', 'error');
        }
        setSubmitting(false);
    };

    // Long Press handlers
    const handlePressStart = (task) => {
        if (task.status === 'Completed') return; // Only notes on pending? Or allow on completed? Allow!
        pressTimer.current = setTimeout(() => {
            setSelectedTask(task);
            setTaskNote(task.note || '');
            setShowNoteSheet(true);
        }, 600);
    };

    const handlePressEnd = () => {
        if (pressTimer.current) clearTimeout(pressTimer.current);
    };

    // Renders
    const renderTask = (task) => {
        const isCompleted = task.status === 'Completed';
        const IconComponent = LucideIcons[task.icon] || LucideIcons.Activity;

        return (
            <Card
                key={task.taskId}
                onClick={() => {
                    if (!isCompleted && !showNoteSheet && !showConfirmSheet) {
                        setSelectedTask(task);
                        setShowConfirmSheet(true);
                    }
                }}
                onPointerDown={() => handlePressStart(task)}
                onPointerUp={handlePressEnd}
                onPointerLeave={handlePressEnd}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    opacity: isCompleted ? 0.6 : 1,
                    marginBottom: '12px'
                }}
            >
                <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: colors.lightBlue,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center'
                }}>
                    <IconComponent size={20} color={colors.primaryBlue} />
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <span style={{
                        fontSize: '16px',
                        fontWeight: '600',
                        color: colors.textPrimary,
                        textDecoration: isCompleted ? 'line-through' : 'none'
                    }}>
                        {task.name}
                    </span>
                    <span style={{ fontSize: '12px', color: colors.textSecondary, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} /> {task.scheduledTime}
                        {task.note && <span style={{ marginLeft: '6px', color: colors.primaryBlue, fontStyle: 'italic' }}>• Note added</span>}
                    </span>
                </div>

                <div>
                    {isCompleted ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: colors.successGreen, padding: '4px 8px', borderRadius: '8px' }}>
                            <CheckCircle2 size={14} color={colors.primaryGreen} />
                            <span style={{ fontSize: '10px', color: colors.primaryGreen, fontWeight: '600' }}>Done</span>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: colors.lightOrange, padding: '4px 8px', borderRadius: '8px', border: `1px solid ${colors.alertOrange}` }}>
                            <span style={{ fontSize: '10px', color: colors.alertOrange, fontWeight: '600' }}>Pending</span>
                        </div>
                    )}
                </div>
            </Card>
        );
    };

    const completedCount = data?.completedTasks || 0;
    const totalCount = data?.totalTasks || 0;
    const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

    const pendingTasks = data?.tasks?.filter(t => t.status !== 'Completed') || [];
    const completedTasks = data?.tasks?.filter(t => t.status === 'Completed') || [];

    const sidebarItems = [
        { icon: 'Home', label: 'Dashboard', path: '/caretaker/dashboard' },
        { icon: 'HeartPulse', label: 'Vitals', path: '/caretaker/vitals' },
        { icon: 'Clipboard', label: 'Observations', path: '/caretaker/observations' },
        { icon: 'Bell', label: 'Alerts', path: '/caretaker/alerts' },
        { icon: 'Clock', label: 'Shift Handover', path: '/caretaker/handover' },
    ];

    return (
        <div className="desktop-layout" style={{ backgroundColor: colors.background, minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
            <Sidebar navItems={sidebarItems} />
            <div className="desktop-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0 }}>


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

                {/* TopHeader Native Build */}
                <div style={{
                    height: spacing.topHeaderHeight, backgroundColor: colors.white, borderBottom: `1px solid ${colors.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', position: 'sticky', top: 0, zIndex: 10
                }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <div style={{ fontSize: typography.sectionHeading.fontSize, fontWeight: typography.sectionHeading.fontWeight, color: colors.textPrimary }}>
                            Good Morning, {firstName}
                        </div>
                        {humanPatientId && (
                            <span style={{ fontSize: '11px', color: colors.textSecondary, backgroundColor: colors.background, padding: '2px 8px', borderRadius: '20px', display: 'inline-block', fontWeight: '500', border: `1px solid ${colors.border}` }}>
                                Patient ID: {humanPatientId}
                            </span>
                        )}
                    </div>
                    <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => navigate('/caretaker/alerts')}>
                        <Bell size={24} color={colors.textPrimary} />
                        {alertCount > 0 && (
                            <span style={{ position: 'absolute', top: '-4px', right: '-4px', backgroundColor: colors.alertRed, color: colors.white, fontSize: '10px', fontWeight: 'bold', width: '16px', height: '16px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {alertCount}
                            </span>
                        )}
                    </div>
                </div>

                {/* Unlinked State */}
                {!loading && !patientId && (
                    <div style={{ padding: spacing.pagePadding, flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '24px' }}>
                        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <span style={{ fontSize: '40px' }}>🔗</span>
                            <h2 style={{ fontSize: '18px', fontWeight: '700', color: colors.textPrimary }}>You are not linked to any patient yet.</h2>
                            <p style={{ fontSize: '14px', color: colors.textSecondary, lineHeight: '1.6', maxWidth: '300px' }}>
                                Ask the family for the Patient ID and enter it below to get started.
                            </p>
                        </div>
                        <div style={{ width: '100%', maxWidth: '380px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <InputField
                                label="Patient ID"
                                placeholder="e.g. CL-2026-4729"
                                value={linkIdInput}
                                onChange={(e) => { setLinkIdInput(e.target.value.toUpperCase()); setLinkError(''); }}
                            />
                            {linkError && (
                                <div style={{ backgroundColor: '#FEF2F2', padding: '10px 14px', borderRadius: '8px', border: `1px solid ${colors.alertRed}` }}>
                                    <span style={{ fontSize: '13px', color: colors.alertRed, fontWeight: '500' }}>{linkError}</span>
                                </div>
                            )}
                            <PrimaryButton label={linking ? 'Linking…' : 'Link to Patient'} onClick={handleLinkPatient} isLoading={linking} disabled={linking || !linkIdInput} />
                        </div>
                    </div>
                )}

                <div style={{ padding: spacing.pagePadding, flex: 1, overflowY: 'auto' }}>
                    <p style={{ fontSize: '14px', color: colors.textSecondary, marginBottom: '16px' }}>{formatDisplayDate(getTodayDateString())}</p>

                    {error && <ErrorCard message={error} />}

                    {loading && !error && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <SkeletonCard style={{ height: '80px' }} />
                            <SkeletonCard style={{ height: '100px' }} />
                            <SkeletonCard style={{ height: '100px' }} />
                        </div>
                    )}

                    {!loading && !error && data && (
                        <>
                            {/* Progress Card */}
                            <Card style={{ marginBottom: spacing.gapBetweenSections }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                    <span style={{ fontSize: '14px', fontWeight: '600', color: colors.textPrimary }}>Today's Tasks</span>
                                    <span style={{ fontSize: '14px', color: colors.textSecondary }}>{completedCount} of {totalCount} completed</span>
                                </div>
                                <div style={{ width: '100%', height: '8px', backgroundColor: colors.background, borderRadius: '4px', overflow: 'hidden' }}>
                                    <div style={{ width: `${progressPercent}%`, height: '100%', backgroundColor: colors.primaryBlue, transition: 'width 0.5s ease-out' }} />
                                </div>
                            </Card>

                            {/* Tasks List */}
                            <div className="caretaker-grid">
                                <div>
                                    {data.tasks?.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: '32px 16px', color: colors.textSecondary, fontSize: '14px' }}>
                                            No tasks scheduled for today.
                                        </div>
                                    ) : (
                                        <div style={{ paddingBottom: '80px' }}>
                                            {pendingTasks.map(renderTask)}
                                            {completedTasks.length > 0 && (
                                                <>
                                                    <div style={{ fontSize: '14px', fontWeight: '600', color: colors.textSecondary, marginTop: '24px', marginBottom: '12px' }}>Completed</div>
                                                    {completedTasks.map(renderTask)}
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="desktop-only" style={{ flexDirection: 'column' }}>
                                    <Card style={{ padding: '24px' }}>
                                        <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px' }}>Quick Vitals Entry</h3>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                            <InputField placeholder="BP Systolic (e.g. 120)" />
                                            <InputField placeholder="BP Diastolic (e.g. 80)" />
                                            <InputField placeholder="Heart Rate (bpm)" />
                                            <InputField placeholder="Temperature (F)" />
                                            <PrimaryButton label="Open Full Vitals Entry" onClick={() => navigate('/caretaker/vitals')} />
                                        </div>
                                    </Card>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* FAB */}
            <div
                className="mobile-only"
                onClick={() => navigate('/caretaker/vitals')}
                style={{
                    position: 'fixed', bottom: '88px', right: '16px', width: '56px', height: '56px',
                    borderRadius: '50%', backgroundColor: colors.primaryBlue, boxShadow: spacing.shadows.button,
                    display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', zIndex: 10
                }}
            >
                <Plus size={28} color={colors.white} />
            </div>

            <div className="mobile-only">
                <CaretakerBottomNav />
            </div>

            {/* Confirmation Bottom Sheet */}
            {
                showConfirmSheet && selectedTask && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'flex-end', animation: 'fadeIn 0.2s' }}>
                        <div style={{ backgroundColor: colors.white, width: '100%', maxWidth: '430px', margin: '0 auto', borderTopLeftRadius: '24px', borderTopRightRadius: '24px', padding: spacing.pagePadding, paddingBottom: '32px', animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', textAlign: 'center' }}>Mark "{selectedTask.name}" as complete?</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <PrimaryButton label="Confirm" onClick={confirmCompletion} isLoading={submitting} disabled={submitting} />
                                <SecondaryButton label="Cancel" onClick={() => setShowConfirmSheet(false)} disabled={submitting} />
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Note Bottom Sheet */}
            {
                showNoteSheet && selectedTask && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'flex-end', animation: 'fadeIn 0.2s' }}>
                        <div style={{ backgroundColor: colors.white, width: '100%', maxWidth: '430px', margin: '0 auto', borderTopLeftRadius: '24px', borderTopRightRadius: '24px', padding: spacing.pagePadding, paddingBottom: '32px', animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h3 style={{ fontSize: '18px', fontWeight: '600' }}>Add Note</h3>
                                <button onClick={() => setShowNoteSheet(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} color={colors.textSecondary} /></button>
                            </div>
                            <p style={{ fontSize: '12px', color: colors.textSecondary, marginBottom: '12px' }}>Attaching note to: {selectedTask.name}</p>
                            <InputField
                                placeholder="E.g. Patient felt slightly nauseous."
                                value={taskNote}
                                onChange={(e) => setTaskNote(e.target.value)}
                            />
                            <div style={{ marginTop: '24px' }}>
                                <PrimaryButton label="Save Note" onClick={saveTaskNote} isLoading={submitting} disabled={submitting || !taskNote} />
                            </div>
                        </div>
                    </div>
                )
            }

            <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes slideDown { from { top: -50px; opacity: 0; } to { top: 20px; opacity: 1; } }
      `}</style>
        </div >
    );
}
