import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuthContext } from './AuthContext';

const DoctorContext = createContext(null);

export function DoctorProvider({ children }) {
    const { user } = useAuthContext();
    const [selectedPatientId, setSelectedPatientId] = useState(null);
    const [patients, setPatients] = useState([]);
    const [alertCount, setAlertCount] = useState(0);

    useEffect(() => {
        if (!user) return;
        const q = query(collection(db, 'patients'), where('doctorId', '==', user.uid));
        return onSnapshot(q, snap => {
            setPatients(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
    }, [user]);

    useEffect(() => {
        const q = query(collection(db, 'alerts'), where('isRead', '==', false));
        return onSnapshot(q, snap => setAlertCount(snap.size));
    }, []);

    return (
        <DoctorContext.Provider value={{ selectedPatientId, setSelectedPatientId, patients, alertCount }}>
            {children}
        </DoctorContext.Provider>
    );
}

export function useDoctorContext() {
    return useContext(DoctorContext);
}
