import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Users, Bell, FileText, Settings, HeartPulse, LogOut, PieChart, MessageSquare, Menu, X } from 'lucide-react';
import { useAuthContext } from '../../context/AuthContext';
import { DS } from './ds';

const iconMap = { Users, Bell, FileText, Settings, PieChart, MessageSquare };

const items = [
    { icon: 'Users', label: 'Patients', path: '/doctor/dashboard' },
    { icon: 'Bell', label: 'Alerts', path: '/doctor/alerts' },
    { icon: 'MessageSquare', label: 'Messages', path: '/doctor/messages' },
    { icon: 'FileText', label: 'Reports', path: '/doctor/reports' },
    { icon: 'Settings', label: 'Settings', path: '/doctor/settings' },
];

export default function DoctorShell({ children, alertCount = 0 }) {
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const { logout, user } = useAuthContext();
    const [isSidebarOpen, setSidebarOpen] = useState(false);

    const titleMap = {
        '/doctor/dashboard': 'Clinical Hub',
        '/doctor/alerts': 'Alerts',
        '/doctor/messages': 'Messages',
        '/doctor/reports': 'Reports',
        '/doctor/settings': 'Settings'
    };
    const currentTitle = titleMap[pathname] || 'CareLog';

    return (
        <div style={{ display: 'flex', height: '100vh', fontFamily: "'Inter', sans-serif", overflow: 'hidden', backgroundColor: '#ffffff', flexDirection: 'column' }}>
            <header className="mobile-only" style={{ height: '56px', backgroundColor: '#ffffff', borderBottom: '1px solid #EAECF0', display: 'flex', alignItems: 'center', padding: '0 16px', gap: '12px', flexShrink: 0, zIndex: 100 }}>
                <button onClick={() => setSidebarOpen(true)} style={{ background: 'none', border: 'none', color: '#101828', padding: '8px' }}>
                    <Menu size={20} />
                </button>
                <span style={{ fontSize: '16px', fontWeight: '900', color: '#101828' }}>{currentTitle}</span>
            </header>

            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                <aside className={`sidebar ${isSidebarOpen ? 'active' : ''}`} style={{
                    width: '240px', minWidth: '240px', backgroundColor: '#ffffff', borderRight: '1px solid #EAECF0', display: 'flex', flexDirection: 'column', padding: '24px 0', zIndex: 2000, transition: 'all 0.3s', position: window.innerWidth < 768 ? 'fixed' : 'relative', height: '100%', left: window.innerWidth < 768 && !isSidebarOpen ? '-240px' : '0'
                }}>
                    <div style={{ padding: '0 24px 32px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '32px', height: '32px', background: '#0052FF', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <HeartPulse size={18} color="white" strokeWidth={2.5} />
                            </div>
                            <span style={{ fontSize: '18px', fontWeight: '900', color: '#101828', letterSpacing: '-0.5px' }}>CareLog</span>
                        </div>
                    </div>

                    <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', padding: '0 12px' }}>
                        {items.map(item => {
                            const Icon = iconMap[item.icon];
                            const active = pathname === item.path || (item.path !== '/doctor/dashboard' && pathname.startsWith(item.path));
                            return (
                                <button key={item.path} onClick={() => { navigate(item.path); setSidebarOpen(false); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: '10px', border: 'none', background: active ? '#0052FF' : 'transparent', color: active ? '#ffffff' : '#475467', fontSize: '14px', fontWeight: active ? '700' : '600', cursor: 'pointer', transition: 'all 0.2s', width: '100%', textAlign: 'left' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        {Icon && <Icon size={16} strokeWidth={active ? 2.5 : 2} />}
                                        {item.label}
                                    </div>
                                    {item.label === 'Alerts' && alertCount > 0 && <span style={{ backgroundColor: active ? '#ffffff' : '#D92D20', color: active ? '#0052FF' : '#ffffff', borderRadius: '6px', minWidth: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '900' }}>{alertCount > 9 ? '9+' : alertCount}</span>}
                                </button>
                            );
                        })}
                    </nav>

                    <div style={{ padding: '20px 12px 0', borderTop: '1px solid #EAECF0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', backgroundColor: '#F9FAFB', borderRadius: '12px', marginBottom: '12px', border: '1px solid #F2F4F7' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#0052FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '14px', fontWeight: '900' }}>{user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'D'}</div>
                            <div style={{ overflow: 'hidden' }}>
                                <div style={{ fontSize: '13px', fontWeight: '800', color: '#101828', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Dr. {user?.displayName || 'Clinical'}</div>
                                <div style={{ fontSize: '11px', color: '#667085', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</div>
                            </div>
                        </div>
                        <button onClick={async () => { if (logout) await logout(); navigate('/auth/splash', { replace: true }); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', borderRadius: '10px', border: 'none', background: '#FEF3F2', color: '#B42318', fontSize: '13px', fontWeight: '800', cursor: 'pointer', width: '100%' }}><LogOut size={16} /> Sign Out</button>
                    </div>
                </aside>

                <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', backgroundColor: '#ffffff' }}>
                    {children}
                </div>
            </div>
            <style>{`
                @media (max-width: 768px) {
                    .mobile-only { display: flex !important; }
                    .sidebar { position: fixed !important; top: 0; bottom: 0; left: -240px; z-index: 2000; }
                    .sidebar.active { left: 0 !important; }
                }
                @media (min-width: 769px) { .mobile-only { display: none !important; } }
            `}</style>
        </div>
    );
}
