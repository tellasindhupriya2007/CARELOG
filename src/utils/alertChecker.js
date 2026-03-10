import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

export const checkVitalsAndCreateAlert = async (patientId, vitalsData, patientDetails) => {
    const { bpSystolic, bpDiastolic, heartRate, temperature } = vitalsData;

    const checkBpSys = (val) => val && (Number(val) < 90 || Number(val) > 140);
    const checkBpDia = (val) => val && (Number(val) < 60 || Number(val) > 90);
    const checkHr = (val) => val && (Number(val) < 60 || Number(val) > 100);
    const checkTemp = (val) => val && (Number(val) < 97 || Number(val) > 99);

    const sysAbnormal = checkBpSys(bpSystolic);
    const diaAbnormal = checkBpDia(bpDiastolic);
    const hrAbnormal = checkHr(heartRate);
    const tempAbnormal = checkTemp(temperature);

    const isAnyAbnormal = sysAbnormal || diaAbnormal || hrAbnormal || tempAbnormal;

    if (isAnyAbnormal) {
        const abnormalDetails = [];
        if (sysAbnormal) abnormalDetails.push({ param: 'Blood Pressure (Systolic)', val: bpSystolic });
        if (diaAbnormal) abnormalDetails.push({ param: 'Blood Pressure (Diastolic)', val: bpDiastolic });
        if (hrAbnormal) abnormalDetails.push({ param: 'Heart Rate', val: heartRate });
        if (tempAbnormal) abnormalDetails.push({ param: 'Temperature', val: temperature });

        const alertsRef = collection(db, 'alerts');
        for (const detail of abnormalDetails) {
            await addDoc(alertsRef, {
                type: 'vitals', // Replaced Red with vitals as per instruction
                message: `${detail.param} reading of ${detail.val} is critically outside safe limits.`,
                title: `Critical Vitals Alert`,
                triggeredAt: serverTimestamp(),
                patientId: patientId,
                parameter: detail.param,
                recordedValue: detail.val
            });
        }
        return true;
    }
    return false;
};

export const checkCriticalObservationAndAlert = async (patientId, observationData) => {
    if (observationData.isCritical) {
        await addDoc(collection(db, 'alerts'), {
            type: 'criticalObservation',
            message: `Caretaker flagged a critical observation for patient at ${new Date().toLocaleTimeString()}`,
            title: 'Critical Observation',
            triggeredAt: serverTimestamp(),
            patientId: patientId,
            parameter: 'Observation',
        });
        return true;
    }
    return false;
};
