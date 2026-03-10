import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, updateDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuthContext } from '../../context/AuthContext';
import { getTodayDateString } from '../../utils/dateHelpers';
import { checkVitalsAndCreateAlert } from '../../utils/alertChecker';
import TopHeader from '../common/TopHeader';
import InputField from '../common/InputField';
import { colors } from '../../styles/colors';
import { spacing } from '../../styles/spacing';
import { Loader2 } from 'lucide-react';

export default function VitalsEntry() {
    const navigate = useNavigate();
    const { patientId } = useAuthContext();

    const [bpSys, setBpSys] = useState('');
    const [bpDia, setBpDia] = useState('');
    const [hr, setHr] = useState('');
    const [temp, setTemp] = useState('');

    const [submitting, setSubmitting] = useState(false);
    const [currentTime, setCurrentTime] = useState('');

    useEffect(() => {
        const updateTime = () => {
            setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        };
        updateTime();
        const timer = setInterval(updateTime, 60000);
        return () => clearInterval(timer);
    }, []);

    // Validation functions
    const checkBpSys = (val) => val && (Number(val) < 90 || Number(val) > 140);
    const checkBpDia = (val) => val && (Number(val) < 60 || Number(val) > 90);
    const checkHr = (val) => val && (Number(val) < 60 || Number(val) > 100);
    const checkTemp = (val) => val && (Number(val) < 97 || Number(val) > 99);

    const sysAbnormal = checkBpSys(bpSys);
    const diaAbnormal = checkBpDia(bpDia);
    const hrAbnormal = checkHr(hr);
    const tempAbnormal = checkTemp(temp);

    const isAnyAbnormal = sysAbnormal || diaAbnormal || hrAbnormal || tempAbnormal;
    const isFormComplete = bpSys && bpDia && hr && temp;

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
                // Technically this shouldn't happen if dashboard initializes it, but failsafe here
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
                alertTriggered: isAnyAbnormal
            };

            // Append vital to today's log (assuming a vitals array is stored or overwriting active daily vitals object)
            const currentData = logSnap.empty ? {} : logSnap.docs[0].data();
            const existingVitals = currentData.vitals || [];
            await updateDoc(logDocRef, {
                vitals: [...existingVitals, vitalsEntry]
            });

            // Step 3: Write alerts if abnormal via abstraction
            const isAlertTriggered = await checkVitalsAndCreateAlert(patientId, { bpSystolic: bpSys, bpDiastolic: bpDia, heartRate: hr, temperature: temp }, {});

            let abnormalDetails = [];
            if (isAlertTriggered) {
                if (sysAbnormal) abnormalDetails.push({ param: 'Blood Pressure (Systolic)', val: bpSys });
                if (diaAbnormal) abnormalDetails.push({ param: 'Blood Pressure (Diastolic)', val: bpDia });
                if (hrAbnormal) abnormalDetails.push({ param: 'Heart Rate', val: hr });
                if (tempAbnormal) abnormalDetails.push({ param: 'Temperature', val: temp });
            }

            // Step 4: Navigate to confirmation
            navigate('/caretaker/alert-confirmation', {
                state: {
                    isAbnormal: isAnyAbnormal,
                    abnormalDetails
                },
                replace: true
            });

        } catch (error) {
            console.error(error);
            alert('Failed to save vitals. Please try again.');
        }
        setSubmitting(false);
    };

    const getPillStyle = () => ({
        display: 'inline-block',
        backgroundColor: colors.grey100, // grey-100
        color: colors.textSecondary,
        fontSize: '12px',
        padding: '4px 10px',
        borderRadius: '16px',
        marginTop: '4px'
    });

    return (
        <div style={{ backgroundColor: colors.white, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <TopHeader title="Enter Vitals" showBack onBack={() => navigate(-1)} />

            <div style={{ padding: spacing.pagePadding, flex: 1, display: 'flex', flexDirection: 'column' }}>
                <p style={{ fontSize: '14px', color: colors.textSecondary, marginBottom: '24px' }}>Current Time: {currentTime}</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', flex: 1 }}>

                    <div style={{ display: 'flex', gap: '12px' }}>
                        <div style={{ flex: 1 }}>
                            <InputField
                                label="BP Systolic"
                                type="number"
                                placeholder="120"
                                value={bpSys}
                                onChange={(e) => setBpSys(e.target.value)}
                                error={sysAbnormal ? "Out of range" : ""}
                                style={{ borderColor: sysAbnormal ? colors.alertRed : undefined }}
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <InputField
                                label="BP Diastolic"
                                type="number"
                                placeholder="80"
                                value={bpDia}
                                onChange={(e) => setBpDia(e.target.value)}
                                error={diaAbnormal ? "Out of range" : ""}
                                style={{ borderColor: diaAbnormal ? colors.alertRed : undefined }}
                            />
                        </div>
                    </div>
                    <div><span style={getPillStyle()}>Normal: 90-140 / 60-90 mmHg</span></div>

                    <div>
                        <InputField
                            label="Heart Rate"
                            type="number"
                            placeholder="72"
                            value={hr}
                            onChange={(e) => setHr(e.target.value)}
                            error={hrAbnormal ? "Out of range" : ""}
                            style={{ borderColor: hrAbnormal ? colors.alertRed : undefined }}
                        />
                        <span style={getPillStyle()}>Normal: 60-100 bpm</span>
                    </div>

                    <div>
                        <InputField
                            label="Temperature (F)"
                            type="number"
                            placeholder="98.6"
                            value={temp}
                            onChange={(e) => setTemp(e.target.value)}
                            error={tempAbnormal ? "Out of range" : ""}
                            style={{ borderColor: tempAbnormal ? colors.alertRed : undefined }}
                        />
                        <span style={getPillStyle()}>Normal: 97-99 F</span>
                    </div>

                </div>

                <div style={{ marginTop: 'auto', marginBottom: '16px' }}>
                    <button
                        onClick={handleSubmit}
                        disabled={!isFormComplete || submitting}
                        style={{
                            width: '100%',
                            height: '52px',
                            backgroundColor: !isFormComplete ? colors.border : (isAnyAbnormal ? colors.alertOrange : colors.primaryGreen),
                            color: !isFormComplete ? colors.textSecondary : colors.white,
                            fontSize: '16px',
                            fontWeight: '600',
                            borderRadius: spacing.borderRadius.button,
                            border: 'none',
                            boxShadow: isFormComplete ? spacing.shadows.button : 'none',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            cursor: (!isFormComplete || submitting) ? 'not-allowed' : 'pointer',
                            opacity: submitting ? 0.7 : 1,
                            transition: 'all 0.2s ease',
                        }}
                    >
                        {submitting ? <Loader2 size={20} className="spinner" /> : (isAnyAbnormal ? "Submit - Alert Will Be Sent" : "Submit Vitals")}
                        <style>{`.spinner { animation: spin 1s linear infinite; } @keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
                    </button>
                </div>
            </div>
        </div>
    );
}
