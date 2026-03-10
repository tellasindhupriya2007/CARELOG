import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopHeader from '../../components/common/TopHeader';
import InputField from '../../components/common/InputField';
import PrimaryButton from '../../components/common/PrimaryButton';
import StepIndicator from '../../components/common/StepIndicator';
import { colors } from '../../styles/colors';
import { spacing } from '../../styles/spacing';

// We map this route to /family/onboarding/step-1 in App.js
export default function PatientBasicDetails() {
  const navigate = useNavigate();

  // Local state for the form
  const [formData, setFormData] = useState({
    patientName: '',
    age: '',
    medicalCondition: '',
    doctorName: '',
    doctorPhone: ''
  });

  const [errors, setErrors] = useState({});

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleNext = () => {
    // Validate
    const newErrors = {};
    if (!formData.patientName) newErrors.patientName = 'Patient Name is required';
    if (!formData.age || isNaN(formData.age)) newErrors.age = 'A valid age is required';
    if (!formData.medicalCondition) newErrors.medicalCondition = 'Condition is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Pass data forward via route state
    navigate('/family/onboarding/step-2', {
      state: { patientData: formData }
    });
  };

  return (
    <div className="auth-desktop-container" style={{ backgroundColor: colors.background, minHeight: '100vh' }}>
      <div className="auth-desktop-card" style={{ backgroundColor: colors.white, minHeight: '100vh', display: 'flex', flexDirection: 'column', width: '100%' }}>
        <TopHeader title="Set Up Patient Profile" />

        <div style={{ padding: spacing.pagePadding, flex: 1, display: 'flex', flexDirection: 'column' }}>
          <StepIndicator currentStep={1} totalSteps={3} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
            <InputField
              label="Patient Name"
              placeholder="Enter patient full name"
              value={formData.patientName}
              onChange={(e) => handleChange('patientName', e.target.value)}
              error={errors.patientName}
              required
            />
            <InputField
              label="Age"
              type="number"
              placeholder="e.g. 78"
              value={formData.age}
              onChange={(e) => handleChange('age', e.target.value)}
              error={errors.age}
              required
            />
            <InputField
              label="Medical Condition"
              placeholder="e.g. Alzheimer's, Diabetes"
              value={formData.medicalCondition}
              onChange={(e) => handleChange('medicalCondition', e.target.value)}
              error={errors.medicalCondition}
              required
            />
            <InputField
              label="Doctor Name"
              placeholder="e.g. Dr. Sarah Smith"
              value={formData.doctorName}
              onChange={(e) => handleChange('doctorName', e.target.value)}
            />
            <InputField
              label="Doctor Phone"
              type="tel"
              placeholder="e.g. +1 234 567 8900"
              value={formData.doctorPhone}
              onChange={(e) => handleChange('doctorPhone', e.target.value)}
            />
          </div>

          <div style={{ marginTop: '32px', marginBottom: '16px' }}>
            <PrimaryButton label="Next" onClick={handleNext} />
          </div>
        </div>
      </div>
    </div>
  );
}
