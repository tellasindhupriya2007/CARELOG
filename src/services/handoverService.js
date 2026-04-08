import { collection, addDoc, query, where, getDocs, limit, orderBy, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { getTodayDateString } from '../utils/dateHelpers';

export const createShiftHandover = async (patientId, caregiverId, caregiverName) => {
    if (!patientId || !caregiverId) throw new Error("Missing required fields");

    const todayDate = getTodayDateString();

    // 1. Fetch Tasks for today
    const tasksQ = query(collection(db, 'patients', patientId, 'tasks'), where('active', '==', true));
    const tasksSnap = await getDocs(tasksQ);
    const tasks = tasksSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Fetch completions and observations from daily logs
    const logQ = query(collection(db, 'dailyLogs'), where('patientId', '==', patientId), where('date', '==', todayDate));
    const logSnap = await getDocs(logQ);
    let completions = {};
    let observations = [];
    if (!logSnap.empty) {
        const logData = logSnap.docs[0].data();
        completions = logData.completions || {};
        observations = logData.observations || [];
    }

    // Combine tasks with statuses
    const snapshotTasks = tasks.map(t => ({
        id: t.id,
        title: t.title,
        category: t.category,
        time: t.time,
        status: completions[t.id]?.completed ? 'completed' : 'pending',
        completedAt: completions[t.id]?.completedAt || null
    }));

    // 2. Fetch Latest Vitals (Bypass index with client-side sort)
    const vitalsQ = query(collection(db, 'vitals'), where('patientId', '==', patientId));
    const vitalsSnap = await getDocs(vitalsQ);
    console.log("Vitals fetched for handover");
    let latestVitals = null;
    if (!vitalsSnap.empty) {
        // Precise sorting handles Firestore Timestamp objects correctly
        const sortedVitals = vitalsSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => {
            const ta = a.recordedAt?.toMillis ? a.recordedAt.toMillis() : (a.recordedAt?.toDate ? a.recordedAt.toDate().getTime() : (a.recordedAt || 0));
            const tb = b.recordedAt?.toMillis ? b.recordedAt.toMillis() : (b.recordedAt?.toDate ? b.recordedAt.toDate().getTime() : (b.recordedAt || 0));
            return tb - ta;
        });
        latestVitals = sortedVitals[0] || null;
    }

    // 3. Fetch Unresolved Alerts
    const alertsQ = query(collection(db, 'alerts'), where('patientId', '==', patientId), where('isRead', '==', false));
    const alertsSnap = await getDocs(alertsQ);
    const activeAlerts = alertsSnap.docs.map(d => ({
        id: d.id,
        message: d.data().message,
        type: d.data().type,
        timestamp: d.data().timestamp?.toDate?.() ? d.data().timestamp.toDate().toISOString() : new Date().toISOString()
    }));

    // 4. Create Snapshot
    const handoverData = {
        patientId,
        caregiverId,
        caregiverName,
        tasks: snapshotTasks,
        vitals: latestVitals,
        observations: observations,
        alerts: activeAlerts,
        createdAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, 'handover_logs'), handoverData);
    return { id: docRef.id, ...handoverData };
};

export const getLatestHandover = async (patientId) => {
    if (!patientId) return null;
    try {
        // Find latest handover for this patient.
        // We will query by patientId, then client-side sort to get the latest, avoiding composite index required by orderBy.
        const q = query(collection(db, 'handover_logs'), where('patientId', '==', patientId));
        const snap = await getDocs(q);
        
        if (snap.empty) {
            return null;
        }

        const sorted = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => {
            const ta = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
            const tb = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
            return tb - ta;
        });

        return sorted[0];
    } catch (e) {
        console.error("Error fetching latest handover:", e);
        return null;
    }
};
