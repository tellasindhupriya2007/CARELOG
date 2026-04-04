import { collection, addDoc, query, where, onSnapshot, doc, updateDoc, serverTimestamp, getDocs, limit } from 'firebase/firestore';
import { db } from '../firebase/config';

// Trigger an alert and save it to the 'alerts' collection
export const triggerAlert = async (patientId, type, message, source) => {
    try {
        const alertsRef = collection(db, 'alerts');
        await addDoc(alertsRef, {
            patientId,
            type, // "critical" | "warning" | "normal"
            message,
            source, // "vitals" | "task" | "observation"
            isRead: false,
            timestamp: serverTimestamp()
        });
        console.log(`Alert triggered: ${message}`);
    } catch (e) {
        console.error("Error triggering alert: ", e);
    }
};

// Check if there are any alerts for a patient, if not generate mock data
export const preloadMockAlertsIfNeeded = async (patientId) => {
    if (!patientId) return;
    try {
        const q = query(collection(db, 'alerts'), where('patientId', '==', patientId), limit(1));
        const snap = await getDocs(q);
        
        if (snap.empty) {
            console.log("Preloading mock alerts for new patient...");
            await triggerAlert(patientId, 'critical', 'High BP detected (150/100)', 'vitals');
            await triggerAlert(patientId, 'warning', 'Medication missed at 9:00 PM', 'task');
            await triggerAlert(patientId, 'normal', 'Routine check completed', 'observation');
        }
    } catch (e) {
        console.error("Error preloading alerts:", e);
    }
}

// Mark an alert as read
export const markAlertAsRead = async (alertId) => {
    try {
        const alertRef = doc(db, 'alerts', alertId);
        await updateDoc(alertRef, {
            isRead: true
        });
    } catch (e) {
        console.error("Error marking alert as read: ", e);
    }
};

// Real-time listener for alerts for a specific patient (or all if null)
export const listenToAlerts = (patientId, callback) => {
    let q;
    if (!patientId) {
        q = query(collection(db, 'alerts'));
    } else {
        q = query(
            collection(db, 'alerts'), 
            where('patientId', '==', patientId)
        );
    }
    
    return onSnapshot(q, (snapshot) => {
        const alerts = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .sort((a, b) => {
                const ta = a.timestamp?.toDate?.() || new Date(a.timestamp || 0);
                const tb = b.timestamp?.toDate?.() || new Date(b.timestamp || 0);
                return tb - ta; // desc
            });
        callback(alerts);
    });
};
