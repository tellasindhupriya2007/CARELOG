import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';

/**
 * Generates a unique Patient ID in format CL-2026-XXXX.
 * Checks Firestore to ensure no duplicate exists before returning.
 */
export async function generateUniquePatientId() {
    const year = new Date().getFullYear();
    let attempts = 0;

    while (attempts < 20) {
        const random = Math.floor(1000 + Math.random() * 9000); // 1000–9999
        const candidateId = `CL-${year}-${random}`;

        // Check for duplicates
        const q = query(collection(db, 'patients'), where('patientId', '==', candidateId));
        const snap = await getDocs(q);

        if (snap.empty) {
            return candidateId;
        }
        attempts++;
    }

    // Extremely unlikely fallback — use timestamp suffix
    return `CL-${year}-${Date.now() % 10000}`;
}
