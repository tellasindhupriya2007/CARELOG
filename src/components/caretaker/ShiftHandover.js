import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../context/AuthContext';
import { getLatestHandover, createShiftHandover } from '../../services/handoverService';
import { getDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import ScreenHeader from '../../components/common/ScreenHeader';
import PrimaryButton from '../common/PrimaryButton';
import Card from '../common/Card';
import { colors } from '../../styles/colors';
import { typography } from '../../styles/typography';
import { CheckCircle2, HeartPulse, Pill, Activity, AlertTriangle, Smile, Clock, Users } from 'lucide-react';

export default function ShiftHandover() {
    const navigate = useNavigate();
    const { user, patientId } = useAuthContext();

    const [loading, setLoading] = useState(true);
    const [recording, setRecording] = useState(false);
    const [incomingName, setIncomingName] = useState('');
    const [incomingAge, setIncomingAge] = useState('');
    const [snapshot, setSnapshot] = useState(null);
    const [caregiverName, setCaregiverName] = useState('Caregiver');
    const [toastMessage, setToastMessage] = useState(null);
    const [handoverSubmitted, setHandoverSubmitted] = useState(false);

    const checkSubmitted = (data) => {
        if (!data || !data.createdAt) return false;
        const snapDate = data.createdAt?.toDate?.() || new Date(data.createdAt);
        const twelveHoursAgo = new Date();
        twelveHoursAgo.setHours(twelveHoursAgo.getHours() - 12);
        return (snapDate > twelveHoursAgo && data.caregiverId === user.uid);
    };

    useEffect(() => {
        const init = async () => {
            if (user) {
                const uDoc = await getDoc(doc(db, 'users', user.uid));
                if (uDoc.exists()) setCaregiverName(uDoc.data().name || 'Caregiver');
            }
            if (patientId) {
                const data = await getLatestHandover(patientId);
                setSnapshot(data);
                setHandoverSubmitted(checkSubmitted(data));
            }
            setLoading(false);
        };
        init();
    }, [user, patientId]);

    const handleRecordHandover = async () => {
        if (handoverSubmitted) return;
        if (!incomingName.trim()) {
            alert("Please enter the incoming caretaker's name.");
            return;
        }

        setRecording(true);
        try {
            // Update the user profile for the new caretaker
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
                name: incomingName,
                age: incomingAge,
                lastHandoverAt: serverTimestamp()
            });

            // Create the snapshot with the current summary
            await createShiftHandover(patientId, user.uid, caregiverName);
            
            setHandoverSubmitted(true);
            setToastMessage('Shift Handover & Identity Updated');
            
            setTimeout(() => {
                setToastMessage(null);
                window.location.reload(); // Refresh to update all instances of caregiver name instantly
            }, 2000);
            
        } catch (error) {
            console.error("Error creating handover:", error);
            setToastMessage('Failed to record handover.');
            setTimeout(() => setToastMessage(null), 3000);
        }
        setRecording(false);
    };

    if (loading) {
        return (
            <div style={{ backgroundColor: colors.white, height: '100vh', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <Activity className="animate-spin" size={32} color={colors.primaryBlue} />
            </div>
        );
    }

    const completedCount = snapshot?.tasks?.filter(t => t.status === 'completed').length || 0;
    const pendingCount = snapshot?.tasks?.filter(t => t.status === 'pending').length || 0;
    const hasCriticalAlerts = snapshot?.alerts?.some(a => a.type === 'critical');

    return (
        <div style={{ 
            backgroundColor: '#F8FAFC', 
            minHeight: '100vh', 
            width: '100%', 
            fontFamily: typography.fontFamily,
            paddingBottom: handoverSubmitted ? '40px' : '220px'
        }}>
            <ScreenHeader title="Shift Handover" showBack={true} onBack={() => navigate(-1)} />

            {/* Toast Notification */}
            {toastMessage && (
                <div style={{
                    position: 'fixed', top: '80px', left: '50%', transform: 'translateX(-50%)',
                    backgroundColor: colors.textPrimary, color: colors.white, padding: '12px 24px',
                    borderRadius: '8px', zIndex: 1000, display: 'flex', alignItems: 'center', gap: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}>
                    <CheckCircle2 size={18} color={toastMessage.includes('Failed') ? colors.alertRed : colors.primaryGreen} />
                    <span style={{ fontSize: '14px', fontWeight: '600' }}>{toastMessage}</span>
                </div>
            )}

            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

                {!handoverSubmitted && (
                    <Card style={{ padding: '20px', backgroundColor: colors.lightBlue + '22', border: `1.5px solid ${colors.primaryBlue}44` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                            <div style={{ backgroundColor: colors.primaryBlue, borderRadius: '6px', padding: '4px' }}>
                                <Users size={16} color="white" />
                            </div>
                            <h3 style={{ fontSize: '14px', fontWeight: '900', color: colors.textPrimary }}>Verification: Incoming Caretaker</h3>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={{ fontSize: '11px', fontWeight: '800', color: colors.textSecondary }}>FULL NAME</label>
                                <input 
                                    type="text" 
                                    placeholder="Enter incoming caretaker name"
                                    value={incomingName}
                                    onChange={(e) => setIncomingName(e.target.value)}
                                    style={{ padding: '12px', borderRadius: '10px', border: `1px solid ${colors.border}`, fontSize: '14px', fontWeight: '600' }}
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={{ fontSize: '11px', fontWeight: '800', color: colors.textSecondary }}>AGE (OPTIONAL)</label>
                                <input 
                                    type="number" 
                                    placeholder="Age"
                                    value={incomingAge}
                                    onChange={(e) => setIncomingAge(e.target.value)}
                                    style={{ padding: '12px', borderRadius: '10px', border: `1px solid ${colors.border}`, fontSize: '14px', fontWeight: '600' }}
                                />
                            </div>
                        </div>
                    </Card>
                )}

                {!snapshot && handoverSubmitted && (
                    <Card style={{ padding: '24px', textAlign: 'center' }}>
                        <Clock size={32} color={colors.textSecondary} style={{ margin: '0 auto 12px' }} />
                        <h3 style={{ fontSize: '16px', fontWeight: '900', color: colors.textPrimary }}>No previous shift data available</h3>
                        <p style={{ fontSize: '14px', color: colors.textSecondary, marginTop: '8px' }}>
                            Record the first handover for this patient to establish a baseline.
                        </p>
                    </Card>
                )}

                {snapshot && (
                    <>
                        {/* Header Info */}
                        <div style={{ 
                            backgroundColor: handoverSubmitted ? '#ECFDF5' : colors.white, 
                            padding: '16px', borderRadius: '12px', border: `1px solid ${handoverSubmitted ? '#A7F3D0' : colors.border}`,
                            display: 'flex', flexDirection: 'column', gap: '4px'
                        }}>
                            {handoverSubmitted ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#059669' }}>
                                    <CheckCircle2 size={16} />
                                    <h3 style={{ fontSize: '13px', fontWeight: '800', textTransform: 'uppercase' }}>
                                        Current Shift Submitted
                                    </h3>
                                </div>
                            ) : (
                                <h3 style={{ fontSize: '13px', fontWeight: '800', color: colors.textSecondary, textTransform: 'uppercase' }}>
                                    Previous Snapshot Info
                                </h3>
                            )}
                            <p style={{ fontSize: '16px', fontWeight: '800', color: colors.textPrimary, marginTop: '4px' }}>
                                {handoverSubmitted ? 'Submitted' : 'Previous Shift'} by {snapshot.caregiverName}
                            </p>
                            <p style={{ fontSize: '13px', color: colors.textSecondary, fontWeight: '600' }}>
                                Recorded at: {new Date(snapshot.createdAt?.toDate?.() || snapshot.createdAt).toLocaleString()}
                            </p>
                        </div>

                        {/* SECTION 1: Summary */}
                        <Card style={{ padding: '20px' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: '900', color: colors.textPrimary, marginBottom: '16px' }}>Handover Summary</h3>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <div style={{ flex: 1, backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <span style={{ fontSize: '28px', fontWeight: '900', color: '#059669' }}>{completedCount}</span>
                                    <span style={{ fontSize: '11px', fontWeight: '800', color: '#059669', textTransform: 'uppercase' }}>Completed Tasks</span>
                                </div>
                                <div style={{ flex: 1, backgroundColor: '#FEF2F2', padding: '16px', borderRadius: '12px', border: '1px solid #FECACA', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <span style={{ fontSize: '28px', fontWeight: '900', color: '#DC2626' }}>{pendingCount}</span>
                                    <span style={{ fontSize: '11px', fontWeight: '800', color: '#DC2626', textTransform: 'uppercase' }}>Pending Tasks</span>
                                </div>
                            </div>
                            {hasCriticalAlerts && (
                                <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#FEF2F2', borderRadius: '8px', border: '1px solid #FECACA', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <AlertTriangle size={18} color="#DC2626" />
                                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#DC2626' }}>Critical alerts were reported during this shift.</span>
                                </div>
                            )}
                        </Card>

                        {/* SECTION 2: Tasks */}
                        <Card style={{ padding: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                                <Pill size={20} color={colors.primaryBlue} />
                                <h3 style={{ fontSize: '16px', fontWeight: '900', color: colors.textPrimary }}>Tasks Snapshot</h3>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {snapshot.tasks?.length > 0 ? snapshot.tasks.map((t, idx) => (
                                    <div key={idx} style={{ 
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', 
                                        backgroundColor: '#F8FAFC', borderRadius: '8px', border: `1px solid ${colors.border}` 
                                    }}>
                                        <div>
                                            <div style={{ fontSize: '14px', fontWeight: '700', color: colors.textPrimary }}>{t.title}</div>
                                            <div style={{ fontSize: '12px', fontWeight: '600', color: colors.textSecondary }}>{t.time} • {t.category}</div>
                                        </div>
                                        <div>
                                            {t.status === 'completed' ? (
                                                <span style={{ fontSize: '11px', fontWeight: '800', padding: '4px 10px', backgroundColor: '#ECFDF5', color: '#059669', borderRadius: '999px' }}>COMPLETED</span>
                                            ) : (
                                                <span style={{ fontSize: '11px', fontWeight: '800', padding: '4px 10px', backgroundColor: '#FEF2F2', color: '#DC2626', borderRadius: '999px' }}>PENDING</span>
                                            )}
                                        </div>
                                    </div>
                                )) : (
                                    <p style={{ fontSize: '13px', color: colors.textSecondary }}>No tasks recorded.</p>
                                )}
                            </div>
                        </Card>

                        {/* SECTION 3: Vitals */}
                        <Card style={{ padding: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                                <HeartPulse size={20} color={colors.primaryBlue} />
                                <h3 style={{ fontSize: '16px', fontWeight: '900', color: colors.textPrimary }}>Latest Vitals Snapshot</h3>
                            </div>
                            {snapshot.vitals ? (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div style={{ padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: `1px solid ${colors.border}` }}>
                                        <div style={{ fontSize: '11px', fontWeight: '800', color: colors.textSecondary, textTransform: 'uppercase' }}>Heart Rate</div>
                                        <div style={{ fontSize: '18px', fontWeight: '900', color: colors.textPrimary }}>{snapshot.vitals.heartRate} <span style={{ fontSize: '12px', fontWeight: '600' }}>bpm</span></div>
                                    </div>
                                    <div style={{ padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: `1px solid ${colors.border}` }}>
                                        <div style={{ fontSize: '11px', fontWeight: '800', color: colors.textSecondary, textTransform: 'uppercase' }}>Blood Pressure</div>
                                        <div style={{ fontSize: '18px', fontWeight: '900', color: colors.textPrimary }}>{snapshot.vitals.bpSystolic}/{snapshot.vitals.bpDiastolic}</div>
                                    </div>
                                    <div style={{ padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: `1px solid ${colors.border}` }}>
                                        <div style={{ fontSize: '11px', fontWeight: '800', color: colors.textSecondary, textTransform: 'uppercase' }}>Temperature</div>
                                        <div style={{ fontSize: '18px', fontWeight: '900', color: colors.textPrimary }}>{snapshot.vitals.temperature}°C</div>
                                    </div>
                                </div>
                            ) : (
                                <p style={{ fontSize: '13px', color: colors.textSecondary }}>No vitals recorded.</p>
                            )}
                        </Card>

                        {/* SECTION 4: Observations */}
                        <Card style={{ padding: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                                <Smile size={20} color={colors.primaryBlue} />
                                <h3 style={{ fontSize: '16px', fontWeight: '900', color: colors.textPrimary }}>Observations Snapshot</h3>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {snapshot.observations?.length > 0 ? snapshot.observations.map((o, idx) => (
                                    <div key={idx} style={{ padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: `1px solid ${colors.border}` }}>
                                        <p style={{ fontSize: '13px', fontWeight: '700', color: colors.textPrimary }}>{o.isCritical ? 'Critical flag raised' : (o.mood ? `Patient mood: ${o.mood}` : 'Observation recorded')}</p>
                                    </div>
                                )) : (
                                    <p style={{ fontSize: '13px', color: colors.textSecondary }}>No observations recorded.</p>
                                )}
                            </div>
                        </Card>

                        {/* SECTION 5: Alerts */}
                        {(snapshot.alerts?.length > 0) && (
                            <Card style={{ padding: '20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                                    <AlertTriangle size={20} color={colors.alertRed} />
                                    <h3 style={{ fontSize: '16px', fontWeight: '900', color: colors.textPrimary }}>Active Alerts Snapshot</h3>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {snapshot.alerts.map((a, idx) => (
                                        <div key={idx} style={{ padding: '12px', backgroundColor: '#FEF2F2', borderRadius: '8px', border: `1px solid #FECACA` }}>
                                            <p style={{ fontSize: '13px', fontWeight: '700', color: '#991B1B' }}>{a.message}</p>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        )}
                    </>
                )}
            </div>

            {/* Bottom Button Fixed in Viewport */}
            {!handoverSubmitted && (
                <div style={{ 
                    position: 'fixed', bottom: 0, left: 0, right: 0, 
                    backgroundColor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)', 
                    padding: '24px 24px calc(24px + env(safe-area-inset-bottom))', 
                    borderTop: `1px solid ${colors.border}`, zIndex: 1001, 
                    display: 'flex', justifyContent: 'center' 
                }}>
                    <div style={{ width: '100%', maxWidth: '440px' }}>
                        <PrimaryButton 
                            label={recording ? "Recording..." : "Record Shift Handover"}
                            onClick={handleRecordHandover}
                            disabled={recording}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
