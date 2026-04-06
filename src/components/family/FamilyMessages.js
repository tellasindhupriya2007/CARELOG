import React from 'react';
import { useAuthContext } from '../../context/AuthContext';
import Sidebar from '../common/Sidebar';
import ChatInterface from '../common/ChatInterface';

const familySidebarItems = [
    { icon: 'Home', label: 'Dashboard', path: '/family/dashboard' },
    { icon: 'FileText', label: 'Reports', path: '/family/report' },
    { icon: 'Pill', label: 'Prescriptions', path: '/family/prescriptions' },
    { icon: 'Bell', label: 'Alerts', path: '/family/alerts' },
    { icon: 'MessageSquare', label: 'Messages', path: '/family/messages' }
];

export default function FamilyMessages() {
    const { user, patientId } = useAuthContext();

    return (
        <div style={{ display: 'flex', height: '100vh', backgroundColor: '#F8FAFC' }}>
            <Sidebar navItems={familySidebarItems} />
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                <ChatInterface currentUser={user} patientId={patientId} userRole="family" />
            </div>
        </div>
    );
}
