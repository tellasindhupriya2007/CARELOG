import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthContext } from '../../context/AuthContext';
import { collection, query, where, onSnapshot, doc, addDoc, getDoc, updateDoc, deleteDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import ScreenHeader from '../common/ScreenHeader';
import { DS, card, gradientBtn, sectionLabel } from './ds';
import { subscribeToPatientMedia } from '../../services/mediaService';
import { subscribeToTasks, addTask, deleteRelativeTask } from '../../services/taskService';
import {
    Activity, ShieldAlert, Clock, FileText, Pill, AlertTriangle, CheckCircle,
    MessageCircle, Image, Clipboard, Plus, Trash2, Edit3, Save, X, Download, Eye
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const TABS = ['Overview', 'Vitals', 'Logs', 'Media', 'Prescriptions', 'Care Plan', 'Notes'];

export default function PatientDetails({ inlinePatientId, onClose }) {
    const navigate = useNavigate();
    const { user } = useAuthContext();
    const { id: paramId } = useParams();
    const id = inlinePatientId || paramId;

    const [patient, setPatient] = useState(null);
    const [vitalsHistory, setVitalsHistory] = useState([]);
    const [careLogs, setCareLogs] = useState([]);
    const [clinicalNotes, setClinicalNotes] = useState([]);
    const [media, setMedia] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [newNote, setNewNote] = useState('');
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('Overview');

    useEffect(() => {
        if (!id) return;
        const subs = [];

        // Patient profile
        subs.push(onSnapshot(doc(db, 'patients', id), (ds) => {
            if (ds.exists()) setPatient({ id: ds.id, ...ds.data() });
        }));

        // Daily logs → vitals + care logs
        const logsQ = query(collection(db, 'dailyLogs'), where('patientId', '==', id));
        subs.push(onSnapshot(logsQ, (snap) => {
            let vHistory = [], cLogs = [];
            snap.docs.forEach(docSnap => {
                const data = docSnap.data();
                if (data.vitals?.length) vHistory.push(...data.vitals.map(v => ({ ...v, logId: docSnap.id, date: data.date })));
                if (data.completions) {
                    Object.keys(data.completions).forEach(taskId => {
                        const t = data.completions[taskId];
                        if (t) cLogs.push({ logId: docSnap.id, taskId, date: data.date, caregiver: t.completedBy || 'Caregiver', timestamp: t.timestamp || t.completedAt, note: t.note, status: t.doctorStatus || 'Pending' });
                    });
                }
            });
            vHistory.sort((a, b) => new Date(b.recordedAt) - new Date(a.recordedAt));
            cLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            setVitalsHistory(vHistory);
            setCareLogs(cLogs);
        }));

        // Clinical notes
        const notesQ = query(collection(db, 'notes'), where('patientId', '==', id));
        subs.push(onSnapshot(notesQ, (snap) => {
            const notes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            notes.sort((a, b) => b.timestamp - a.timestamp);
            setClinicalNotes(notes);
        }));

        // Media
        const mediaUnsub = subscribeToPatientMedia(id, setMedia);
        subs.push(mediaUnsub);

        // Tasks
        const taskUnsub = subscribeToTasks(id, setTasks);
        subs.push(taskUnsub);

        setLoading(false);
        return () => subs.forEach(u => u && u());
    }, [id]);

    const handleAddNote = async () => {
        if (!newNote.trim()) return;
        await addDoc(collection(db, 'notes'), { 
            patientId: id, 
            doctorId: user.uid, 
            authorName: user.displayName || 'Doctor',
            note: newNote, 
            timestamp: Date.now(), 
            visibleToFamily: true, 
            visibleToCaregiver: true 
        });
        setNewNote('');
    };

    const handleLogAction = async (logId, taskId, action) => {
        const logRef = doc(db, 'dailyLogs', logId);
        const logSnap = await getDoc(logRef);
        if (!logSnap.exists()) return;
        const data = logSnap.data();
        const upd = { ...data.completions };
        if (upd[taskId]) upd[taskId].doctorStatus = action;
        await updateDoc(logRef, { completions: upd });
        if (action === 'Needs Review') {
            await addDoc(collection(db, 'alerts'), { patientId: id, patientName: patient?.name || '', type: 'warning', severity: 'warning', message: 'Doctor flagged care log for review.', timestamp: new Date().toISOString(), isRead: false, status: 'active' });
        }
    };

    if (loading || !patient) {
        return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: DS.textMuted, fontFamily: 'Inter, sans-serif', gap: '12px' }}>Loading patient data...</div>;
    }

    const trendData = [...vitalsHistory].reverse().slice(-14).map(v => ({
        time: new Date(v.recordedAt).toLocaleDateString([], { month: 'short', day: 'numeric' }),
        sys: v.bpSystolic, dia: v.bpDiastolic, hr: v.heartRate, temp: v.temperature
    }));

    // Inline (dashboard) vs standalone (route)
    const isInline = !!inlinePatientId;

    const Inner = () => (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: 'Inter, sans-serif', backgroundColor: DS.surface }}>
            {/* Hero Header */}
            <div style={{ backgroundColor: DS.surfaceLowest, borderBottom: `1px solid ${DS.outlineVariant}`, padding: '20px 28px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{ width: '52px', height: '52px', borderRadius: '16px', background: `linear-gradient(135deg, ${DS.primaryContainer}25, ${DS.secondaryContainer}15)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: '900', color: DS.primaryContainer }}>
                            {(patient.name || 'P').charAt(0)}
                        </div>
                        <div>
                            <h1 style={{ fontSize: '22px', fontWeight: '900', color: DS.textPrimary, margin: 0, letterSpacing: '-0.4px' }}>{patient.name}</h1>
                            <p style={{ fontSize: '13px', fontWeight: '600', color: DS.textMuted, margin: '3px 0 0 0' }}>
                                {patient.age} yrs · {patient.condition || 'General Care'} · {patient.bloodGroup || 'Blood unknown'}
                            </p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button style={{ ...gradientBtn(DS.secondary, DS.secondaryContainer, { padding: '9px 18px', fontSize: '13px', borderRadius: '12px' }) }}>
                            <MessageCircle size={15} /> Contact
                        </button>
                        {isInline && onClose && (
                            <button onClick={onClose} style={{ width: '36px', height: '36px', borderRadius: '10px', border: 'none', backgroundColor: DS.surfaceHigh, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                <X size={16} color={DS.textSecondary} />
                            </button>
                        )}
                    </div>
                </div>
                {/* Tab Bar */}
                <div style={{ display: 'flex', gap: '2px', overflowX: 'auto' }}>
                    {TABS.map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)} style={{
                            padding: '10px 16px', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                            fontSize: '13px', fontWeight: activeTab === tab ? '800' : '600',
                            color: activeTab === tab ? DS.primaryContainer : DS.textMuted,
                            background: 'transparent', whiteSpace: 'nowrap',
                            borderBottom: activeTab === tab ? `2.5px solid ${DS.primaryContainer}` : '2.5px solid transparent',
                            transition: 'all 0.2s',
                        }}>
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
                {activeTab === 'Overview' && <OverviewTab patient={patient} vitalsHistory={vitalsHistory} trendData={trendData} id={id} patientId={id} />}
                {activeTab === 'Vitals' && <VitalsTab vitalsHistory={vitalsHistory} trendData={trendData} />}
                {activeTab === 'Logs' && <LogsTab careLogs={careLogs} onAction={handleLogAction} />}
                {activeTab === 'Media' && <MediaTab media={media} />}
                {activeTab === 'Prescriptions' && <PrescriptionsTab patient={patient} patientId={id} />}
                {activeTab === 'Care Plan' && <CarePlanTab tasks={tasks} patientId={id} />}
                {activeTab === 'Notes' && <NotesTab clinicalNotes={clinicalNotes} newNote={newNote} setNewNote={setNewNote} onAdd={handleAddNote} />}
            </div>
        </div>
    );

    if (!isInline) {
        return (
            <div style={{ minHeight: '100vh' }}>
                <ScreenHeader title={patient.name} showBack onBack={() => navigate(-1)} />
                <Inner />
            </div>
        );
    }
    return <Inner />;
}

// ─── OVERVIEW TAB ──────────────────────────────────────────────────────────
function OverviewTab({ patient, vitalsHistory, trendData, id }) {
    const lastVitals = vitalsHistory[0];
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Quick vitals strip */}
            {lastVitals && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                    {[
                        { label: 'Blood Pressure', value: `${lastVitals.bpSystolic}/${lastVitals.bpDiastolic}`, unit: 'mmHg', color: DS.primaryContainer, bg: '#EEF2FF' },
                        { label: 'Heart Rate', value: lastVitals.heartRate, unit: 'bpm', color: DS.danger, bg: '#FEF2F2' },
                        { label: 'Temperature', value: lastVitals.temperature || 'N/A', unit: '°C', color: DS.warning, bg: '#FEF3C7' },
                        { label: 'SpO2', value: lastVitals.spo2 || 'N/A', unit: '%', color: DS.success, bg: '#DCFCE7' },
                    ].map((v, i) => (
                        <div key={i} style={{ backgroundColor: v.bg, borderRadius: '16px', padding: '16px' }}>
                            <div style={{ fontSize: '11px', fontWeight: '700', color: DS.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>{v.label}</div>
                            <div style={{ fontSize: '22px', fontWeight: '900', color: v.color, letterSpacing: '-0.5px' }}>{v.value}</div>
                            <div style={{ fontSize: '11px', fontWeight: '600', color: DS.textMuted }}>{v.unit}</div>
                        </div>
                    ))}
                </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {/* Clinical Overview */}
                <div style={card()}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                        <ShieldAlert size={15} color={DS.success} />
                        <span style={sectionLabel}>Clinical Overview</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div>
                            <div style={{ fontSize: '11px', fontWeight: '700', color: DS.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Condition</div>
                            <div style={{ fontSize: '15px', fontWeight: '800', color: DS.textPrimary }}>{patient.condition || 'Not recorded'}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '11px', fontWeight: '700', color: DS.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Medications</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {(patient.medications || ['Aspirin 81mg']).map((m, i) => (
                                    <span key={i} style={{ backgroundColor: '#EDE9FE', color: DS.secondary, padding: '5px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Pill size={10} /> {m}
                                    </span>
                                ))}
                            </div>
                        </div>
                        <div>
                            <div style={{ fontSize: '11px', fontWeight: '700', color: DS.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Allergies</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {(patient.allergies?.length ? patient.allergies : ['None known']).map((a, i) => (
                                    <span key={i} style={{ backgroundColor: a !== 'None known' ? '#FEE2E2' : DS.surfaceLow, color: a !== 'None known' ? DS.danger : DS.textMuted, padding: '4px 10px', borderRadius: '7px', fontSize: '12px', fontWeight: '800' }}>
                                        {a !== 'None known' ? `⚠ ${a}` : a}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 7-day Vitals */}
                <div style={card()}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Activity size={15} color={DS.success} />
                            <span style={sectionLabel}>7-Day Trend</span>
                        </div>
                        <span style={{ fontSize: '12px', color: DS.textMuted, fontWeight: '700' }}>{vitalsHistory.length} entries</span>
                    </div>
                    {trendData.length > 1 ? (
                        <ResponsiveContainer width="100%" height={160}>
                            <LineChart data={trendData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={DS.surfaceHigh} />
                                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: DS.textMuted }} />
                                <YAxis domain={['auto', 'auto']} axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: DS.textMuted }} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 28px rgba(0,0,0,0.08)', fontFamily: 'Inter', fontSize: '12px' }} />
                                <Line type="monotone" dataKey="sys" stroke={DS.primaryContainer} strokeWidth={2.5} dot={{ r: 3 }} name="SYS" />
                                <Line type="monotone" dataKey="dia" stroke="#38BDF8" strokeWidth={2.5} dot={{ r: 3 }} name="DIA" />
                                <Line type="monotone" dataKey="hr" stroke={DS.danger} strokeWidth={2} dot={{ r: 3 }} name="HR" strokeDasharray="4 2" />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <div style={{ height: '160px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', color: DS.textMuted }}>
                            <Activity size={32} color={DS.surfaceHigh} />
                            <p style={{ fontSize: '13px', fontWeight: '600', margin: 0, textAlign: 'center' }}>Insufficient vitals to generate trend.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── VITALS TAB ────────────────────────────────────────────────────────────
function VitalsTab({ vitalsHistory, trendData }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={card()}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <Activity size={15} color={DS.success} />
                    <span style={sectionLabel}>Full Vitals History ({vitalsHistory.length} entries)</span>
                </div>
                {trendData.length > 1 ? (
                    <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={trendData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={DS.surfaceHigh} />
                            <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: DS.textMuted }} />
                            <YAxis domain={['auto', 'auto']} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: DS.textMuted }} />
                            <Tooltip contentStyle={{ borderRadius: '14px', border: 'none', boxShadow: '0 8px 28px rgba(0,0,0,0.08)', fontFamily: 'Inter' }} />
                            <Line type="monotone" dataKey="sys" stroke={DS.primaryContainer} strokeWidth={3} dot={{ r: 4 }} name="Systolic (mmHg)" />
                            <Line type="monotone" dataKey="dia" stroke="#38BDF8" strokeWidth={3} dot={{ r: 4 }} name="Diastolic (mmHg)" />
                            <Line type="monotone" dataKey="hr" stroke={DS.danger} strokeWidth={2.5} dot={{ r: 4 }} name="Heart Rate (bpm)" strokeDasharray="5 2" />
                        </LineChart>
                    </ResponsiveContainer>
                ) : (
                    <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: DS.textMuted, fontSize: '14px', fontWeight: '600' }}>No vitals recorded yet.</div>
                )}
            </div>
            {vitalsHistory.length > 0 && (
                <div style={card()}>
                    <span style={{ ...sectionLabel, display: 'block', marginBottom: '14px' }}>Recent Readings</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {vitalsHistory.slice(0, 12).map((v, i) => {
                            const isAbnormal = parseInt(v.bpSystolic) > 140 || parseInt(v.heartRate) > 100 || parseInt(v.heartRate) < 50;
                            return (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', backgroundColor: isAbnormal ? '#FEF2F2' : DS.surfaceLow, borderRadius: '12px' }}>
                                    <div style={{ display: 'flex', gap: '20px' }}>
                                        <span style={{ fontSize: '13px', fontWeight: '800', color: isAbnormal ? DS.danger : DS.primaryContainer }}>BP: {v.bpSystolic}/{v.bpDiastolic}</span>
                                        <span style={{ fontSize: '13px', fontWeight: '800', color: DS.textPrimary }}>HR: {v.heartRate}</span>
                                        {v.temperature && <span style={{ fontSize: '13px', fontWeight: '700', color: DS.warning }}>T: {v.temperature}°C</span>}
                                        {v.spo2 && <span style={{ fontSize: '13px', fontWeight: '700', color: DS.success }}>SpO2: {v.spo2}%</span>}
                                    </div>
                                    <span style={{ fontSize: '12px', color: DS.textMuted, fontWeight: '600' }}>{new Date(v.recordedAt).toLocaleString()}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── LOGS TAB ──────────────────────────────────────────────────────────────
function LogsTab({ careLogs, onAction }) {
    return (
        <div style={card()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <Clock size={15} color={DS.secondary} />
                <span style={sectionLabel}>Care Logs ({careLogs.length})</span>
            </div>
            {careLogs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: DS.textMuted }}>
                    <Clipboard size={36} color={DS.surfaceHigh} style={{ display: 'block', margin: '0 auto 12px' }} />
                    <p style={{ fontWeight: '700', margin: 0 }}>No care logs found.</p>
                    <p style={{ fontSize: '13px', margin: '4px 0 0 0' }}>Check back once caregivers log patient activities.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {careLogs.map((log, idx) => {
                        const s = { Confirmed: { bg: '#DCFCE7', color: DS.success }, 'Needs Review': { bg: '#FEF2F2', color: DS.danger }, Pending: { bg: DS.surfaceHigh, color: DS.textSecondary } }[log.status] || { bg: DS.surfaceHigh, color: DS.textSecondary };
                        return (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: DS.surfaceLow, borderRadius: '14px', padding: '14px 16px', gap: '12px' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                        <span style={{ fontSize: '14px', fontWeight: '700', color: DS.textPrimary }}>Task logged</span>
                                        <span style={{ fontSize: '10px', fontWeight: '800', padding: '3px 7px', borderRadius: '6px', backgroundColor: s.bg, color: s.color, textTransform: 'uppercase' }}>{log.status}</span>
                                    </div>
                                    <div style={{ fontSize: '12px', color: DS.textMuted, fontWeight: '600' }}>By {log.caregiver} · {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'Unknown time'}</div>
                                    {log.note && <div style={{ fontSize: '13px', color: DS.textSecondary, marginTop: '6px', backgroundColor: DS.surfaceLowest, padding: '7px 10px', borderRadius: '8px', fontStyle: 'italic' }}>"{log.note}"</div>}
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button onClick={() => onAction(log.logId, log.taskId, 'Confirmed')} title="Confirm" style={{ width: '36px', height: '36px', borderRadius: '10px', border: 'none', backgroundColor: '#DCFCE7', color: DS.success, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                        <CheckCircle size={17} />
                                    </button>
                                    <button onClick={() => onAction(log.logId, log.taskId, 'Needs Review')} title="Flag for Review" style={{ width: '36px', height: '36px', borderRadius: '10px', border: 'none', backgroundColor: '#FEF2F2', color: DS.danger, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                        <AlertTriangle size={17} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ─── MEDIA TAB ─────────────────────────────────────────────────────────────
function MediaTab({ media }) {
    const combined = media || [];
    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                <Image size={15} color={DS.secondary} />
                <span style={sectionLabel}>Caregiver Photos ({combined.length})</span>
            </div>
            {combined.length === 0 ? (
                 <div style={{ textAlign: 'center', padding: '60px 20px', backgroundColor: 'white', borderRadius: '24px', border: `1px dashed ${DS.outlineVariant}` }}>
                    <Image size={48} color={DS.surfaceHigh} style={{ margin: '0 auto 16px', display: 'block' }} />
                    <p style={{ fontWeight: '700', fontSize: '15px', color: DS.textMuted, margin: 0 }}>No media uploaded by caretaker yet.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                    {combined.map((item, idx) => (
                        <div key={idx} style={{ borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(25,28,30,0.06)', backgroundColor: DS.surfaceLowest }}>
                            <div style={{ position: 'relative', paddingTop: '65%', overflow: 'hidden', backgroundColor: DS.surfaceHigh }}>
                                <img src={item.url} alt={item.description} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none'; }} />
                            </div>
                            <div style={{ padding: '12px' }}>
                                <p style={{ fontSize: '13px', color: DS.textPrimary, fontWeight: '600', margin: '0 0 4px 0', lineHeight: 1.4 }}>{item.description || 'No description'}</p>
                                <p style={{ fontSize: '11px', color: DS.textMuted, fontWeight: '600', margin: 0 }}>{item.uploadedBy || 'Caregiver'} · {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ''}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── PRESCRIPTIONS TAB ─────────────────────────────────────────────────────
function PrescriptionsTab({ patient, patientId }) {
    const [meds, setMeds] = useState(patient?.medications || ['Aspirin 81mg', 'Lisinopril 10mg']);
    const [newMed, setNewMed] = useState('');
    const [editIdx, setEditIdx] = useState(null);
    const [editVal, setEditVal] = useState('');

    const save = async (updatedMeds) => {
        await updateDoc(doc(db, 'patients', patientId), { medications: updatedMeds });
        setMeds(updatedMeds);
    };

    return (
        <div style={card()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <Pill size={15} color={DS.secondary} />
                <span style={sectionLabel}>Current Medications</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                {meds.map((m, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: DS.surfaceLow, borderRadius: '12px', padding: '12px 16px' }}>
                        {editIdx === i ? (
                            <input value={editVal} onChange={e => setEditVal(e.target.value)} style={{ flex: 1, border: 'none', outline: `2px solid ${DS.primaryContainer}`, borderRadius: '8px', padding: '6px 10px', fontSize: '14px', fontFamily: 'inherit', marginRight: '8px' }} />
                        ) : (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '700', color: DS.textPrimary }}>
                                <Pill size={14} color={DS.secondary} /> {m}
                            </span>
                        )}
                        <div style={{ display: 'flex', gap: '6px' }}>
                            {editIdx === i ? (
                                <button onClick={() => { const updated = [...meds]; updated[i] = editVal; save(updated); setEditIdx(null); }} style={{ width: '32px', height: '32px', borderRadius: '8px', border: 'none', backgroundColor: '#DCFCE7', color: DS.success, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Save size={14} /></button>
                            ) : (
                                <button onClick={() => { setEditIdx(i); setEditVal(m); }} style={{ width: '32px', height: '32px', borderRadius: '8px', border: 'none', backgroundColor: '#EEF2FF', color: DS.primaryContainer, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Edit3 size={14} /></button>
                            )}
                            <button onClick={() => { const updated = meds.filter((_, j) => j !== i); save(updated); }} style={{ width: '32px', height: '32px', borderRadius: '8px', border: 'none', backgroundColor: '#FEF2F2', color: DS.danger, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Trash2 size={14} /></button>
                        </div>
                    </div>
                ))}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
                <input value={newMed} onChange={e => setNewMed(e.target.value)} placeholder="Add medication (e.g. Metformin 500mg)" style={{ flex: 1, padding: '12px 14px', borderRadius: '12px', border: 'none', backgroundColor: DS.surfaceHigh, fontSize: '14px', fontFamily: 'inherit', outline: 'none', color: DS.textPrimary }} />
                <button onClick={() => { if (newMed.trim()) { save([...meds, newMed.trim()]); setNewMed(''); } }} style={gradientBtn(DS.primary, DS.primaryContainer, { borderRadius: '12px', padding: '12px 18px' })}><Plus size={16} /></button>
            </div>
        </div>
    );
}

// ─── CARE PLAN TAB ─────────────────────────────────────────────────────────
function CarePlanTab({ tasks, patientId }) {
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskTime, setNewTaskTime] = useState('08:00');
    const [adding, setAdding] = useState(false);

    const handleAdd = async () => {
        if (!newTaskTitle.trim()) return;
        await addTask(patientId, { title: newTaskTitle.trim(), time: newTaskTime, category: 'Doctor Order', icon: 'ClipboardList', active: true });
        setNewTaskTitle('');
        setAdding(false);
    };

    const handleDelete = async (taskId) => {
        await deleteRelativeTask(patientId, taskId);
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Clipboard size={15} color={DS.primaryContainer} />
                    <span style={sectionLabel}>Care Plan Tasks ({tasks.length})</span>
                </div>
                <button onClick={() => setAdding(v => !v)} style={gradientBtn(DS.primary, DS.primaryContainer, { padding: '8px 16px', borderRadius: '12px', fontSize: '13px' })}>
                    <Plus size={15} /> Add Task
                </button>
            </div>

            {adding && (
                <div style={{ ...card({ marginBottom: '16px', border: `2px solid ${DS.primaryContainer}30` }) }}>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <input value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} placeholder="Task name (e.g. Physiotherapy)" style={{ flex: 1, minWidth: '200px', padding: '10px 14px', borderRadius: '12px', border: `1px solid ${DS.surfaceHigh}`, fontSize: '14px', fontFamily: 'inherit', outline: 'none', color: DS.textPrimary, backgroundColor: DS.surfaceLow }} />
                        <input type="time" value={newTaskTime} onChange={e => setNewTaskTime(e.target.value)} style={{ padding: '10px 14px', borderRadius: '12px', border: `1px solid ${DS.surfaceHigh}`, fontSize: '14px', fontFamily: 'inherit', outline: 'none', color: DS.textPrimary, backgroundColor: DS.surfaceLow }} />
                        <button onClick={handleAdd} style={gradientBtn(DS.primary, DS.primaryContainer, { padding: '10px 20px', borderRadius: '12px' })}><Save size={15} /> Save</button>
                        <button onClick={() => setAdding(false)} style={{ padding: '10px 16px', borderRadius: '12px', border: 'none', background: DS.surfaceHigh, color: DS.textSecondary, cursor: 'pointer', fontFamily: 'inherit', fontWeight: '700' }}>Cancel</button>
                    </div>
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {tasks.length === 0 && !adding && (
                    <div style={{ textAlign: 'center', padding: '40px', color: DS.textMuted }}>
                        <Clipboard size={36} color={DS.surfaceHigh} style={{ display: 'block', margin: '0 auto 12px' }} />
                        <p style={{ fontWeight: '700', margin: 0 }}>No tasks defined yet.</p>
                        <p style={{ fontSize: '13px', margin: '4px 0 0 0' }}>Add tasks to sync with the caregiver dashboard.</p>
                    </div>
                )}
                {tasks.map((task, i) => (
                    <div key={task.id || i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: DS.surfaceLowest, borderRadius: '14px', padding: '14px 16px', boxShadow: '0 2px 10px rgba(25,28,30,0.04)' }}>
                        <div>
                            <div style={{ fontSize: '14px', fontWeight: '800', color: DS.textPrimary }}>{task.title}</div>
                            <div style={{ fontSize: '12px', color: DS.textMuted, marginTop: '3px', fontWeight: '600' }}>{task.time} · {task.category || 'General'}</div>
                        </div>
                        <button onClick={() => handleDelete(task.id)} style={{ width: '34px', height: '34px', borderRadius: '10px', border: 'none', backgroundColor: '#FEF2F2', color: DS.danger, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                            <Trash2 size={15} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── NOTES TAB ─────────────────────────────────────────────────────────────
function NotesTab({ clinicalNotes, newNote, setNewNote, onAdd }) {
    const { user } = useAuthContext();
    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <FileText size={15} color={DS.primaryContainer} />
                <span style={sectionLabel}>Clinical Notes</span>
            </div>
            <div style={{ backgroundColor: `${DS.primaryContainer}08`, borderRadius: '20px', padding: '20px', border: `1px solid ${DS.primaryContainer}20`, marginBottom: '20px' }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: DS.primaryContainer, marginBottom: '10px' }}>Add New Observation</div>
                <textarea
                    value={newNote}
                    onChange={e => setNewNote(e.target.value)}
                    placeholder="Add clinical observation, treatment notes, or follow-up instructions... Visible to caregiver and family."
                    style={{ width: '100%', border: 'none', borderRadius: '14px', padding: '14px 16px', fontSize: '14px', resize: 'none', outline: 'none', minHeight: '100px', fontFamily: 'inherit', fontWeight: '500', color: DS.textPrimary, backgroundColor: DS.surfaceLowest, boxSizing: 'border-box', display: 'block', lineHeight: 1.6 }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                    <button onClick={onAdd} style={gradientBtn(DS.primary, DS.primaryContainer, { borderRadius: '14px', padding: '12px 28px' })}><Save size={16} /> Save Note</button>
                </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {clinicalNotes.length === 0 && <p style={{ color: DS.textMuted, fontSize: '14px', fontWeight: '600', textAlign: 'center', padding: '24px' }}>No clinical notes yet.</p>}
                {clinicalNotes.map(n => (
                    <div key={n.id} style={{ backgroundColor: DS.surfaceLowest, borderRadius: '16px', padding: '16px 20px', boxShadow: '0 2px 12px rgba(25,28,30,0.04)' }}>
                        <div style={{ fontSize: '11px', color: DS.textMuted, fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                             {n.authorName || (user?.displayName || 'Dr. Arjun Smith')} · {n.timestamp ? new Date(n.timestamp).toLocaleString() : ''}
                        </div>
                        <p style={{ fontSize: '14px', color: DS.textPrimary, fontWeight: '500', lineHeight: 1.6, margin: 0 }}>{n.note}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
