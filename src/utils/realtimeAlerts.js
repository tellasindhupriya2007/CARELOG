import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';

export const listenToPatientAlerts = (patientId, callback) => {
    if (!patientId) {
        // For global doctor view fallback if unassigned
        const fallbackQ = query(collection(db, 'alerts'), orderBy('triggeredAt', 'desc'));
        return onSnapshot(fallbackQ, (snapshot) => {
            const activeAlerts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            callback(activeAlerts, snapshot);
        });
    }

    const alertsQuery = query(
        collection(db, 'alerts'),
        where('patientId', '==', patientId),
        orderBy('triggeredAt', 'desc')
    );

    const unsubscribe = onSnapshot(alertsQuery, (snapshot) => {
        // Calls the callback whenever a new alert document is added or modified
        const activeAlerts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(activeAlerts, snapshot);
    });

    // Returns the unsubscribe function so the component can clean it up when it unmounts
    return unsubscribe;
};
