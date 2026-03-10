import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../context/AuthContext';
import { colors } from '../../styles/colors';
import { typography } from '../../styles/typography';
import { spacing } from '../../styles/spacing';
import { Home, User, Stethoscope } from 'lucide-react';

export default function Splash() {
  const navigate = useNavigate();
  const { user, role, loading } = useAuthContext();

  useEffect(() => {
    if (!loading && user && role) {
      if (role === 'caretaker') navigate('/caretaker/dashboard', { replace: true });
      if (role === 'family') navigate('/family/dashboard', { replace: true });
      if (role === 'doctor') navigate('/doctor/dashboard', { replace: true });
    }
  }, [user, role, loading, navigate]);

  const RoleCard = ({ title, subtitle, bg, Icon, roleName }) => (
    <div
      onClick={() => navigate('/auth/login', { state: { role: roleName } })}
      style={{
        backgroundColor: bg,
        borderRadius: spacing.borderRadius.card,
        padding: spacing.cardPadding,
        boxShadow: spacing.shadows.card,
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        cursor: 'pointer',
        transition: 'transform 0.1s ease',
        marginBottom: spacing.gapBetweenCards,
      }}
      onPointerDown={(e) => e.currentTarget.style.transform = 'scale(0.97)'}
      onPointerUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
      onPointerLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
    >
      <div style={{ backgroundColor: colors.white, padding: '12px', borderRadius: '12px', display: 'flex' }}>
        <Icon size={24} color={colors.primaryBlue} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: typography.cardTitle.fontSize, fontWeight: typography.cardTitle.fontWeight, color: colors.textPrimary }}>{title}</span>
        <span style={{ fontSize: typography.smallLabel.fontSize, color: colors.textSecondary }}>{subtitle}</span>
      </div>
    </div>
  );

  return (
    <div className="auth-desktop-container" style={{ backgroundColor: colors.background, minHeight: '100vh' }}>
      <div className="auth-desktop-card" style={{ backgroundColor: colors.white, minHeight: '100vh', padding: spacing.pagePadding, display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
          <h1 style={{ fontSize: '32px', fontWeight: '700', color: colors.primaryBlue, marginBottom: '8px' }}>CareLog</h1>
          <p style={{ fontSize: typography.bodyText.fontSize, color: colors.textSecondary, marginBottom: '48px' }}>Caring made simple</p>

          <div style={{ width: '100%' }}>
            <RoleCard
              title="Family Member"
              subtitle="I manage care for my loved one"
              bg="#EFF6FF"
              Icon={Home}
              roleName="family"
            />
            <RoleCard
              title="Caretaker"
              subtitle="I provide daily care"
              bg="#F0FDF4"
              Icon={User}
              roleName="caretaker"
            />
            <RoleCard
              title="Doctor"
              subtitle="I monitor patient health"
              bg="#FFF7ED"
              Icon={Stethoscope}
              roleName="doctor"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
