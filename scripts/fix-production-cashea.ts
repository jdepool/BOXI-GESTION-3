import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { sales, productos } from '../shared/schema';
import { eq, and, or, isNull } from 'drizzle-orm';

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(color: string, message: string) {
  console.log(`${color}${message}${colors.reset}`);
}

interface BrokenOrder {
  id: string;
  orden: string | null;
  product: string;
  nombre: string;
}

interface Product {
  id: string;
  nombre: string;
  sku: string | null;
}

function normalizeText(text: string): string {
  return text.trim().toLowerCase();
}

function findMatchingProduct(orderProduct: string, allProducts: Product[]): Product | null {
  const normalized = normalizeText(orderProduct);
  
  // Try exact match on SKU first (case-insensitive)
  for (const p of allProducts) {
    if (p.sku && normalizeText(p.sku) === normalized) {
      return p;
    }
  }
  
  // Try exact match on name (case-insensitive)
  for (const p of allProducts) {
    if (normalizeText(p.nombre) === normalized) {
      return p;
    }
  }
  
  return null;
}

async function main() {
  const isPreview = process.argv.includes('--preview');
  const isActualFix = process.argv.includes('--fix');
  
  if (!isPreview && !isActualFix) {
    log(colors.red, '\n❌ ERROR: You must specify either --preview or --fix');
    log(colors.yellow, '\nUsage:');
    log(colors.cyan, '  npm run fix-production --preview   (See what will be fixed)');
    log(colors.cyan, '  npm run fix-production --fix       (Actually fix the data)\n');
    process.exit(1);
  }
  
  // Get production database URL
  const productionDbUrl = process.env.REPLIT_DB_URL || process.env.DATABASE_URL;
  
  if (!productionDbUrl) {
    log(colors.red, '\n❌ ERROR: No database URL found');
    log(colors.yellow, 'Make sure DATABASE_URL or REPLIT_DB_URL is set\n');
    process.exit(1);
  }
  
  log(colors.blue, '\n' + '='.repeat(60));
  if (isPreview) {
    log(colors.yellow, '🔍 PREVIEW MODE - No changes will be made');
  } else {
    log(colors.green, '⚠️  FIX MODE - This will modify production data');
  }
  log(colors.blue, '='.repeat(60) + '\n');
  
  // Connect to production database
  const pool = new Pool({ connectionString: productionDbUrl });
  const db = drizzle(pool);
  
  log(colors.cyan, '📊 Loading data from production database...\n');
  
  // Get all products
  const allProducts = await db.select({
    id: productos.id,
    nombre: productos.nombre,
    sku: productos.sku,
  }).from(productos);
  
  log(colors.green, `✅ Loaded ${allProducts.length} products`);
  
  // Get broken Cashea orders
  const brokenOrders = await db.select({
    id: sales.id,
    orden: sales.orden,
    product: sales.product,
    nombre: sales.nombre,
  }).from(sales).where(
    and(
      eq(sales.canal, 'cashea'),
      or(
        isNull(sales.sku),
        eq(sales.sku, '')
      )
    )
  );
  
  log(colors.green, `✅ Found ${brokenOrders.length} broken Cashea orders\n`);
  
  if (brokenOrders.length === 0) {
    log(colors.green, '🎉 No broken orders found! Everything is already fixed.\n');
    await pool.end();
    return;
  }
  
  // Process each order
  let matchedCount = 0;
  let notFoundCount = 0;
  const fixes: Array<{ order: BrokenOrder; product: Product }> = [];
  
  log(colors.cyan, 'Analyzing orders...\n');
  
  for (const order of brokenOrders) {
    const matchedProduct = findMatchingProduct(order.product, allProducts);
    
    if (matchedProduct && matchedProduct.sku) {
      fixes.push({ order, product: matchedProduct });
      matchedCount++;
      
      if (isPreview && matchedCount <= 10) {
        // Show first 10 examples in preview
        log(colors.green, `✅ Order ${order.orden}: "${order.product}" → "${matchedProduct.nombre}" (${matchedProduct.sku})`);
      }
    } else {
      notFoundCount++;
      if (isPreview && notFoundCount <= 5) {
        log(colors.red, `❌ Order ${order.orden}: Could not match "${order.product}"`);
      }
    }
  }
  
  // Summary
  log(colors.blue, '\n' + '='.repeat(60));
  log(colors.cyan, '📊 SUMMARY:');
  log(colors.green, `   ✅ Will fix: ${matchedCount} orders`);
  if (notFoundCount > 0) {
    log(colors.red, `   ❌ Cannot fix: ${notFoundCount} orders`);
  }
  log(colors.cyan, `   📦 Total broken: ${brokenOrders.length} orders`);
  log(colors.blue, '='.repeat(60) + '\n');
  
  if (isPreview) {
    log(colors.yellow, '🔍 This was PREVIEW mode - no changes were made');
    log(colors.cyan, '\nTo actually fix the data, run:');
    log(colors.green, '  npx tsx scripts/fix-production-cashea.ts --fix\n');
  } else {
    // Actually apply the fixes
    log(colors.yellow, '⚙️  Applying fixes to production database...\n');
    
    let fixed = 0;
    for (const { order, product } of fixes) {
      await db.update(sales)
        .set({
          product: product.nombre,
          sku: product.sku,
        })
        .where(eq(sales.id, order.id));
      
      fixed++;
      if (fixed % 10 === 0) {
        log(colors.cyan, `   Progress: ${fixed}/${matchedCount} orders fixed...`);
      }
    }
    
    log(colors.green, `\n✅ Successfully fixed ${fixed} orders!`);
    
    // Verify
    const remainingBroken = await db.select({
      id: sales.id,
    }).from(sales).where(
      and(
        eq(sales.canal, 'cashea'),
        or(
          isNull(sales.sku),
          eq(sales.sku, '')
        )
      )
    );
    
    log(colors.blue, '\n' + '='.repeat(60));
    log(colors.cyan, '✨ VERIFICATION:');
    log(colors.green, `   Fixed: ${fixed} orders`);
    log(colors.yellow, `   Remaining broken: ${remainingBroken.length} orders`);
    log(colors.blue, '='.repeat(60) + '\n');
    
    if (remainingBroken.length === 0) {
      log(colors.green, '🎉 All Cashea orders are now fixed!\n');
    } else {
      log(colors.yellow, `⚠️  There are still ${remainingBroken.length} orders that could not be matched automatically.\n`);
    }
  }
  
  await pool.end();
}

main().catch((error) => {
  log(colors.red, '\n❌ ERROR:');
  console.error(error);
  process.exit(1);
});
