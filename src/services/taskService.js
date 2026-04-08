import { 
    collection, doc, setDoc, getDoc, getDocs, 
    updateDoc, deleteDoc, serverTimestamp, 
    query, where, onSnapshot, arrayUnion 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { getTodayDateString } from '../utils/dateHelpers';

/**
 * PRESCRIBED CARE CHECKLIST - SERVICE LAYER
 */

/**
 * 1. PATIENT MANAGEMENT
 */
export const createPatient = async (familyUid, patientData) => {
    // Generate a unique Human-Readable ID: CL-2026-XXXX
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const humanId = `CL-2026-${randomSuffix}`;
    
    const patientRef = doc(collection(db, 'patients'));
    const newPatient = {
        id: patientRef.id,
        patientId: humanId,
        ...patientData,
        createdBy: familyUid,
        createdAt: serverTimestamp(),
        caretakers: [],
        doctors: []
    };
    
    await setDoc(patientRef, newPatient);
    return newPatient;
};

/**
 * 2. TASK MANAGEMENT
 */
export const addTask = async (patientId, taskData) => {
    const tasksRef = collection(db, 'patients', patientId, 'tasks');
    const newTaskRef = doc(tasksRef);
    const task = {
        id: newTaskRef.id,
        ...taskData,
        createdAt: serverTimestamp(),
        active: true
    };
    await setDoc(newTaskRef, task);
    return task;
};

export const deleteRelativeTask = async (patientId, taskId) => {
    const taskRef = doc(db, 'patients', patientId, 'tasks', taskId);
    await updateDoc(taskRef, { active: false }); // Soft delete to keep history
};

export const subscribeToTasks = (patientId, callback) => {
    const q = query(
        collection(db, 'patients', patientId, 'tasks'), 
        where('active', '==', true)
    );
    return onSnapshot(q, (snapshot) => {
        const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(tasks);
    });
};

/**
 * 3. DAILY TRACKING & PERSISTENCE
 */
export const toggleTaskCompletion = async (patientId, taskId, caretakerUid, completed) => {
    const today = getTodayDateString();
    const logRef = doc(db, 'patients', patientId, 'dailyLogs', today);
    
    const logDoc = await getDoc(logRef);
    if (!logDoc.exists()) {
        await setDoc(logRef, {
            completions: {
                [taskId]: completed ? {
                    completed: true,
                    completedBy: caretakerUid,
                    completedAt: new Date().toISOString()
                } : null
            }
        });
    } else {
        await updateDoc(logRef, {
            [`completions.${taskId}`]: completed ? {
                completed: true,
                completedBy: caretakerUid,
                completedAt: new Date().toISOString()
            } : null
        });
    }
};

export const subscribeToDailyLogs = (patientId, callback) => {
    const today = getTodayDateString();
    const logRef = doc(db, 'patients', patientId, 'dailyLogs', today);
    
    return onSnapshot(logRef, (doc) => {
        if (doc.exists()) {
            callback(doc.data().completions || {});
        } else {
            callback({});
        }
    });
};

/**
 * 4. DEFAULT WORKFLOW GENERATOR
 */
export const createDefaultWorkflow = async (patientId) => {
    const defaultTasks = [
        { title: 'Morning Medication', time: '07:15', category: 'Medication', icon: 'Pill' },
        { title: 'Breakfast', time: '08:00', category: 'Nutrition', icon: 'Utensils' },
        { title: 'Walking', time: '09:00', category: 'Physical Activity', icon: 'Activity' },
        { title: 'Lunch', time: '12:30', category: 'Nutrition', icon: 'Utensils' },
        { title: 'Check Vitals', time: '15:00', category: 'Vitals Monitoring', icon: 'HeartPulse' },
        { title: 'Dinner', time: '19:00', category: 'Nutrition', icon: 'Utensils' },
        { title: 'Evening Medication', time: '21:00', category: 'Medication', icon: 'Pill' },
        { title: 'Bedtime Routine', time: '22:00', category: 'Sleep Routine', icon: 'Moon' }
    ];

    for (const task of defaultTasks) {
        await addTask(patientId, task);
    }
};

/**
 * 5. SUMMARY / PROGRESS
 */
export const calculateProgress = (tasks, completions) => {
    if (!tasks || tasks.length === 0) return 0;
    const completedCount = tasks.filter(t => completions[t.id]?.completed).length;
    return Math.round((completedCount / tasks.length) * 100);
};
