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
  dateStr: string | null;
} {
  // Extract date-only string from ISO timestamp or YYYY-MM-DD string
  const extractDate = (dateValue: string | Date | null | undefined): string | null => {
    if (!dateValue) return null;
    
    const dateStr = typeof dateValue === 'string' ? dateValue : dateValue.toISOString();
    
    // If already in YYYY-MM-DD format (10 chars, matches pattern)
    if (dateStr.length === 10 && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }
    
    // Extract from ISO timestamp (has 'T')
    if (dateStr.includes('T')) {
      return dateStr.split('T')[0];
    }
    
    // Fallback: just return the string
    return dateStr;
  };

  // Add days to a YYYY-MM-DD string without using date-fns
  const addDaysToDateStr = (dateStr: string, days: number): string => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() + days);
    const newYear = date.getFullYear();
    const newMonth = String(date.getMonth() + 1).padStart(2, '0');
    const newDay = String(date.getDate()).padStart(2, '0');
    return `${newYear}-${newMonth}-${newDay}`;
  };

  // Parse date string to local Date object without timezone conversion
  const parseLocalDate = (dateStr: string): Date => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const todayStr = format(new Date(), "yyyy-MM-dd");
  
  // Determine which phase we're in and the next follow-up date
  const orderDateStr = extractDate(sale.fecha);
  if (!orderDateStr) {
    return { phase: null, status: null, date: null, dateStr: null };
  }
  
  // Calculate fase 1 date
  const fase1Extracted = extractDate(sale.fechaSeguimiento1);
  const fase1Str = fase1Extracted || addDaysToDateStr(orderDateStr, diasFase1);
  
  // Calculate fase 2 date
  const fase2Extracted = extractDate(sale.fechaSeguimiento2);
  let fase2Str: string;
  if (fase2Extracted) {
    fase2Str = fase2Extracted;
  } else if (fase1Extracted) {
    // If fase1 was manually set, add diasFase2 to it
    fase2Str = addDaysToDateStr(fase1Extracted, diasFase2);
  } else {
    // If fase1 was not set, calculate from order date
    fase2Str = addDaysToDateStr(orderDateStr, diasFase1 + diasFase2);
  }
  
  // Calculate fase 3 date
  const fase3Extracted = extractDate(sale.fechaSeguimiento3);
  let fase3Str: string;
  if (fase3Extracted) {
    fase3Str = fase3Extracted;
  } else if (fase2Extracted) {
    // If fase2 was manually set, add diasFase3 to it
    fase3Str = addDaysToDateStr(fase2Extracted, diasFase3);
  } else {
    // If fase2 was not set, calculate from order date
    fase3Str = addDaysToDateStr(orderDateStr, diasFase1 + diasFase2 + diasFase3);
  }

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
    return { phase: null, status: null, date: null, dateStr: null };
  }

  // Ensure nextDateStr is not null
  if (!nextDateStr) {
    return { phase: null, status: null, date: null, dateStr: null };
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
    date: parseLocalDate(nextDateStr),
    dateStr: nextDateStr
  };
}
