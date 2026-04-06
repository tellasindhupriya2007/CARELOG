import { useEffect, useRef } from 'react';
import { useAuthContext } from '../context/AuthContext';
import { collection, query, where, getDocs, updateDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { triggerAlert } from './alertService';
import { subscribeToTasks, subscribeToDailyLogs } from './taskService';
import { getTodayDateString } from '../utils/dateHelpers';

export default function TaskMonitor() {
    const { patientId, user } = useAuthContext();

    // Map to prevent spamming during hot reloads or interval overlaps
    const firedAlerts = useRef(new Set());

    useEffect(() => {
        if (!patientId || !user) return;

        let tasks = [];
        let completions = {};

        const unsubTasks = subscribeToTasks(patientId, (allTasks) => {
            tasks = allTasks;
        });

        const unsubLogs = subscribeToDailyLogs(patientId, (logs) => {
            completions = logs || {};
        });

        const checkTasks = setInterval(async () => {
            if (tasks.length === 0) return;

            const now = new Date();
            const today = getTodayDateString();

            for (const task of tasks) {
                if (!task.time || task.time === 'As needed') continue;

                // Parse task time
                const [targetHour, targetMin] = task.time.split(':').map(Number);
                const targetTime = new Date();
                targetTime.setHours(targetHour, targetMin, 0, 0);

                // Check if it's past 30 mins
                const diffMs = now - targetTime;
                const thirtyMinsMs = 30 * 60 * 1000;

                // If overdue by 30+ mins AND hasn't been completed today
                if (diffMs > thirtyMinsMs && !completions[task.id]?.completed) {
                    
                    const cacheKey = `${task.id}_${today}`;
                    
                    // Cross-client duplication prevention
                    // We check if "missedAlert" is tracked in DB
                    if (!completions[task.id]?.missedAlert && !firedAlerts.current.has(cacheKey)) {
                        firedAlerts.current.add(cacheKey);

                        try {
                            const level = task.isCritical ? 'critical' : 'warning';
                            await triggerAlert(
                                patientId, 
                                level, 
                                `Missed Task: ${task.title || task.name} scheduled for ${task.time} has not been completed.`, 
                                'task'
                            );
                            
                            // Mark in DB that the missed alert fired so we don't spam it later
                            const logRef = doc(db, 'patients', patientId, 'dailyLogs', today);
                            const logSnap = await getDoc(logRef);
                            
                            if (!logSnap.exists()) {
                                await setDoc(logRef, {
                                    completions: {
                                        [task.id]: { missedAlert: true }
                                    }
                                });
                            } else {
                                await updateDoc(logRef, {
                                    [`completions.${task.id}.missedAlert`]: true
                                });
                            }

                        } catch(e) {
                            console.error("Failed to fire missed task alert", e);
                            firedAlerts.current.delete(cacheKey);
                        }
                    }
                }
            }
        }, 1000 * 60); // Check every minute

        return () => {
            clearInterval(checkTasks);
            unsubTasks();
            unsubLogs();
        };

    }, [patientId, user]);

    return null; // pure headless component
}
