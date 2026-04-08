import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DS, card, sectionLabel, gradientBtn } from './ds';
import { useAuthContext } from '../../context/AuthContext';
import DoctorShell from './DoctorShell';
import { User, Bell, Shield, LogOut, ChevronRight, Moon, Save } from 'lucide-react';

const TOGGLE_ITEMS = [
    { key: 'criticalAlerts', label: 'Critical Alert Notifications', desc: 'Real-time alerts for biological threshold breaches' },
    { key: 'missedMeds', label: 'Medication Compliance', desc: 'Reports of non-adherence from caregivers' },
    { key: 'careLogUpdates', label: 'Operational Sync', desc: 'Real-time updates on completed care directives' },
    { key: 'familyMessages', label: 'Communication Hub', desc: 'Notifications for new team or family inquiries' },
    { key: 'weeklyReport', label: 'Clinical Analytics', desc: 'Predictive weekly summary of patient trajectories' },
];

export default function DoctorSettings() {
    const navigate = useNavigate();
    const { user } = useAuthContext();
    const [toggles, setToggles] = useState({ criticalAlerts: true, missedMeds: true, careLogUpdates: false, familyMessages: true, weeklyReport: false });
    const [darkMode, setDarkMode] = useState(false);
    const [saved, setSaved] = useState(false);

    const handleSave = () => {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const Toggle = ({ toggled, onToggle }) => (
        <div onClick={onToggle} style={{ width: '44px', height: '24px', borderRadius: '12px', backgroundColor: toggled ? '#0052FF' : '#E4E7EC', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
            <div style={{ position: 'absolute', top: '2px', left: toggled ? '22px' : '2px', width: '20px', height: '20px', borderRadius: '50%', backgroundColor: 'white', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }} />
        </div>
    );

    return (
        <DoctorShell alertCount={0}>
            <div style={{ flex: 1, overflowY: 'auto', backgroundColor: '#F9FAFB', padding: '56px 48px' }}>
                <div style={{ maxWidth: '820px', margin: '0 auto' }}>
                    <div style={{ marginBottom: '48px' }}>
                        <h1 style={{ fontSize: '36px', fontWeight: '900', color: '#101828', margin: '0 0 8px 0', letterSpacing: '-1.5px' }}>Institutional Settings</h1>
                        <p style={{ fontSize: '16px', color: '#667085', fontWeight: '600', margin: 0 }}>Configure clinical parameters, operational sync, and practitioner preferences.</p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
                        {/* Profile Section */}
                        <div style={{ backgroundColor: '#ffffff', borderRadius: '32px', padding: '40px', border: '1px solid #EAECF0', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#0052FF' }}></div>
                                <span style={{ fontSize: '14px', fontWeight: '900', color: '#667085', textTransform: 'uppercase', letterSpacing: '1px' }}>Practitioner Identity</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '40px' }}>
                                <div style={{ width: '72px', height: '72px', borderRadius: '20px', background: '#0052FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '28px', fontWeight: '900' }}>
                                    {user?.email ? user.email[0].toUpperCase() : 'D'}
                                </div>
                                <div>
                                    <div style={{ fontSize: '24px', fontWeight: '900', color: '#101828' }}>Dr. {user?.displayName || 'Medical Officer'}</div>
                                    <div style={{ fontSize: '16px', color: '#667085', fontWeight: '600' }}>{user?.email}</div>
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                {[
                                    { label: 'Assigned Hospital', value: 'CareLog Health Net' },
                                    { label: 'Registry Licensing', value: 'MCI-2024-EX-V4' },
                                ].map((f, i) => (
                                    <div key={i}>
                                        <div style={{ fontSize: '12px', fontWeight: '900', color: '#98A2B3', textTransform: 'uppercase', marginBottom: '8px' }}>{f.label}</div>
                                        <div style={{ fontSize: '16px', fontWeight: '700', color: '#101828', padding: '16px 20px', backgroundColor: '#F9FAFB', borderRadius: '16px', border: '1px solid #F2F4F7' }}>{f.value}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Notifications */}
                        <div style={{ backgroundColor: '#ffffff', borderRadius: '32px', padding: '40px', border: '1px solid #EAECF0', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#D92D20' }}></div>
                                <span style={{ fontSize: '14px', fontWeight: '900', color: '#667085', textTransform: 'uppercase', letterSpacing: '1px' }}>Oversight Alerts</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                {TOGGLE_ITEMS.map((item, idx) => (
                                    <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 0', borderBottom: idx === TOGGLE_ITEMS.length - 1 ? 'none' : '1px solid #F2F4F7' }}>
                                        <div style={{ paddingRight: '24px' }}>
                                            <div style={{ fontSize: '18px', fontWeight: '900', color: '#101828' }}>{item.label}</div>
                                            <div style={{ fontSize: '14px', fontWeight: '600', color: '#667085', marginTop: '4px' }}>{item.desc}</div>
                                        </div>
                                        <Toggle toggled={toggles[item.key]} onToggle={() => setToggles(t => ({ ...t, [item.key]: !t[item.key] }))} />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '20px', marginTop: '24px' }}>
                            <button onClick={handleSave} style={{ flex: 1, height: '64px', backgroundColor: '#0052FF', color: 'white', borderRadius: '20px', border: 'none', fontWeight: '900', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', boxShadow: '0 8px 20px rgba(0,82,255,0.2)' }}>
                                <Save size={20} /> {saved ? 'System Parameters Synchronized' : 'Commit Configuration'}
                            </button>
                            <button onClick={async () => { navigate('/auth/splash'); }} style={{ height: '64px', padding: '0 40px', borderRadius: '20px', border: 'none', backgroundColor: '#FEF2F2', color: '#D92D20', fontWeight: '900', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <LogOut size={20} /> End Session
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </DoctorShell>
    );
}
