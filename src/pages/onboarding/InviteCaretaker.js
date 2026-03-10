import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { collection, doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuthContext } from '../../context/AuthContext';
import TopHeader from '../../components/common/TopHeader';
import PrimaryButton from '../../components/common/PrimaryButton';
import SecondaryButton from '../../components/common/SecondaryButton';
import StepIndicator from '../../components/common/StepIndicator';
import { colors } from '../../styles/colors';
import { spacing } from '../../styles/spacing';
import { generateUniquePatientId } from '../../utils/patientIdGenerator';
import { CheckCircle2, Copy, Share2 } from 'lucide-react';

export default function InviteCaretaker() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, setRoleAndPatient } = useAuthContext();

  const stateData = location.state || {};
  const patientData = stateData.patientData || {};
  const medicines = stateData.medicines || [];
  const tasks = stateData.tasks || [];

  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Success screen state
  const [done, setDone] = useState(false);
  const [generatedPatientId, setGeneratedPatientId] = useState('');
  const [savedDocId, setSavedDocId] = useState('');

  const showToast = (message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      // 1. Generate a unique human-readable Patient ID
      const humanPatientId = await generateUniquePatientId();

      // 2. Create Firestore document (use auto-id as doc id, humanPatientId as searchable field)
      const newPatientDocRef = doc(collection(db, 'patients'));
      const newDocId = newPatientDocRef.id;

      await setDoc(newPatientDocRef, {
        patientId: humanPatientId,       // e.g. CL-2026-4729 — searchable field
        name: patientData.patientName,
        age: parseInt(patientData.age),
        condition: patientData.medicalCondition,
        doctorName: patientData.doctorName || '',
        doctorPhone: patientData.doctorPhone || '',
        familyId: user.uid,
        doctorId: '',
        caretakerIds: [],
        createdAt: serverTimestamp()
      });

      // 3. Care Plan collection
      await setDoc(doc(db, 'carePlans', newDocId), {
        medicines: medicines.map(m => ({
          medicineId: m.id,
          name: m.name,
          dosage: m.dosage,
          frequency: m.frequency,
          scheduledTimes: [m.time]
        })),
        tasks: tasks.map(t => ({
          taskId: t.id,
          name: t.name,
          icon: t.icon,
          scheduledTime: t.time,
          isCritical: t.isCritical
        })),
        vitalsToMonitor: ['bloodPressure', 'heartRate', 'temperature']
      });

      // 4. Update the family user's patientId in their Firestore user doc
      await updateDoc(doc(db, 'users', user.uid), {
        patientId: newDocId
      });

      // 5. Update context so family dashboard works immediately
      setRoleAndPatient('family', newDocId);

      // Show success screen
      setGeneratedPatientId(humanPatientId);
      setSavedDocId(newDocId);
      setDone(true);

    } catch (error) {
      console.error('Firestore write error:', error);
      showToast('Failed to save care plan. Please try again.', 'error');
    }
    setLoading(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedPatientId).then(() => {
      showToast('Patient ID copied!', 'success');
    });
  };

  const handleShare = () => {
    const msg = `Join CareLog as my caretaker. Use Patient ID: ${generatedPatientId} to link to the patient.`;
    if (navigator.share) {
      navigator.share({ title: 'CareLog Patient ID', text: msg });
    } else {
      navigator.clipboard.writeText(msg);
      showToast('Share link copied to clipboard!', 'success');
    }
  };

  // ─── SUCCESS SCREEN ───────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="auth-desktop-container" style={{ backgroundColor: colors.background, minHeight: '100vh' }}>
        <div className="auth-desktop-card" style={{ backgroundColor: colors.background, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: spacing.pagePadding, gap: '24px' }}>

          {toast && (
            <div style={{
              position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
              backgroundColor: toast.type === 'success' ? colors.successGreen : colors.alertRed,
              color: toast.type === 'success' ? colors.primaryGreen : colors.white,
              padding: '12px 24px', borderRadius: '24px', fontWeight: '600',
              boxShadow: spacing.shadows.card, zIndex: 200
            }}>
              {toast.message}
            </div>
          )}

          {/* Big green checkmark */}
          <div style={{ backgroundColor: colors.successGreen, width: '88px', height: '88px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 8px 24px ${colors.successGreen}` }}>
            <CheckCircle2 size={52} color={colors.primaryGreen} strokeWidth={2.5} />
          </div>

          <h1 style={{ fontSize: '22px', fontWeight: '700', color: colors.textPrimary, textAlign: 'center', marginBottom: '0' }}>
            Patient Profile Created!
          </h1>

          {/* Patient ID Card */}
          <div style={{ backgroundColor: colors.white, borderRadius: '16px', padding: '24px', boxShadow: spacing.shadows.button, width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '12px', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Patient Name</span>
              <span style={{ fontSize: '16px', fontWeight: '600', color: colors.textPrimary }}>{patientData.patientName}</span>
            </div>

            <div style={{ borderTop: `1px solid ${colors.border}`, paddingTop: '12px' }}>
              <span style={{ fontSize: '12px', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>Patient ID</span>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.lightBlue, borderRadius: '12px', padding: '14px 16px' }}>
                <span style={{ fontSize: '24px', fontWeight: '700', color: colors.primaryBlue, letterSpacing: '1px' }}>{generatedPatientId}</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={handleCopy} style={{ background: colors.primaryBlue, border: 'none', borderRadius: '8px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <Copy size={16} color={colors.white} />
                  </button>
                  <button onClick={handleShare} style={{ background: colors.primaryBlue, border: 'none', borderRadius: '8px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <Share2 size={16} color={colors.white} />
                  </button>
                </div>
              </div>
            </div>

            <p style={{ fontSize: '13px', color: colors.textSecondary, fontStyle: 'italic', textAlign: 'center', marginTop: '4px' }}>
              Share this ID with your caretaker so they can link to this patient.
            </p>
          </div>

          <div style={{ width: '100%', maxWidth: '400px', marginTop: '8px' }}>
            <PrimaryButton
              label="Continue to Dashboard"
              onClick={() => navigate('/family/dashboard', { replace: true })}
            />
          </div>
        </div>
      </div>
    );
  }

  // ─── STEP 3 — INVITE SCREEN ───────────────────────────────────────────────
  const pendingCount = medicines.length + tasks.length;

  return (
    <div className="auth-desktop-container" style={{ backgroundColor: colors.background, minHeight: '100vh' }}>
      <div className="auth-desktop-card" style={{ backgroundColor: colors.white, minHeight: '100vh', display: 'flex', flexDirection: 'column', width: '100%' }}>

        {toast && (
          <div style={{
            position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
            backgroundColor: toast.type === 'success' ? colors.successGreen : colors.alertRed,
            color: toast.type === 'success' ? colors.primaryGreen : colors.white,
            padding: '12px 24px', borderRadius: '24px', fontWeight: '600',
            boxShadow: spacing.shadows.card, zIndex: 200
          }}>
            {toast.message}
          </div>
        )}

        <TopHeader title="Almost Done" showBack onBack={() => navigate(-1)} />

        <div style={{ padding: spacing.pagePadding, flex: 1, display: 'flex', flexDirection: 'column' }}>
          <StepIndicator currentStep={3} totalSteps={3} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
            <div style={{ backgroundColor: colors.successGreen, padding: '16px', borderRadius: spacing.borderRadius.card, border: `1px solid ${colors.primaryGreen}`, display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <CheckCircle2 size={20} color={colors.primaryGreen} style={{ marginTop: '2px', flexShrink: 0 }} />
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: '600', color: colors.primaryGreen, marginBottom: '4px' }}>Care Plan Ready</h3>
                <p style={{ fontSize: '13px', color: colors.primaryGreen, opacity: 0.85 }}>
                  You've configured {pendingCount} daily routine{pendingCount !== 1 ? 's' : ''} for {patientData.patientName || 'your patient'}.
                </p>
              </div>
            </div>

            <div style={{ backgroundColor: colors.lightBlue, padding: '16px', borderRadius: spacing.borderRadius.card, border: `1px solid ${colors.border}` }}>
              <p style={{ fontSize: '14px', color: colors.primaryBlue, fontWeight: '600', marginBottom: '4px' }}>What happens next?</p>
              <p style={{ fontSize: '13px', color: colors.textSecondary, lineHeight: '1.6' }}>
                A unique <strong>Patient ID</strong> (format: <strong>CL-2026-XXXX</strong>) will be generated and shown to you. Share it with your caretaker so they can link to this profile.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
            <PrimaryButton label={loading ? 'Creating Profile…' : 'Finish & Get Patient ID'} onClick={handleFinish} isLoading={loading} disabled={loading} />
          </div>
        </div>
      </div>
    </div>
  );
}
