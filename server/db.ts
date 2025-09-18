import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Configure pool with proper error handling and connection settings
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 10, // Connection pool size
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 10000, // Wait 10 seconds for new client connections
  allowExitOnIdle: false // Don't exit the process when idle
});

// Add error handling for the pool
pool.on('error', (err: Error) => {
  console.error('Unexpected database pool error:', err);
  // Don't exit the process, let the pool handle reconnection
});

pool.on('connect', () => {
  console.log('Database connection established');
});

// Create database instance with correct adapter and schema
export const db = drizzle(pool, { schema });

// Utility function to retry database operations on transient errors
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 100
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Check if this is a transient error that should be retried
      const isTransientError = 
        error.code === '57P01' ||  // admin_shutdown
        error.code === '57P02' ||  // crash_shutdown
        error.code === 'ETIMEDOUT' ||
        error.code === 'ECONNRESET' ||
        error.code === 'ENOTFOUND' ||
        error.message?.includes('connection terminated') ||
        error.message?.includes('connection closed');
      
      if (!isTransientError || attempt === maxRetries - 1) {
        throw error;
      }
      
      // Exponential backoff delay
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`Database operation failed (attempt ${attempt + 1}/${maxRetries}), retrying in ${delay}ms...`, error.message);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}