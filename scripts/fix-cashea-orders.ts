import { db } from '../server/db';
import { sales, productos } from '../shared/schema';
import { eq, and, or, isNull } from 'drizzle-orm';

async function fixCasheaOrders() {
  console.log('🔧 Starting Cashea order fix...\n');

  // Step 1: Get all products to build lookup maps
  console.log('📚 Loading product catalog...');
  const allProducts = await db.select({
    id: productos.id,
    nombre: productos.nombre,
    sku: productos.sku,
  }).from(productos);

  // Build lookup maps
  const productBySku = new Map<string, { nombre: string; sku: string }>();
  const productByName = new Map<string, { nombre: string; sku: string }>();

  allProducts.forEach(p => {
    if (p.sku) {
      productBySku.set(p.sku.toUpperCase(), { nombre: p.nombre, sku: p.sku });
    }
    productByName.set(p.nombre.toLowerCase().trim(), { nombre: p.nombre, sku: p.sku || '' });
  });

  console.log(`✅ Loaded ${allProducts.length} products\n`);

  // Step 2: Get all broken Cashea orders
  console.log('🔍 Finding broken Cashea orders...');
  const brokenOrders = await db.select({
    id: sales.id,
    orden: sales.orden,
    product: sales.product,
    sku: sales.sku,
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

  console.log(`Found ${brokenOrders.length} orders to fix\n`);

  // Step 3: Process each order
  let fixed = 0;
  let notFound = 0;

  for (const order of brokenOrders) {
    let correctProduct: { nombre: string; sku: string } | undefined;
    let lookupMethod = '';

    // Try matching by SKU first (if product field looks like a SKU)
    if (order.product && /^[A-Z]{3}-[A-Z]{3}(-\d+X\d+)?$/.test(order.product.toUpperCase())) {
      correctProduct = productBySku.get(order.product.toUpperCase());
      lookupMethod = 'SKU lookup';
    }

    // If not found by SKU, try by product name
    if (!correctProduct && order.product) {
      correctProduct = productByName.get(order.product.toLowerCase().trim());
      lookupMethod = 'Name lookup';
    }

    if (correctProduct) {
      // Update the order
      await db.update(sales)
        .set({
          product: correctProduct.nombre,
          sku: correctProduct.sku,
        })
        .where(eq(sales.id, order.id));

      console.log(`✅ Order ${order.orden}: "${order.product}" → "${correctProduct.nombre}" (${correctProduct.sku}) [${lookupMethod}]`);
      fixed++;
    } else {
      console.log(`❌ Order ${order.orden}: Could not find product for "${order.product}"`);
      notFound++;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Fixed: ${fixed}`);
  console.log(`   Not found: ${notFound}`);
  console.log(`   Total: ${brokenOrders.length}`);
  console.log('\n✨ Done!');
}

// Run the fix
fixCasheaOrders().catch(console.error);
