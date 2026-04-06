import React from 'react';
import { useAuthContext } from '../../context/AuthContext';
import Sidebar from '../common/Sidebar';
import ChatInterface from '../common/ChatInterface';

const sidebarItems = [
    { icon: 'Home', label: 'Dashboard', path: '/caretaker/dashboard' },
    { icon: 'Pill', label: 'Prescriptions', path: '/caretaker/prescriptions' },
    { icon: 'HeartPulse', label: 'Vitals', path: '/caretaker/vitals' },
    { icon: 'Clipboard', label: 'Observations', path: '/caretaker/observations' },
    { icon: 'Bell', label: 'Alerts', path: '/caretaker/alerts' },
    { icon: 'Clock', label: 'Shift Handover', path: '/caretaker/handover' },
    { icon: 'MessageSquare', label: 'Messages', path: '/caretaker/messages' },
];

export default function CaretakerMessages() {
    const { user, patientId } = useAuthContext();

    return (
        <div style={{ display: 'flex', height: '100vh', backgroundColor: '#F8FAFC' }}>
            <Sidebar navItems={sidebarItems} />
            <ChatInterface currentUser={user} patientId={patientId} userRole="caretaker" />
        </div>
    );
}
