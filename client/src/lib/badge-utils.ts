/**
 * Utility functions for badge styling across the application
 */

/**
 * Returns Tailwind CSS classes for estado badges in Ingresos verification
 * Consistent colors: Verificado (green), Por verificar (amber), Rechazado (purple)
 */
export const getEstadoVerificacionBadgeClass = (estado: string): string => {
  switch (estado) {
    case "Verificado":
      return "bg-green-500 text-white dark:bg-green-600 dark:text-white hover:bg-green-500 dark:hover:bg-green-600";
    case "Por verificar":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900";
    case "Rechazado":
      return "bg-purple-500 text-white dark:bg-purple-600 dark:text-white hover:bg-purple-500 dark:hover:bg-purple-600";
    default:
      return "bg-gray-500 text-white dark:bg-gray-600 hover:bg-gray-500 dark:hover:bg-gray-600";
  }
};

/**
 * Returns Tailwind CSS classes for estado badges in Egresos workflow
 * Consistent colors across the app:
 * - Verificado (green) - shared with Ingresos
 * - Pagado/Por Verificar (amber) - same as "Por verificar" in Ingresos
 * - Rechazado (purple) - shared with Ingresos
 * - Por Pagar (red) - Egresos specific
 * - Por Autorizar (blue) - Egresos specific
 * - Borrador (grey) - Egresos specific
 */
export const getEstadoEgresosBadgeClass = (estado: string): string => {
  switch (estado) {
    case "Borrador":
      return "bg-gray-500 text-white dark:bg-gray-600 hover:bg-gray-500 dark:hover:bg-gray-600";
    case "Por autorizar":
      return "bg-blue-500 text-white dark:bg-blue-600 hover:bg-blue-500 dark:hover:bg-blue-600";
    case "Por pagar":
      return "bg-red-500 text-white dark:bg-red-600 hover:bg-red-500 dark:hover:bg-red-600";
    case "Pagado":
      // Pagado = "Por Verificar" state, uses same color as Ingresos "Por verificar"
      return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900";
    case "Verificado":
      // Shared color with Ingresos
      return "bg-green-500 text-white dark:bg-green-600 hover:bg-green-500 dark:hover:bg-green-600";
    case "Rechazado":
      // Shared color with Ingresos
      return "bg-purple-500 text-white dark:bg-purple-600 hover:bg-purple-500 dark:hover:bg-purple-600";
    default:
      return "bg-gray-500 text-white dark:bg-gray-600 hover:bg-gray-500 dark:hover:bg-gray-600";
  }
};
