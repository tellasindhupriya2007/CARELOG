import React from 'react';
import BottomNav from './BottomNav';

export default function DoctorBottomNav() {
    const navItems = [
        { icon: 'Users', label: 'Patients', path: '/doctor/dashboard' },
        { icon: 'Bell', label: 'Alerts', path: '/doctor/alerts' },
        { icon: 'FileText', label: 'Reports', path: '/doctor/reports' },
    ];

    return <BottomNav navItems={navItems} />;
}
