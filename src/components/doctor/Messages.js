import React, { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';
import DoctorShell from './DoctorShell';
import ChatInterface from '../common/ChatInterface';
import { useAuthContext } from '../../context/AuthContext';

export default function DoctorMessages() {
    const { user, patientId, role } = useAuthContext();
    const [alertCount, setAlertCount] = useState(0);

    // Alert count subscription for DoctorShell
    useEffect(() => {
        const u = onSnapshot(collection(db, 'alerts'), s => setAlertCount(s.docs.filter(d => !d.data().isRead).length));
        return () => u();
    }, []);

    // For Doctor, we either pass patientId if looking at a specific patient's chat,
    // or if the routing supports a full inbox, we might need a generic selector.
    // However, the prompt specifically says "Use patient-based user mapping".
    // For doctor's messages, typically they select a patient. 
    // Here we use the global patientId if set, or require selecting one.
    // Assuming patientId in context is the currently loaded patient.

    // If patientId is null, doctor hasn't selected a patient context yet.
    if (!patientId) {
        return (
            <DoctorShell alertCount={alertCount}>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC' }}>
                    <div style={{ textAlign: 'center', backgroundColor: 'white', padding: '40px', borderRadius: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', maxWidth: '400px' }}>
                        <div style={{ fontSize: '18px', fontWeight: '800', color: '#0F172A', marginBottom: '8px' }}>No Patient Selected</div>
                        <p style={{ fontSize: '14px', color: '#64748B', lineHeight: '1.5' }}>
                            Please select a patient from your Dashboard to access their secure messaging channel and communicate with their family and caregivers.
                        </p>
                    </div>
                </div>
            </DoctorShell>
        );
    }

    return (
        <DoctorShell alertCount={alertCount}>
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                <ChatInterface currentUser={user} patientId={patientId} userRole={role || "doctor"} />
            </div>
        </DoctorShell>
    );
}
