/**
 * CareLog · Clinical Sanctuary Design System
 * Shared tokens used across all Doctor module screens
 */
export const DS = {
    primary: '#0052FF',
    primaryContainer: '#EFF4FF',
    secondary: '#344054',
    secondaryContainer: '#F2F4F7',
    tertiary: '#079455',
    success: '#079455',
    warning: '#DC6803',
    danger: '#D92D20',
    info: '#175CD3',
    surface: '#F9FAFB',
    surfaceLow: '#F2F4F7',
    surfaceLowest: '#ffffff',
    surfaceHigh: '#E4E7EC',
    surfaceHighest: '#D0D5DD',
    textPrimary: '#101828',
    textSecondary: '#475467',
    textMuted: '#667085',
    outlineVariant: 'rgba(208,213,221,0.6)',
};

export const pill = (color, bg, text) => ({
    backgroundColor: bg,
    color,
    padding: '6px 12px',
    borderRadius: '999px',
    fontSize: '11px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    border: `1px solid ${color}15`
});

export const card = (extra = {}) => ({
    backgroundColor: DS.surfaceLowest,
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.04)',
    border: '1px solid rgba(0,0,0,0.02)',
    transition: 'all 0.2s ease',
    ...extra,
});

export const sectionLabel = {
    fontSize: '12px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: DS.textMuted,
};

export const gradientBtn = (from, to, extra = {}) => ({
    background: `linear-gradient(135deg, ${from}, ${to})`,
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    padding: '12px 24px',
    fontWeight: '600',
    fontSize: '14px',
    cursor: 'pointer',
    fontFamily: 'Inter, sans-serif',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    boxShadow: `0 8px 16px ${from}25`,
    transition: 'all 0.2s ease',
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
