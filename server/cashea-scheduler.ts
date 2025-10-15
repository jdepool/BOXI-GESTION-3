import cron, { ScheduledTask } from 'node-cron';
import { db } from '../server/db';
import { casheaAutomationConfig, casheaAutomaticDownloads } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { performCasheaDownload } from './services/cashea-download';
import { storage } from './storage';

// Map frequency text to cron expressions
const frequencyToCron: Record<string, string> = {
  '30 minutes': '*/30 * * * *',
  '1 hour': '0 * * * *',
  '2 hours': '0 */2 * * *',
  '4 hours': '0 */4 * * *',
  '8 hours': '0 */8 * * *',
  '16 hours': '0 */16 * * *',
  '24 hours': '0 0 * * *'
};

// Convert frequency text to minutes for calculating date ranges
const frequencyToMinutes: Record<string, number> = {
  '30 minutes': 30,
  '1 hour': 60,
  '2 hours': 120,
  '4 hours': 240,
  '8 hours': 480,
  '16 hours': 960,
  '24 hours': 1440
};

let currentTask: ScheduledTask | null = null;

export async function startCasheaScheduler() {
  console.log('🚀 Initializing Cashea automation scheduler...');
  
  // Get current config from database
  const config = await getAutomationConfig();
  
  if (!config.enabled) {
    console.log('⏸️  Cashea automation is disabled');
    return;
  }
  
  const cronExpression = frequencyToCron[config.frequency];
  
  if (!cronExpression) {
    console.error(`❌ Invalid frequency: ${config.frequency}`);
    return;
  }
  
  console.log(`✅ Starting Cashea scheduler with frequency: ${config.frequency} (${cronExpression})`);
  
  // Stop existing task if any
  if (currentTask) {
    currentTask.stop();
    currentTask = null;
  }
  
  // Create new scheduled task
  currentTask = cron.schedule(cronExpression, async () => {
    console.log('⏰ Running scheduled Cashea download...');
    await runAutomaticDownload(config.frequency);
  });
  
  console.log('✨ Cashea scheduler started successfully');
}

export async function stopCasheaScheduler() {
  if (currentTask) {
    currentTask.stop();
    currentTask = null;
    console.log('🛑 Cashea scheduler stopped');
  }
}

export async function restartCasheaScheduler() {
  await stopCasheaScheduler();
  await startCasheaScheduler();
}

async function runAutomaticDownload(frequency: string) {
  const minutes = frequencyToMinutes[frequency];
  
  if (!minutes) {
    console.error(`❌ Invalid frequency for download: ${frequency}`);
    return;
  }
  
  // Calculate date range: from (now - frequency) to now
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - minutes * 60 * 1000);
  
  // Format dates as YYYY-MM-DD for API
  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];
  
  console.log(`📥 Auto-downloading Cashea data: ${startDateStr} to ${endDateStr}`);
  
  try {
    const result = await performCasheaDownload(startDateStr, endDateStr, storage);
    
    if (!result.success) {
      // Handle validation errors as failures
      await db.insert(casheaAutomaticDownloads).values({
        startDate: startDate,
        endDate: endDate,
        recordsCount: 0,
        status: 'error',
        errorMessage: result.message
      });
      
      console.error(`❌ Automatic download failed: ${result.message}`);
      return;
    }
    
    // Record successful download
    await db.insert(casheaAutomaticDownloads).values({
      startDate: startDate,
      endDate: endDate,
      recordsCount: result.recordsProcessed,
      status: 'success'
    });
    
    console.log(`✅ Automatic download completed: ${result.recordsProcessed} new sales`);
  } catch (error) {
    console.error('❌ Automatic download failed:', error);
    
    // Record failed download
    await db.insert(casheaAutomaticDownloads).values({
      startDate: startDate,
      endDate: endDate,
      recordsCount: 0,
      status: 'error',
      errorMessage: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function getAutomationConfig() {
  const configs = await db.select().from(casheaAutomationConfig).limit(1);
  
  if (configs.length === 0) {
    // Create default config if none exists
    const [newConfig] = await db.insert(casheaAutomationConfig).values({
      enabled: false,
      frequency: '2 hours'
    }).returning();
    
    return newConfig;
  }
  
  return configs[0];
}

export { getAutomationConfig };
