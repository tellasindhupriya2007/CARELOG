import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuthContext } from '../../context/AuthContext';
import { checkVitalsAndCreateAlert } from '../../utils/alertChecker';
import ScreenHeader from '../../components/common/ScreenHeader';
import Sidebar from '../../components/common/Sidebar';
import { Loader2, TrendingUp, CheckCircle2, History, Activity, Heart, Thermometer, Hash, Clock } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function VitalsEntry() {
    const navigate = useNavigate();
    const { patientId, user } = useAuthContext();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const [bpSys, setBpSys] = useState('');
    const [bpDia, setBpDia] = useState('');
    const [hr, setHr] = useState('');
    const [temp, setTemp] = useState('');
    
    const [vitalsHistory, setVitalsHistory] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [toast, setToast] = useState(null);

    const bpDiaRef = useRef(null);
    const hrRef = useRef(null);
    const tempRef = useRef(null);

    const sidebarItems = [
        { icon: 'Home', label: 'Dashboard', path: '/caretaker/dashboard' },
        { icon: 'Pill', label: 'Prescriptions', path: '/caretaker/prescriptions' },
        { icon: 'HeartPulse', label: 'Vitals', path: '/caretaker/vitals' },
        { icon: 'Clipboard', label: 'Observations', path: '/caretaker/observations' },
        { icon: 'Bell', label: 'Alerts', path: '/caretaker/alerts' },
        { icon: 'Clock', label: 'Shift Handover', path: '/caretaker/handover' },
        { icon: 'MessageSquare', label: 'Messages', path: '/caretaker/messages' },
    ];

    useEffect(() => {
        if (!patientId) return;
        const q = query(collection(db, 'vitals'), where('patientId', '==', patientId));
        const unsubscribe = onSnapshot(q, (snap) => {
            if (!snap.empty) {
                const vitals = snap.docs.map(d => ({ ...d.data(), id: d.id }));
                vitals.sort((a, b) => {
                    const ta = a.recordedAt?.toMillis?.() || new Date(a.recordedAt || 0).getTime();
                    const tb = b.recordedAt?.toMillis?.() || new Date(b.recordedAt || 0).getTime();
                    return tb - ta;
                });
                setVitalsHistory(vitals);
            }
        });
        return () => unsubscribe();
    }, [patientId]);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const handleBpSysChange = (e) => {
        const val = e.target.value;
        if (val.length <= 3) setBpSys(val);
        if (val.length === 3 && Number(val) > 0) bpDiaRef.current?.focus();
    };

    const handleSubmit = async () => {
        if (!bpSys || !bpDia || !hr || !temp) return;
        setSubmitting(true);
        try {
            const vitalsData = {
                patientId,
                recordedBy: user.uid,
                recordedAt: serverTimestamp(),
                bp: { systolic: Number(bpSys), diastolic: Number(bpDia) },
                heartRate: Number(hr),
                temperature: Number(temp)
            };
            await addDoc(collection(db, 'vitals'), vitalsData);
            await checkVitalsAndCreateAlert(patientId, vitalsData);
            showToast('Reading synchronized');
            setBpSys(''); setBpDia(''); setHr(''); setTemp('');
        } catch (err) {
            showToast('Sync error.', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const trendData = [...vitalsHistory].reverse().slice(-15).map(v => ({
        time: new Date(v.recordedAt?.toMillis?.() || v.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sys: v.bp?.systolic, 
        dia: v.bp?.diastolic, 
        hr: v.heartRate
    }));

    return (
        <div className="desktop-layout">
            <Sidebar navItems={sidebarItems} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            
            <div className="desktop-content">
                <ScreenHeader title="Vitals Monitoring" showBack onBack={() => navigate(-1)} onMenu={() => setSidebarOpen(true)} showMenuButton={true} />

                <div className="main-content scroll-y">
                    {toast && (
                        <div style={{ position: 'fixed', top: '70px', left: '50%', transform: 'translateX(-50%)', zIndex: 1000, backgroundColor: toast.type === 'success' ? '#00288E' : '#FF4B4B', color: 'white', padding: '10px 24px', borderRadius: '40px', fontWeight: '700', fontSize: '13px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <CheckCircle2 size={16} /> {toast.message}
                        </div>
                    )}

                    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                        
                        {/* Summary Observations */}
                        <div className="card">
                            <h2><Activity size={20} color="#00288E" /> Physical Observation</h2>
                            <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '11px', fontWeight: '800', color: '#64748B', display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>BP (Systolic)</label>
                                    <div style={{ position: 'relative' }}>
                                        <input className="vitals-input" type="number" placeholder="120" value={bpSys} onChange={handleBpSysChange} />
                                        <Hash size={14} color="#94A3B8" style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', opacity: 0.6 }} />
                                    </div>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '11px', fontWeight: '800', color: '#64748B', display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>BP (Diastolic)</label>
                                    <div style={{ position: 'relative' }}>
                                        <input ref={bpDiaRef} className="vitals-input" type="number" placeholder="80" value={bpDia} onChange={(e) => setBpDia(e.target.value)} />
                                        <Hash size={14} color="#94A3B8" style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', opacity: 0.6 }} />
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '11px', fontWeight: '800', color: '#64748B', display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>Heart Rate (bpm)</label>
                                    <div style={{ position: 'relative' }}>
                                        <Heart size={16} color="#F43F5E" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                                        <input ref={hrRef} className="vitals-input has-icon" type="number" placeholder="72" value={hr} onChange={(e) => setHr(e.target.value)} />
                                    </div>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '11px', fontWeight: '800', color: '#64748B', display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>Skin Temp (°F)</label>
                                    <div style={{ position: 'relative' }}>
                                        <Thermometer size={16} color="#00288E" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                                        <input ref={tempRef} className="vitals-input has-icon" type="number" placeholder="98.6" value={temp} onChange={(e) => setTemp(e.target.value)} />
                                    </div>
                                </div>
                            </div>
                            <button className="save-btn" disabled={submitting} onClick={handleSubmit}>
                                {submitting ? <Loader2 className="animate-spin" size={20} /> : 'SYNCHRONIZE DATA'}
                            </button>
                        </div>

                        {/* Visual Trends */}
                        <div className="card">
                            <h2><TrendingUp size={20} color="#00288E" /> Trends</h2>
                            <div style={{ height: '280px', width: '100%' }}>
                                {trendData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={trendData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EDEEF0" />
                                            <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 700 }} dy={10} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 700 }} dx={-10} />
                                            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.08)', fontSize: '12px' }} />
                                            <Area type="monotone" dataKey="sys" stroke="#00288E" strokeWidth={3} fillOpacity={0.05} fill="#00288E" dot={{ r: 4, fill: '#00288E', strokeWidth: 2, stroke: '#fff' }} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8' }}>
                                        <History size={48} opacity={0.1} />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Detailed Log */}
                        <div className="card">
                            <h2><History size={20} color="#00288E" /> Clinical History</h2>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
                                    <thead>
                                        <tr style={{ fontSize: '10px', fontWeight: '900', color: '#64748B', letterSpacing: '0.05em' }}>
                                            <th style={{ textAlign: 'left', padding: '12px' }}>RECORDED</th>
                                            <th style={{ textAlign: 'center', padding: '12px' }}>BP</th>
                                            <th style={{ textAlign: 'center', padding: '12px' }}>HR</th>
                                            <th style={{ textAlign: 'center', padding: '12px' }}>TEMP</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {vitalsHistory.map((v, i) => (
                                            <tr key={i} className="history-row-item" style={{ backgroundColor: '#F8FAFC' }}>
                                                <td style={{ padding: '14px', borderRadius: '12px 0 0 12px' }}>
                                                    <div style={{ fontSize: '13px', fontWeight: '800' }}>{new Date(v.recordedAt?.toMillis?.() || v.recordedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</div>
                                                    <div style={{ fontSize: '10px', color: '#64748B', fontWeight: '600' }}>{new Date(v.recordedAt?.toMillis?.() || v.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                                </td>
                                                <td style={{ textAlign: 'center', padding: '14px', fontSize: '13px', fontWeight: '800' }}>{v.bp?.systolic}/{v.bp?.diastolic}</td>
                                                <td style={{ textAlign: 'center', padding: '14px', fontSize: '13px', fontWeight: '800', color: '#F43F5E' }}>{v.heartRate}</td>
                                                <td style={{ textAlign: 'center', padding: '14px', fontSize: '13px', fontWeight: '800', borderRadius: '0 12px 12px 0' }}>{v.temperature}°</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <style>{`
                .history-row-item { transition: 0.2s; }
                .history-row-item:hover { background-color: #F1F5F9 !important; }
            `}</style>
        </div>
    );
}
