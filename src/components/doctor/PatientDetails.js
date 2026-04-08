import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, orderBy, updateDoc, doc, addDoc, serverTimestamp, getDocs, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import ScreenHeader from '../common/ScreenHeader';
import { DS, card, gradientBtn, sectionLabel } from './ds';
import { subscribeToPatientMedia, uploadPatientMedia } from '../../services/mediaService';
import { subscribeToTasks, addTask, deleteRelativeTask } from '../../services/taskService';
import { 
    Activity, HeartPulse, Thermometer, ShieldCheck, User, Users,
    Calendar, FileText, ChevronRight, CheckCircle, AlertTriangle, 
    Clock, Plus, Trash2, Camera, MapPin, Briefcase, Pill, X, Phone, Mail
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Legend } from 'recharts';

export default function PatientDetails({ inlinePatientId, onClose }) {
    const id = inlinePatientId;
    const [patient, setPatient] = useState(null);
    const [vitalsHistory, setVitalsHistory] = useState([]);
    const [trendData, setTrendData] = useState([]);
    const [careLogs, setCareLogs] = useState([]);
    const [clinicalNotes, setClinicalNotes] = useState([]);
    const [media, setMedia] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [activeTab, setActiveTab] = useState('Overview');
    const [newNote, setNewNote] = useState('');
    const [showTeam, setShowTeam] = useState(false);
    const [team, setTeam] = useState([]);

    useEffect(() => {
        if (!id) return;
        const pSub = onSnapshot(doc(db, 'patients', id), s => setPatient({ id: s.id, ...s.data() }));
        const vQ = query(collection(db, 'vitals'), where('patientId', '==', id), orderBy('recordedAt', 'desc'));
        const vSub = onSnapshot(vQ, s => {
            const history = s.docs.map(d => ({ id: d.id, ...d.data() }));
            setVitalsHistory(history);
            setTrendData([...history].reverse().map(v => ({
                time: new Date(v.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                sys: v.bp?.systolic || v.bpSystolic,
                dia: v.bp?.diastolic || v.bpDiacholic,
                hr: v.heartRate
            })));
        });
        const lQ = query(collection(db, 'careLogs'), where('patientId', '==', id), orderBy('timestamp', 'desc'));
        const lSub = onSnapshot(lQ, s => setCareLogs(s.docs.map(d => ({ id: d.id, ...d.data() }))));
        const nQ = query(collection(db, 'clinicalNotes'), where('patientId', '==', id), orderBy('timestamp', 'desc'));
        const nSub = onSnapshot(nQ, s => setClinicalNotes(s.docs.map(d => ({ id: d.id, ...d.data() }))));
        
        const mSub = subscribeToPatientMedia(id, setMedia);
        const tSub = subscribeToTasks(id, setTasks);

        // Fetch Care Team
        const fetchTeam = async () => {
            const q = query(collection(db, 'users'), where('role', 'in', ['CARETAKER', 'FAMILY']));
            const s = await getDocs(q);
            const members = s.docs.map(d => ({ id: d.id, ...d.data() }))
                .filter(u => u.patientId === id || (u.assignedPatients && u.assignedPatients.includes(id)));
            setTeam(members);
        };
        fetchTeam();

        return () => { pSub(); vSub(); lSub(); nSub(); mSub(); tSub(); };
    }, [id]);

    const handleAddNote = async () => {
        if (!newNote.trim()) return;
        await addDoc(collection(db, 'clinicalNotes'), { patientId: id, note: newNote, authorId: 'DOC01', authorName: 'Dr. Tella', timestamp: new Date().toISOString() });
        setNewNote('');
    };

    const handleLogAction = async (logId, taskId, status) => {
        const ref = doc(db, 'careLogs', logId);
        await updateDoc(ref, { status, reviewedBy: 'Doctor' });
    };

    if (!patient) return null;

    const tabs = ['Overview', 'Vitals', 'Logs', 'Media', 'Prescriptions', 'Care Plan', 'Notes'];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#ffffff', borderLeft: '1px solid #EAECF0', position: 'relative' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid #EAECF0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#0052FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '16px', fontWeight: '900' }}>{(patient.name || 'P').charAt(0)}</div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <h1 style={{ fontSize: '18px', fontWeight: '900', color: '#101828', margin: 0 }}>{patient.name}</h1>
                            <span style={{ fontSize: '10px', fontWeight: '900', color: '#079455', backgroundColor: '#ECFDF5', padding: '2px 8px', borderRadius: '4px' }}>ACTIVE</span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#667085', fontWeight: '600' }}>{patient.age}y · {patient.condition} · <span style={{ color: '#D92D20', fontWeight: '900' }}>{patient.bloodGroup || 'O+'}</span></div>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button onClick={() => setShowTeam(true)} style={{ backgroundColor: '#ffffff', color: '#101828', border: '1px solid #EAECF0', padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}><Users size={14} /> Team</button>
                    <button onClick={() => setActiveTab('Prescriptions')} style={{ backgroundColor: '#0052FF', color: 'white', border: 'none', padding: '6px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: '900', cursor: 'pointer' }}>Prescribe</button>
                    <button onClick={onClose} style={{ color: '#98A2B3', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}><Plus size={20} style={{ transform: 'rotate(45deg)' }} /></button>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '24px', padding: '0 24px', borderBottom: '1px solid #EAECF0', overflowX: 'auto' }}>
                {tabs.map(t => (
                    <button key={t} onClick={() => setActiveTab(t)} style={{ padding: '12px 0', border: 'none', borderBottom: activeTab === t ? '2px solid #0052FF' : '2px solid transparent', background: 'none', color: activeTab === t ? '#0052FF' : '#667085', fontSize: '13px', fontWeight: '900', cursor: 'pointer', whiteSpace: 'nowrap' }}>{t}</button>
                ))}
            </div>

            <div style={{ flex: 1, padding: '24px', overflowY: 'auto', backgroundColor: '#F9FAFB' }}>
                {activeTab === 'Overview' && <OverviewTab patient={patient} vitalsHistory={vitalsHistory} trendData={trendData} />}
                {activeTab === 'Vitals' && <VitalsTab vitalsHistory={vitalsHistory} />}
                {activeTab === 'Logs' && <LogsTab careLogs={careLogs} onAction={handleLogAction} />}
                {activeTab === 'Media' && <MediaTab media={media} patientId={id} />}
                {activeTab === 'Prescriptions' && <PrescriptionsTab patient={patient} patientId={id} />}
                {activeTab === 'Care Plan' && <CarePlanTab tasks={tasks} patientId={id} />}
                {activeTab === 'Notes' && <NotesTab clinicalNotes={clinicalNotes} newNote={newNote} setNewNote={setNewNote} onAdd={handleAddNote} />}
            </div>

            {showTeam && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(16,24,40,0.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ backgroundColor: 'white', border: '1px solid #EAECF0', borderRadius: '16px', width: '400px', maxWidth: '90%', padding: '24px', boxShadow: '0 20px 48px rgba(0,0,0,0.2)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: '900', color: '#101828', margin: 0 }}>Operational Care Team</h3>
                            <button onClick={() => setShowTeam(false)} style={{ background: 'none', border: 'none', color: '#98A2B3', cursor: 'pointer' }}><X size={20} /></button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {team.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '24px', color: '#667085', fontSize: '14px' }}>No designated team members found for this monitor.</div>
                            ) : (
                                team.map((member, idx) => (
                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', borderRadius: '12px', background: '#F9FAFB', border: '1px solid #F2F4F7' }}>
                                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: member.role === 'CARETAKER' ? '#E7F5EF' : '#EFF4FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: member.role === 'CARETAKER' ? '#079455' : '#0052FF', fontSize: '14px', fontWeight: '900' }}>{(member.displayName || member.role).charAt(0)}</div>
                                            <div>
                                                <div style={{ fontSize: '14px', fontWeight: '900', color: '#101828' }}>{member.displayName || 'Anonymous'}</div>
                                                <div style={{ fontSize: '11px', color: '#667085', fontWeight: '700', textTransform: 'uppercase' }}>{member.role}</div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button style={{ width: '32px', height: '32px', borderRadius: '8px', border: 'none', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0052FF', cursor: 'pointer', border: '1px solid #EAECF0' }}><Phone size={14} /></button>
                                            <button style={{ width: '32px', height: '32px', borderRadius: '8px', border: 'none', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0052FF', cursor: 'pointer', border: '1px solid #EAECF0' }}><Mail size={14} /></button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function OverviewTab({ patient, vitalsHistory, trendData }) {
    const latest = vitalsHistory[0] || {};
    const vitals = [
        { label: 'Blood Pressure', value: `${latest.bp?.systolic || latest.bpSystolic || '--'}/${latest.bp?.diastolic || latest.bpDiacholic || '--'}`, unit: 'mmHg', icon: Activity, color: '#0052FF', bg: '#EFF4FF' },
        { label: 'Heart Rate', value: latest.heartRate || '--', unit: 'bpm', icon: HeartPulse, color: '#D92D20', bg: '#FFF1F0' },
        { label: 'Temp', value: latest.temp || '--', unit: '°F', icon: Thermometer, color: '#F79009', bg: '#FFFAEB' },
        { label: 'SpO2', value: latest.spo2 || '--', unit: '%', icon: ShieldCheck, color: '#079455', bg: '#ECFDF5' }
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                {vitals.map((v, i) => {
                    const Icon = v.icon;
                    return (
                        <div key={i} style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '14px', border: '1px solid #EAECF0' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                                <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: v.bg, color: v.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Icon size={14} strokeWidth={2.5} />
                                </div>
                                <span style={{ fontSize: '11px', fontWeight: '900', color: '#667085', textTransform: 'uppercase' }}>{v.label}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                <div style={{ fontSize: '20px', fontWeight: '900', color: '#101828', letterSpacing: '-0.5px' }}>{v.value}</div>
                                <div style={{ fontSize: '11px', fontWeight: '700', color: '#667085' }}>{v.unit}</div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.6fr', gap: '16px' }}>
                <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '20px', border: '1px solid #EAECF0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ fontSize: '15px', fontWeight: '900', color: '#101828', margin: 0 }}>Baseline Trend</h3>
                        <span style={{ fontSize: '11px', fontWeight: '800', color: '#667085' }}>14d</span>
                    </div>
                    <div style={{ height: '180px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={trendData}>
                                <CartesianGrid vertical={false} stroke="#F2F4F7" />
                                <XAxis dataKey="time" hide />
                                <YAxis yAxisId="left" hide domain={[70, 200]} />
                                <YAxis yAxisId="right" orientation="right" hide domain={[40, 120]} />
                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: '11px' }} />
                                <Line yAxisId="left" type="monotone" dataKey="sys" stroke="#0052FF" strokeWidth={2.5} dot={{ fill: '#0052FF', r: 2.5 }} name="Sys" />
                                <Line yAxisId="left" type="monotone" dataKey="dia" stroke="#38BDF8" strokeWidth={2.5} dot={{ fill: '#38BDF8', r: 2.5 }} name="Dia" />
                                <Line yAxisId="right" type="monotone" dataKey="hr" stroke="#D92D20" strokeWidth={2} dot={false} strokeDasharray="4 4" name="HR" />
                                <Legend wrapperStyle={{ fontSize: '11px', fontWeight: '900', paddingTop: '10px' }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '20px', border: '1px solid #EAECF0' }}>
                    <div style={{ fontSize: '11px', fontWeight: '900', color: '#667085', textTransform: 'uppercase', marginBottom: '16px' }}>Profile</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div>
                            <div style={{ fontSize: '10px', color: '#98A2B3', fontWeight: '800', marginBottom: '4px' }}>DIAGNOSIS</div>
                            <div style={{ fontSize: '14px', fontWeight: '900', color: '#101828' }}>{patient.condition || 'General'}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '10px', color: '#98A2B3', fontWeight: '800', marginBottom: '6px' }}>MEDS</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                {(patient.medications || ['None']).map((m, i) => (
                                    <span key={i} style={{ fontSize: '11px', fontWeight: '800', backgroundColor: '#EFF4FF', color: '#0052FF', padding: '4px 8px', borderRadius: '4px' }}>{m}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function VitalsTab({ vitalsHistory }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '16px', border: '1px solid #EAECF0' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '900', marginBottom: '16px' }}>History</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {vitalsHistory.map((v, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 16px', backgroundColor: '#F9FAFB', borderRadius: '10px', border: '1px solid #F2F4F7', fontSize: '13px' }}>
                            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                <div style={{ fontWeight: '800', color: '#667085' }}>{new Date(v.recordedAt).toLocaleDateString()}</div>
                                <div style={{ fontWeight: '900', color: '#0052FF' }}>{v.bp?.systolic || v.bpSystolic}/{v.bp?.diastolic || v.bpDiacholic}</div>
                                <div style={{ fontWeight: '800' }}>{v.heartRate} bpm</div>
                            </div>
                            <div style={{ color: '#98A2B3', fontWeight: '700' }}>{new Date(v.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function LogsTab({ careLogs, onAction }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {careLogs.map((log, idx) => (
                <div key={idx} style={{ backgroundColor: '#ffffff', borderRadius: '14px', padding: '14px 18px', border: '1px solid #EAECF0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: log.status === 'Confirmed' ? '#079455' : '#D92D20' }}></div>
                        <div>
                            <div style={{ fontSize: '14px', fontWeight: '900', color: '#101828' }}>Operational Log</div>
                            <div style={{ fontSize: '12px', color: '#667085', fontWeight: '600' }}>{log.caregiver} · {new Date(log.timestamp).toLocaleString()}</div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => onAction(log.logId, log.taskId, 'Confirmed')} style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', backgroundColor: '#E7F5EF', color: '#079455', cursor: 'pointer', fontSize: '12px', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '5px' }}><CheckCircle size={14} /> Verify</button>
                        <button onClick={() => onAction(log.logId, log.taskId, 'Needs Review')} style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', backgroundColor: '#FEF3F2', color: '#B42318', cursor: 'pointer', fontSize: '12px', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '5px' }}><AlertTriangle size={14} /> Flag</button>
                    </div>
                </div>
            ))}
        </div>
    );
}

function MediaTab({ media, patientId }) {
    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
            await uploadPatientMedia(patientId, file, 'Physician Upload', 'Doctor');
        } catch (err) {
            console.error("Doctor upload failed:", err);
            alert("Upload failed.");
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '900', margin: 0 }}>Archive</h3>
                <label style={{ cursor: 'pointer', backgroundColor: '#0052FF', color: 'white', padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Plus size={14} /> Upload Content
                    <input type="file" onChange={handleUpload} style={{ display: 'none' }} />
                </label>
            </div>
            
            {media.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', color: '#98A2B3', fontSize: '13px', border: '1px dashed #EAECF0', borderRadius: '16px' }}>
                    No media found.
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
                    {media.map((item, idx) => (
                        <div key={idx} style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid #EAECF0', backgroundColor: '#ffffff' }}>
                            <img 
                                src={item.url} 
                                alt="" 
                                style={{ width: '100%', height: '120px', objectFit: 'cover' }} 
                                onError={(e) => { e.target.src = 'https://via.placeholder.com/160x120?text=Image+Unavailable'; }}
                            />
                            <div style={{ padding: '12px' }}>
                                <div style={{ fontSize: '13px', fontWeight: '900', color: '#101828', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.description || 'Capture'}</div>
                                <div style={{ fontSize: '11px', color: '#667085', fontWeight: '700', marginTop: '2px' }}>{new Date(item.createdAt).toLocaleDateString()}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function PrescriptionsTab({ patient, patientId }) {
    const [meds, setMeds] = useState(patient?.medications || []);
    const [newMed, setNewMed] = useState('');
    const save = async (u) => { await updateDoc(doc(db, 'patients', patientId), { medications: u }); setMeds(u); };
    return (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '24px', border: '1px solid #EAECF0' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '900', marginBottom: '16px' }}>Active Orders</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                {meds.map((m, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 16px', backgroundColor: '#F9FAFB', borderRadius: '10px', fontSize: '13px', fontWeight: '800', border: '1px solid #F2F4F7' }}>
                        {m}
                        <button onClick={() => save(meds.filter((_,j) => j !== i))} style={{ border: 'none', background: 'none', color: '#D92D20', cursor: 'pointer' }}><Trash2 size={16} /></button>
                    </div>
                ))}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
                <input value={newMed} onChange={e => setNewMed(e.target.value)} placeholder="New order..." style={{ flex: 1, padding: '10px 14px', borderRadius: '10px', border: '1px solid #EAECF0', fontSize: '13px', outline: 'none' }} />
                <button onClick={() => { if (newMed.trim()) { save([...meds, newMed.trim()]); setNewMed(''); } }} style={{ backgroundColor: '#0052FF', color: 'white', border: 'none', borderRadius: '10px', padding: '0 20px', fontSize: '13px', fontWeight: '900' }}>Commit</button>
            </div>
        </div>
    );
}

function CarePlanTab({ tasks, patientId }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {tasks.map((task, i) => (
                <div key={i} style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '16px 20px', border: '1px solid #EAECF0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ fontSize: '15px', fontWeight: '900', color: '#101828' }}>{task.title}</div>
                        <div style={{ fontSize: '12px', color: '#667085', fontWeight: '800', marginTop: '2px' }}>{task.time} · {task.category}</div>
                    </div>
                    <button onClick={() => deleteRelativeTask(patientId, task.id)} style={{ border: 'none', background: 'none', color: '#D92D20', cursor: 'pointer' }}><Trash2 size={16} /></button>
                </div>
            ))}
        </div>
    );
}

function NotesTab({ clinicalNotes, newNote, setNewNote, onAdd }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '24px', border: '1px solid #EAECF0' }}>
                <textarea value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Append observation..." style={{ width: '100%', height: '80px', border: '1px solid #EAECF0', borderRadius: '12px', padding: '12px', fontSize: '14px', resize: 'none', outline: 'none', marginBottom: '12px' }} />
                <button onClick={onAdd} style={{ backgroundColor: '#0052FF', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 20px', fontSize: '13px', fontWeight: '900' }}>Post Entry</button>
            </div>
            {clinicalNotes.map(n => (
                <div key={n.id} style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '16px 20px', border: '1px solid #EAECF0' }}>
                    <div style={{ fontSize: '11px', color: '#667085', fontWeight: '800', marginBottom: '8px' }}>{n.authorName} · {new Date(n.timestamp).toLocaleString()}</div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#101828', lineHeight: 1.4 }}>{n.note}</div>
                </div>
            ))}
        </div>
    );
}
