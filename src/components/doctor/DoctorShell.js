import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Users, Bell, FileText, Settings, HeartPulse, LogOut, PieChart, MessageSquare } from 'lucide-react';
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
    const { logout } = useAuthContext();

    return (
        <div style={{ display: 'flex', height: '100vh', fontFamily: "'Inter', sans-serif", overflow: 'hidden', backgroundColor: DS.surface }}>
            {/* Sidebar */}
            <aside style={{
                width: '220px', minWidth: '220px',
                backgroundColor: DS.surfaceLowest,
                borderRight: `1px solid ${DS.outlineVariant}`,
                display: 'flex', flexDirection: 'column', padding: '24px 0',
                zIndex: 20,
            }}>
                {/* Brand */}
                <div style={{ padding: '0 20px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '36px', height: '36px', background: `linear-gradient(135deg, ${DS.primary}, ${DS.primaryContainer})`, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <HeartPulse size={18} color="white" />
                        </div>
                        <div>
                            <div style={{ fontSize: '15px', fontWeight: '900', color: DS.textPrimary, letterSpacing: '-0.3px' }}>CareLog</div>
                            <div style={{ fontSize: '10px', color: DS.textMuted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Doctor Portal</div>
                        </div>
                    </div>
                </div>

                {/* Nav */}
                <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', padding: '0 12px' }}>
                    {items.map(item => {
                        const Icon = iconMap[item.icon];
                        const active = pathname === item.path || (item.path !== '/doctor/dashboard' && pathname.startsWith(item.path));
                        return (
                            <button
                                key={item.path}
                                onClick={() => navigate(item.path)}
                                style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '10px 12px', borderRadius: '12px', border: 'none',
                                    background: active ? `${DS.primaryContainer}15` : 'transparent',
                                    color: active ? DS.primaryContainer : DS.textSecondary,
                                    fontSize: '14px', fontWeight: active ? '700' : '600',
                                    cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit',
                                    width: '100%', textAlign: 'left',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    {Icon && <Icon size={17} />}
                                    {item.label}
                                </div>
                                {item.label === 'Alerts' && alertCount > 0 && (
                                    <span style={{ backgroundColor: DS.danger, color: 'white', borderRadius: '999px', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '900' }}>
                                        {alertCount > 9 ? '9+' : alertCount}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </nav>

                {/* Doctor Profile */}
                <div style={{ padding: '0 12px', borderTop: `1px solid ${DS.outlineVariant}`, paddingTop: '16px', marginTop: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', marginBottom: '4px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: `linear-gradient(135deg, ${DS.secondaryContainer}, ${DS.secondary})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '13px', fontWeight: '800', flexShrink: 0 }}>
                            DR
                        </div>
                        <div>
                            <div style={{ fontSize: '13px', fontWeight: '700', color: DS.textPrimary }}>Dr. Smith</div>
                            <div style={{ fontSize: '11px', color: DS.textMuted }}>Clinical Director</div>
                        </div>
                    </div>
                    <button
                        onClick={async () => {
                            if (logout) {
                                await logout();
                            }
                            navigate('/auth/splash', { replace: true });
                        }}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', borderRadius: '12px', border: 'none', background: 'transparent', color: DS.danger, fontSize: '13px', fontWeight: '700', cursor: 'pointer', width: '100%', fontFamily: 'inherit' }}
                    >
                        <LogOut size={15} /> Log Out
                    </button>
                </div>
            </aside>

            {/* Page Content */}
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                {children}
            </div>
        </div>
    );
}
