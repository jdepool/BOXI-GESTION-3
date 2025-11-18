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

// Helper to format Date to yyyy-MM-dd using local time (prevents timezone bug)
export const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Calculate default delivery commitment date for Inmediato sales
// Caracas: +2 days, Other cities: +4 days, Reservas: undefined
export const calculateDefaultDeliveryDate = (
  orderDate: string | Date,
  tipo: string,
  ciudad: string
): string | undefined => {
  // Only pre-fill for Inmediato sales
  if (tipo !== 'Inmediato') {
    return undefined;
  }

  // Parse the order date
  const baseDate = typeof orderDate === 'string' 
    ? parseLocalDate(orderDate) 
    : orderDate;
  
  if (!baseDate) {
    return undefined;
  }

  // Calculate days to add based on ciudad
  const daysToAdd = ciudad === 'Caracas' ? 2 : 4;

  // Create new date with added days
  const deliveryDate = new Date(baseDate);
  deliveryDate.setDate(deliveryDate.getDate() + daysToAdd);

  return formatLocalDate(deliveryDate);
};
