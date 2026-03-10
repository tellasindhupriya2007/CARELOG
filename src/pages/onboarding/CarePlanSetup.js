import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import TopHeader from '../../components/common/TopHeader';
import InputField from '../../components/common/InputField';
import PrimaryButton from '../../components/common/PrimaryButton';
import StepIndicator from '../../components/common/StepIndicator';
import { colors } from '../../styles/colors';
import { typography } from '../../styles/typography';
import { spacing } from '../../styles/spacing';
import { Plus, X, Pill, Activity, HeartPulse, Coffee, Clipboard, Moon } from 'lucide-react';

export default function CarePlanSetup() {
  const navigate = useNavigate();
  const location = useLocation();
  const patientData = location.state?.patientData || {}; // Failsafe if accessed directly

  const [medicines, setMedicines] = useState([]);
  const [tasks, setTasks] = useState([]);

  const [showMedSheet, setShowMedSheet] = useState(false);
  const [showTaskSheet, setShowTaskSheet] = useState(false);

  // Forms for bottom sheets
  const [medForm, setMedForm] = useState({ name: '', dosage: '', frequency: 'Daily', time: '' });
  const [taskForm, setTaskForm] = useState({ name: '', icon: 'Pill', time: '', isCritical: false });

  const addMedicine = () => {
    if (!medForm.name || !medForm.dosage || !medForm.time) return;
    setMedicines(prev => [...prev, { ...medForm, id: Date.now().toString(), scheduledTimes: [medForm.time] }]);
    setMedForm({ name: '', dosage: '', frequency: 'Daily', time: '' });
    setShowMedSheet(false);
  };

  const addTask = () => {
    if (!taskForm.name || !taskForm.time) return;
    setTasks(prev => [...prev, { ...taskForm, id: Date.now().toString(), scheduledTime: taskForm.time }]);
    setTaskForm({ name: '', icon: 'Pill', time: '', isCritical: false });
    setShowTaskSheet(false);
  };

  const removeMedicine = (id) => setMedicines(prev => prev.filter(m => m.id !== id));
  const removeTask = (id) => setTasks(prev => prev.filter(t => t.id !== id));

  const handleNext = () => {
    navigate('/family/onboarding/step-3', {
      state: {
        patientData,
        medicines,
        tasks
      }
    });
  };

  const iconOptions = [
    { name: 'Pill', icon: Pill },
    { name: 'Activity', icon: Activity },
    { name: 'HeartPulse', icon: HeartPulse },
    { name: 'Coffee', icon: Coffee },
    { name: 'Clipboard', icon: Clipboard },
    { name: 'Moon', icon: Moon },
  ];

  return (
    <div style={{ backgroundColor: colors.white, minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <TopHeader title="Care Plan" showBack onBack={() => navigate(-1)} />

      <div style={{ padding: spacing.pagePadding, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <StepIndicator currentStep={2} totalSteps={3} />

        {/* Medicines Section */}
        <div style={{ marginBottom: spacing.gapBetweenSections }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h2 style={{ fontSize: typography.sectionHeading.fontSize, fontWeight: typography.sectionHeading.fontWeight, color: colors.textPrimary }}>Medicines</h2>
            <button onClick={() => setShowMedSheet(true)} style={{ background: colors.primaryBlue, color: colors.white, border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <Plus size={20} />
            </button>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {medicines.length === 0 && <span style={{ fontSize: typography.smallLabel.fontSize, color: colors.textSecondary }}>No medicines added yet.</span>}
            {medicines.map((med) => (
              <div key={med.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: colors.background, padding: '8px 12px', borderRadius: spacing.borderRadius.badge, border: `1px solid ${colors.border}` }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: colors.textPrimary }}>{med.name} ({med.dosage})</span>
                  <span style={{ fontSize: '12px', color: colors.textSecondary }}>{med.time} • {med.frequency}</span>
                </div>
                <button onClick={() => removeMedicine(med.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', marginLeft: '4px' }}>
                  <X size={16} color={colors.textSecondary} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Tasks Section */}
        <div style={{ marginBottom: spacing.gapBetweenSections }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h2 style={{ fontSize: typography.sectionHeading.fontSize, fontWeight: typography.sectionHeading.fontWeight, color: colors.textPrimary }}>Daily Tasks</h2>
            <button onClick={() => setShowTaskSheet(true)} style={{ background: colors.primaryBlue, color: colors.white, border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <Plus size={20} />
            </button>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {tasks.length === 0 && <span style={{ fontSize: typography.smallLabel.fontSize, color: colors.textSecondary }}>No tasks added yet.</span>}
            {tasks.map((task) => {
              const IconComp = iconOptions.find(i => i.name === task.icon)?.icon || Pill;
              return (
                <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: task.isCritical ? colors.alertOrange : colors.background, padding: '8px 12px', borderRadius: spacing.borderRadius.badge, border: `1px solid ${task.isCritical ? '#F5B041' : colors.border}` }}>
                  <IconComp size={16} color={task.isCritical ? colors.white : colors.textPrimary} />
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: task.isCritical ? colors.white : colors.textPrimary }}>{task.name}</span>
                    <span style={{ fontSize: '12px', color: task.isCritical ? colors.white : colors.textSecondary }}>{task.time} {task.isCritical && '• Critical'}</span>
                  </div>
                  <button onClick={() => removeTask(task.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', marginLeft: '4px' }}>
                    <X size={16} color={task.isCritical ? colors.white : colors.textSecondary} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ marginTop: 'auto', marginBottom: '16px' }}>
          <PrimaryButton label="Next" onClick={handleNext} disabled={medicines.length === 0 && tasks.length === 0} />
        </div>
      </div>

      {/* Bottom Sheet Modal - Medicines */}
      {showMedSheet && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'flex-end', animation: 'fadeIn 0.2s' }}>
          <div style={{ backgroundColor: colors.white, width: '100%', maxWidth: '430px', margin: '0 auto', borderTopLeftRadius: '24px', borderTopRightRadius: '24px', padding: spacing.pagePadding, paddingBottom: '32px', animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600' }}>Add Medicine</h3>
              <button onClick={() => setShowMedSheet(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} color={colors.textSecondary} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <InputField label="Medicine Name" placeholder="e.g. Lisinopril" value={medForm.name} onChange={e => setMedForm({ ...medForm, name: e.target.value })} />
              <div style={{ display: 'flex', gap: '12px' }}>
                <InputField label="Dosage" placeholder="e.g. 10mg" value={medForm.dosage} onChange={e => setMedForm({ ...medForm, dosage: e.target.value })} />
                <InputField label="Time" type="time" value={medForm.time} onChange={e => setMedForm({ ...medForm, time: e.target.value })} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '12px', color: colors.textSecondary }}>Frequency</label>
                <select value={medForm.frequency} onChange={e => setMedForm({ ...medForm, frequency: e.target.value })} style={{ height: '52px', borderRadius: spacing.borderRadius.input, border: `1.5px solid ${colors.border}`, padding: '0 16px', fontSize: '14px', backgroundColor: colors.background, outline: 'none' }}>
                  <option>Daily</option>
                  <option>Twice a day</option>
                  <option>As needed</option>
                </select>
              </div>
              <PrimaryButton label="Save Medicine" onClick={addMedicine} disabled={!medForm.name || !medForm.dosage || !medForm.time} />
            </div>
          </div>
        </div>
      )}

      {/* Bottom Sheet Modal - Tasks */}
      {showTaskSheet && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'flex-end', animation: 'fadeIn 0.2s' }}>
          <div style={{ backgroundColor: colors.white, width: '100%', maxWidth: '430px', margin: '0 auto', borderTopLeftRadius: '24px', borderTopRightRadius: '24px', padding: spacing.pagePadding, paddingBottom: '32px', animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600' }}>Add Daily Task</h3>
              <button onClick={() => setShowTaskSheet(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} color={colors.textSecondary} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <InputField label="Task Name" placeholder="e.g. Afternoon Walk" value={taskForm.name} onChange={e => setTaskForm({ ...taskForm, name: e.target.value })} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '12px', color: colors.textSecondary }}>Select Icon</label>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  {iconOptions.map(opt => (
                    <div
                      key={opt.name}
                      onClick={() => setTaskForm({ ...taskForm, icon: opt.name })}
                      style={{
                        width: '44px', height: '44px', borderRadius: '12px',
                        backgroundColor: taskForm.icon === opt.name ? colors.primaryBlue : colors.background,
                        border: `1px solid ${taskForm.icon === opt.name ? colors.primaryBlue : colors.border}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                        transition: 'al 0.2s'
                      }}>
                      <opt.icon size={20} color={taskForm.icon === opt.name ? colors.white : colors.textPrimary} />
                    </div>
                  ))}
                </div>
              </div>

              <InputField label="Scheduled Time" type="time" value={taskForm.time} onChange={e => setTaskForm({ ...taskForm, time: e.target.value })} />

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.background, padding: '16px', borderRadius: spacing.borderRadius.input, border: `1px solid ${colors.border}` }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: colors.alertRed }}>Critical Task</span>
                  <span style={{ fontSize: '12px', color: colors.textSecondary }}>Alert sent if missed by 30 mins</span>
                </div>
                <label style={{ position: 'relative', display: 'inline-block', width: '50px', height: '28px' }}>
                  <input
                    type="checkbox"
                    checked={taskForm.isCritical}
                    onChange={e => setTaskForm({ ...taskForm, isCritical: e.target.checked })}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: taskForm.isCritical ? colors.alertRed : '#ccc',
                    borderRadius: '34px', cursor: 'pointer', transition: '.4s'
                  }}>
                    <span style={{
                      position: 'absolute', content: '""', height: '20px', width: '20px',
                      left: taskForm.isCritical ? '26px' : '4px', bottom: '4px',
                      backgroundColor: 'white', borderRadius: '50%', transition: '.4s'
                    }} />
                  </span>
                </label>
              </div>

              <div style={{ marginTop: '8px' }}>
                <PrimaryButton label="Save Task" onClick={addTask} disabled={!taskForm.name || !taskForm.time} />
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
      `}</style>
    </div>
  );
}
