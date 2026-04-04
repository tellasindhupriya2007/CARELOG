import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, updateDoc, doc, serverTimestamp, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuthContext } from '../../context/AuthContext';
import { getTodayDateString } from '../../utils/dateHelpers';
import { checkVitalsAndCreateAlert } from '../../utils/alertChecker';
import ScreenHeader from '../../components/common/ScreenHeader';
import { colors } from '../../styles/colors';
import { Loader2, AlertTriangle, TrendingUp, Clock, CheckCircle2, History, Activity } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function VitalsEntry() {
    const navigate = useNavigate();
    const { patientId } = useAuthContext();

    const [bpSys, setBpSys] = useState('');
    const [bpDia, setBpDia] = useState('');
    const [hr, setHr] = useState('');
    const [temp, setTemp] = useState('');
    
    const [vitalsHistory, setVitalsHistory] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [currentTime, setCurrentTime] = useState('');
    const [toast, setToast] = useState(null);
    const [emergencyMode, setEmergencyMode] = useState(false);

    const bpDiaRef = useRef(null);
    const hrRef = useRef(null);
    const tempRef = useRef(null);

    useEffect(() => {
        const updateTime = () => setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        updateTime();
        const timer = setInterval(updateTime, 60000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (!patientId) return;
        const todayString = getTodayDateString();
        const logsRef = collection(db, 'dailyLogs');
        const q = query(logsRef, where('patientId', '==', patientId), where('date', '==', todayString));
        
        const unsubscribe = onSnapshot(q, (snap) => {
            if (!snap.empty) {
                const docData = snap.docs[0].data();
                const vitals = docData.vitals || [];
                // Sort by recordedAt descending
                vitals.sort((a, b) => new Date(b.recordedAt) - new Date(a.recordedAt));
                setVitalsHistory(vitals);
            }
        });
        return () => unsubscribe();
    }, [patientId]);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    // Auto-focus logic
    const handleBpSysChange = (e) => {
        const val = e.target.value;
        if (val.length <= 3) setBpSys(val);
        if (val.length === 3 && Number(val) > 0) bpDiaRef.current?.focus();
    };
    
    const handleBpDiaChange = (e) => {
        const val = e.target.value;
        if (val.length <= 3) setBpDia(val);
        if (val.length === 3 && Number(val) > 0) hrRef.current?.focus();
    };

    // Status Helper Functions
    const getBpStatus = (sys, dia) => {
        if (!sys && !dia) return null;
        const s = Number(sys), d = Number(dia);
        if ((s && s > 140) || (d && d > 90) || (s && s < 90) || (d && d < 60)) return { text: 'Critical', color: colors.alertRed, bg: '#FEF2F2' };
        if ((s && s >= 120 && s <= 140) || (d && d >= 80 && d <= 90)) return { text: 'Elevated', color: '#B45309', bg: '#FEF3C7' };
        return { text: 'Normal', color: colors.primaryGreen, bg: '#DCFCE7' };
    };

    const getHrStatus = (hrVal) => {
        if (!hrVal) return null;
        const h = Number(hrVal);
        if (h < 60) return { text: 'Low', color: '#B45309', bg: '#FEF3C7' };
        if (h > 100) return { text: 'High', color: colors.alertRed, bg: '#FEF2F2' };
        return { text: 'Normal', color: colors.primaryGreen, bg: '#DCFCE7' };
    };

    const getTempStatus = (tempVal) => {
        if (!tempVal) return null;
        const t = Number(tempVal);
        if (t > 99) return { text: 'Fever', color: colors.alertRed, bg: '#FEF2F2' };
        if (t < 97) return { text: 'Low', color: '#B45309', bg: '#FEF3C7' };
        return { text: 'Normal', color: colors.primaryGreen, bg: '#DCFCE7' };
    };

    const bpStatus = getBpStatus(bpSys, bpDia);
    const hrStatus = getHrStatus(hr);
    const tempStatus = getTempStatus(temp);

    const isAnyAbnormal = (bpStatus?.text === 'Critical' || hrStatus?.text === 'High' || hrStatus?.text === 'Low' || tempStatus?.text === 'Fever' || tempStatus?.text === 'Low' || emergencyMode);
    const isFormComplete = bpSys && bpDia && hr && temp;

    const useLastValues = () => {
        if (vitalsHistory.length > 0) {
            const last = vitalsHistory[0];
            setBpSys(last.bpSystolic.toString());
            setBpDia(last.bpDiastolic.toString());
            setHr(last.heartRate.toString());
            setTemp(last.temperature.toString());
            showToast('Loaded last recorded values', 'success');
        }
    };

    const handleSubmit = async () => {
        if (!isFormComplete) return;
        setSubmitting(true);

        try {
            const todayString = getTodayDateString();
            const logsRef = collection(db, 'dailyLogs');
            const q = query(logsRef, where('patientId', '==', patientId), where('date', '==', todayString));
            const logSnap = await getDocs(q);

            let logDocRef;
            if (logSnap.empty) {
                logDocRef = doc(collection(db, 'dailyLogs'));
                await setDoc(logDocRef, {
                    patientId,
                    date: todayString,
                    createdAt: serverTimestamp(),
                    vitals: []
                });
            } else {
                logDocRef = logSnap.docs[0].ref;
            }

            const vitalsEntry = {
                bpSystolic: Number(bpSys),
                bpDiastolic: Number(bpDia),
                heartRate: Number(hr),
                temperature: Number(temp),
                recordedAt: new Date().toISOString(),
                alertTriggered: isAnyAbnormal,
                emergency: emergencyMode
            };

            const currentData = logSnap.empty ? {} : logSnap.docs[0].data();
            const existingVitals = currentData.vitals || [];
            await updateDoc(logDocRef, {
                vitals: [...existingVitals, vitalsEntry]
            });

            // Write alerts if abnormal via abstraction or naturally if emergency
            let triggered = isAnyAbnormal;
            if (emergencyMode) {
               await setDoc(doc(collection(db, 'alerts')), {
                   patientId, type: 'critical', message: 'EMERGENCY: Vitals marked as critical manually by caretaker.', timestamp: new Date().toISOString(), isRead: false
               });
            } else {
               const checked = await checkVitalsAndCreateAlert(patientId, { bpSystolic: Number(bpSys), bpDiastolic: Number(bpDia), heartRate: Number(hr), temperature: Number(temp) }, {});
               if (checked) triggered = true;
            }

            showToast('Vitals recorded successfully!', 'success');
            
            // Clear inputs if not emergency, otherwise navigate
            if (triggered) {
                let abnormalDetails = [];
                if (bpStatus?.text !== 'Normal') abnormalDetails.push({ param: 'Blood Pressure', val: `${bpSys}/${bpDia}` });
                if (hrStatus?.text !== 'Normal') abnormalDetails.push({ param: 'Heart Rate', val: hr });
                if (tempStatus?.text !== 'Normal') abnormalDetails.push({ param: 'Temperature', val: temp });
                
                setTimeout(() => navigate('/caretaker/alert-confirmation', {
                    state: { isAbnormal: true, abnormalDetails },
                    replace: true
                }), 1000);
            } else {
                setBpSys(''); setBpDia(''); setHr(''); setTemp(''); setEmergencyMode(false);
            }
        } catch (error) {
            console.error(error);
            showToast('Failed to save vitals', 'error');
        }
        setSubmitting(false);
    };

    const renderInputBadge = (statusObj) => {
        if (!statusObj) return null;
        return (
            <span style={{ 
                fontSize: '11px', fontWeight: '800', color: statusObj.color, 
                backgroundColor: statusObj.bg, padding: '4px 8px', borderRadius: '6px', 
                position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                transition: 'all 0.3s ease'
            }}>
                {statusObj.text}
            </span>
        );
    };

    // Trend Data formatting
    const trendData = [...vitalsHistory].reverse().slice(-7).map(v => ({
        time: new Date(v.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sys: v.bpSystolic,
        dia: v.bpDiastolic,
        hr: v.heartRate
    }));

    return (
        <div style={{ backgroundColor: colors.background, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <ScreenHeader title="Vitals Monitoring" showBack onBack={() => navigate(-1)} />

            {toast && (
                <div style={{
                    position: 'fixed', top: '80px', left: '50%', transform: 'translateX(-50%)', zIndex: 1000,
                    backgroundColor: toast.type === 'success' ? '#10B981' : colors.alertRed, color: 'white',
                    padding: '12px 24px', borderRadius: '30px', fontWeight: '800', fontSize: '14px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', gap: '8px'
                }}>
                    <CheckCircle2 size={18} /> {toast.message}
                </div>
            )}

            <div 
                className="main-content caretaker-responsive-grid" 
                style={{ padding: 'calc(var(--header-h) + 24px + env(safe-area-inset-top)) 20px 40px 20px', flex: 1, width: '100%', maxWidth: '1200px', margin: '0 auto' }}
            >
                {/* Left Column: Entry Form */}
                <div className="caretaker-main-col">
                    <div style={{ 
                        backgroundColor: '#FFFFFF', padding: '32px', borderRadius: '24px', border: `1px solid ${colors.border}`,
                        boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h2 style={{ fontSize: '20px', fontWeight: '900', color: colors.textPrimary, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Activity size={20} color={colors.primaryBlue} /> New Reading
                            </h2>
                            <span style={{ fontSize: '13px', fontWeight: '700', color: colors.textSecondary, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Clock size={14} /> {currentTime}
                            </span>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            
                            {/* Blood Pressure */}
                            <div>
                                <label style={{ fontSize: '13px', fontWeight: '800', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', display: 'block' }}>
                                    Blood Pressure (mmHg)
                                </label>
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', position: 'relative' }}>
                                    <div style={{ flex: 1, position: 'relative' }}>
                                        <input
                                            type="number"
                                            placeholder="120"
                                            value={bpSys}
                                            onChange={handleBpSysChange}
                                            style={{ 
                                                width: '100%', height: '56px', border: `2px solid ${bpStatus?.text === 'Critical' ? colors.alertRed : '#E2E8F0'}`,
                                                borderRadius: '16px', padding: '0 16px', fontSize: '18px', fontWeight: '800',
                                                backgroundColor: bpStatus?.bg || '#F8FAFC', outline: 'none', transition: 'all 0.2s', paddingRight: '40px'
                                            }}
                                        />
                                        <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: colors.textSecondary, fontWeight: '700' }}>SYS</span>
                                    </div>
                                    <span style={{ fontSize: '24px', color: colors.border, fontWeight: '300' }}>/</span>
                                    <div style={{ flex: 1, position: 'relative' }}>
                                        <input
                                            ref={bpDiaRef}
                                            type="number"
                                            placeholder="80"
                                            value={bpDia}
                                            onChange={handleBpDiaChange}
                                            style={{ 
                                                width: '100%', height: '56px', border: `2px solid ${bpStatus?.text === 'Critical' ? colors.alertRed : '#E2E8F0'}`,
                                                borderRadius: '16px', padding: '0 16px', fontSize: '18px', fontWeight: '800',
                                                backgroundColor: bpStatus?.bg || '#F8FAFC', outline: 'none', transition: 'all 0.2s', paddingRight: '40px'
                                            }}
                                        />
                                        <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: colors.textSecondary, fontWeight: '700' }}>DIA</span>
                                    </div>
                                </div>
                                <div style={{ marginTop: '8px', height: '20px', position: 'relative' }}>
                                    {renderInputBadge(bpStatus)}
                                </div>
                            </div>

                            {/* HR and Temp */}
                            <div style={{ display: 'flex', gap: '16px' }}>
                                <div style={{ flex: 1, position: 'relative' }}>
                                    <label style={{ fontSize: '13px', fontWeight: '800', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', display: 'block' }}>
                                        Heart Rate (bpm)
                                    </label>
                                    <input
                                        ref={hrRef}
                                        type="number"
                                        placeholder="72"
                                        value={hr}
                                        onChange={(e) => { setHr(e.target.value); if(e.target.value.length === 3) tempRef.current?.focus(); }}
                                        style={{ 
                                            width: '100%', height: '56px', border: `2px solid ${hrStatus?.text === 'High' ? colors.alertRed : '#E2E8F0'}`,
                                            borderRadius: '16px', padding: '0 16px', fontSize: '18px', fontWeight: '800',
                                            backgroundColor: hrStatus?.bg || '#F8FAFC', outline: 'none', transition: 'all 0.2s'
                                        }}
                                    />
                                    {renderInputBadge(hrStatus)}
                                </div>
                                <div style={{ flex: 1, position: 'relative' }}>
                                    <label style={{ fontSize: '13px', fontWeight: '800', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', display: 'block' }}>
                                        Temperature (°F)
                                    </label>
                                    <input
                                        ref={tempRef}
                                        type="number"
                                        placeholder="98.6"
                                        value={temp}
                                        step="0.1"
                                        onChange={(e) => setTemp(e.target.value)}
                                        style={{ 
                                            width: '100%', height: '56px', border: `2px solid ${tempStatus?.text === 'Fever' ? colors.alertRed : '#E2E8F0'}`,
                                            borderRadius: '16px', padding: '0 16px', fontSize: '18px', fontWeight: '800',
                                            backgroundColor: tempStatus?.bg || '#F8FAFC', outline: 'none', transition: 'all 0.2s'
                                        }}
                                    />
                                    {renderInputBadge(tempStatus)}
                                </div>
                            </div>

                            {/* Quick Actions */}
                            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                                <button
                                    onClick={useLastValues}
                                    style={{ flex: 1, padding: '10px', backgroundColor: '#F1F5F9', border: 'none', borderRadius: '10px', color: '#475569', fontSize: '13px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                                >
                                    <History size={14} /> Use Last Values
                                </button>
                                <button
                                    onClick={() => setEmergencyMode(!emergencyMode)}
                                    style={{ flex: 1, padding: '10px', backgroundColor: emergencyMode ? colors.alertRed : '#FEF2F2', border: 'none', borderRadius: '10px', color: emergencyMode ? '#FFF' : colors.alertRed, fontSize: '13px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s' }}
                                >
                                    <AlertTriangle size={14} /> {emergencyMode ? 'Emergency Set' : 'Mark Emergency'}
                                </button>
                            </div>

                            <hr style={{ border: 'none', borderTop: `1px solid ${colors.border}`, margin: '8px 0' }} />

                            {/* Submit Button */}
                            <button
                                onClick={handleSubmit}
                                disabled={!isFormComplete || submitting}
                                style={{
                                    width: '100%', height: '56px', backgroundColor: !isFormComplete ? '#E2E8F0' : (isAnyAbnormal ? colors.alertRed : colors.primaryBlue),
                                    color: !isFormComplete ? '#94A3B8' : colors.white, fontSize: '15px', fontWeight: '900', borderRadius: '16px', border: 'none',
                                    cursor: (!isFormComplete || submitting) ? 'not-allowed' : 'pointer', transition: 'all 0.3s ease',
                                    boxShadow: isFormComplete ? `0 8px 20px ${isAnyAbnormal ? colors.alertRed : colors.primaryBlue}44` : 'none',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                }}
                            >
                                {submitting ? <Loader2 size={24} className="spinner" /> : (isAnyAbnormal ? <><AlertTriangle size={18} /> TRANSMIT CRITICAL VITALS</> : <><CheckCircle2 size={18} /> SAVE VITALS RECORD</>)}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Column: History & Trends */}
                <div className="caretaker-side-col" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    
                    {/* Trend Graph */}
                    <div style={{ backgroundColor: '#FFFFFF', padding: '24px', borderRadius: '20px', border: `1px solid ${colors.border}` }}>
                        <h3 style={{ fontSize: '16px', fontWeight: '900', color: colors.textPrimary, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <TrendingUp size={18} color={colors.primaryBlue} /> Blood Pressure Trend
                        </h3>
                        <div style={{ height: '180px', width: '100%' }}>
                            {trendData.length > 1 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={trendData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                        <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: colors.textSecondary }} />
                                        <YAxis domain={['auto', 'auto']} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: colors.textSecondary }} />
                                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                        <Line type="monotone" dataKey="sys" stroke={colors.primaryBlue} strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} name="Systolic" />
                                        <Line type="monotone" dataKey="dia" stroke="#38BDF8" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} name="Diastolic" />
                                    </LineChart>
                                </ResponsiveContainer>
                            ) : (
                                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textSecondary, fontSize: '13px', fontWeight: '600' }}>
                                    Need at least 2 entries for trend
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Vitals History */}
                    <div style={{ backgroundColor: '#FFFFFF', padding: '24px', borderRadius: '20px', border: `1px solid ${colors.border}`, flex: 1 }}>
                        <h3 style={{ fontSize: '16px', fontWeight: '900', color: colors.textPrimary, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <History size={18} color="#0EA5E9" /> Recent History
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {vitalsHistory.length > 0 ? (
                                vitalsHistory.slice(0, 5).map((v, idx) => (
                                    <div key={idx} style={{ padding: '16px', backgroundColor: '#F8FAFC', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ fontSize: '15px', fontWeight: '900', color: colors.textPrimary }}>
                                                {v.bpSystolic}/{v.bpDiastolic} <span style={{ fontSize: '12px', fontWeight: '700', color: colors.textSecondary }}>mmHg</span>
                                            </div>
                                            <div style={{ fontSize: '12px', color: '#64748B', display: 'flex', gap: '8px', marginTop: '4px', fontWeight: '600' }}>
                                                <span>HR: {v.heartRate}</span> • <span>T: {v.temperature}°F</span>
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '11px', fontWeight: '800', color: colors.textSecondary }}>
                                                {new Date(v.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                            {v.alertTriggered && <span style={{ fontSize: '10px', color: colors.alertRed, fontWeight: '800', textTransform: 'uppercase', marginTop: '4px', display: 'block' }}>Alert</span>}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div style={{ textAlign: 'center', padding: '30px 0', color: colors.textSecondary, fontSize: '13px', fontWeight: '600' }}>
                                    No vitals recorded today.
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>

            <style>{`
                .spinner { animation: spin 1s linear infinite; } 
                @keyframes spin { 100% { transform: rotate(360deg); } }
                input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
                input[type=number] { -moz-appearance: textfield; }
            `}</style>
        </div>
    );
}
