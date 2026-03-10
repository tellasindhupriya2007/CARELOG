import { collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

export const calculateAndSaveCareScore = async (patientId, date) => {
    try {
        const q = query(collection(db, 'dailyLogs'), where('patientId', '==', patientId), where('date', '==', date));
        const snap = await getDocs(q);

        if (snap.empty) return 0;

        const docSnap = snap.docs[0];
        const data = docSnap.data();

        // 1. Task Score (max 5 points)
        let taskScore = 0;
        const totalTasks = data.totalTasks || (data.tasks ? data.tasks.length : 0);
        const completedTasks = data.completedTasks || (data.tasks ? data.tasks.filter(t => t.status === 'Completed').length : 0);

        if (totalTasks > 0) {
            taskScore = (completedTasks / totalTasks) * 5;
        }

        // 2. Vitals Score (max 3 points)
        let vitalsScore = 1.5;
        if (data.vitals && data.vitals.length > 0) {
            const alertCount = data.vitals.filter(v => v.alertTriggered).length;
            if (alertCount === 0) vitalsScore = 3;
            else if (alertCount === 1) vitalsScore = 1.5;
            else vitalsScore = 0;
        }

        // 3. Observations Score (max 2 points)
        let obsScore = 1;
        if (data.observations && data.observations.length > 0) {
            const criticalCount = data.observations.filter(o => o.isCritical).length;
            if (criticalCount === 0) obsScore = 2;
            else if (criticalCount === 1) obsScore = 1;
            else obsScore = 0;
        }

        // Final score = task score + vitals score + observations score
        let finalScore = taskScore + vitalsScore + obsScore;

        // Round to 1 decimal place
        finalScore = Number(finalScore.toFixed(1));

        // Cap at 10 
        if (finalScore > 10) finalScore = 10;

        // Writes the score back to Firestore
        await updateDoc(docSnap.ref, {
            careScore: finalScore
        });

        return finalScore;
    } catch (error) {
        console.error("Error calculating care score:", error);
        return 0;
    }
};
