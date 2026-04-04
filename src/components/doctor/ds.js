/**
 * CareLog · Clinical Sanctuary Design System
 * Shared tokens used across all Doctor module screens
 */
export const DS = {
    primary: '#00288e',
    primaryContainer: '#1e40af',
    secondary: '#712ae2',
    secondaryContainer: '#8a4cfc',
    tertiary: '#00563a',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    info: '#3B82F6',
    surface: '#f7f9fb',
    surfaceLow: '#f2f4f6',
    surfaceLowest: '#ffffff',
    surfaceHigh: '#e6e8ea',
    surfaceHighest: '#e0e3e5',
    textPrimary: '#191c1e',
    textSecondary: '#444653',
    textMuted: '#757684',
    outlineVariant: 'rgba(196,197,213,0.18)',
};

export const pill = (color, bg, text) => ({
    backgroundColor: bg,
    color,
    padding: '4px 10px',
    borderRadius: '8px',
    fontSize: '11px',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
    display: 'inline-block',
});

export const card = (extra = {}) => ({
    backgroundColor: DS.surfaceLowest,
    borderRadius: '20px',
    padding: '20px',
    boxShadow: '0 4px 20px rgba(25,28,30,0.05)',
    ...extra,
});

export const sectionLabel = {
    fontSize: '11px',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    color: DS.textSecondary,
};

export const gradientBtn = (from, to, extra = {}) => ({
    background: `linear-gradient(135deg, ${from}, ${to})`,
    color: 'white',
    border: 'none',
    borderRadius: '14px',
    padding: '10px 20px',
    fontWeight: '800',
    fontSize: '14px',
    cursor: 'pointer',
    fontFamily: 'Inter, sans-serif',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    ...extra,
});

export const statusMeta = (status) => {
    if (status === 'RED' || status === 'critical') return { label: 'ABNORMAL', color: DS.danger, bg: '#FEF2F2', dot: DS.danger };
    if (status === 'ORANGE' || status === 'warning') return { label: 'NO RECENT DATA', color: DS.warning, bg: '#FEF3C7', dot: DS.warning };
    return { label: 'NORMAL', color: DS.success, bg: '#DCFCE7', dot: DS.success };
};

export const navItems = [
    { icon: 'Users', label: 'Patients', path: '/doctor/dashboard' },
    { icon: 'Bell', label: 'Alerts', path: '/doctor/alerts' },
    { icon: 'FileText', label: 'Reports', path: '/doctor/reports' },
    { icon: 'Settings', label: 'Settings', path: '/doctor/settings' },
];
