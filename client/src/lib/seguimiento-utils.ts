import { addDays, format } from "date-fns";
import type { Sale } from "@shared/schema";

/**
 * Helper function to determine seguimiento status for sales orders
 */
export function getSeguimientoStatusOrden(
  sale: Sale, 
  diasFase1: number = 2, 
  diasFase2: number = 4, 
  diasFase3: number = 7
): {
  phase: number | null;
  status: "overdue" | "today" | "future" | null;
  date: Date | null;
} {
  // Extract date-only string from ISO timestamp or date-only string
  const extractDate = (isoDate: string | Date) => {
    const dateStr = typeof isoDate === 'string' ? isoDate : isoDate.toISOString();
    return dateStr.split('T')[0]; // YYYY-MM-DD
  };

  // Parse date string to local Date object without timezone conversion
  const parseLocalDate = (dateStr: string): Date => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const todayStr = format(new Date(), "yyyy-MM-dd");
  
  // Determine which phase we're in and the next follow-up date
  const orderDateStr = extractDate(sale.fecha);
  const fase1Str = sale.fechaSeguimiento1 
    ? extractDate(sale.fechaSeguimiento1) 
    : format(addDays(parseLocalDate(orderDateStr), diasFase1), "yyyy-MM-dd");
  
  const fase2Str = sale.fechaSeguimiento2 
    ? extractDate(sale.fechaSeguimiento2) 
    : (sale.fechaSeguimiento1 
      ? format(addDays(parseLocalDate(extractDate(sale.fechaSeguimiento1)), diasFase2), "yyyy-MM-dd")
      : format(addDays(parseLocalDate(orderDateStr), diasFase1 + diasFase2), "yyyy-MM-dd"));
  
  const fase3Str = sale.fechaSeguimiento3 
    ? extractDate(sale.fechaSeguimiento3) 
    : (sale.fechaSeguimiento2 
      ? format(addDays(parseLocalDate(extractDate(sale.fechaSeguimiento2)), diasFase3), "yyyy-MM-dd")
      : format(addDays(parseLocalDate(orderDateStr), diasFase1 + diasFase2 + diasFase3), "yyyy-MM-dd"));

  // Determine current phase based on completed phases
  let currentPhase = 1;
  let nextDateStr = fase1Str;

  if (sale.respuestaSeguimiento1) {
    currentPhase = 2;
    nextDateStr = fase2Str;
  }
  if (sale.respuestaSeguimiento2) {
    currentPhase = 3;
    nextDateStr = fase3Str;
  }

  // If all phases completed, no more follow-ups needed
  if (sale.respuestaSeguimiento3) {
    return { phase: null, status: null, date: null };
  }

  // Determine status relative to today
  let status: "overdue" | "today" | "future";
  if (nextDateStr < todayStr) {
    status = "overdue";
  } else if (nextDateStr === todayStr) {
    status = "today";
  } else {
    status = "future";
  }

  return {
    phase: currentPhase,
    status,
    date: parseLocalDate(nextDateStr)
  };
}
