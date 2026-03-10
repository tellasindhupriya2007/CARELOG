import React from 'react';
import { colors } from '../../styles/colors';
import { spacing } from '../../styles/spacing';

export default function StepIndicator({ currentStep, totalSteps = 3 }) {
    const progressPercentage = (currentStep / totalSteps) * 100;

    return (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: spacing.gapBetweenSections }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                {[...Array(totalSteps)].map((_, i) => (
                    <div
                        key={i}
                        style={{
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            backgroundColor: i + 1 === currentStep ? colors.primaryBlue : colors.border,
                            transition: 'background-color 0.3s ease'
                        }}
                    />
                ))}
            </div>
            <div style={{ height: '4px', width: '100%', backgroundColor: colors.border, borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{
                    height: '100%',
                    width: `${progressPercentage}%`,
                    backgroundColor: colors.primaryBlue,
                    transition: 'width 0.3s ease'
                }} />
            </div>
        </div>
    );
}
