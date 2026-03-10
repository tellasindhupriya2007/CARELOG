import React from 'react';
import BottomNav from './BottomNav';

export default function FamilyBottomNav() {
    const navItems = [
        { icon: 'Home', label: 'Home', path: '/family/dashboard' },
        { icon: 'Bell', label: 'Alerts', path: '/family/alerts' },
        { icon: 'Pill', label: 'Rx', path: '/family/prescriptions' },
        { icon: 'FileText', label: 'Reports', path: '/family/report' },
    ];

    return <BottomNav navItems={navItems} />;
}
