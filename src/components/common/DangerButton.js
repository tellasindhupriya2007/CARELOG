import React from 'react';
import { colors } from '../../styles/colors';
import { typography } from '../../styles/typography';
import { spacing } from '../../styles/spacing';
import { Loader2 } from 'lucide-react';

export default function DangerButton({ label, onClick, disabled, isLoading, ...props }) {
    return (
        <button
            onClick={onClick}
            disabled={disabled || isLoading}
            style={{
                width: '100%',
                height: '52px',
                backgroundColor: colors.alertRed,
                color: colors.white,
                border: 'none',
                fontSize: typography.buttonText.fontSize,
                fontWeight: typography.buttonText.fontWeight,
                borderRadius: spacing.borderRadius.button,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '8px',
                cursor: (disabled || isLoading) ? 'not-allowed' : 'pointer',
                opacity: (disabled || isLoading) ? 0.7 : 1,
                transition: 'transform 0.1s ease',
            }}
            onPointerDown={(e) => {
                if (!disabled && !isLoading) e.currentTarget.style.transform = 'scale(0.97)';
            }}
            onPointerUp={(e) => {
                if (!disabled && !isLoading) e.currentTarget.style.transform = 'scale(1)';
            }}
            onPointerLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
            }}
            {...props}
        >
            {isLoading ? <Loader2 size={20} className="spinner" /> : label}
        </button>
    );
}
