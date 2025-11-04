import { db } from "../db";
import { egresos, type InsertEgreso } from "../../shared/schema";
import { eq, and, isNotNull, sql } from "drizzle-orm";
import type { DatabaseStorage } from "../storage";
import { nanoid } from "nanoid";

/**
 * Calculate the next occurrence date based on frequency
 */
export function calculateNextDate(baseDate: Date, frequency: string): Date {
  const next = new Date(baseDate);
  
  switch (frequency) {
    case "Diario":
      next.setDate(next.getDate() + 1);
      break;
      
    case "Semanal":
      next.setDate(next.getDate() + 7);
      break;
      
    case "Quincenal":
      // Quincenal = 2 times per month (original date + 15 days)
      // This handles edge cases where adding 15 days goes to next month
      next.setDate(next.getDate() + 15);
      break;
      
    case "Mensual":
      // Same day next month, handles month-end edge cases
      const currentDayMensual = next.getDate();
      next.setMonth(next.getMonth() + 1);
      
      // Handle case where target month has fewer days (e.g., Jan 31 -> Feb 28)
      if (next.getDate() < currentDayMensual) {
        next.setDate(0); // Last day of previous month
      }
      break;
      
    case "Trimestral":
      const currentDayTrim = next.getDate();
      next.setMonth(next.getMonth() + 3);
      if (next.getDate() < currentDayTrim) {
        next.setDate(0);
      }
      break;
      
    case "Semestral":
      const currentDaySem = next.getDate();
      next.setMonth(next.getMonth() + 6);
      if (next.getDate() < currentDaySem) {
        next.setDate(0);
      }
      break;
      
    case "Anual":
      const currentDayAnual = next.getDate();
      next.setFullYear(next.getFullYear() + 1);
      if (next.getDate() < currentDayAnual) {
        next.setDate(0);
      }
      break;
      
    default:
      throw new Error(`Unknown frequency: ${frequency}`);
  }
  
  return next;
}

/**
 * Generate all future egresos in a recurrence series upfront
 * This function creates all remaining egresos when a recurring series is created
 */
export async function generateAllRecurringEgresos(
  templateEgreso: InsertEgreso,
  storage: DatabaseStorage
): Promise<{ success: boolean; created: number; message: string }> {
  try {
    if (!templateEgreso.esRecurrente || !templateEgreso.numeroRepeticiones || !templateEgreso.frecuenciaRecurrencia || !templateEgreso.fechaCompromiso) {
      return { success: false, created: 0, message: "Not a valid recurring egreso" };
    }

    const createdEgresos = [];
    let currentDate = new Date(templateEgreso.fechaCompromiso);
    
    // Generate all future egresos (starting from #2 since #1 is the template)
    for (let i = 2; i <= templateEgreso.numeroRepeticiones; i++) {
      currentDate = calculateNextDate(currentDate, templateEgreso.frecuenciaRecurrencia);
      
      const nextEstado = templateEgreso.requiereAprobacion ? "Por autorizar" : "Por pagar";
      
      const newEgreso = await storage.createEgreso({
        // Updated fields for new occurrence
        fechaRegistro: new Date(),
        fechaCompromiso: currentDate,
        estado: nextEstado,
        esBorrador: false,
        numeroEnSerie: i,
        
        // Copy all payment fields from template
        ctaPorPagarUsd: templateEgreso.ctaPorPagarUsd,
        ctaPorPagarBs: templateEgreso.ctaPorPagarBs,
        tipoEgresoId: templateEgreso.tipoEgresoId,
        descripcion: templateEgreso.descripcion,
        beneficiario: templateEgreso.beneficiario,
        numeroFacturaProveedor: templateEgreso.numeroFacturaProveedor,
        requiereAprobacion: templateEgreso.requiereAprobacion,
        autorizadorId: templateEgreso.autorizadorId,
        
        // Recurrence fields - maintain series identity
        esRecurrente: templateEgreso.esRecurrente,
        frecuenciaRecurrencia: templateEgreso.frecuenciaRecurrencia,
        serieRecurrenciaId: templateEgreso.serieRecurrenciaId,
        numeroRepeticiones: templateEgreso.numeroRepeticiones,
        
        // Reset payment/verification fields for new occurrence
        fechaPago: undefined,
        montoPagadoUsd: undefined,
        montoPagadoBs: undefined,
        tasaCambio: undefined,
        bancoId: undefined,
        referenciaPago: undefined,
        numeroFacturaPagada: undefined,
        estadoVerificacion: "Por verificar",
        fechaVerificacion: undefined,
        notasVerificacion: undefined,
        fechaAutorizacion: undefined,
        accionAutorizacion: undefined,
        notasAutorizacion: undefined,
      });
      
      createdEgresos.push(newEgreso);
    }
    
    console.log(`✅ Generated ${createdEgresos.length} future egresos for serie ${templateEgreso.serieRecurrenciaId}`);
    
    return {
      success: true,
      created: createdEgresos.length,
      message: `Generated ${createdEgresos.length} future payments`
    };
  } catch (error) {
    console.error("Error generating all recurring egresos:", error);
    return {
      success: false,
      created: 0,
      message: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

/**
 * Generate the next egreso in a recurrence series
 */
export async function generateNextRecurringEgreso(
  serieId: string,
  storage: DatabaseStorage
): Promise<{ success: boolean; egresoId?: string; message: string }> {
  try {
    // Find the most recent egreso in this series to use as template
    const seriesEgresos = await db
      .select()
      .from(egresos)
      .where(eq(egresos.serieRecurrenciaId, serieId))
      .orderBy(sql`${egresos.numeroEnSerie} DESC`)
      .limit(1);

    if (seriesEgresos.length === 0) {
      return { success: false, message: `No egresos found for series ${serieId}` };
    }

    const template = seriesEgresos[0];

    // Check if we've reached the repetition limit
    if (!template.numeroRepeticiones || !template.numeroEnSerie) {
      return { success: false, message: "Missing repetition data" };
    }

    if (template.numeroEnSerie >= template.numeroRepeticiones) {
      return { success: false, message: "Series has reached its repetition limit" };
    }

    // Calculate next date
    const nextDate = calculateNextDate(new Date(template.fechaCompromiso!), template.frecuenciaRecurrencia!);
    
    // Check if next date is in the future
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (nextDate <= today) {
      return { success: false, message: "Next occurrence date is not in the future" };
    }

    // Create the next egreso in the series
    const nextEstado = template.requiereAprobacion ? "Por autorizar" : "Por pagar";
    const nextNumber = template.numeroEnSerie + 1;

    // Create next egreso copying ALL fields from template except those that change
    const newEgreso = await storage.createEgreso({
      // Updated fields for new occurrence
      fechaRegistro: new Date(),
      fechaCompromiso: nextDate,
      estado: nextEstado,
      esBorrador: false,
      numeroEnSerie: nextNumber,
      
      // Copy all payment fields from template
      ctaPorPagarUsd: template.ctaPorPagarUsd,
      ctaPorPagarBs: template.ctaPorPagarBs,
      tipoEgresoId: template.tipoEgresoId,
      descripcion: template.descripcion,
      numeroFacturaProveedor: template.numeroFacturaProveedor,
      requiereAprobacion: template.requiereAprobacion,
      autorizadorId: template.autorizadorId,
      
      // Recurrence fields - maintain series identity
      esRecurrente: template.esRecurrente,
      frecuenciaRecurrencia: template.frecuenciaRecurrencia,
      serieRecurrenciaId: template.serieRecurrenciaId,
      numeroRepeticiones: template.numeroRepeticiones,
      
      // Reset state-dependent fields (will be filled when processed)
      fechaAutorizacion: null,
      accionAutorizacion: null,
      notasAutorizacion: null,
      fechaPago: null,
      montoPagadoUsd: null,
      montoPagadoBs: null,
      tasaCambio: null,
      bancoId: null,
      referenciaPago: null,
      numeroFacturaPagada: null,
      estadoVerificacion: "Por verificar",
      fechaVerificacion: null,
      notasVerificacion: null,
    });

    // Update the template's ultimaFechaGenerada
    await db
      .update(egresos)
      .set({ ultimaFechaGenerada: new Date() })
      .where(eq(egresos.id, template.id));

    return {
      success: true,
      egresoId: newEgreso.id,
      message: `Generated egreso ${nextNumber} of ${template.numeroRepeticiones} for serie ${serieId}`,
    };
  } catch (error) {
    console.error("Error generating recurring egreso:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Process all active recurring series and generate pending egresos
 * This should be called daily by the cron job
 */
export async function processRecurringSeries(
  storage: DatabaseStorage
): Promise<{ processed: number; generated: number; errors: string[] }> {
  const errors: string[] = [];
  let processed = 0;
  let generated = 0;

  try {
    // Find all active recurring series (those that haven't reached their limit)
    // We get one representative from each series
    const activeSeries = await db
      .select({
        serieId: egresos.serieRecurrenciaId,
        maxNumero: sql<number>`MAX(${egresos.numeroEnSerie})`,
        numeroRepeticiones: sql<number>`MAX(${egresos.numeroRepeticiones})`,
      })
      .from(egresos)
      .where(
        and(
          eq(egresos.esRecurrente, true),
          isNotNull(egresos.serieRecurrenciaId),
          isNotNull(egresos.numeroRepeticiones)
        )
      )
      .groupBy(egresos.serieRecurrenciaId)
      .having(sql`MAX(${egresos.numeroEnSerie}) < MAX(${egresos.numeroRepeticiones})`);

    console.log(`📅 Processing ${activeSeries.length} active recurring series`);

    for (const series of activeSeries) {
      if (!series.serieId) continue;
      
      processed++;
      const result = await generateNextRecurringEgreso(series.serieId, storage);
      
      if (result.success) {
        generated++;
        console.log(`✅ ${result.message}`);
      } else {
        // Only log non-informational errors
        if (!result.message.includes("not in the future") && 
            !result.message.includes("reached its repetition limit")) {
          errors.push(`Serie ${series.serieId}: ${result.message}`);
          console.error(`❌ ${result.message}`);
        }
      }
    }

    console.log(`📊 Recurrence processing complete: ${generated} generated from ${processed} series`);
    
    return { processed, generated, errors };
  } catch (error) {
    console.error("Error processing recurring series:", error);
    errors.push(error instanceof Error ? error.message : "Unknown error");
    return { processed, generated, errors };
  }
}
