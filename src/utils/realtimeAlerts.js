import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';

// No orderBy in queries — avoids composite index requirement.
// Results sorted client-side by triggeredAt or timestamp.
export const listenToPatientAlerts = (patientId, callback) => {
    const q = patientId
        ? query(collection(db, 'alerts'), where('patientId', '==', patientId))
        : query(collection(db, 'alerts'));

    return onSnapshot(q, (snapshot) => {
        const activeAlerts = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .sort((a, b) => {
                const ta = a.triggeredAt?.toDate?.() || a.timestamp?.toDate?.() || new Date(a.triggeredAt || a.timestamp || 0);
                const tb = b.triggeredAt?.toDate?.() || b.timestamp?.toDate?.() || new Date(b.triggeredAt || b.timestamp || 0);
                return tb - ta; // desc
            });
        callback(activeAlerts, snapshot);
    });
};
