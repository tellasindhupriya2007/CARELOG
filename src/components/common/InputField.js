import React, { useState } from 'react';
import { colors } from '../../styles/colors';
import { typography } from '../../styles/typography';
import { spacing } from '../../styles/spacing';

export default function InputField({ label, placeholder, value, onChange, error, type = 'text', style, ...props }) {
    const [isFocused, setIsFocused] = useState(false);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
            {label && (
                <label style={{
                    fontSize: typography.smallLabel.fontSize,
                    fontWeight: typography.smallLabel.fontWeight,
                    color: typography.smallLabel.color,
                }}>
                    {label} {props.required && <span style={{ color: colors.alertRed }}>*</span>}
                </label>
            )}
            <input
                type={type}
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                style={{
                    width: '100%',
                    height: '52px',
                    backgroundColor: colors.background,
                    border: `1.5px solid ${error ? colors.alertRed : (isFocused ? colors.primaryBlue : colors.border)}`,
                    borderRadius: spacing.borderRadius.input,
                    padding: '0 16px',
                    fontSize: typography.bodyText.fontSize,
                    color: typography.cardTitle.color,
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    ...style
                }}
                {...props}
            />
            {error && (
                <span style={{
                    fontSize: typography.smallLabel.fontSize,
                    color: colors.alertRed,
                    animation: 'shake 0.3s'
                }}>
                    {error}
                </span>
            )}
            <style>{`
        @keyframes shake {
          0% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          50% { transform: translateX(4px); }
          75% { transform: translateX(-4px); }
          100% { transform: translateX(0); }
        }
      `}</style>
        </div>
    );
}
