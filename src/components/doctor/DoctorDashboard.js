import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../context/AuthContext';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { getTodayDateString } from '../../utils/dateHelpers';
import { DS, statusMeta } from './ds';
import DoctorShell from './DoctorShell';
import PatientDetails from './PatientDetails';
import { seedSamplePatientsIfEmpty, subscribeToDoctorPatients } from '../../services/patientService';
import {
    Search, Activity, HeartPulse, Clock, Plus,
    Users, AlertTriangle, CheckCircle, UserPlus
} from 'lucide-react';

export default function DoctorDashboard() {
    const navigate = useNavigate();
    // Real Firebase UID for Google login; mock UID (dev-doctor) for dev mode
    const { user } = useAuthContext();
    const [patients, setPatients] = useState([]);
    const [enrichedPatients, setEnrichedPatients] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPatientId, setSelectedPatientId] = useState(null);
    const [alertCount, setAlertCount] = useState(0);
    const [seeded, setSeeded] = useState(false);

    // ── Auto-seed sample patients if Firestore is empty ──────
    useEffect(() => {
        if (!user?.uid || seeded) return;
        seedSamplePatientsIfEmpty(user.uid).then(() => setSeeded(true));
    }, [user?.uid, seeded]);

    // ── Subscribe to patients via patientService ─────────────
    useEffect(() => {
        if (!user?.uid) return;
        return subscribeToDoctorPatients(user.uid, (pts) => {
            setPatients(pts.map(pt => ({
                ...pt,
                status: 'ORANGE',
                lastUpdated: 'No data today',
                latestVitals: null,
            })));
        });
    }, [user?.uid, seeded]);

    // ── Enrich patients with today's vitals ──────────────────
    useEffect(() => {
        if (patients.length === 0) { setEnrichedPatients([]); return; }
        const today = getTodayDateString();
        let unsubs = [];
        let latestData = {};

        patients.forEach(pt => {
            const logsQ = query(
                collection(db, 'dailyLogs'),
                where('patientId', '==', pt.id),
                where('date', '==', today)
            );
            const u = onSnapshot(logsQ, (logSnap) => {
                let status = 'ORANGE', lastUpdated = 'No data today', latestVitals = null;
                if (!logSnap.empty) {
                    const data = logSnap.docs[0].data();
                    const vList = data.vitals || [];
                    if (vList.length > 0) {
                        latestVitals = vList[vList.length - 1];
                        lastUpdated = new Date(latestVitals.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        status = (latestVitals.alertTriggered || latestVitals.emergency) ? 'RED' : 'GREEN';
                    }
                }
                latestData[pt.id] = { status, lastUpdated, latestVitals };
                setEnrichedPatients(patients.map(p => ({ ...p, ...(latestData[p.id] || {}) })));
            }, () => {
                latestData[pt.id] = { status: 'ORANGE', lastUpdated: 'No data today', latestVitals: null };
            });
            unsubs.push(u);
        });

        return () => unsubs.forEach(u => u());
    }, [patients]);

    // ── Alert count subscription ─────────────────────────────
    useEffect(() => {
        if (!user?.uid) return;
        // Count unread alerts (all patients under this doctor)
        const q = query(collection(db, 'alerts'), where('isRead', '==', false));
        return onSnapshot(q, snap => setAlertCount(snap.size));
    }, [user?.uid]);

    const displayPatients = enrichedPatients.length > 0 ? enrichedPatients : patients;
    const filtered = displayPatients.filter(p =>
        !searchQuery || p.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const criticalCount = displayPatients.filter(p => p.status === 'RED').length;
    const orangeCount = displayPatients.filter(p => p.status === 'ORANGE').length;

    return (
        <DoctorShell alertCount={alertCount}>
            <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

                {/* ─── Patient List Panel ─── */}
                <div style={{ width: '320px', minWidth: '320px', backgroundColor: DS.surfaceLow, borderRight: `1px solid ${DS.outlineVariant}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <div style={{ padding: '20px 18px 14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <h2 style={{ fontSize: '20px', fontWeight: '900', color: DS.textPrimary, margin: 0, letterSpacing: '-0.4px' }}>My Patients</h2>
                            {/* Add Patient shortcut */}
                            <button
                                onClick={() => navigate('/doctor/add-patient')}
                                title="Add New Patient"
                                style={{
                                    width: '34px', height: '34px', borderRadius: '10px', border: 'none',
                                    background: `linear-gradient(135deg, ${DS.primary}, ${DS.primaryContainer})`,
                                    color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: 'pointer', flexShrink: 0,
                                    boxShadow: `0 4px 12px ${DS.primaryContainer}40`,
                                }}
                            >
                                <Plus size={18} />
                            </button>
                        </div>
                        <p style={{ fontSize: '13px', color: DS.textMuted, margin: '0 0 14px 0', fontWeight: '500' }}>
                            {displayPatients.length} total ·{' '}
                            {criticalCount > 0
                                ? <span style={{ color: DS.danger, fontWeight: '700' }}>{criticalCount} critical</span>
                                : orangeCount > 0
                                    ? <span style={{ color: DS.warning, fontWeight: '700' }}>{orangeCount} pending data</span>
                                    : <span style={{ color: DS.success, fontWeight: '700' }}>all stable</span>}
                        </p>
                        {/* Search */}
                        <div style={{ position: 'relative' }}>
                            <Search size={14} color={DS.textMuted} style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                            <input
                                placeholder="Find patient..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: '12px', border: 'none', outline: 'none', backgroundColor: DS.surfaceHighest, fontSize: '13px', color: DS.textPrimary, fontFamily: 'inherit', boxSizing: 'border-box' }}
                            />
                        </div>
                    </div>

                    {/* Patient Cards */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '0 14px 14px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {filtered.map(pt => {
                                const meta = statusMeta(pt.status);
                                const isSelected = selectedPatientId === pt.id;
                                // Use conditions (new field) OR condition (legacy) for display
                                const conditionDisplay = (pt.conditions || pt.condition || 'General Care').split(',')[0].trim();
                                return (
                                    <div key={pt.id} onClick={() => setSelectedPatientId(pt.id)} style={{
                                        backgroundColor: DS.surfaceLowest, borderRadius: '16px', padding: '14px', cursor: 'pointer',
                                        transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
                                        boxShadow: isSelected ? `0 8px 32px -4px rgba(0,40,142,0.18), 0 0 0 2px ${DS.primaryContainer}` : '0 2px 10px rgba(25,28,30,0.04)',
                                        transform: isSelected ? 'translateY(-1px)' : 'none',
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div style={{ width: '38px', height: '38px', borderRadius: '11px', background: `linear-gradient(135deg, ${DS.primaryContainer}20, ${DS.secondaryContainer}15)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '900', color: DS.primaryContainer, flexShrink: 0 }}>
                                                    {(pt.name || 'P').charAt(0)}
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '14px', fontWeight: '800', color: DS.textPrimary }}>{pt.name}</div>
                                                    <div style={{ fontSize: '11px', color: DS.textMuted, fontWeight: '500', marginTop: '1px' }}>
                                                        {pt.age} yrs · {pt.gender ? `${pt.gender} · ` : ''}{conditionDisplay}
                                                    </div>
                                                </div>
                                            </div>
                                            <span style={{ fontSize: '9px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.4px', color: meta.color, backgroundColor: meta.bg, padding: '3px 7px', borderRadius: '6px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                                {meta.label}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: DS.surfaceLow, borderRadius: '9px', padding: '7px 11px' }}>
                                            <div style={{ display: 'flex', gap: '14px' }}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: '700', color: DS.primaryContainer }}>
                                                    <Activity size={10} /> {pt.latestVitals ? `${pt.latestVitals.bpSystolic}/${pt.latestVitals.bpDiastolic}` : '--'}
                                                </span>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: '700', color: DS.danger }}>
                                                    <HeartPulse size={10} /> {pt.latestVitals?.heartRate || '--'}
                                                </span>
                                            </div>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: DS.textMuted, fontWeight: '600' }}>
                                                <Clock size={9} /> {pt.lastUpdated || 'No data today'}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}

                            {filtered.length === 0 && displayPatients.length > 0 && (
                                <div style={{ textAlign: 'center', padding: '32px 16px', color: DS.textMuted, fontSize: '13px', fontWeight: '600' }}>
                                    No patients match your search.
                                </div>
                            )}

                            {displayPatients.length === 0 && (
                                <div style={{ textAlign: 'center', padding: '40px 16px', color: DS.textMuted }}>
                                    <Users size={36} color={DS.surfaceHigh} style={{ marginBottom: '12px' }} />
                                    <p style={{ fontSize: '14px', fontWeight: '700', margin: '0 0 8px' }}>No patients yet</p>
                                    <p style={{ fontSize: '12px', fontWeight: '500', margin: 0 }}>Click + to add your first patient</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Add Patient CTA */}
                    <div style={{ padding: '12px 14px' }}>
                        <button
                            onClick={() => navigate('/doctor/add-patient')}
                            style={{
                                width: '100%', padding: '13px', borderRadius: '14px', border: 'none',
                                background: `linear-gradient(135deg, ${DS.primary}, ${DS.primaryContainer})`,
                                color: 'white', fontWeight: '800', fontSize: '14px', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                boxShadow: `0 6px 20px -2px ${DS.primaryContainer}50`, fontFamily: 'inherit',
                                transition: 'all 0.2s',
                            }}
                        >
                            <UserPlus size={16} /> Add New Patient
                        </button>
                    </div>
                </div>

                {/* ─── Right: Patient Detail or Welcome ─── */}
                <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    {selectedPatientId ? (
                        <PatientDetails
                            key={selectedPatientId}
                            inlinePatientId={selectedPatientId}
                            onClose={() => setSelectedPatientId(null)}
                        />
                    ) : (
                        <WelcomePanel
                            patients={displayPatients}
                            criticalCount={criticalCount}
                            alertCount={alertCount}
                            navigate={navigate}
                            onSelectPatient={setSelectedPatientId}
                            user={user}
                        />
                    )}
                </div>
            </div>
        </DoctorShell>
    );
}

function WelcomePanel({ patients, criticalCount, alertCount, navigate, onSelectPatient, user }) {
    const attentionPts = patients.filter(p => p.status === 'RED' || p.status === 'ORANGE');
    // Use real display name from Firebase Auth or fallback
    const doctorName = user?.displayName?.split(' ')[0] || 'Doctor';
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

    return (
        <div style={{ flex: 1, overflowY: 'auto', padding: '32px', backgroundColor: DS.surface }}>
            <div style={{ maxWidth: '740px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: '900', color: DS.textPrimary, margin: '0 0 6px 0', letterSpacing: '-0.6px' }}>
                    {greeting}, Dr. {doctorName} 👋
                </h1>
                <p style={{ fontSize: '15px', color: DS.textMuted, fontWeight: '500', margin: '0 0 32px 0' }}>
                    Here's your clinical overview for today.
                </p>

                {/* Stats Row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
                    {[
                        { label: 'Total Patients', value: patients.length, color: DS.primaryContainer, bg: DS.surfaceLowest },
                        { label: 'Active Alerts', value: alertCount, color: DS.danger, bg: '#FEF2F2', onClick: () => navigate('/doctor/alerts') },
                        { label: 'Stable Today', value: patients.filter(p => p.status === 'GREEN').length, color: DS.success, bg: '#DCFCE7' },
                    ].map((s, i) => (
                        <div key={i} onClick={s.onClick} style={{
                            backgroundColor: s.bg, borderRadius: '20px', padding: '20px 24px',
                            boxShadow: '0 4px 20px rgba(25,28,30,0.04)',
                            cursor: s.onClick ? 'pointer' : 'default',
                            transition: 'transform 0.15s',
                        }}
                            onMouseEnter={e => { if (s.onClick) e.currentTarget.style.transform = 'translateY(-2px)'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}
                        >
                            <div style={{ fontSize: '36px', fontWeight: '900', color: s.color, letterSpacing: '-1px', lineHeight: 1 }}>{s.value}</div>
                            <div style={{ fontSize: '12px', fontWeight: '700', color: DS.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '8px' }}>{s.label}</div>
                        </div>
                    ))}
                </div>

                {/* Needs Attention */}
                {attentionPts.length > 0 && (
                    <div style={{ marginBottom: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                            <AlertTriangle size={15} color={DS.danger} />
                            <span style={{ fontSize: '13px', fontWeight: '800', color: DS.textPrimary, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Needs Attention</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {attentionPts.map(pt => {
                                const meta = statusMeta(pt.status);
                                const condDisplay = (pt.conditions || pt.condition || 'General').split(',')[0].trim();
                                return (
                                    <div key={pt.id} onClick={() => onSelectPatient(pt.id)} style={{
                                        backgroundColor: DS.surfaceLowest, borderRadius: '16px', padding: '16px 20px',
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        cursor: 'pointer', boxShadow: '0 2px 12px rgba(25,28,30,0.04)', transition: 'all 0.2s',
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: '900', color: meta.color }}>
                                                {(pt.name || 'P').charAt(0)}
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '15px', fontWeight: '800', color: DS.textPrimary }}>{pt.name}</div>
                                                <div style={{ fontSize: '12px', color: DS.textMuted, fontWeight: '500' }}>
                                                    {pt.age} yrs · {condDisplay}
                                                    {pt.bloodGroup && <span style={{ marginLeft: '6px', fontSize: '11px', color: DS.danger, fontWeight: '700' }}>{pt.bloodGroup}</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <span style={{ fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', color: meta.color, backgroundColor: meta.bg, padding: '5px 10px', borderRadius: '8px' }}>
                                            {meta.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {attentionPts.length === 0 && patients.length > 0 && (
                    <div style={{ backgroundColor: '#DCFCE7', borderRadius: '20px', padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <CheckCircle size={32} color={DS.success} />
                        <div>
                            <div style={{ fontSize: '16px', fontWeight: '800', color: '#14532D' }}>All patients stable</div>
                            <div style={{ fontSize: '14px', color: '#166534', marginTop: '2px' }}>No abnormal readings or missed tasks today.</div>
                        </div>
                    </div>
                )}

                <p style={{ fontSize: '13px', color: DS.textMuted, textAlign: 'center', marginTop: '32px', fontWeight: '500' }}>
                    ← Select a patient to open their full clinical profile
                </p>
            </div>
        </div>
    );
}
