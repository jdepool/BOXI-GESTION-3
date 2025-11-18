// Helper to parse yyyy-MM-dd strings as local dates (prevents timezone bug)
export const parseLocalDate = (dateString: string): Date | undefined => {
  if (!dateString) return undefined;
  
  // Parse yyyy-MM-dd as local date, not UTC
  // This prevents the "day before" timezone bug
  const [year, month, day] = dateString.split('-').map(Number);
  if (!year || !month || !day) return undefined;
  
  // Month is 0-indexed in JavaScript Date
  return new Date(year, month - 1, day);
};
