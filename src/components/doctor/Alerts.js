import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { DS, card, sectionLabel, gradientBtn, statusMeta } from './ds';
import DoctorShell from './DoctorShell';
import { Bell, AlertTriangle, CheckCircle, ExternalLink, Filter, Clock, User } from 'lucide-react';

const SEVERITY_TABS = ['All', 'Critical', 'Warning', 'Resolved'];

// Skeleton Loader
function Skeleton({ height = '60px', borderRadius = '14px' }) {
    return (
        <div style={{ height, borderRadius, backgroundColor: DS.surfaceHigh, animation: 'pulse 1.5s ease-in-out infinite' }} />
    );
}

export default function DoctorAlerts() {
    const navigate = useNavigate();
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('All');
    const [alertCount, setAlertCount] = useState(0);
    const [error, setError] = useState(null);

    useEffect(() => {
        try {
            const q = query(collection(db, 'alerts'));
            const unsub = onSnapshot(q, (snap) => {
                const data = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => {
                    const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
                    const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
                    return tb - ta;
                });
                setAlerts(data);
                setAlertCount(data.filter(a => !a.isRead && a.status !== 'resolved').length);
                setLoading(false);
            }, (err) => { setError('Failed to load alerts.'); setLoading(false); });
            return () => unsub();
        } catch (e) {
            setError('Failed to load alerts.');
            setLoading(false);
        }
    }, []);

    const handleResolve = async (alertId) => {
        try {
            await updateDoc(doc(db, 'alerts', alertId), { isRead: true, status: 'resolved' });
        } catch (e) { console.error(e); }
    };

    const filtered = alerts.filter(a => {
        if (activeTab === 'All') return a.status !== 'resolved';
        if (activeTab === 'Resolved') return a.status === 'resolved';
        return a.severity === activeTab.toLowerCase() && a.status !== 'resolved';
    });

    const criticalCount = alerts.filter(a => a.severity === 'critical' && a.status !== 'resolved').length;
    const warningCount = alerts.filter(a => a.severity === 'warning' && a.status !== 'resolved').length;

    return (
        <DoctorShell alertCount={alertCount}>
            <div style={{ flex: 1, overflowY: 'auto', backgroundColor: DS.surface, padding: '32px' }}>
                <div style={{ maxWidth: '860px', margin: '0 auto' }}>

                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
                        <div>
                            <h1 style={{ fontSize: '28px', fontWeight: '900', color: DS.textPrimary, margin: '0 0 6px 0', letterSpacing: '-0.6px' }}>Alerts</h1>
                            <p style={{ fontSize: '14px', color: DS.textMuted, fontWeight: '500', margin: 0 }}>
                                {criticalCount > 0 && <span style={{ color: DS.danger, fontWeight: '700' }}>{criticalCount} critical · </span>}
                                {warningCount > 0 && <span style={{ color: DS.warning, fontWeight: '700' }}>{warningCount} warnings · </span>}
                                {alerts.filter(a => a.status === 'resolved').length} resolved
                            </p>
                        </div>
                    </div>

                    {/* Stats Strip */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '28px' }}>
                        {[
                            { label: 'Active Alerts', value: alerts.filter(a => a.status !== 'resolved').length, color: DS.primaryContainer, bg: '#EEF2FF' },
                            { label: 'Critical', value: criticalCount, color: DS.danger, bg: '#FEF2F2' },
                            { label: 'Resolved', value: alerts.filter(a => a.status === 'resolved').length, color: DS.success, bg: '#DCFCE7' },
                        ].map((s, i) => (
                            <div key={i} style={{ backgroundColor: s.bg, borderRadius: '18px', padding: '18px 22px', boxShadow: '0 4px 16px rgba(25,28,30,0.04)' }}>
                                <div style={{ fontSize: '32px', fontWeight: '900', color: s.color, letterSpacing: '-1px', lineHeight: 1 }}>{s.value}</div>
                                <div style={{ fontSize: '11px', fontWeight: '700', color: DS.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '6px' }}>{s.label}</div>
                            </div>
                        ))}
                    </div>

                    {/* Tabs */}
                    <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', backgroundColor: DS.surfaceLowest, borderRadius: '14px', padding: '4px' }}>
                        {SEVERITY_TABS.map(tab => (
                            <button key={tab} onClick={() => setActiveTab(tab)} style={{
                                flex: 1, padding: '10px 16px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                                fontSize: '13px', fontWeight: '700', transition: 'all 0.2s',
                                backgroundColor: activeTab === tab ? DS.primaryContainer : 'transparent',
                                color: activeTab === tab ? 'white' : DS.textSecondary,
                            }}>
                                {tab}
                            </button>
                        ))}
                    </div>

                    {/* Error */}
                    {error && (
                        <div style={{ backgroundColor: '#FEF2F2', borderRadius: '14px', padding: '16px 20px', color: DS.danger, fontWeight: '700', marginBottom: '16px' }}>
                            ⚠ {error}
                        </div>
                    )}

                    {/* Alert List */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {loading && [1, 2, 3, 4].map(i => <Skeleton key={i} height="88px" />)}

                        {!loading && filtered.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '60px 20px', color: DS.textMuted }}>
                                <CheckCircle size={44} color={DS.success} style={{ display: 'block', margin: '0 auto 16px' }} />
                                <div style={{ fontSize: '16px', fontWeight: '800', color: DS.textPrimary, marginBottom: '6px' }}>All clear!</div>
                                <div style={{ fontSize: '14px', fontWeight: '500' }}>No {activeTab !== 'All' ? activeTab.toLowerCase() : ''} alerts at this time.</div>
                            </div>
                        )}

                        {!loading && filtered.map(alert => (
                            <AlertCard key={alert.id} alert={alert} onResolve={handleResolve} onViewPatient={(pid) => navigate(`/doctor/dashboard?patient=${pid}`)} />
                        ))}
                    </div>
                </div>
            </div>
            <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
        </DoctorShell>
    );
}

function AlertCard({ alert, onResolve, onViewPatient }) {
    const isResolved = alert.status === 'resolved';
    const isCritical = alert.severity === 'critical';
    const isWarning = alert.severity === 'warning';

    const severityColor = isCritical ? DS.danger : isWarning ? DS.warning : DS.success;
    const severityBg = isCritical ? '#FEF2F2' : isWarning ? '#FEF3C7' : '#DCFCE7';
    const severityLabel = isCritical ? 'CRITICAL' : isWarning ? 'WARNING' : 'NORMAL';

    const timeAgo = (ts) => {
        if (!ts) return 'Unknown';
        const diff = Date.now() - new Date(ts).getTime();
        const m = Math.floor(diff / 60000);
        if (m < 60) return `${m}m ago`;
        const h = Math.floor(m / 60);
        if (h < 24) return `${h}h ago`;
        return `${Math.floor(h / 24)}d ago`;
    };

    return (
        <div style={{
            backgroundColor: DS.surfaceLowest, borderRadius: '18px', padding: '18px 20px',
            boxShadow: isCritical && !isResolved ? '0 4px 20px rgba(239,68,68,0.1)' : '0 4px 16px rgba(25,28,30,0.04)',
            border: isCritical && !isResolved ? '1px solid rgba(239,68,68,0.2)' : '1px solid transparent',
            opacity: isResolved ? 0.65 : 1,
            transition: 'all 0.2s',
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '14px', flex: 1 }}>
                    {/* Icon */}
                    <div style={{ width: '44px', height: '44px', borderRadius: '14px', backgroundColor: severityBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {isCritical ? <AlertTriangle size={22} color={severityColor} /> : isWarning ? <Bell size={22} color={severityColor} /> : <CheckCircle size={22} color={severityColor} />}
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '15px', fontWeight: '800', color: DS.textPrimary }}>{alert.patientName || 'Patient'}</span>
                            <span style={{ fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', color: severityColor, backgroundColor: severityBg, padding: '3px 8px', borderRadius: '6px' }}>
                                {isResolved ? 'RESOLVED' : severityLabel}
                            </span>
                        </div>
                        <p style={{ fontSize: '14px', color: DS.textSecondary, fontWeight: '600', margin: '0 0 8px 0', lineHeight: 1.5 }}>{alert.message}</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: DS.textMuted, fontWeight: '600' }}>
                                <Clock size={11} /> {timeAgo(alert.timestamp)}
                            </span>
                            {alert.source && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: DS.textMuted, fontWeight: '600', textTransform: 'capitalize' }}>
                                    <User size={11} /> Source: {alert.source}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Actions */}
                {!isResolved && (
                    <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                        {alert.patientId && (
                            <button onClick={() => onViewPatient(alert.patientId)} title="View Patient" style={{ padding: '8px 14px', borderRadius: '10px', border: 'none', backgroundColor: '#EEF2FF', color: DS.primaryContainer, fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontFamily: 'inherit' }}>
                                <ExternalLink size={13} /> Patient
                            </button>
                        )}
                        <button onClick={() => onResolve(alert.id)} title="Mark Resolved" style={{ padding: '8px 14px', borderRadius: '10px', border: 'none', backgroundColor: '#DCFCE7', color: DS.success, fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontFamily: 'inherit' }}>
                            <CheckCircle size={13} /> Resolve
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
