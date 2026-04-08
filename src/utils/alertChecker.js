import { triggerAlert } from '../services/alertService';

export const checkVitalsAndCreateAlert = async (patientId, vitalsData, patientDetails) => {
    // Standardized schema: { bp: { systolic, diastolic }, heartRate, temperature }
    const { bp, heartRate, temperature } = vitalsData;
    const bpSystolic = bp?.systolic;
    const bpDiastolic = bp?.diastolic;
    
    let anyAlert = false;

    // A. VITALS
    // - BP > 140/90 → critical
    if (Number(bpSystolic) > 140 || Number(bpDiastolic) > 90) {
        await triggerAlert(patientId, 'critical', `High BP detected (${bpSystolic}/${bpDiastolic})`, 'vitals');
        anyAlert = true;
    }

    // - Temp > 100°F → warning
    if (Number(temperature) > 100) {
        await triggerAlert(patientId, 'warning', `Abnormal temperature recorded (${temperature}°F)`, 'vitals');
        anyAlert = true;
    }

    return anyAlert;
};

export const checkCriticalObservationAndAlert = async (patientId, observationData) => {
    // C. OBSERVATIONS: Caregiver marks abnormal → critical
    if (observationData.isCritical) {
        await triggerAlert(patientId, 'critical', 'Caretaker marked abnormal observation', 'observation');
        return true;
    }
    return false;
};
