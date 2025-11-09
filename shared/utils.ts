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
    'treble': 'Treble',
  };
  
  return canonicalMap[canalLower] || canal.charAt(0).toUpperCase() + canal.slice(1).toLowerCase();
}
