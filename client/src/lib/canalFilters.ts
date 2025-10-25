/**
 * Helper functions to filter canales by product line (Boxi vs Mompox)
 */

export type ProductLine = 'boxi' | 'mompox';

/**
 * Canales allowed for Boxi product line
 */
export const BOXI_CANALES = ['Shopify', 'Tienda', 'Cashea', 'Manual'];

/**
 * Canales allowed for Mompox product line
 */
export const MOMPOX_CANALES = ['ShopMom', 'Tienda MP', 'Cashea MP', 'Manual MP'];

/**
 * Get the list of allowed canales for a given product line
 */
export function getAllowedCanales(productLine: ProductLine): string[] {
  return productLine === 'boxi' ? BOXI_CANALES : MOMPOX_CANALES;
}

/**
 * Filter a list of canal objects to only include those allowed for the product line
 */
export function filterCanalesByProductLine<T extends { nombre: string }>(
  canales: T[],
  productLine: ProductLine
): T[] {
  const allowed = getAllowedCanales(productLine);
  return canales.filter(canal => allowed.includes(canal.nombre));
}

/**
 * Detect product line from a canal name
 */
export function detectProductLine(canal: string | null): ProductLine {
  if (!canal) return 'boxi';
  
  const lowerCanal = canal.toLowerCase();
  
  // Check if it's a Mompox channel
  if (lowerCanal === 'shopmom' || 
      lowerCanal.includes(' mp') || 
      lowerCanal.includes('mp ')) {
    return 'mompox';
  }
  
  return 'boxi';
}
