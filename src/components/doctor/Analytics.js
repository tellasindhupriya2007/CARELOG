import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { DS, card, sectionLabel } from './ds';
import DoctorShell from './DoctorShell';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Activity, Users, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';

const WEEKLY_MOCK = [
    { day: 'Mon', bp: 128, hr: 76, alerts: 1 },
    { day: 'Tue', bp: 135, hr: 82, alerts: 2 },
    { day: 'Wed', bp: 122, hr: 74, alerts: 0 },
    { day: 'Thu', bp: 145, hr: 90, alerts: 3 },
    { day: 'Fri', bp: 130, hr: 78, alerts: 1 },
    { day: 'Sat', bp: 118, hr: 72, alerts: 0 },
    { day: 'Sun', bp: 126, hr: 75, alerts: 1 },
];

function Skeleton({ height = '60px' }) {
    return <div style={{ height, borderRadius: '14px', backgroundColor: DS.surfaceHigh, animation: 'pulse 1.5s ease-in-out infinite', marginBottom: '8px' }} />;
}

export default function DoctorAnalytics() {
    const [patients, setPatients] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const u1 = onSnapshot(collection(db, 'patients'), s => { setPatients(s.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); });
        const u2 = onSnapshot(collection(db, 'alerts'), s => setAlerts(s.docs.map(d => ({ id: d.id, ...d.data() }))));
        return () => { u1(); u2(); };
    }, []);

    const critical = alerts.filter(a => a.severity === 'critical' && a.status !== 'resolved').length;
    const resolved = alerts.filter(a => a.status === 'resolved').length;
    const statusData = [
        { name: 'Critical', value: alerts.filter(a => a.severity === 'critical').length, color: DS.danger },
        { name: 'Warning', value: alerts.filter(a => a.severity === 'warning').length, color: DS.warning },
        { name: 'Resolved', value: resolved, color: DS.success },
    ];

    return (
        <DoctorShell alertCount={alerts.filter(a => !a.isRead).length}>
            <div style={{ flex: 1, overflowY: 'auto', backgroundColor: DS.surface, padding: '32px' }}>
                <div style={{ maxWidth: '960px', margin: '0 auto' }}>
                    <h1 style={{ fontSize: '28px', fontWeight: '900', color: DS.textPrimary, margin: '0 0 6px 0', letterSpacing: '-0.6px' }}>Analytics</h1>
                    <p style={{ fontSize: '14px', color: DS.textMuted, fontWeight: '500', margin: '0 0 28px 0' }}>Clinical performance overview for your patient panel.</p>

                    {/* KPI Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
                        {loading ? [1,2,3,4].map(i => <Skeleton key={i} height="100px" />) : [
                            { label: 'Total Patients', value: patients.length, color: DS.primaryContainer, bg: '#EEF2FF', icon: Users },
                            { label: 'Active Alerts', value: critical, color: DS.danger, bg: '#FEF2F2', icon: AlertTriangle },
                            { label: 'Resolved', value: resolved, color: DS.success, bg: '#DCFCE7', icon: CheckCircle },
                            { label: 'Avg Compliance', value: '84%', color: DS.warning, bg: '#FEF3C7', icon: TrendingUp },
                        ].map((s, i) => (
                            <div key={i} style={{ backgroundColor: s.bg, borderRadius: '18px', padding: '18px 20px', boxShadow: '0 4px 16px rgba(25,28,30,0.04)' }}>
                                <s.icon size={20} color={s.color} style={{ marginBottom: '8px' }} />
                                <div style={{ fontSize: '32px', fontWeight: '900', color: s.color, letterSpacing: '-1px', lineHeight: 1 }}>{s.value}</div>
                                <div style={{ fontSize: '11px', fontWeight: '700', color: DS.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '6px' }}>{s.label}</div>
                            </div>
                        ))}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '20px' }}>
                        {/* Weekly BP Trend */}
                        <div style={card()}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                                <Activity size={15} color={DS.primaryContainer} />
                                <span style={sectionLabel}>Weekly Average BP</span>
                            </div>
                            <ResponsiveContainer width="100%" height={200}>
                                <LineChart data={WEEKLY_MOCK} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={DS.surfaceHigh} />
                                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: DS.textMuted }} />
                                    <YAxis domain={[100, 160]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: DS.textMuted }} />
                                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 28px rgba(0,0,0,0.08)', fontFamily: 'Inter', fontSize: '12px' }} />
                                    <Line type="monotone" dataKey="bp" stroke={DS.primaryContainer} strokeWidth={3} dot={{ r: 4, fill: DS.primaryContainer }} name="Avg BP (sys)" />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Alert Distribution */}
                        <div style={card()}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                                <AlertTriangle size={15} color={DS.danger} />
                                <span style={sectionLabel}>Alert Distribution</span>
                            </div>
                            <ResponsiveContainer width="100%" height={160}>
                                <PieChart>
                                    <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} dataKey="value" paddingAngle={4}>
                                        {statusData.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                                    </Pie>
                                    <Tooltip contentStyle={{ borderRadius: '10px', border: 'none', fontFamily: 'Inter', fontSize: '12px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {statusData.map((s, i) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: s.color }} />
                                            <span style={{ fontSize: '12px', fontWeight: '600', color: DS.textSecondary }}>{s.name}</span>
                                        </div>
                                        <span style={{ fontSize: '13px', fontWeight: '800', color: s.color }}>{s.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Weekly Alerts Bar Chart */}
                    <div style={card()}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                            <AlertTriangle size={15} color={DS.warning} />
                            <span style={sectionLabel}>Daily Alert Volume (This Week)</span>
                        </div>
                        <ResponsiveContainer width="100%" height={180}>
                            <BarChart data={WEEKLY_MOCK} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={DS.surfaceHigh} />
                                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: DS.textMuted }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: DS.textMuted }} allowDecimals={false} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', fontFamily: 'Inter', fontSize: '12px' }} />
                                <Bar dataKey="alerts" fill={DS.primaryContainer} radius={[6, 6, 0, 0]} name="Alerts" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
            <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
        </DoctorShell>
    );
}
