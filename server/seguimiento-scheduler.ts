import cron, { ScheduledTask } from 'node-cron';
import { 
  getFollowUpsDueToday, 
  generateFollowUpEmailHtml, 
  generateFollowUpEmailText,
  getEmailConfiguration,
  sendEmail
} from './services/seguimiento-email';

let currentTask: ScheduledTask | null = null;

/**
 * Start the daily seguimiento email reminder scheduler
 * Runs every day at 8:00 AM
 */
export async function startSeguimientoScheduler() {
  console.log('🚀 Initializing Seguimiento email reminder scheduler...');
  
  // Stop existing task if any
  if (currentTask) {
    currentTask.stop();
    currentTask = null;
  }
  
  // Run every day at 1:00 AM
  const cronExpression = '0 1 * * *';
  
  console.log(`✅ Starting Seguimiento scheduler (daily at 1:00 AM)`);
  
  // Create new scheduled task
  currentTask = cron.schedule(cronExpression, async () => {
    console.log('⏰ Running scheduled seguimiento email reminders...');
    await sendDailySeguimientoReminders();
  });
  
  console.log('✨ Seguimiento scheduler started successfully');
}

export async function stopSeguimientoScheduler() {
  if (currentTask) {
    currentTask.stop();
    currentTask = null;
    console.log('🛑 Seguimiento scheduler stopped');
  }
}

export async function restartSeguimientoScheduler() {
  await stopSeguimientoScheduler();
  await startSeguimientoScheduler();
}

/**
 * Send daily seguimiento reminder emails to asesores
 */
async function sendDailySeguimientoReminders() {
  try {
    // Get all follow-ups due today grouped by asesor
    const asesorReminders = await getFollowUpsDueToday();
    
    if (asesorReminders.length === 0) {
      console.log('✅ No seguimiento reminders due today');
      return;
    }
    
    console.log(`📧 Found ${asesorReminders.length} asesor(es) with follow-ups due today`);
    
    // Get email configuration
    const config = await getEmailConfiguration();
    
    if (!config) {
      console.error('❌ No seguimiento configuration found');
      return;
    }
    
    // Build asesor email map from config
    const asesorEmailMap = new Map<string, string>();
    
    if (config.asesorEmails && Array.isArray(config.asesorEmails)) {
      for (const mapping of config.asesorEmails as Array<{ asesorId: string; email: string }>) {
        asesorEmailMap.set(mapping.asesorId, mapping.email);
      }
    }
    
    // Send emails to each asesor
    let emailsSent = 0;
    let emailsFailed = 0;
    
    for (const asesorData of asesorReminders) {
      let asesorEmail = asesorEmailMap.get(asesorData.asesorId);
      
      // For prospects without asesor or inactive asesor, require general fallback email
      if (!asesorEmail) {
        if (asesorData.asesorId === 'sin-asesor' || !asesorEmailMap.has(asesorData.asesorId)) {
          asesorEmail = config.emailRecordatorio || undefined;
        }
      }
      
      if (!asesorEmail) {
        const errorMsg = asesorData.asesorId === 'sin-asesor'
          ? `⚠️  ERROR: Hay ${asesorData.reminders.length} prospecto(s) sin asesor asignado, pero no hay email general configurado. Configure un email general en la sección de Seguimiento.`
          : `⚠️  No email configured for asesor ${asesorData.asesorNombre}, skipping...`;
        console.error(errorMsg);
        emailsFailed++;
        continue;
      }
      
      try {
        // Generate email content
        const htmlContent = generateFollowUpEmailHtml(asesorData.asesorNombre, asesorData.reminders);
        const textContent = generateFollowUpEmailText(asesorData.asesorNombre, asesorData.reminders);
        
        // Send email using Outlook
        await sendEmail(
          asesorEmail,
          'Recordatorio de Seguimientos - BoxiSleep CRM',
          htmlContent,
          textContent
        );
        
        console.log(`✅ Email sent to ${asesorData.asesorNombre} (${asesorEmail}) - ${asesorData.reminders.length} reminder(s)`);
        emailsSent++;
      } catch (error) {
        console.error(`❌ Failed to send email to ${asesorData.asesorNombre}:`, error);
        emailsFailed++;
      }
    }
    
    console.log(`✅ Seguimiento reminders sent: ${emailsSent} successful, ${emailsFailed} failed`);
  } catch (error) {
    console.error('❌ Failed to send seguimiento reminders:', error);
  }
}

/**
 * Manual trigger for testing (can be called from API endpoint)
 */
export async function triggerSeguimientoReminders() {
  console.log('🔔 Manually triggering seguimiento reminders...');
  await sendDailySeguimientoReminders();
}
