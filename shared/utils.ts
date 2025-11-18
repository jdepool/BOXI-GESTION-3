export function normalizeCanal(canal: string | null | undefined): string | null {
  if (!canal || canal.trim() === '') return null;
  
  const canalLower = canal.toLowerCase().trim();
  
  const canonicalMap: Record<string, string> = {
    'cashea': 'Cashea',
    'cashea mp': 'Cashea MP',
    'shopmom': 'ShopMom',
    'shopify': 'Shopify',
    'manual': 'Manual',
    'manual mp': 'Manual MP',
    'tienda': 'Tienda',
    'tienda mp': 'Tienda MP',
    'treble': 'Treble',
  };
  
  return canonicalMap[canalLower] || canal.charAt(0).toUpperCase() + canal.slice(1).toLowerCase();
}

// Calculate default delivery commitment date for Inmediato sales
// Caracas: +2 days, Other cities: +4 days, Reservas: undefined
export function calculateDeliveryDate(
  orderDate: Date | string,
  tipo: string,
  ciudad: string | null | undefined
): string | undefined {
  // Only pre-fill for Inmediato sales
  if (tipo !== 'Inmediato') {
    return undefined;
  }

  // Need a valid ciudad to calculate
  if (!ciudad) {
    return undefined;
  }

  // Parse the order date as LOCAL time to prevent timezone bugs
  let baseDate: Date;
  if (orderDate instanceof Date) {
    baseDate = orderDate;
  } else {
    // For string dates in yyyy-MM-dd format, parse as local date
    // CRITICAL: new Date("2024-11-18") interprets as UTC midnight, causing timezone shifts!
    // Instead, manually parse and create as local date
    const parts = orderDate.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1; // Month is 0-indexed
      const day = parseInt(parts[2]);
      baseDate = new Date(year, month, day);
    } else {
      return undefined; // Invalid date format
    }
  }
  
  if (isNaN(baseDate.getTime())) {
    return undefined;
  }

  // Calculate days to add based on ciudad
  const daysToAdd = ciudad === 'Caracas' ? 2 : 4;

  // Create new date with added days
  const deliveryDate = new Date(baseDate);
  deliveryDate.setDate(deliveryDate.getDate() + daysToAdd);

  // Format as yyyy-MM-dd using local time components
  const year = deliveryDate.getFullYear();
  const month = String(deliveryDate.getMonth() + 1).padStart(2, '0');
  const day = String(deliveryDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
