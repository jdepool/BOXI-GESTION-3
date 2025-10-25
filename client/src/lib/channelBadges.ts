/**
 * Get the badge color class for a channel name.
 * Maps Mompox channels to their Boxi equivalents for uniform colors across product lines.
 */
export function getChannelBadgeClass(canal: string | null | undefined): string {
  const lowerCanal = canal?.toLowerCase();
  
  // Map Mompox channels to their Boxi equivalents for uniform colors
  if (lowerCanal === 'shopmom') return 'channel-badge-shopify';
  if (lowerCanal === 'manual mp') return 'bg-orange-100 text-orange-800';
  if (lowerCanal === 'cashea mp') return 'channel-badge-cashea';
  if (lowerCanal === 'tienda mp') return 'channel-badge-tienda';
  
  switch (lowerCanal) {
    case 'cashea': return 'channel-badge-cashea';
    case 'shopify': return 'channel-badge-shopify';
    case 'treble': return 'channel-badge-treble';
    case 'tienda': return 'channel-badge-tienda';
    case 'manual': return 'bg-orange-100 text-orange-800';
    default: return 'bg-gray-500 text-white';
  }
}
