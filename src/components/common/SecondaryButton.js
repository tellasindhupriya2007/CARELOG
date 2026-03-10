import React from 'react';
import { colors } from '../../styles/colors';
import { typography } from '../../styles/typography';
import { spacing } from '../../styles/spacing';

export default function SecondaryButton({ label, onClick, disabled, ...props }) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            style={{
                width: '100%',
                height: '52px',
                backgroundColor: colors.white,
                border: `1.5px solid ${colors.primaryBlue}`,
                color: colors.primaryBlue,
                fontSize: typography.buttonText.fontSize,
                fontWeight: typography.buttonText.fontWeight,
                borderRadius: spacing.borderRadius.button,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.7 : 1,
                transition: 'transform 0.1s ease',
            }}
            onPointerDown={(e) => {
                if (!disabled) e.currentTarget.style.transform = 'scale(0.97)';
            }}
            onPointerUp={(e) => {
                if (!disabled) e.currentTarget.style.transform = 'scale(1)';
            }}
            onPointerLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
            }}
            {...props}
        >
            {label}
        </button>
    );
}
