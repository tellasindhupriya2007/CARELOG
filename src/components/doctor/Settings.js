import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DS, card, sectionLabel, gradientBtn } from './ds';
import DoctorShell from './DoctorShell';
import { User, Bell, Shield, LogOut, ChevronRight, Moon, Save } from 'lucide-react';

const TOGGLE_ITEMS = [
    { key: 'criticalAlerts', label: 'Critical Alert Notifications', desc: 'Notified immediately for critical BP/HR readings' },
    { key: 'missedMeds', label: 'Missed Medication Alerts', desc: 'Alert when caregiver reports missed dose' },
    { key: 'careLogUpdates', label: 'Care Log Updates', desc: 'Receive updates when logs are completed' },
    { key: 'familyMessages', label: 'Family Messages', desc: 'Get notified on new family messages' },
    { key: 'weeklyReport', label: 'Weekly Summary Email', desc: 'Auto-generated patient report every Monday' },
];

export default function DoctorSettings() {
    const navigate = useNavigate();
    const [toggles, setToggles] = useState({ criticalAlerts: true, missedMeds: true, careLogUpdates: false, familyMessages: true, weeklyReport: false });
    const [darkMode, setDarkMode] = useState(false);
    const [saved, setSaved] = useState(false);

    const handleSave = () => {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const Toggle = ({ toggled, onToggle }) => (
        <div onClick={onToggle} style={{ width: '44px', height: '24px', borderRadius: '12px', backgroundColor: toggled ? DS.primaryContainer : DS.surfaceHigh, cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
            <div style={{ position: 'absolute', top: '3px', left: toggled ? '23px' : '3px', width: '18px', height: '18px', borderRadius: '50%', backgroundColor: 'white', boxShadow: '0 1px 6px rgba(0,0,0,0.2)', transition: 'left 0.2s' }} />
        </div>
    );

    return (
        <DoctorShell alertCount={0}>
            <div style={{ flex: 1, overflowY: 'auto', backgroundColor: DS.surface, padding: '32px' }}>
                <div style={{ maxWidth: '680px', margin: '0 auto' }}>
                    <h1 style={{ fontSize: '28px', fontWeight: '900', color: DS.textPrimary, margin: '0 0 6px 0', letterSpacing: '-0.6px' }}>Settings</h1>
                    <p style={{ fontSize: '14px', color: DS.textMuted, fontWeight: '500', margin: '0 0 28px 0' }}>Manage your profile, preferences, and notifications.</p>

                    {/* Doctor Profile */}
                    <div style={{ ...card(), marginBottom: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                            <User size={15} color={DS.primaryContainer} />
                            <span style={sectionLabel}>Doctor Profile</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                            <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: `linear-gradient(135deg, ${DS.secondaryContainer}, ${DS.secondary})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '22px', fontWeight: '900' }}>
                                DR
                            </div>
                            <div>
                                <div style={{ fontSize: '20px', fontWeight: '900', color: DS.textPrimary }}>Dr. Smith</div>
                                <div style={{ fontSize: '13px', color: DS.textMuted, fontWeight: '600' }}>Clinical Director · dr.smith@carelog.health</div>
                                <div style={{ fontSize: '12px', color: DS.primaryContainer, fontWeight: '700', marginTop: '2px' }}>License: MCI-2018-04521</div>
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            {[
                                { label: 'Full Name', value: 'Dr. Arjun Smith' },
                                { label: 'Specialty', value: 'Internal Medicine' },
                                { label: 'Hospital', value: 'Apollo Medical Center' },
                                { label: 'Phone', value: '+91 98765 43210' },
                            ].map((f, i) => (
                                <div key={i}>
                                    <div style={{ fontSize: '11px', fontWeight: '700', color: DS.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>{f.label}</div>
                                    <div style={{ fontSize: '14px', fontWeight: '700', color: DS.textPrimary, padding: '10px 14px', backgroundColor: DS.surfaceLow, borderRadius: '10px' }}>{f.value}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Notifications */}
                    <div style={{ ...card(), marginBottom: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                            <Bell size={15} color={DS.warning} />
                            <span style={sectionLabel}>Notification Preferences</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {TOGGLE_ITEMS.map(item => (
                                <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: `1px solid ${DS.outlineVariant}` }}>
                                    <div>
                                        <div style={{ fontSize: '14px', fontWeight: '700', color: DS.textPrimary, marginBottom: '2px' }}>{item.label}</div>
                                        <div style={{ fontSize: '12px', fontWeight: '500', color: DS.textMuted }}>{item.desc}</div>
                                    </div>
                                    <Toggle toggled={toggles[item.key]} onToggle={() => setToggles(t => ({ ...t, [item.key]: !t[item.key] }))} />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Preferences */}
                    <div style={{ ...card(), marginBottom: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                            <Moon size={15} color={DS.secondary} />
                            <span style={sectionLabel}>App Preferences</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontSize: '14px', fontWeight: '700', color: DS.textPrimary }}>Dark Mode</div>
                                <div style={{ fontSize: '12px', color: DS.textMuted, fontWeight: '500' }}>Switch to dark theme</div>
                            </div>
                            <Toggle toggled={darkMode} onToggle={() => setDarkMode(v => !v)} />
                        </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button onClick={handleSave} style={gradientBtn(DS.primary, DS.primaryContainer, { borderRadius: '14px', padding: '13px 28px' })}>
                            <Save size={16} /> {saved ? 'Saved ✓' : 'Save Changes'}
                        </button>
                        <button onClick={() => navigate('/auth/splash')} style={{ padding: '13px 24px', borderRadius: '14px', border: 'none', backgroundColor: '#FEF2F2', color: DS.danger, fontWeight: '800', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'inherit' }}>
                            <LogOut size={16} /> Log Out
                        </button>
                    </div>
                </div>
            </div>
        </DoctorShell>
    );
}
