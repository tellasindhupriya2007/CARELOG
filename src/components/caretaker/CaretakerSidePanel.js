import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../context/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { subscribeToDailyLogs, subscribeToTasks } from '../../services/taskService';
import { listenToAlerts } from '../../services/alertService';
import { colors } from '../../styles/colors';
import { Activity, Bell, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function CaretakerSidePanel() {
    const navigate = useNavigate();
    const { patientId } = useAuthContext();
    const [progress, setProgress] = useState({ completed: 0, total: 0, percent: 0 });
    const [alerts, setAlerts] = useState([]);

    useEffect(() => {
        if (!patientId) return;

        // Subscribe to tasks and logs for progress
        const unsubTasks = subscribeToTasks(patientId, (tasks) => {
            const unsubLogs = subscribeToDailyLogs(patientId, (completions) => {
                const total = tasks.length;
                const completed = tasks.filter(t => completions[t.id]?.completed).length;
                setProgress({
                    completed,
                    total,
                    percent: total > 0 ? (completed / total) * 100 : 0
                });
            });
            return () => unsubLogs();
        });

        // Listen to active alerts
        const unsubAlerts = listenToAlerts(patientId, (fetchedAlerts) => {
             const activeUnread = fetchedAlerts.filter(a => !a.isRead).slice(0, 3);
             setAlerts(activeUnread);
        });

        return () => {
            unsubTasks();
            unsubAlerts();
        };
    }, [patientId]);

    if (!patientId) return null;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
            
            {/* 1. Quick Progress Summary Card */}
            <div style={{ backgroundColor: '#F0F9FF', padding: '24px', borderRadius: '16px', border: `1.5px solid #BAE6FD` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                    <div style={{ padding: '8px', backgroundColor: '#E0F2FE', borderRadius: '8px' }}>
                        <Activity size={18} color={colors.primaryBlue} />
                    </div>
                    <h4 style={{ fontSize: '15px', fontWeight: '800', color: '#0369A1' }}>Shift Progress</h4>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ position: 'relative', width: '60px', height: '60px', flexShrink: 0 }}>
                        <svg width="60" height="60" viewBox="0 0 80 80" style={{ transform: 'rotate(-90deg)' }}>
                            <circle cx="40" cy="40" r="32" fill="transparent" stroke="#E2E8F0" strokeWidth="6" />
                            <circle 
                                cx="40" cy="40" r="32" fill="transparent" 
                                stroke={colors.primaryBlue} strokeWidth="6" 
                                strokeDasharray={2 * Math.PI * 32} 
                                strokeDashoffset={(2 * Math.PI * 32) - (progress.percent / 100) * (2 * Math.PI * 32)} 
                                strokeLinecap="round" 
                            />
                        </svg>
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            <span style={{ fontSize: '13px', fontWeight: '900', color: colors.primaryBlue }}>{Math.round(progress.percent)}%</span>
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '20px', fontWeight: '900', color: colors.textPrimary, lineHeight: 1 }}>{progress.completed}/{progress.total}</span>
                        <span style={{ fontSize: '13px', color: colors.textSecondary, fontWeight: '700' }}>Tasks Completed</span>
                    </div>
                </div>
            </div>

            {/* 2. Active Alerts Preview */}
            <div style={{ backgroundColor: colors.white, padding: '24px', borderRadius: '16px', border: `1px solid ${colors.border}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ padding: '8px', backgroundColor: '#FEE2E2', borderRadius: '8px' }}>
                            <Bell size={18} color={colors.alertRed} />
                        </div>
                        <h4 style={{ fontSize: '15px', fontWeight: '800', color: colors.textPrimary }}>Active Alerts</h4>
                    </div>
                    {alerts.length > 0 && (
                        <span style={{ fontSize: '11px', fontWeight: '800', color: colors.alertRed, backgroundColor: '#FEF2F2', padding: '4px 8px', borderRadius: '6px' }}>
                            {alerts.length} NEW
                        </span>
                    )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {alerts.length > 0 ? (
                        alerts.map(a => (
                            <div key={a.id} style={{ display: 'flex', gap: '12px', padding: '12px', backgroundColor: a.type === 'critical' ? '#FEF2F2' : '#FFFBEB', borderRadius: '12px', border: `1px solid ${a.type === 'critical' ? '#FEE2E2' : '#FEF3C7'}` }}>
                                <AlertTriangle size={16} color={a.type === 'critical' ? '#EF4444' : '#F59E0B'} style={{ marginTop: '2px', flexShrink: 0 }} />
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <span style={{ fontSize: '13px', fontWeight: '800', color: colors.textPrimary, lineHeight: 1.3 }}>{a.message}</span>
                                    <span style={{ fontSize: '11px', fontWeight: '800', color: colors.textSecondary, textTransform: 'uppercase' }}>{a.type}</span>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px', backgroundColor: '#ECFDF5', borderRadius: '12px', border: '1px solid #D1FAE5' }}>
                            <CheckCircle2 size={16} color="#10B981" />
                            <span style={{ fontSize: '12px', fontWeight: '700', color: '#065F46' }}>No active alerts. Patient stable.</span>
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
}
