import React from 'react';
import BottomNav from './BottomNav';

export default function CaretakerBottomNav() {
    const navItems = [
        { icon: 'Home', label: 'Home', path: '/caretaker/dashboard' },
        { icon: 'HeartPulse', label: 'Vitals', path: '/caretaker/vitals' },
        { icon: 'Clipboard', label: 'Observations', path: '/caretaker/observations' },
        { icon: 'Bell', label: 'Alerts', path: '/caretaker/alerts' },
    ];

    return <BottomNav navItems={navItems} />;
}
