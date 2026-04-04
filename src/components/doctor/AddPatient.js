import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../context/AuthContext';
import { createPatient } from '../../services/patientService';
import { DS } from './ds';
import DoctorShell from './DoctorShell';
import {
    User, Activity, Heart, Phone, FileText, AlertCircle,
    CheckCircle, ChevronLeft, Save, Pill, Droplets
} from 'lucide-react';

const GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say'];
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-', 'Unknown'];

const SECTIONS = [
    { id: 'identity', label: 'Basic Information', icon: User },
    { id: 'clinical', label: 'Clinical Details', icon: Activity },
    { id: 'emergency', label: 'Emergency Contact', icon: Phone },
];

const inputStyle = {
    width: '100%', padding: '12px 14px', borderRadius: '12px',
    border: `1.5px solid ${DS.outlineVariant}`, fontSize: '14px',
    fontFamily: 'inherit', backgroundColor: DS.surfaceLowest,
    color: DS.textPrimary, outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.2s',
};

const focusStyle = { borderColor: DS.primaryContainer };

function Field({ label, required, hint, children }) {
    return (
        <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: DS.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                {label}{required && <span style={{ color: DS.danger, marginLeft: '3px' }}>*</span>}
            </label>
            {children}
            {hint && <p style={{ fontSize: '11px', color: DS.textMuted, marginTop: '4px', fontWeight: '500' }}>{hint}</p>}
        </div>
    );
}

function Input({ value, onChange, placeholder, type = 'text', ...rest }) {
    const [focused, setFocused] = useState(false);
    return (
        <input
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            style={{ ...inputStyle, ...(focused ? focusStyle : {}) }}
            {...rest}
        />
    );
}

function Textarea({ value, onChange, placeholder, rows = 3 }) {
    const [focused, setFocused] = useState(false);
    return (
        <textarea
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            rows={rows}
            style={{ ...inputStyle, ...(focused ? focusStyle : {}), resize: 'vertical', lineHeight: 1.5 }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
        />
    );
}

function Select({ value, onChange, options }) {
    const [focused, setFocused] = useState(false);
    return (
        <select
            value={value}
            onChange={onChange}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            style={{ ...inputStyle, ...(focused ? focusStyle : {}), cursor: 'pointer', appearance: 'none' }}
        >
            <option value="">— Select —</option>
            {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
    );
}

export default function AddPatient() {
    const navigate = useNavigate();
    const { user } = useAuthContext();
    const [activeSection, setActiveSection] = useState('identity');
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(null); // patientId on success
    const [error, setError] = useState(null);
    const [alertCount] = useState(0);

    const [form, setForm] = useState({
        // Identity
        name: '',
        age: '',
        gender: '',
        dob: '',
        bloodGroup: '',
        address: '',

        // Clinical
        conditions: '',
        allergies: '',
        medications: '',
        notes: '',

        // Emergency
        emergencyContact: '',
        emergencyPhone: '',
    });

    const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

    const validate = () => {
        if (!form.name.trim()) return 'Patient name is required.';
        if (!form.age || isNaN(Number(form.age)) || Number(form.age) <= 0) return 'Please enter a valid age.';
        if (!form.gender) return 'Please select a gender.';
        return null;
    };

    const handleSubmit = async () => {
        const err = validate();
        if (err) { setError(err); setActiveSection('identity'); return; }

        setSaving(true);
        setError(null);

        try {
            const patientId = await createPatient({
                ...form,
                age: Number(form.age),
                doctorId: user?.uid || null,
                caregiverId: null,
                familyId: null,
            });
            setSuccess(patientId);
        } catch (e) {
            setError(e.message || 'Failed to create patient. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    if (success) {
        return (
            <DoctorShell alertCount={alertCount}>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: DS.surface }}>
                    <div style={{ textAlign: 'center', padding: '48px', maxWidth: '480px' }}>
                        <div style={{ width: '80px', height: '80px', borderRadius: '24px', backgroundColor: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                            <CheckCircle size={40} color={DS.success} />
                        </div>
                        <h2 style={{ fontSize: '26px', fontWeight: '900', color: DS.textPrimary, margin: '0 0 8px', letterSpacing: '-0.5px' }}>Patient Created!</h2>
                        <p style={{ fontSize: '14px', color: DS.textMuted, margin: '0 0 8px', fontWeight: '500', lineHeight: 1.6 }}>
                            <strong>{form.name}</strong> has been added to your patient panel.
                        </p>
                        <p style={{ fontSize: '12px', fontFamily: 'monospace', color: DS.primaryContainer, backgroundColor: '#EEF2FF', padding: '8px 16px', borderRadius: '10px', margin: '0 0 32px', display: 'inline-block', fontWeight: '700' }}>
                            ID: {success}
                        </p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <button
                                onClick={() => navigate('/doctor/dashboard')}
                                style={{ padding: '13px 28px', borderRadius: '14px', border: 'none', background: `linear-gradient(135deg, ${DS.primary}, ${DS.primaryContainer})`, color: 'white', fontSize: '14px', fontWeight: '800', cursor: 'pointer', fontFamily: 'inherit' }}
                            >
                                Go to Dashboard
                            </button>
                            <button
                                onClick={() => { setSuccess(null); setForm({ name: '', age: '', gender: '', dob: '', bloodGroup: '', address: '', conditions: '', allergies: '', medications: '', notes: '', emergencyContact: '', emergencyPhone: '' }); setActiveSection('identity'); }}
                                style={{ padding: '13px 24px', borderRadius: '14px', border: 'none', backgroundColor: DS.surfaceLowest, color: DS.textSecondary, fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}
                            >
                                Add Another
                            </button>
                        </div>
                    </div>
                </div>
            </DoctorShell>
        );
    }

    return (
        <DoctorShell alertCount={alertCount}>
            <div style={{ flex: 1, overflowY: 'auto', backgroundColor: DS.surface, padding: '32px' }}>
                <div style={{ maxWidth: '800px', margin: '0 auto' }}>

                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px' }}>
                        <button onClick={() => navigate('/doctor/dashboard')} style={{ width: '40px', height: '40px', borderRadius: '12px', border: 'none', backgroundColor: DS.surfaceLowest, color: DS.textSecondary, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                            <ChevronLeft size={20} />
                        </button>
                        <div>
                            <h1 style={{ fontSize: '26px', fontWeight: '900', color: DS.textPrimary, margin: 0, letterSpacing: '-0.5px' }}>Add New Patient</h1>
                            <p style={{ fontSize: '13px', color: DS.textMuted, fontWeight: '500', margin: '4px 0 0' }}>Patient ID will be auto-generated by Firestore</p>
                        </div>
                    </div>

                    {/* Error banner */}
                    {error && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#FEF2F2', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '14px', padding: '14px 18px', marginBottom: '20px' }}>
                            <AlertCircle size={18} color={DS.danger} />
                            <span style={{ fontSize: '14px', color: DS.danger, fontWeight: '700' }}>{error}</span>
                        </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '24px', alignItems: 'start' }}>

                        {/* Section Nav */}
                        <div style={{ position: 'sticky', top: '0px' }}>
                            <div style={{ backgroundColor: DS.surfaceLowest, borderRadius: '18px', padding: '12px', boxShadow: '0 4px 16px rgba(25,28,30,0.05)' }}>
                                {SECTIONS.map(s => {
                                    const isActive = activeSection === s.id;
                                    return (
                                        <button key={s.id} onClick={() => setActiveSection(s.id)} style={{
                                            width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                                            padding: '12px 14px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                                            fontFamily: 'inherit', marginBottom: '4px',
                                            backgroundColor: isActive ? DS.primaryContainer : 'transparent',
                                            color: isActive ? 'white' : DS.textSecondary,
                                            fontSize: '13px', fontWeight: '800', transition: 'all 0.2s',
                                        }}>
                                            <s.icon size={15} />
                                            {s.label}
                                        </button>
                                    );
                                })}

                                {/* Progress */}
                                <div style={{ marginTop: '16px', padding: '12px 14px', backgroundColor: DS.surfaceLow, borderRadius: '12px' }}>
                                    <div style={{ fontSize: '11px', fontWeight: '700', color: DS.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Completion</div>
                                    {[
                                        { label: 'Name', done: !!form.name },
                                        { label: 'Age', done: !!form.age },
                                        { label: 'Gender', done: !!form.gender },
                                        { label: 'Conditions', done: !!form.conditions },
                                        { label: 'Emergency', done: !!form.emergencyContact },
                                    ].map(item => (
                                        <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                                            <span style={{ fontSize: '12px', fontWeight: '600', color: DS.textMuted }}>{item.label}</span>
                                            <span style={{ width: '18px', height: '18px', borderRadius: '50%', backgroundColor: item.done ? DS.success : DS.surfaceHigh, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                {item.done && <CheckCircle size={12} color="white" />}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Form Body */}
                        <div style={{ backgroundColor: DS.surfaceLowest, borderRadius: '20px', padding: '28px', boxShadow: '0 4px 16px rgba(25,28,30,0.05)' }}>

                            {/* ─── IDENTITY ─── */}
                            {activeSection === 'identity' && (
                                <>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <User size={18} color={DS.primaryContainer} />
                                        </div>
                                        <h2 style={{ fontSize: '18px', fontWeight: '900', color: DS.textPrimary, margin: 0 }}>Basic Information</h2>
                                    </div>

                                    <Field label="Full Name" required>
                                        <Input value={form.name} onChange={set('name')} placeholder="e.g. Venkata Ramaiah" />
                                    </Field>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                                        <Field label="Age" required>
                                            <Input value={form.age} onChange={set('age')} placeholder="e.g. 75" type="number" min="0" max="150" />
                                        </Field>
                                        <Field label="Gender" required>
                                            <Select value={form.gender} onChange={set('gender')} options={GENDERS} />
                                        </Field>
                                        <Field label="Blood Group">
                                            <Select value={form.bloodGroup} onChange={set('bloodGroup')} options={BLOOD_GROUPS} />
                                        </Field>
                                    </div>

                                    <Field label="Date of Birth">
                                        <Input value={form.dob} onChange={set('dob')} type="date" />
                                    </Field>

                                    <Field label="Home Address">
                                        <Textarea value={form.address} onChange={set('address')} placeholder="Street, City, State, PIN" rows={2} />
                                    </Field>
                                </>
                            )}

                            {/* ─── CLINICAL ─── */}
                            {activeSection === 'clinical' && (
                                <>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Activity size={18} color={DS.danger} />
                                        </div>
                                        <h2 style={{ fontSize: '18px', fontWeight: '900', color: DS.textPrimary, margin: 0 }}>Clinical Details</h2>
                                    </div>

                                    <Field label="Medical Conditions / Diagnoses" hint="Separate multiple conditions with commas">
                                        <Textarea value={form.conditions} onChange={set('conditions')} placeholder="e.g. Hypertension, Brain Injury, Diabetes Type 2" rows={3} />
                                    </Field>

                                    <Field label="Known Allergies" hint="Medications, foods, substances">
                                        <Textarea value={form.allergies} onChange={set('allergies')} placeholder="e.g. Penicillin, Sulfa drugs, Aspirin" rows={2} />
                                    </Field>

                                    <Field label="Current Medications" hint="Include dosage and frequency">
                                        <Textarea value={form.medications} onChange={set('medications')} placeholder="e.g. Aspirin 81mg (daily), Lisinopril 10mg (morning)" rows={3} />
                                    </Field>

                                    <Field label="Clinical Notes" hint="Additional notes for care team">
                                        <Textarea value={form.notes} onChange={set('notes')} placeholder="Patient history, care preferences, mobility status..." rows={3} />
                                    </Field>
                                </>
                            )}

                            {/* ─── EMERGENCY ─── */}
                            {activeSection === 'emergency' && (
                                <>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Phone size={18} color={DS.warning} />
                                        </div>
                                        <h2 style={{ fontSize: '18px', fontWeight: '900', color: DS.textPrimary, margin: 0 }}>Emergency Contact</h2>
                                    </div>

                                    <Field label="Contact Name & Relation" hint="e.g. Sindhu (Daughter)">
                                        <Input value={form.emergencyContact} onChange={set('emergencyContact')} placeholder="e.g. Priya Sharma (Daughter)" />
                                    </Field>

                                    <Field label="Contact Phone Number">
                                        <Input value={form.emergencyPhone} onChange={set('emergencyPhone')} placeholder="+91 98765 43210" type="tel" />
                                    </Field>

                                    {/* Summary Review */}
                                    <div style={{ backgroundColor: DS.surfaceLow, borderRadius: '14px', padding: '18px', marginTop: '8px' }}>
                                        <p style={{ fontSize: '12px', fontWeight: '800', color: DS.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 12px' }}>Review Before Saving</p>
                                        {[
                                            { label: 'Name', value: form.name },
                                            { label: 'Age', value: form.age ? `${form.age} yrs` : '' },
                                            { label: 'Gender', value: form.gender },
                                            { label: 'Blood Group', value: form.bloodGroup },
                                            { label: 'Conditions', value: form.conditions },
                                            { label: 'Allergies', value: form.allergies },
                                            { label: 'Medications', value: form.medications ? form.medications.split(',')[0] + (form.medications.split(',').length > 1 ? `... +${form.medications.split(',').length - 1} more` : '') : '' },
                                        ].map(item => item.value ? (
                                            <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', gap: '8px' }}>
                                                <span style={{ fontSize: '12px', color: DS.textMuted, fontWeight: '700', flexShrink: 0 }}>{item.label}</span>
                                                <span style={{ fontSize: '12px', color: DS.textPrimary, fontWeight: '600', textAlign: 'right' }}>{item.value}</span>
                                            </div>
                                        ) : null)}
                                    </div>
                                </>
                            )}

                            {/* Navigation Buttons */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '28px', gap: '12px' }}>
                                <div>
                                    {activeSection !== 'identity' && (
                                        <button onClick={() => {
                                            const idx = SECTIONS.findIndex(s => s.id === activeSection);
                                            if (idx > 0) setActiveSection(SECTIONS[idx - 1].id);
                                        }} style={{ padding: '12px 20px', borderRadius: '12px', border: 'none', backgroundColor: DS.surfaceLow, color: DS.textSecondary, fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <ChevronLeft size={16} /> Back
                                        </button>
                                    )}
                                </div>

                                <div style={{ display: 'flex', gap: '10px' }}>
                                    {activeSection !== 'emergency' ? (
                                        <button onClick={() => {
                                            setError(null);
                                            const idx = SECTIONS.findIndex(s => s.id === activeSection);
                                            if (idx < SECTIONS.length - 1) setActiveSection(SECTIONS[idx + 1].id);
                                        }} style={{ padding: '12px 22px', borderRadius: '12px', border: 'none', background: `linear-gradient(135deg, ${DS.primary}, ${DS.primaryContainer})`, color: 'white', fontSize: '14px', fontWeight: '800', cursor: 'pointer', fontFamily: 'inherit' }}>
                                            Next →
                                        </button>
                                    ) : (
                                        <button onClick={handleSubmit} disabled={saving} style={{
                                            padding: '13px 28px', borderRadius: '14px', border: 'none',
                                            background: saving ? DS.surfaceHigh : `linear-gradient(135deg, ${DS.primary}, ${DS.primaryContainer})`,
                                            color: saving ? DS.textMuted : 'white', fontSize: '14px', fontWeight: '900',
                                            cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                                            display: 'flex', alignItems: 'center', gap: '8px',
                                            boxShadow: saving ? 'none' : `0 6px 20px ${DS.primaryContainer}40`,
                                        }}>
                                            <Save size={16} />
                                            {saving ? 'Creating Patient...' : 'Create Patient'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </DoctorShell>
    );
}
