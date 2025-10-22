import { db } from '../db';
import { prospectos, seguimientoConfig, asesores } from '@shared/schema';
import { and, eq, or, lte, gte } from 'drizzle-orm';

interface FollowUpReminder {
  prospecto: {
    id: string;
    numeroProspecto: string;
    nombre: string;
    telefono: string | null;
    canal: string;
  };
  fase: 1 | 2 | 3;
  fechaSeguimiento: Date;
  respuestaAnterior?: string | null;
}

interface AsesorReminders {
  asesorId: string;
  asesorNombre: string;
  email: string;
  reminders: FollowUpReminder[];
}

/**
 * Get all follow-ups due today grouped by asesor
 */
export async function getFollowUpsDueToday(): Promise<AsesorReminders[]> {
  // Get today's date range (timezone-safe comparison)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  // Get all prospectos with follow-ups due today
  const prospectosWithFollowUps = await db
    .select()
    .from(prospectos)
    .where(
      and(
        or(
          and(
            lte(prospectos.fechaSeguimiento1, tomorrow),
            gte(prospectos.fechaSeguimiento1, today)
          ),
          and(
            lte(prospectos.fechaSeguimiento2, tomorrow),
            gte(prospectos.fechaSeguimiento2, today)
          ),
          and(
            lte(prospectos.fechaSeguimiento3, tomorrow),
            gte(prospectos.fechaSeguimiento3, today)
          )
        )
      )
    );

  if (prospectosWithFollowUps.length === 0) {
    return [];
  }

  // Get all active asesores
  const allAsesores = await db
    .select()
    .from(asesores)
    .where(eq(asesores.activo, true));

  // Group by asesor
  const asesorMap = new Map<string, FollowUpReminder[]>();

  for (const prospecto of prospectosWithFollowUps) {
    // Determine which phase is due today
    let fase: 1 | 2 | 3 | null = null;
    let fechaSeguimiento: Date | null = null;
    let respuestaAnterior: string | null = null;

    if (prospecto.fechaSeguimiento1 && 
        prospecto.fechaSeguimiento1 >= today && 
        prospecto.fechaSeguimiento1 < tomorrow) {
      fase = 1;
      fechaSeguimiento = prospecto.fechaSeguimiento1;
      respuestaAnterior = null;
    } else if (prospecto.fechaSeguimiento2 && 
               prospecto.fechaSeguimiento2 >= today && 
               prospecto.fechaSeguimiento2 < tomorrow) {
      fase = 2;
      fechaSeguimiento = prospecto.fechaSeguimiento2;
      respuestaAnterior = prospecto.respuestaSeguimiento1;
    } else if (prospecto.fechaSeguimiento3 && 
               prospecto.fechaSeguimiento3 >= today && 
               prospecto.fechaSeguimiento3 < tomorrow) {
      fase = 3;
      fechaSeguimiento = prospecto.fechaSeguimiento3;
      respuestaAnterior = prospecto.respuestaSeguimiento2;
    }

    if (!fase || !fechaSeguimiento) continue;

    const asesorId = prospecto.asesorId || 'sin-asesor';
    
    if (!asesorMap.has(asesorId)) {
      asesorMap.set(asesorId, []);
    }

    asesorMap.get(asesorId)!.push({
      prospecto: {
        id: prospecto.id,
        numeroProspecto: prospecto.prospecto,
        nombre: prospecto.nombre,
        telefono: prospecto.telefono || '',
        canal: prospecto.canal || 'Tienda',
      },
      fase,
      fechaSeguimiento,
      respuestaAnterior,
    });
  }

  // Convert map to array with asesor info
  const result: AsesorReminders[] = [];
  
  for (const [asesorId, reminders] of Array.from(asesorMap.entries())) {
    const asesor = allAsesores.find(a => a.id === asesorId);
    
    if (asesor) {
      result.push({
        asesorId: asesor.id,
        asesorNombre: asesor.nombre,
        email: '', // Will be populated from config
        reminders,
      });
    } else if (asesorId === 'sin-asesor') {
      // Include prospectos without asesor for fallback email
      result.push({
        asesorId: 'sin-asesor',
        asesorNombre: 'Sin Asesor Asignado',
        email: '', // Will use fallback general email
        reminders,
      });
    }
  }

  return result;
}

/**
 * Generate HTML email content for follow-up reminders
 */
export function generateFollowUpEmailHtml(asesorNombre: string, reminders: FollowUpReminder[]): string {
  const reminderRows = reminders.map(reminder => {
    const respuestaInfo = reminder.respuestaAnterior 
      ? `<br><small style="color: #666;">Respuesta anterior: ${reminder.respuestaAnterior}</small>`
      : '';
    
    return `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${reminder.prospecto.numeroProspecto}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
          <strong>${reminder.prospecto.nombre}</strong><br>
          <small style="color: #666;">${reminder.prospecto.telefono || 'Sin teléfono'}</small>
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${reminder.prospecto.canal}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">
          <span style="background-color: #3b82f6; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px;">
            Fase ${reminder.fase}
          </span>
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
          ${reminder.fechaSeguimiento.toLocaleDateString('es-ES')}
          ${respuestaInfo}
        </td>
      </tr>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Recordatorio de Seguimientos - BoxiSleep</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8fafc; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
          <h1 style="color: #1e293b; margin: 0 0 8px 0; font-size: 24px;">📅 Recordatorio de Seguimientos</h1>
          <p style="color: #64748b; margin: 0; font-size: 14px;">BoxiSleep CRM</p>
        </div>

        <div style="background-color: white; border-radius: 8px; border: 1px solid #e5e7eb; padding: 24px; margin-bottom: 24px;">
          <p style="margin: 0 0 16px 0; font-size: 16px;">
            Hola <strong>${asesorNombre}</strong>,
          </p>
          <p style="margin: 0 0 16px 0;">
            Tienes <strong>${reminders.length}</strong> seguimiento${reminders.length !== 1 ? 's' : ''} programado${reminders.length !== 1 ? 's' : ''} para hoy:
          </p>
        </div>

        <div style="background-color: white; border-radius: 8px; border: 1px solid #e5e7eb; overflow: hidden; margin-bottom: 24px;">
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background-color: #f8fafc;">
                <th style="padding: 12px; text-align: left; font-weight: 600; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e5e7eb;">Prospecto</th>
                <th style="padding: 12px; text-align: left; font-weight: 600; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e5e7eb;">Nombre</th>
                <th style="padding: 12px; text-align: left; font-weight: 600; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e5e7eb;">Canal</th>
                <th style="padding: 12px; text-align: center; font-weight: 600; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e5e7eb;">Fase</th>
                <th style="padding: 12px; text-align: left; font-weight: 600; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e5e7eb;">Fecha</th>
              </tr>
            </thead>
            <tbody>
              ${reminderRows}
            </tbody>
          </table>
        </div>

        <div style="background-color: #f8fafc; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
          <p style="margin: 0; font-size: 14px; color: #64748b;">
            💡 <strong>Consejo:</strong> Revisa la respuesta del seguimiento anterior antes de contactar al prospecto.
          </p>
        </div>

        <div style="text-align: center; padding-top: 24px; border-top: 1px solid #e5e7eb;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">
            Este es un recordatorio automático del sistema BoxiSleep CRM<br>
            ${new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </body>
    </html>
  `;
}

/**
 * Generate plain text email content for follow-up reminders
 */
export function generateFollowUpEmailText(asesorNombre: string, reminders: FollowUpReminder[]): string {
  const reminderList = reminders.map((reminder, index) => {
    const respuestaInfo = reminder.respuestaAnterior 
      ? `\n   Respuesta anterior: ${reminder.respuestaAnterior}`
      : '';
    
    return `
${index + 1}. ${reminder.prospecto.numeroProspecto} - ${reminder.prospecto.nombre}
   Teléfono: ${reminder.prospecto.telefono || 'Sin teléfono'}
   Canal: ${reminder.prospecto.canal}
   Fase: ${reminder.fase}
   Fecha: ${reminder.fechaSeguimiento.toLocaleDateString('es-ES')}${respuestaInfo}
    `;
  }).join('\n');

  return `
📅 RECORDATORIO DE SEGUIMIENTOS - BoxiSleep CRM

Hola ${asesorNombre},

Tienes ${reminders.length} seguimiento${reminders.length !== 1 ? 's' : ''} programado${reminders.length !== 1 ? 's' : ''} para hoy:
${reminderList}

💡 Consejo: Revisa la respuesta del seguimiento anterior antes de contactar al prospecto.

---
Este es un recordatorio automático del sistema BoxiSleep CRM
${new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
  `.trim();
}

/**
 * Get email configuration from database
 */
export async function getEmailConfiguration() {
  const [config] = await db.select().from(seguimientoConfig).limit(1);
  return config;
}
