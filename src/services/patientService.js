/**
 * CareLog — Patient Service
 * Central Firestore CRUD for the `patients` collection.
 * PatientId = Firestore auto-generated doc ID, used across all modules.
 */

import {
    collection, addDoc, doc, getDoc, getDocs, updateDoc,
    query, where, onSnapshot, serverTimestamp, orderBy, limit
} from 'firebase/firestore';
import { db } from '../firebase/config';

// ─── Collection reference ─────────────────────────────────
const PATIENTS = 'patients';

// ─── CREATE ───────────────────────────────────────────────

/**
 * Create a new patient.
 * Returns the Firestore-generated patientId.
 *
 * @param {Object} data  Patient fields from the form
 * @returns {string} patientId
 */
export const createPatient = async ({
    name,
    age,
    gender,
    dob,
    bloodGroup,
    conditions,
    allergies,
    medications,
    emergencyContact,
    emergencyPhone,
    doctorId,
    caregiverId,
    familyId,
    address,
    notes,
}) => {
    if (!name?.trim()) throw new Error('Patient name is required.');

    const ref = await addDoc(collection(db, PATIENTS), {
        // Identity
        name: name.trim(),
        age: Number(age) || null,
        gender: gender || null,
        dob: dob || null,
        bloodGroup: bloodGroup || null,

        // Clinical
        conditions: conditions || '',
        allergies: allergies || '',
        medications: medications || '',
        notes: notes || '',

        // Emergency
        emergencyContact: emergencyContact || '',
        emergencyPhone: emergencyPhone || '',

        // Location
        address: address || '',

        // Relations  ← link to logged-in user IDs
        doctorId: doctorId || null,
        caregiverId: caregiverId || null,
        familyId: familyId || null,

        // Meta
        status: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });

    return ref.id; // ← Firestore auto-generated patientId
};

// ─── READ ─────────────────────────────────────────────────

/** Get a single patient doc by ID. */
export const getPatient = async (patientId) => {
    if (!patientId) return null;
    const snap = await getDoc(doc(db, PATIENTS, patientId));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

/** Live-subscribe to a single patient. */
export const subscribeToPatient = (patientId, callback) => {
    if (!patientId) return () => {};
    return onSnapshot(doc(db, PATIENTS, patientId), (snap) => {
        callback(snap.exists() ? { id: snap.id, ...snap.data() } : null);
    });
};

/** Live-subscribe to all patients for a doctor. */
export const subscribeToDoctorPatients = (doctorId, callback) => {
    if (!doctorId) return () => {};
    const q = query(collection(db, PATIENTS), where('doctorId', '==', doctorId));
    return onSnapshot(q, (snap) => {
        callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.warn('[patientService] subscribeToDoctorPatients error:', err.message));
};

/** Live-subscribe to patients for a caregiver. */
export const subscribeToCaregiverPatients = (caregiverId, callback) => {
    if (!caregiverId) return () => {};
    const q = query(collection(db, PATIENTS), where('caregiverId', '==', caregiverId));
    return onSnapshot(q, (snap) => {
        callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
};

/** Live-subscribe to patients for a family member. */
export const subscribeToFamilyPatients = (familyId, callback) => {
    if (!familyId) return () => {};
    const q = query(collection(db, PATIENTS), where('familyId', '==', familyId));
    return onSnapshot(q, (snap) => {
        callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
};

// ─── UPDATE ───────────────────────────────────────────────

/** Update patient fields. */
export const updatePatient = async (patientId, fields) => {
    if (!patientId) throw new Error('patientId required');
    await updateDoc(doc(db, PATIENTS, patientId), {
        ...fields,
        updatedAt: serverTimestamp(),
    });
};

/** Assign a caregiver to an existing patient. */
export const assignCaregiver = (patientId, caregiverId) =>
    updatePatient(patientId, { caregiverId });

/** Assign a family member to an existing patient. */
export const assignFamily = (patientId, familyId) =>
    updatePatient(patientId, { familyId });

// ─── SEED ────────────────────────────────────────────────

const SEED_PATIENTS = [
    {
        name: 'Tella Sriramulu', age: 78, gender: 'Male', bloodGroup: 'O+',
        conditions: 'Brain Injury, Hypertension', allergies: 'Penicillin',
        medications: 'Aspirin 81mg, Lisinopril 10mg',
        emergencyContact: 'Sindhu (Daughter)', emergencyPhone: '+91 98765 43210',
    },
    {
        name: 'Priya Sharma', age: 65, gender: 'Female', bloodGroup: 'A+',
        conditions: 'Hypertension', allergies: 'Sulfa',
        medications: 'Amlodipine 5mg, Metoprolol 25mg',
        emergencyContact: 'Rahul Sharma (Son)', emergencyPhone: '+91 98001 11222',
    },
    {
        name: 'Ravi Kumar', age: 72, gender: 'Male', bloodGroup: 'B+',
        conditions: 'Diabetes Type 2', allergies: 'None',
        medications: 'Metformin 500mg, Glipizide 5mg',
        emergencyContact: 'Kavitha Kumar (Wife)', emergencyPhone: '+91 97700 55666',
    },
];

/**
 * Auto-seed sample patients for a doctor if collection is empty.
 * Includes mock alerts for demonstration.
 */
export const seedSamplePatientsIfEmpty = async (doctorId) => {
    if (!doctorId) return;
    const snap = await getDocs(query(collection(db, PATIENTS), where('doctorId', '==', doctorId)));
    if (!snap.empty) return; // already seeded

    const { addDoc: _add } = await import('firebase/firestore');

    for (const pt of SEED_PATIENTS) {
        const ref = await addDoc(collection(db, PATIENTS), {
            ...pt,
            doctorId,
            caregiverId: null,
            familyId: null,
            status: 'active',
            notes: '',
            address: '',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });

        // Seed 2 alerts per patient
        await addDoc(collection(db, 'alerts'), {
            patientId: ref.id, patientName: pt.name,
            type: 'critical', severity: 'critical',
            message: 'High BP detected (158/98)',
            timestamp: new Date().toISOString(), isRead: false, status: 'active',
        });
        await addDoc(collection(db, 'alerts'), {
            patientId: ref.id, patientName: pt.name,
            type: 'warning', severity: 'warning',
            message: `Medication missed: ${pt.medications.split(',')[0]}`,
            timestamp: new Date(Date.now() - 3600000).toISOString(), isRead: false, status: 'active',
        });
    }
};
