import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    AlertTriangle, Bell, Clock, CheckCircle2, ChevronRight, 
    XCircle, Info, Filter, ArrowLeft 
} from 'lucide-react';
import { colors } from '../../styles/colors';
import { spacing } from '../../styles/spacing';
import ScreenHeader from '../../components/common/ScreenHeader';

const mockAlerts = [
    {
        id: '1',
        title: 'Missed Medication',
        description: 'Patient missed the 09:00 AM dose of Paracetamol.',
        severity: 'High',
        timestamp: '2 minutes ago',
        status: 'Active',
        category: 'Medication'
    },
    {
        id: '2',
        title: 'Abnormal Heart Rate',
        description: 'BPM detected at 112 during latest vitals registration (Target: <100).',
        severity: 'High',
        timestamp: '15 minutes ago',
        status: 'Active',
        category: 'Vitals'
    },
    {
        id: '3',
        title: 'Slightly High Blood Pressure',
        description: 'Reading of 145/95 recorded. Above normal range but not critical.',
        severity: 'Medium',
        timestamp: '1 hour ago',
        status: 'Active',
        category: 'Vitals'
    },
    {
        id: '4',
        title: 'Routine Check Reminder',
        description: 'Bi-hourly positioning check is due for the patient.',
        severity: 'Low',
        timestamp: '3 hours ago',
        status: 'Resolved',
        category: 'Routine'
    },
    {
        id: '5',
        title: 'Hydration Protocol',
        description: 'Patient has not reached daily hydration target. Encourage fluid intake.',
        severity: 'Medium',
        timestamp: '5 hours ago',
        status: 'Resolved',
        category: 'Nutrition'
    }
];

const severityConfig = {
    High: { color: '#EF4444', bg: '#FEF2F2', border: '#FEE2E2', icon: AlertTriangle },
    Medium: { color: '#F59E0B', bg: '#FFFBEB', border: '#FEF3C7', icon: Info },
    Low: { color: '#3B82F6', bg: '#EFF6FF', border: '#DBEAFE', icon: Bell }
};

export default function AlertsScreen() {
    const navigate = useNavigate();
    const [filter, setFilter] = useState('All');
    const [alerts, setAlerts] = useState(mockAlerts);

    const filteredAlerts = alerts.filter(alert => {
        if (filter === 'All') return true;
        return alert.status === filter;
    });

    const handleResolve = (id) => {
        setAlerts(prev => prev.map(a => 
            a.id === id ? { ...a, status: 'Resolved' } : a
        ));
    };

    return (
        <div style={{ backgroundColor: colors.background, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <ScreenHeader title="Alerts" subtitle="Recent patient alerts and notifications" showBack onBack={() => navigate(-1)} />

            <main 
                className="main-content" 
                style={{ 
                    padding: 'calc(var(--header-h) + 24px + env(safe-area-inset-top)) 20px 40px 20px', 
                    flex: 1, 
                    maxWidth: '800px', 
                    margin: '0 auto', 
                    width: '100%' 
                }}
            >
                {/* Filter Tabs */}
                <div style={{ 
                    display: 'flex', backgroundColor: '#E2E8F0', padding: '4px', borderRadius: '12px', marginBottom: '24px' 
                }}>
                    {['All', 'Active', 'Resolved'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setFilter(tab)}
                            style={{
                                flex: 1, padding: '8px', border: 'none', borderRadius: '8px',
                                backgroundColor: filter === tab ? colors.white : 'transparent',
                                color: filter === tab ? colors.textPrimary : colors.textSecondary,
                                fontSize: '13px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s',
                                boxShadow: filter === tab ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                            }}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Alerts List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {filteredAlerts.length > 0 ? (
                        filteredAlerts.map((alert) => {
                            const config = severityConfig[alert.severity];
                            const Icon = config.icon;
                            const isResolved = alert.status === 'Resolved';

                            return (
                                <div key={alert.id} style={{ 
                                    backgroundColor: colors.white, 
                                    borderRadius: '16px', 
                                    border: `1.5px solid ${isResolved ? '#F1F5F9' : config.border}`,
                                    padding: '20px',
                                    position: 'relative',
                                    transition: 'transform 0.2s',
                                    opacity: isResolved ? 0.8 : 1
                                }}>
                                    <div style={{ display: 'flex', gap: '16px' }}>
                                        <div style={{ 
                                            width: '40px', height: '40px', borderRadius: '10px', 
                                            backgroundColor: config.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 
                                        }}>
                                            <Icon size={20} color={config.color} />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                                                <h3 style={{ fontSize: '15px', fontWeight: '800', color: colors.textPrimary }}>{alert.title}</h3>
                                                <span style={{ 
                                                    fontSize: '11px', fontWeight: '800', padding: '2px 8px', borderRadius: '6px', 
                                                    backgroundColor: isResolved ? '#F1F5F9' : config.bg, 
                                                    color: isResolved ? colors.textSecondary : config.color,
                                                    textTransform: 'uppercase'
                                                }}>
                                                    {alert.severity}
                                                </span>
                                            </div>
                                            <p style={{ fontSize: '13px', color: colors.textSecondary, lineHeight: '1.5', marginBottom: '12px' }}>
                                                {alert.description}
                                            </p>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: colors.textSecondary }}>
                                                    <Clock size={12} />
                                                    <span style={{ fontSize: '11px', fontWeight: '600' }}>{alert.timestamp}</span>
                                                </div>
                                                {!isResolved ? (
                                                    <button 
                                                        onClick={() => handleResolve(alert.id)}
                                                        style={{ 
                                                            backgroundColor: colors.primaryBlue, color: colors.white, border: 'none', borderRadius: '8px',
                                                            padding: '6px 12px', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
                                                            display: 'flex', alignItems: 'center', gap: '4px'
                                                        }}
                                                    >
                                                        <CheckCircle2 size={12} /> Mark as Resolved
                                                    </button>
                                                ) : (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#10B981' }}>
                                                        <CheckCircle2 size={12} />
                                                        <span style={{ fontSize: '12px', fontWeight: '700' }}>Resolved</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div style={{ 
                            textAlign: 'center', padding: '60px 20px', backgroundColor: colors.white, borderRadius: '24px', border: `1.5px dashed ${colors.border}`
                        }}>
                            <CheckCircle2 size={48} color={colors.primaryBlue} style={{ opacity: 0.2, marginBottom: '16px' }} />
                            <h3 style={{ fontSize: '16px', fontWeight: '800', color: colors.textPrimary }}>All clear!</h3>
                            <p style={{ fontSize: '13px', color: colors.textSecondary }}>No {filter.toLowerCase()} alerts to display.</p>
                        </div>
                    )}
                </div>
            </main>

            <footer style={{ padding: '20px', textAlign: 'center', borderTop: `1px solid ${colors.border}`, backgroundColor: colors.white }}>
                <p style={{ fontSize: '11px', color: colors.textSecondary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    * Logged actions are permanent and time-stamped.
                </p>
            </footer>
        </div>
    );
}
