import { db } from '../db';
import { prospectos, seguimientoConfig, asesores } from '@shared/schema';
import { and, eq, or, lte, gte } from 'drizzle-orm';
import { Client } from '@microsoft/microsoft-graph-client';

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
  // Get today's date as a date-only string (YYYY-MM-DD) - timezone safe
  const todayDateOnly = new Date().toISOString().split('T')[0];
  
  console.log(`📅 Checking for seguimientos due on: ${todayDateOnly}`);
  
  // Get all prospectos that have at least one seguimiento date set
  const prospectosWithFollowUps = await db
    .select()
    .from(prospectos)
    .where(
      or(
        eq(prospectos.estadoProspecto, 'Activo')
      )
    );

  console.log(`🔍 Found ${prospectosWithFollowUps.length} active prospectos to check`);

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
    // Determine which phase is due today using date-only comparison
    let fase: 1 | 2 | 3 | null = null;
    let fechaSeguimiento: Date | null = null;
    let respuestaAnterior: string | null = null;

    // Compare date-only strings (YYYY-MM-DD) to avoid timezone issues
    const fecha1DateOnly = prospecto.fechaSeguimiento1 
      ? new Date(prospecto.fechaSeguimiento1).toISOString().split('T')[0] 
      : null;
    const fecha2DateOnly = prospecto.fechaSeguimiento2 
      ? new Date(prospecto.fechaSeguimiento2).toISOString().split('T')[0] 
      : null;
    const fecha3DateOnly = prospecto.fechaSeguimiento3 
      ? new Date(prospecto.fechaSeguimiento3).toISOString().split('T')[0] 
      : null;

    if (fecha1DateOnly === todayDateOnly) {
      fase = 1;
      fechaSeguimiento = prospecto.fechaSeguimiento1!;
      respuestaAnterior = null;
    } else if (fecha2DateOnly === todayDateOnly) {
      fase = 2;
      fechaSeguimiento = prospecto.fechaSeguimiento2!;
      respuestaAnterior = prospecto.respuestaSeguimiento1;
    } else if (fecha3DateOnly === todayDateOnly) {
      fase = 3;
      fechaSeguimiento = prospecto.fechaSeguimiento3!;
      respuestaAnterior = prospecto.respuestaSeguimiento2;
    }

    if (!fase || !fechaSeguimiento) continue;
    
    console.log(`✅ Found seguimiento due today: ${prospecto.prospecto} - Fase ${fase}`);

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

        <div style="text-align: center; padding-top: 24px; border-top: 1px solid #e5e7eb;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">
            Este es un recordatorio automático del Sistema de Gestión BoxiSleep
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

---
Este es un recordatorio automático del Sistema de Gestión BoxiSleep
  `.trim();
}

/**
 * Get email configuration from database
 */
export async function getEmailConfiguration() {
  const [config] = await db.select().from(seguimientoConfig).limit(1);
  return config;
}

/**
 * Get Outlook client with fresh access token
 */
async function getAccessToken() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  const connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=outlook',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Outlook not connected');
  }
  return accessToken;
}

async function getOutlookClient() {
  const accessToken = await getAccessToken();

  return Client.initWithMiddleware({
    authProvider: {
      getAccessToken: async () => accessToken
    }
  });
}

/**
 * Send email using Outlook
 */
export async function sendEmail(
  to: string,
  subject: string,
  htmlContent: string,
  textContent: string
): Promise<void> {
  const client = await getOutlookClient();

  const message = {
    message: {
      subject,
      body: {
        contentType: 'HTML',
        content: htmlContent
      },
      toRecipients: [
        {
          emailAddress: {
            address: to
          }
        }
      ]
    }
  };

  await client.api('/me/sendMail').post(message);
  console.log(`Email sent successfully to ${to}`);
}
