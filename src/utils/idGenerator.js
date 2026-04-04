/**
 * Generates a unique, human-readable Patient ID.
 * Format: CL-[YYYY]-[4 random digits]
 * Example: CL-2024-4821
 */
export const generatePatientId = () => {
    const year = new Date().getFullYear();
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    return `CL-${year}-${randomDigits}`;
};
