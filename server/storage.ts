import { 
  sales, uploadHistory, users, bancos, tiposEgresos, productos, metodosPago, monedas, categorias, canales, asesores, egresos, egresosPorAprobar, paymentInstallments,
  type User, type InsertUser, type Sale, type InsertSale, type UploadHistory, type InsertUploadHistory,
  type Banco, type InsertBanco, type TipoEgreso, type InsertTipoEgreso,
  type Producto, type InsertProducto, type MetodoPago, type InsertMetodoPago,
  type Moneda, type InsertMoneda, type Categoria, type InsertCategoria,
  type Canal, type InsertCanal, type Asesor, type InsertAsesor, type Egreso, type InsertEgreso,
  type EgresoPorAprobar, type InsertEgresoPorAprobar, type PaymentInstallment, type InsertPaymentInstallment
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, count, sum, avg, and, gte, lte, or, ne, like, ilike, isNotNull, isNull, sql } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Sales methods
  createSale(sale: InsertSale): Promise<Sale>;
  createSales(salesData: InsertSale[]): Promise<Sale[]>;
  updateSale(id: string, sale: Partial<InsertSale>): Promise<Sale | undefined>;
  updateSalesByOrderNumber(orderNumber: string, updates: Partial<InsertSale>): Promise<Sale[]>;
  deleteSale(id: string): Promise<boolean>;
  getSales(filters?: {
    canal?: string;
    estadoEntrega?: string;
    orden?: string;
    startDate?: Date;
    endDate?: Date;
    tipo?: string;
    asesorId?: string;
    excludePendingManual?: boolean;
    excludeReservas?: boolean;
    excludeADespachar?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<Sale[]>;
  getSaleById(id: string): Promise<Sale | undefined>;
  getSalesByOrderNumber(orderNumber: string): Promise<Sale[]>;
  getCasheaOrders(limit?: number): Promise<Sale[]>;
  getOrdersWithAddresses(limit?: number, offset?: number): Promise<{ data: Sale[]; total: number }>;
  updateSaleDeliveryStatus(saleId: string, newStatus: string): Promise<Sale | undefined>;
  updateSaleAddresses(saleId: string, addresses: {
    direccionFacturacionPais?: string;
    direccionFacturacionEstado?: string;
    direccionFacturacionCiudad?: string;
    direccionFacturacionDireccion?: string;
    direccionFacturacionUrbanizacion?: string;
    direccionFacturacionReferencia?: string;
    direccionDespachoIgualFacturacion?: boolean;
    direccionDespachoPais?: string;
    direccionDespachoEstado?: string;
    direccionDespachoCiudad?: string;
    direccionDespachoDireccion?: string;
    direccionDespachoUrbanizacion?: string;
    direccionDespachoReferencia?: string;
  }): Promise<Sale | undefined>;
  updateSaleFechaEntrega(saleId: string, fechaEntrega: Date | null): Promise<Sale | undefined>;
  getTotalSalesCount(filters?: {
    canal?: string;
    estadoEntrega?: string;
    startDate?: Date;
    endDate?: Date;
    tipo?: string;
    asesorId?: string;
    excludePendingManual?: boolean;
    excludeReservas?: boolean;
    excludeADespachar?: boolean;
  }): Promise<number>;
  getExistingOrderNumbers(orders: string[]): Promise<string[]>;
  getOrdersByOrderNumber(orderNumber: string): Promise<{orden: string; product: string}[]>;
  getSalesWithInstallments(filters?: {
    canal?: string;
    estadoEntrega?: string;
    orden?: string;
    startDate?: Date;
    endDate?: Date;
    tipo?: string;
    asesorId?: string;
    excludePendingManual?: boolean;
    excludeReservas?: boolean;
    excludeADespachar?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<Array<Sale & { installments: PaymentInstallment[] }>>;
  getOrdersForPayments(filters?: {
    limit?: number;
    offset?: number;
  }): Promise<{
    data: Array<{
      orden: string;
      nombre: string;
      fecha: Date;
      canal: string | null;
      tipo: string | null;
      estadoEntrega: string | null;
      totalOrderUsd: number | null;
      productCount: number;
      hasPagoInicial: boolean;
      hasFlete: boolean;
      installmentCount: number;
    }>;
    total: number;
  }>;
  
  // Analytics methods
  getSalesMetrics(): Promise<{
    totalOrderUsd: number;
    pagoInicialVerificado: number;
    totalCuotas: number;
    totalPagado: number;
    pendiente: number;
    salesByChannel: { canal: string; total: number; orders: number }[];
    salesByDeliveryStatus: { status: string; count: number }[];
  }>;
  
  // Upload history methods
  createUploadHistory(uploadData: InsertUploadHistory): Promise<UploadHistory>;
  getRecentUploads(limit?: number): Promise<UploadHistory[]>;

  // Admin configuration methods
  // Bancos
  getBancos(): Promise<Banco[]>;
  createBanco(banco: InsertBanco): Promise<Banco>;
  updateBanco(id: string, banco: Partial<InsertBanco>): Promise<Banco | undefined>;
  deleteBanco(id: string): Promise<boolean>;

  // Tipos de Egresos
  getTiposEgresos(): Promise<TipoEgreso[]>;
  createTipoEgreso(tipo: InsertTipoEgreso): Promise<TipoEgreso>;
  updateTipoEgreso(id: string, tipo: Partial<InsertTipoEgreso>): Promise<TipoEgreso | undefined>;
  deleteTipoEgreso(id: string): Promise<boolean>;

  // Productos
  getProductos(): Promise<Producto[]>;
  createProducto(producto: InsertProducto): Promise<Producto>;
  updateProducto(id: string, producto: Partial<InsertProducto>): Promise<Producto | undefined>;
  deleteProducto(id: string): Promise<boolean>;

  // Métodos de Pago
  getMetodosPago(): Promise<MetodoPago[]>;
  createMetodoPago(metodo: InsertMetodoPago): Promise<MetodoPago>;
  updateMetodoPago(id: string, metodo: Partial<InsertMetodoPago>): Promise<MetodoPago | undefined>;
  deleteMetodoPago(id: string): Promise<boolean>;

  // Monedas
  getMonedas(): Promise<Moneda[]>;
  createMoneda(moneda: InsertMoneda): Promise<Moneda>;
  updateMoneda(id: string, moneda: Partial<InsertMoneda>): Promise<Moneda | undefined>;
  deleteMoneda(id: string): Promise<boolean>;

  // Categorías
  getCategorias(): Promise<Categoria[]>;
  createCategoria(categoria: InsertCategoria): Promise<Categoria>;
  updateCategoria(id: string, categoria: Partial<InsertCategoria>): Promise<Categoria | undefined>;
  deleteCategoria(id: string): Promise<boolean>;
  
  // Canales
  getCanales(): Promise<Canal[]>;
  createCanal(canal: InsertCanal): Promise<Canal>;
  updateCanal(id: string, canal: Partial<InsertCanal>): Promise<Canal | undefined>;
  deleteCanal(id: string): Promise<boolean>;

  // Asesores
  getAsesores(): Promise<Asesor[]>;
  getAsesorById(id: string): Promise<Asesor | undefined>;
  createAsesor(asesor: InsertAsesor): Promise<Asesor>;
  updateAsesor(id: string, asesor: Partial<InsertAsesor>): Promise<Asesor | undefined>;
  deleteAsesor(id: string): Promise<boolean>;

  // Egresos
  getEgresos(filters?: {
    tipoEgresoId?: string;
    metodoPagoId?: string;
    bancoId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<Egreso[]>;
  createEgreso(egreso: InsertEgreso): Promise<Egreso>;
  createEgresos(egresosData: InsertEgreso[]): Promise<Egreso[]>;
  updateEgreso(id: string, egreso: Partial<InsertEgreso>): Promise<Egreso | undefined>;
  deleteEgreso(id: string): Promise<boolean>;
  getEgresoById(id: string): Promise<Egreso | undefined>;
  getTotalEgresosCount(filters?: {
    tipoEgresoId?: string;
    metodoPagoId?: string;
    bancoId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<number>;

  // Egresos Por Aprobar
  getEgresosPorAprobar(filters?: {
    tipoEgresoId?: string;
    metodoPagoId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<EgresoPorAprobar[]>;
  createEgresoPorAprobar(egreso: InsertEgresoPorAprobar): Promise<EgresoPorAprobar>;
  updateEgresoPorAprobar(id: string, egreso: Partial<InsertEgresoPorAprobar>): Promise<EgresoPorAprobar | undefined>;
  deleteEgresoPorAprobar(id: string): Promise<boolean>;
  getEgresoPorAprobarById(id: string): Promise<EgresoPorAprobar | undefined>;
  getTotalEgresosPorAprobarCount(filters?: {
    tipoEgresoId?: string;
    metodoPagoId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<number>;
  aprobarEgreso(id: string, egresoData: {
    monedaId: string;
    bancoId: string;
    referencia?: string;
    observaciones?: string;
  }): Promise<Egreso>;
  completarInfoPagoEgreso(id: string, updates: {
    bancoId?: string;
    referencia?: string;
    observaciones?: string;
  }): Promise<Egreso | undefined>;

  // Payment Installments
  getInstallmentsBySale(saleId: string): Promise<PaymentInstallment[]>;
  getInstallmentById(id: string): Promise<PaymentInstallment | undefined>;
  createInstallment(saleId: string, data: Partial<InsertPaymentInstallment>): Promise<PaymentInstallment>;
  updateInstallment(id: string, data: Partial<InsertPaymentInstallment>): Promise<PaymentInstallment | undefined>;
  deleteInstallment(id: string): Promise<boolean>;
  recomputeInstallmentSequenceAndBalances(saleId: string): Promise<void>;
  getInstallmentSummary(saleId: string): Promise<{
    totalOrderUsd: number;
    pagoInicialUsd: number;
    totalCuotas: number;
    totalPagado: number;
    saldoPendiente: number;
  }>;
  isPaymentFullyVerified(saleId: string): Promise<boolean>;
  
  // Sale update methods
  updateSaleFlete(saleId: string, flete: {
    montoFleteUsd?: string;
    fechaFlete?: string;
    pagoFleteUsd?: string;
    referenciaFlete?: string;
    montoFleteBs?: string;
    bancoReceptorFlete?: string;
    fleteGratis?: boolean;
  }): Promise<Sale | undefined>;
  updateFleteStatus(saleId: string, newStatus: string): Promise<Sale | undefined>;
  updateSaleNotes(id: string, notas: string | null): Promise<Sale | undefined>;
  updateOrderPagoInicial(orderNumber: string, pagoData: {
    fechaPagoInicial?: string | null;
    pagoInicialUsd?: number | null;
    bancoId?: string | null;
    referenciaInicial?: string | null;
    montoInicialBs?: number | null;
    montoInicialUsd?: number | null;
    estadoPagoInicial?: string;
  }): Promise<Sale[]>;
  
  // Verification methods
  getVerificationPayments(filters?: {
    startDate?: string;
    endDate?: string;
    bancoId?: string;
    orden?: string;
    tipoPago?: string;
  }): Promise<any[]>;
  updatePaymentVerification(data: {
    paymentId: string;
    paymentType: string;
    estadoVerificacion?: string;
    notasVerificacion?: string;
  }): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async createSale(sale: InsertSale): Promise<Sale> {
    const [newSale] = await db
      .insert(sales)
      .values(sale)
      .returning();
    return newSale;
  }

  async createSales(salesData: InsertSale[]): Promise<Sale[]> {
    const newSales = await db
      .insert(sales)
      .values(salesData)
      .returning();
    return newSales;
  }

  async updateSale(id: string, saleData: Partial<InsertSale>): Promise<Sale | undefined> {
    const [updatedSale] = await db
      .update(sales)
      .set(saleData)
      .where(eq(sales.id, id))
      .returning();
    return updatedSale || undefined;
  }

  async deleteSale(id: string): Promise<boolean> {
    const result = await db.delete(sales).where(eq(sales.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getSales(filters?: {
    canal?: string;
    estadoEntrega?: string;
    orden?: string;
    startDate?: Date;
    endDate?: Date;
    tipo?: string;
    asesorId?: string;
    excludePendingManual?: boolean;
    excludeReservas?: boolean;
    excludeADespachar?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<Sale[]> {
    const conditions = [];
    if (filters?.canal) {
      conditions.push(eq(sales.canal, filters.canal));
    }
    if (filters?.estadoEntrega) {
      conditions.push(eq(sales.estadoEntrega, filters.estadoEntrega));
    }
    if (filters?.orden) {
      conditions.push(like(sales.orden, `%${filters.orden}%`));
    }
    if (filters?.startDate) {
      conditions.push(gte(sales.fecha, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(sales.fecha, filters.endDate));
    }
    if (filters?.tipo) {
      conditions.push(eq(sales.tipo, filters.tipo));
    }
    if (filters?.asesorId) {
      if (filters.asesorId === 'null') {
        // Filter for unassigned asesores (null values)
        conditions.push(isNull(sales.asesorId));
      } else {
        // Filter for specific asesor
        conditions.push(eq(sales.asesorId, filters.asesorId));
      }
    }
    if (filters?.excludePendingManual) {
      // Exclude sales with estadoEntrega "Pendiente" - this separates completed sales from pending manual sales
      // This ensures Lista de Ventas only shows sales that have completed payment verification
      conditions.push(
        ne(sales.estadoEntrega, "Pendiente")
      );
    }
    if (filters?.excludeReservas) {
      // Exclude orders with tipo "Reserva" from this view
      conditions.push(
        ne(sales.tipo, "Reserva")
      );
    }
    if (filters?.excludeADespachar) {
      // Exclude orders with estadoEntrega "A despachar" - for Reservas tab to only show pending reservas
      conditions.push(
        ne(sales.estadoEntrega, "A despachar")
      );
    }
    
    // Build the complete query in one go
    const queryBuilder = db.select().from(sales);
    const withConditions = conditions.length > 0 
      ? queryBuilder.where(and(...conditions))
      : queryBuilder;
    const withOrder = withConditions.orderBy(desc(sales.fecha));
    const withLimit = filters?.limit ? withOrder.limit(filters.limit) : withOrder;
    const finalQuery = filters?.offset ? withLimit.offset(filters.offset) : withLimit;
    
    const salesData = await finalQuery;

    // Production-ready SKU enrichment with exact matching only
    // Avoids collision-prone fuzzy matching issues - exact matches are reliable and fast
    // Priority: sales.sku (existing) > exact match > null
    
    // Fetch productos once per request for exact matching
    const allProductos = await db
      .select({ nombre: productos.nombre, sku: productos.sku })
      .from(productos)  
      .where(and(isNotNull(productos.sku), isNotNull(productos.nombre)));

    // Build exact match lookup for O(1) performance
    const skuMap = new Map<string, string>();
    for (const producto of allProductos) {
      if (producto.nombre && producto.sku) {
        // Normalize for case-insensitive exact matching
        const normalized = producto.nombre.toLowerCase().trim();
        skuMap.set(normalized, producto.sku);
      }
    }

    // Apply exact SKU matching - reliable and collision-free
    const salesWithSku = salesData.map((sale) => {
      // Priority 1: If sale already has SKU (manual/Shopify), keep it
      if (sale.sku) {
        return { ...sale, sku: sale.sku };
      }

      // Priority 2: Try exact match with productos
      if (sale.product) {
        const normalized = sale.product.toLowerCase().trim();
        const matchedSku = skuMap.get(normalized);
        if (matchedSku) {
          return { ...sale, sku: matchedSku };
        }
      }

      // Priority 3: No match - return null (fuzzy matching can be added later)
      return { ...sale, sku: null };
    });

    return salesWithSku;
  }

  async getSalesWithInstallments(filters?: {
    canal?: string;
    estadoEntrega?: string;
    orden?: string;
    startDate?: Date;
    endDate?: Date;
    tipo?: string;
    asesorId?: string;
    excludePendingManual?: boolean;
    excludeReservas?: boolean;
    excludeADespachar?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<Array<Sale & { installments: PaymentInstallment[] }>> {
    // First get the sales with the same filtering logic as getSales
    const salesData = await this.getSales(filters);
    
    // Then get installments for each sale
    const salesWithInstallments = await Promise.all(
      salesData.map(async (sale) => {
        const installments = await this.getInstallmentsBySale(sale.id);
        return { ...sale, installments };
      })
    );
    
    return salesWithInstallments;
  }

  async getOrdersForPayments(filters?: {
    limit?: number;
    offset?: number;
  }): Promise<{
    data: Array<{
      orden: string;
      nombre: string;
      fecha: Date;
      canal: string | null;
      tipo: string | null;
      estadoEntrega: string | null;
      totalOrderUsd: number | null;
      productCount: number;
      hasPagoInicial: boolean;
      hasFlete: boolean;
      installmentCount: number;
      pagoInicialUsd: number | null;
      pagoFleteUsd: number | null;
      ordenPlusFlete: number;
      totalCuotas: number;
      totalPagado: number;
      saldoPendiente: number;
    }>;
    total: number;
  }> {
    // Filter for orders with estadoEntrega "Pendiente" or "En proceso" and non-null order numbers
    const estadoCondition = and(
      or(
        eq(sales.estadoEntrega, "Pendiente"),
        eq(sales.estadoEntrega, "En proceso")
      ),
      isNotNull(sales.orden)
    );

    // Get grouped orders with aggregated data
    const ordersData = await db
      .select({
        orden: sales.orden,
        nombre: sql<string>`MAX(${sales.nombre})`.as('nombre'),
        fecha: sql<Date>`MAX(${sales.fecha})`.as('fecha'),
        canal: sql<string | null>`MAX(${sales.canal})`.as('canal'),
        tipo: sql<string | null>`MAX(${sales.tipo})`.as('tipo'),
        estadoEntrega: sql<string | null>`MAX(${sales.estadoEntrega})`.as('estadoEntrega'),
        totalOrderUsd: sql<number | null>`MAX(${sales.totalOrderUsd})`.as('totalOrderUsd'),
        productCount: sql<number>`COUNT(*)`.as('productCount'),
        hasPagoInicial: sql<boolean>`BOOL_OR(${sales.pagoInicialUsd} IS NOT NULL OR ${sales.fechaPagoInicial} IS NOT NULL)`.as('hasPagoInicial'),
        hasFlete: sql<boolean>`BOOL_OR(${sales.montoFleteUsd} IS NOT NULL OR ${sales.pagoFleteUsd} IS NOT NULL)`.as('hasFlete'),
        pagoInicialUsd: sql<number | null>`MAX(${sales.pagoInicialUsd})`.as('pagoInicialUsd'),
        pagoFleteUsd: sql<number | null>`MAX(${sales.pagoFleteUsd})`.as('pagoFleteUsd'),
      })
      .from(sales)
      .where(estadoCondition)
      .groupBy(sales.orden)
      .orderBy(desc(sql`MAX(${sales.fecha})`))
      .limit(filters?.limit || 20)
      .offset(filters?.offset || 0);

    // Get total count of unique orders with same filter
    const [{ totalCount }] = await db
      .select({
        totalCount: sql<number>`COUNT(DISTINCT ${sales.orden})`.as('totalCount'),
      })
      .from(sales)
      .where(estadoCondition);

    // Get installment counts and total cuotas for each order (only if we have orders)
    let installmentCountMap = new Map<string, number>();
    let totalCuotasMap = new Map<string, number>();
    
    if (ordersData.length > 0) {
      const installmentData = await db
        .select({
          orden: paymentInstallments.orden,
          count: sql<number>`COUNT(*)`.as('count'),
          totalCuotas: sql<number>`COALESCE(SUM(${paymentInstallments.pagoCuotaUsd}), 0)`.as('totalCuotas'),
        })
        .from(paymentInstallments)
        .where(sql`${paymentInstallments.orden} IN (${sql.join(ordersData.map(o => sql`${o.orden}`), sql`, `)})`)
        .groupBy(paymentInstallments.orden);

      installmentCountMap = new Map(
        installmentData
          .filter(ic => ic.orden !== null)
          .map(ic => [ic.orden!, Number(ic.count)])
      );
      
      totalCuotasMap = new Map(
        installmentData
          .filter(ic => ic.orden !== null)
          .map(ic => [ic.orden!, Number(ic.totalCuotas)])
      );
    }

    return {
      data: ordersData.map(order => {
        const pagoInicial = order.pagoInicialUsd || 0;
        const pagoFlete = order.pagoFleteUsd || 0;
        const ordenPlusFlete = (order.totalOrderUsd || 0) + pagoFlete;
        const totalCuotas = totalCuotasMap.get(order.orden!) || 0;
        const totalPagado = pagoInicial + totalCuotas;
        const saldoPendiente = (order.totalOrderUsd || 0) - totalPagado;
        
        return {
          orden: order.orden!, // Non-null assertion safe because we filter isNotNull(sales.orden)
          nombre: order.nombre,
          fecha: order.fecha,
          canal: order.canal,
          tipo: order.tipo,
          estadoEntrega: order.estadoEntrega,
          totalOrderUsd: order.totalOrderUsd,
          productCount: Number(order.productCount),
          hasPagoInicial: order.hasPagoInicial,
          hasFlete: order.hasFlete,
          installmentCount: installmentCountMap.get(order.orden!) || 0,
          pagoInicialUsd: order.pagoInicialUsd,
          pagoFleteUsd: order.pagoFleteUsd,
          ordenPlusFlete,
          totalCuotas,
          totalPagado,
          saldoPendiente,
        };
      }),
      total: Number(totalCount),
    };
  }

  async getSaleById(id: string): Promise<Sale | undefined> {
    const [sale] = await db.select().from(sales).where(eq(sales.id, id));
    return sale || undefined;
  }

  async getSalesByOrderNumber(orderNumber: string): Promise<Sale[]> {
    return await db
      .select()
      .from(sales)
      .where(eq(sales.orden, orderNumber))
      .orderBy(desc(sales.fecha));
  }

  async updateSalesByOrderNumber(orderNumber: string, updates: Partial<InsertSale>): Promise<Sale[]> {
    const updatedSales = await db
      .update(sales)
      .set(updates)
      .where(eq(sales.orden, orderNumber))
      .returning();
    return updatedSales;
  }

  async getCasheaOrders(limit: number = 50): Promise<Sale[]> {
    return await db
      .select()
      .from(sales)
      .where(eq(sales.canal, 'Cashea'))
      .orderBy(desc(sales.fecha))
      .limit(limit);
  }

  async getOrdersWithAddresses(limit: number = 20, offset: number = 0): Promise<{ data: Sale[]; total: number }> {
    // Get orders that are ready for dispatch:
    // Estado Entrega = A despachar AND (Flete Status = A Despacho OR fleteGratis = true)
    const dispatchCondition = and(
      eq(sales.estadoEntrega, 'A despachar'),
      or(
        eq(sales.statusFlete, 'A Despacho'),
        eq(sales.fleteGratis, true)
      )
    );

    const ordersForDispatch = await db
      .select()
      .from(sales)
      .where(dispatchCondition)
      .orderBy(desc(sales.fecha))
      .limit(limit)
      .offset(offset);

    // Get total count with same conditions
    const [{ totalCount }] = await db
      .select({ totalCount: count() })
      .from(sales)
      .where(dispatchCondition);

    return {
      data: ordersForDispatch,
      total: totalCount,
    };
  }

  async updateSaleDeliveryStatus(saleId: string, newStatus: string): Promise<Sale | undefined> {
    // Get the existing sale to check current freight status
    const existingSale = await this.getSaleById(saleId);
    if (!existingSale) {
      return undefined;
    }

    const updateData: any = {
      estadoEntrega: newStatus,
      updatedAt: new Date()
    };

    // If moving to A despachar and no freight info exists, initialize freight processing
    if (newStatus === 'A despachar' && !existingSale.montoFleteUsd && !existingSale.fleteGratis) {
      // Initialize freight as pending - this will make the order appear in Flete page
      updateData.montoFleteUsd = '0.01'; // Minimal amount to trigger freight processing
      updateData.statusFlete = 'Pendiente';
    }

    const [updatedSale] = await db
      .update(sales)
      .set(updateData)
      .where(eq(sales.id, saleId))
      .returning();

    return updatedSale || undefined;
  }

  async updateFleteStatus(saleId: string, newStatus: string): Promise<Sale | undefined> {
    const [updatedSale] = await db
      .update(sales)
      .set({ 
        statusFlete: newStatus,
        updatedAt: new Date()
      })
      .where(eq(sales.id, saleId))
      .returning();

    return updatedSale || undefined;
  }

  async updateSaleNotes(id: string, notas: string | null): Promise<Sale | undefined> {
    const [updatedSale] = await db
      .update(sales)
      .set({ notas, updatedAt: new Date() })
      .where(eq(sales.id, id))
      .returning();
    return updatedSale || undefined;
  }

  async updateSaleTipo(id: string, tipo: string): Promise<Sale | undefined> {
    const [updatedSale] = await db
      .update(sales)
      .set({ tipo, updatedAt: new Date() })
      .where(eq(sales.id, id))
      .returning();
    return updatedSale || undefined;
  }

  async updateSaleFechaEntrega(saleId: string, fechaEntrega: Date | null): Promise<Sale | undefined> {
    const [updatedSale] = await db
      .update(sales)
      .set({ 
        fechaEntrega,
        updatedAt: new Date()
      })
      .where(eq(sales.id, saleId))
      .returning();
    return updatedSale || undefined;
  }

  async getExistingOrderNumbers(orders: string[]): Promise<string[]> {
    if (orders.length === 0) return [];
    
    const placeholders = orders.map(() => '?').join(',');
    const existingOrders = await db
      .select({ orden: sales.orden })
      .from(sales)
      .where(
        and(
          isNotNull(sales.orden),
          sql`${sales.orden} IN (${sql.raw(orders.map(o => `'${o.replace(/'/g, "''")}'`).join(','))})`
        )
      );
    
    return existingOrders.map(row => row.orden).filter(Boolean) as string[];
  }

  async getOrdersByOrderNumber(orderNumber: string): Promise<{orden: string; product: string}[]> {
    if (!orderNumber) return [];
    
    const orders = await db
      .select({ 
        orden: sales.orden,
        product: sales.product 
      })
      .from(sales)
      .where(
        and(
          isNotNull(sales.orden),
          eq(sales.orden, orderNumber)
        )
      );
    
    return orders.filter(order => order.orden && order.product) as {orden: string; product: string}[];
  }

  async updateSaleAddresses(saleId: string, addresses: {
    direccionFacturacionPais?: string;
    direccionFacturacionEstado?: string;
    direccionFacturacionCiudad?: string;
    direccionFacturacionDireccion?: string;
    direccionFacturacionUrbanizacion?: string;
    direccionFacturacionReferencia?: string;
    direccionDespachoIgualFacturacion?: boolean;
    direccionDespachoPais?: string;
    direccionDespachoEstado?: string;
    direccionDespachoCiudad?: string;
    direccionDespachoDireccion?: string;
    direccionDespachoUrbanizacion?: string;
    direccionDespachoReferencia?: string;
  }): Promise<Sale | undefined> {
    const updateData: any = {};
    
    // Add all address fields to update data
    if (addresses.direccionFacturacionPais !== undefined) {
      updateData.direccionFacturacionPais = addresses.direccionFacturacionPais;
    }
    if (addresses.direccionFacturacionEstado !== undefined) {
      updateData.direccionFacturacionEstado = addresses.direccionFacturacionEstado;
    }
    if (addresses.direccionFacturacionCiudad !== undefined) {
      updateData.direccionFacturacionCiudad = addresses.direccionFacturacionCiudad;
    }
    if (addresses.direccionFacturacionDireccion !== undefined) {
      updateData.direccionFacturacionDireccion = addresses.direccionFacturacionDireccion;
    }
    if (addresses.direccionFacturacionUrbanizacion !== undefined) {
      updateData.direccionFacturacionUrbanizacion = addresses.direccionFacturacionUrbanizacion;
    }
    if (addresses.direccionFacturacionReferencia !== undefined) {
      updateData.direccionFacturacionReferencia = addresses.direccionFacturacionReferencia;
    }
    if (addresses.direccionDespachoIgualFacturacion !== undefined) {
      updateData.direccionDespachoIgualFacturacion = addresses.direccionDespachoIgualFacturacion ? "true" : "false";
    }
    if (addresses.direccionDespachoPais !== undefined) {
      updateData.direccionDespachoPais = addresses.direccionDespachoPais;
    }
    if (addresses.direccionDespachoEstado !== undefined) {
      updateData.direccionDespachoEstado = addresses.direccionDespachoEstado;
    }
    if (addresses.direccionDespachoCiudad !== undefined) {
      updateData.direccionDespachoCiudad = addresses.direccionDespachoCiudad;
    }
    if (addresses.direccionDespachoDireccion !== undefined) {
      updateData.direccionDespachoDireccion = addresses.direccionDespachoDireccion;
    }
    if (addresses.direccionDespachoUrbanizacion !== undefined) {
      updateData.direccionDespachoUrbanizacion = addresses.direccionDespachoUrbanizacion;
    }
    if (addresses.direccionDespachoReferencia !== undefined) {
      updateData.direccionDespachoReferencia = addresses.direccionDespachoReferencia;
    }

    // Add updated timestamp
    updateData.updatedAt = new Date();

    const [updatedSale] = await db
      .update(sales)
      .set(updateData)
      .where(eq(sales.id, saleId))
      .returning();

    return updatedSale || undefined;
  }

  async updateSaleFlete(saleId: string, flete: {
    montoFleteUsd?: string;
    fechaFlete?: string;
    pagoFleteUsd?: string;
    referenciaFlete?: string;
    montoFleteBs?: string;
    bancoReceptorFlete?: string;
    fleteGratis?: boolean;
  }): Promise<Sale | undefined> {
    const updateData: any = {};
    
    // Add all flete fields to update data
    if (flete.montoFleteUsd !== undefined) {
      updateData.montoFleteUsd = flete.montoFleteUsd === "" ? null : flete.montoFleteUsd;
    }
    if (flete.fechaFlete !== undefined) {
      const dateValue = flete.fechaFlete && flete.fechaFlete !== "" ? new Date(flete.fechaFlete) : null;
      updateData.fechaFlete = dateValue;
    }
    if (flete.pagoFleteUsd !== undefined) {
      updateData.pagoFleteUsd = flete.pagoFleteUsd === "" ? null : flete.pagoFleteUsd;
    }
    if (flete.referenciaFlete !== undefined) {
      updateData.referenciaFlete = flete.referenciaFlete === "" ? null : flete.referenciaFlete;
    }
    if (flete.montoFleteBs !== undefined) {
      updateData.montoFleteBs = flete.montoFleteBs === "" ? null : flete.montoFleteBs;
    }
    if (flete.bancoReceptorFlete !== undefined) {
      updateData.bancoReceptorFlete = flete.bancoReceptorFlete === "" ? null : flete.bancoReceptorFlete;
    }
    if (flete.fleteGratis !== undefined) {
      updateData.fleteGratis = flete.fleteGratis;
    }

    // Add updated timestamp
    updateData.updatedAt = new Date();

    const [updatedSale] = await db
      .update(sales)
      .set(updateData)
      .where(eq(sales.id, saleId))
      .returning();

    return updatedSale || undefined;
  }

  async updateOrderPagoInicial(orderNumber: string, pagoData: {
    fechaPagoInicial?: string | null;
    pagoInicialUsd?: number | null;
    bancoId?: string | null;
    referenciaInicial?: string | null;
    montoInicialBs?: number | null;
    montoInicialUsd?: number | null;
    estadoPagoInicial?: string;
  }): Promise<Sale[]> {
    const updateData: any = {};
    
    // Add all pago inicial fields to update data
    if (pagoData.fechaPagoInicial !== undefined) {
      const dateValue = pagoData.fechaPagoInicial && pagoData.fechaPagoInicial !== "" ? new Date(pagoData.fechaPagoInicial) : null;
      updateData.fechaPagoInicial = dateValue;
    }
    if (pagoData.pagoInicialUsd !== undefined) {
      updateData.pagoInicialUsd = pagoData.pagoInicialUsd;
    }
    if (pagoData.bancoId !== undefined) {
      updateData.bancoId = pagoData.bancoId === "" ? null : pagoData.bancoId;
    }
    if (pagoData.referenciaInicial !== undefined) {
      updateData.referenciaInicial = pagoData.referenciaInicial === "" ? null : pagoData.referenciaInicial;
    }
    if (pagoData.montoInicialBs !== undefined) {
      updateData.montoInicialBs = pagoData.montoInicialBs;
    }
    if (pagoData.montoInicialUsd !== undefined) {
      updateData.montoInicialUsd = pagoData.montoInicialUsd;
    }
    if (pagoData.estadoPagoInicial !== undefined) {
      updateData.estadoPagoInicial = pagoData.estadoPagoInicial;
    }

    // Add updated timestamp
    updateData.updatedAt = new Date();

    // Update all sales rows with this order number
    const updatedSales = await db
      .update(sales)
      .set(updateData)
      .where(eq(sales.orden, orderNumber))
      .returning();

    return updatedSales;
  }

  async getTotalSalesCount(filters?: {
    canal?: string;
    estadoEntrega?: string;
    orden?: string;
    startDate?: Date;
    endDate?: Date;
    tipo?: string;
    asesorId?: string;
    excludePendingManual?: boolean;
    excludeReservas?: boolean;
    excludeADespachar?: boolean;
  }): Promise<number> {
    const conditions = [];
    if (filters?.canal) {
      conditions.push(eq(sales.canal, filters.canal));
    }
    if (filters?.estadoEntrega) {
      conditions.push(eq(sales.estadoEntrega, filters.estadoEntrega));
    }
    if (filters?.orden) {
      conditions.push(like(sales.orden, `%${filters.orden}%`));
    }
    if (filters?.startDate) {
      conditions.push(gte(sales.fecha, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(sales.fecha, filters.endDate));
    }
    if (filters?.tipo) {
      conditions.push(eq(sales.tipo, filters.tipo));
    }
    if (filters?.asesorId) {
      if (filters.asesorId === 'null') {
        // Filter for unassigned asesores (null values)
        conditions.push(isNull(sales.asesorId));
      } else {
        // Filter for specific asesor
        conditions.push(eq(sales.asesorId, filters.asesorId));
      }
    }
    if (filters?.excludePendingManual) {
      // Exclude sales with estadoEntrega "Pendiente" - this separates completed sales from pending manual sales
      // This ensures Lista de Ventas only shows sales that have completed payment verification
      conditions.push(
        ne(sales.estadoEntrega, "Pendiente")
      );
    }
    if (filters?.excludeReservas) {
      // Exclude orders with tipo "Reserva" from this view
      conditions.push(
        ne(sales.tipo, "Reserva")
      );
    }
    if (filters?.excludeADespachar) {
      // Exclude orders with estadoEntrega "A despachar" - for Reservas tab to only show pending reservas
      conditions.push(
        ne(sales.estadoEntrega, "A despachar")
      );
    }
    
    // Build the complete query in one go
    const queryBuilder = db.select({ count: count() }).from(sales);
    const finalQuery = conditions.length > 0 
      ? queryBuilder.where(and(...conditions))
      : queryBuilder;
    
    const [result] = await finalQuery;
    return result.count;
  }

  async getSalesMetrics(): Promise<{
    totalOrderUsd: number;
    pagoInicialVerificado: number;
    totalCuotas: number;
    totalPagado: number;
    pendiente: number;
    salesByChannel: { canal: string; total: number; orders: number }[];
    salesByDeliveryStatus: { status: string; count: number }[];
  }> {
    // 1. Total Order USD - sum of totalOrderUsd field (excluding cancelled orders)
    const [totalOrderUsdResult] = await db
      .select({ total: sum(sales.totalOrderUsd) })
      .from(sales)
      .where(ne(sales.estadoEntrega, "Cancelada"));
    
    // 2. Pago Inicial Verificado - sum of pagoInicialUsd when estadoPagoInicial is verified
    // Consider verified when estadoPagoInicial is not null and not "pendiente"
    const [pagoInicialResult] = await db
      .select({ total: sum(sales.pagoInicialUsd) })
      .from(sales)
      .where(
        and(
          ne(sales.estadoEntrega, "Cancelada"),
          isNotNull(sales.estadoPagoInicial),
          ne(sales.estadoPagoInicial, "pendiente")
        )
      );
    
    // 3. Total Cuotas - sum of all verified pagoCuotaUsd from payment_installments
    const [totalCuotasResult] = await db
      .select({ total: sum(paymentInstallments.pagoCuotaUsd) })
      .from(paymentInstallments)
      .where(eq(paymentInstallments.verificado, true));
    
    // Count by delivery status
    const deliveryStatusCounts = await db
      .select({
        status: sales.estadoEntrega,
        count: count()
      })
      .from(sales)
      .groupBy(sales.estadoEntrega);
    
    // Sales by channel (excluding cancelled orders)
    const channelStats = await db
      .select({
        canal: sales.canal,
        total: sum(sales.totalUsd),
        orders: count()
      })
      .from(sales)
      .where(ne(sales.estadoEntrega, "Cancelada"))
      .groupBy(sales.canal);
    
    // Calculate derived metrics
    const totalOrderUsd = Number(totalOrderUsdResult.total) || 0;
    const pagoInicialVerificado = Number(pagoInicialResult.total) || 0;
    const totalCuotas = Number(totalCuotasResult.total) || 0;
    const totalPagado = pagoInicialVerificado + totalCuotas;
    const pendiente = totalOrderUsd - totalPagado;
    
    return {
      totalOrderUsd,
      pagoInicialVerificado,
      totalCuotas,
      totalPagado,
      pendiente,
      salesByChannel: channelStats.map(s => ({
        canal: s.canal,
        total: Number(s.total) || 0,
        orders: s.orders
      })),
      salesByDeliveryStatus: deliveryStatusCounts.map(s => ({
        status: s.status,
        count: s.count
      }))
    };
  }

  async createUploadHistory(uploadData: InsertUploadHistory): Promise<UploadHistory> {
    const [upload] = await db
      .insert(uploadHistory)
      .values(uploadData)
      .returning();
    return upload;
  }

  async getRecentUploads(limit = 10): Promise<UploadHistory[]> {
    return await db
      .select()
      .from(uploadHistory)
      .orderBy(desc(uploadHistory.uploadedAt))
      .limit(limit);
  }

  // Admin configuration methods implementation

  // Bancos methods
  async getBancos(): Promise<Banco[]> {
    return await db.select().from(bancos).orderBy(bancos.banco);
  }

  async createBanco(banco: InsertBanco): Promise<Banco> {
    const [newBanco] = await db.insert(bancos).values({
      ...banco,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return newBanco;
  }

  async updateBanco(id: string, banco: Partial<InsertBanco>): Promise<Banco | undefined> {
    const [updated] = await db
      .update(bancos)
      .set({ ...banco, updatedAt: new Date() })
      .where(eq(bancos.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteBanco(id: string): Promise<boolean> {
    const result = await db.delete(bancos).where(eq(bancos.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Tipos de Egresos methods
  async getTiposEgresos(): Promise<TipoEgreso[]> {
    return await db.select().from(tiposEgresos).orderBy(tiposEgresos.nombre);
  }

  async createTipoEgreso(tipo: InsertTipoEgreso): Promise<TipoEgreso> {
    const [newTipo] = await db.insert(tiposEgresos).values({
      ...tipo,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return newTipo;
  }

  async updateTipoEgreso(id: string, tipo: Partial<InsertTipoEgreso>): Promise<TipoEgreso | undefined> {
    const [updated] = await db
      .update(tiposEgresos)
      .set({ ...tipo, updatedAt: new Date() })
      .where(eq(tiposEgresos.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteTipoEgreso(id: string): Promise<boolean> {
    const result = await db.delete(tiposEgresos).where(eq(tiposEgresos.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Productos methods
  async getProductos(): Promise<Producto[]> {
    return await db.select().from(productos).orderBy(productos.categoria, productos.nombre);
  }

  async createProducto(producto: InsertProducto): Promise<Producto> {
    const [newProducto] = await db.insert(productos).values({
      ...producto,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return newProducto;
  }

  async updateProducto(id: string, producto: Partial<InsertProducto>): Promise<Producto | undefined> {
    const [updated] = await db
      .update(productos)
      .set({ ...producto, updatedAt: new Date() })
      .where(eq(productos.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteProducto(id: string): Promise<boolean> {
    const result = await db.delete(productos).where(eq(productos.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Métodos de Pago methods
  async getMetodosPago(): Promise<MetodoPago[]> {
    return await db.select().from(metodosPago).orderBy(metodosPago.nombre);
  }

  async createMetodoPago(metodo: InsertMetodoPago): Promise<MetodoPago> {
    const [newMetodo] = await db.insert(metodosPago).values({
      ...metodo,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return newMetodo;
  }

  async updateMetodoPago(id: string, metodo: Partial<InsertMetodoPago>): Promise<MetodoPago | undefined> {
    const [updated] = await db
      .update(metodosPago)
      .set({ ...metodo, updatedAt: new Date() })
      .where(eq(metodosPago.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteMetodoPago(id: string): Promise<boolean> {
    const result = await db.delete(metodosPago).where(eq(metodosPago.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Monedas methods
  async getMonedas(): Promise<Moneda[]> {
    return await db.select().from(monedas).orderBy(monedas.codigo);
  }

  async createMoneda(moneda: InsertMoneda): Promise<Moneda> {
    const [newMoneda] = await db.insert(monedas).values({
      ...moneda,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return newMoneda;
  }

  async updateMoneda(id: string, moneda: Partial<InsertMoneda>): Promise<Moneda | undefined> {
    const [updated] = await db
      .update(monedas)
      .set({ ...moneda, updatedAt: new Date() })
      .where(eq(monedas.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteMoneda(id: string): Promise<boolean> {
    const result = await db.delete(monedas).where(eq(monedas.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Categorías methods
  async getCategorias(): Promise<Categoria[]> {
    return await db.select().from(categorias).orderBy(categorias.nombre);
  }

  async createCategoria(categoria: InsertCategoria): Promise<Categoria> {
    const [newCategoria] = await db.insert(categorias).values({
      ...categoria,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return newCategoria;
  }

  async updateCategoria(id: string, categoria: Partial<InsertCategoria>): Promise<Categoria | undefined> {
    const [updated] = await db
      .update(categorias)
      .set({ ...categoria, updatedAt: new Date() })
      .where(eq(categorias.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteCategoria(id: string): Promise<boolean> {
    const result = await db.delete(categorias).where(eq(categorias.id, id));
    return (result.rowCount ?? 0) > 0;
  }
  
  // Canales methods implementation
  async getCanales(): Promise<Canal[]> {
    return await db.select().from(canales).orderBy(canales.nombre);
  }

  async createCanal(canal: InsertCanal): Promise<Canal> {
    const [newCanal] = await db.insert(canales).values({
      ...canal,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return newCanal;
  }

  async updateCanal(id: string, canal: Partial<InsertCanal>): Promise<Canal | undefined> {
    const [updated] = await db
      .update(canales)
      .set({ ...canal, updatedAt: new Date() })
      .where(eq(canales.id, id))
      .returning();
    return updated;
  }

  async deleteCanal(id: string): Promise<boolean> {
    const result = await db.delete(canales).where(eq(canales.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Asesores methods implementation
  async getAsesores(): Promise<Asesor[]> {
    return await db.select().from(asesores).orderBy(asesores.nombre);
  }

  async getAsesorById(id: string): Promise<Asesor | undefined> {
    const [asesor] = await db.select().from(asesores).where(eq(asesores.id, id));
    return asesor;
  }

  async createAsesor(asesor: InsertAsesor): Promise<Asesor> {
    const [newAsesor] = await db.insert(asesores).values({
      ...asesor,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return newAsesor;
  }

  async updateAsesor(id: string, asesor: Partial<InsertAsesor>): Promise<Asesor | undefined> {
    const [updated] = await db
      .update(asesores)
      .set({ ...asesor, updatedAt: new Date() })
      .where(eq(asesores.id, id))
      .returning();
    return updated;
  }

  async deleteAsesor(id: string): Promise<boolean> {
    const result = await db.delete(asesores).where(eq(asesores.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Egresos methods
  async getEgresos(filters?: {
    tipoEgresoId?: string;
    metodoPagoId?: string;
    bancoId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<Egreso[]> {
    const conditions = [];
    if (filters?.tipoEgresoId) {
      conditions.push(eq(egresos.tipoEgresoId, filters.tipoEgresoId));
    }
    if (filters?.metodoPagoId) {
      conditions.push(eq(egresos.metodoPagoId, filters.metodoPagoId));
    }
    if (filters?.bancoId) {
      conditions.push(eq(egresos.bancoId, filters.bancoId));
    }
    if (filters?.startDate) {
      conditions.push(gte(egresos.fecha, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(egresos.fecha, filters.endDate));
    }
    
    // Build the complete query in one go
    const queryBuilder = db.select().from(egresos);
    const withConditions = conditions.length > 0 
      ? queryBuilder.where(and(...conditions))
      : queryBuilder;
    const withOrder = withConditions.orderBy(desc(egresos.fecha));
    const withLimit = filters?.limit ? withOrder.limit(filters.limit) : withOrder;
    const finalQuery = filters?.offset ? withLimit.offset(filters.offset) : withLimit;
    
    return await finalQuery;
  }

  async createEgreso(egreso: InsertEgreso): Promise<Egreso> {
    const [newEgreso] = await db
      .insert(egresos)
      .values(egreso)
      .returning();
    return newEgreso;
  }

  async createEgresos(egresosData: InsertEgreso[]): Promise<Egreso[]> {
    const newEgresos = await db
      .insert(egresos)
      .values(egresosData)
      .returning();
    return newEgresos;
  }

  async updateEgreso(id: string, egreso: Partial<InsertEgreso>): Promise<Egreso | undefined> {
    const [updatedEgreso] = await db
      .update(egresos)
      .set({
        ...egreso,
        updatedAt: new Date(),
      })
      .where(eq(egresos.id, id))
      .returning();
    return updatedEgreso || undefined;
  }

  async deleteEgreso(id: string): Promise<boolean> {
    try {
      await db.delete(egresos).where(eq(egresos.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting egreso:", error);
      return false;
    }
  }

  async getEgresoById(id: string): Promise<Egreso | undefined> {
    const [egreso] = await db.select().from(egresos).where(eq(egresos.id, id));
    return egreso || undefined;
  }

  async getTotalEgresosCount(filters?: {
    tipoEgresoId?: string;
    metodoPagoId?: string;
    bancoId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<number> {
    const conditions = [];
    if (filters?.tipoEgresoId) {
      conditions.push(eq(egresos.tipoEgresoId, filters.tipoEgresoId));
    }
    if (filters?.metodoPagoId) {
      conditions.push(eq(egresos.metodoPagoId, filters.metodoPagoId));
    }
    if (filters?.bancoId) {
      conditions.push(eq(egresos.bancoId, filters.bancoId));
    }
    if (filters?.startDate) {
      conditions.push(gte(egresos.fecha, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(egresos.fecha, filters.endDate));
    }
    
    // Build the complete query in one go
    const queryBuilder = db.select({ count: count() }).from(egresos);
    const finalQuery = conditions.length > 0 
      ? queryBuilder.where(and(...conditions))
      : queryBuilder;
    
    const [{ count: totalCount }] = await finalQuery;
    return totalCount;
  }

  // Egresos Por Aprobar methods
  async getEgresosPorAprobar(filters?: {
    tipoEgresoId?: string;
    metodoPagoId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<EgresoPorAprobar[]> {
    const conditions = [];
    if (filters?.tipoEgresoId) {
      conditions.push(eq(egresosPorAprobar.tipoEgresoId, filters.tipoEgresoId));
    }
    if (filters?.metodoPagoId) {
      conditions.push(eq(egresosPorAprobar.metodoPagoId, filters.metodoPagoId));
    }
    if (filters?.startDate) {
      conditions.push(gte(egresosPorAprobar.fecha, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(egresosPorAprobar.fecha, filters.endDate));
    }
    
    // Build the complete query in one go
    const queryBuilder = db.select().from(egresosPorAprobar);
    const withConditions = conditions.length > 0 
      ? queryBuilder.where(and(...conditions))
      : queryBuilder;
    const withOrder = withConditions.orderBy(desc(egresosPorAprobar.fecha));
    const withLimit = filters?.limit ? withOrder.limit(filters.limit) : withOrder;
    const finalQuery = filters?.offset ? withLimit.offset(filters.offset) : withLimit;
    
    return await finalQuery;
  }

  async createEgresoPorAprobar(egreso: InsertEgresoPorAprobar): Promise<EgresoPorAprobar> {
    const [newEgreso] = await db
      .insert(egresosPorAprobar)
      .values(egreso)
      .returning();
    return newEgreso;
  }

  async updateEgresoPorAprobar(id: string, egreso: Partial<InsertEgresoPorAprobar>): Promise<EgresoPorAprobar | undefined> {
    const [updatedEgreso] = await db
      .update(egresosPorAprobar)
      .set({
        ...egreso,
        updatedAt: new Date(),
      })
      .where(eq(egresosPorAprobar.id, id))
      .returning();
    return updatedEgreso || undefined;
  }

  async deleteEgresoPorAprobar(id: string): Promise<boolean> {
    try {
      await db.delete(egresosPorAprobar).where(eq(egresosPorAprobar.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting egreso por aprobar:", error);
      return false;
    }
  }

  async getEgresoPorAprobarById(id: string): Promise<EgresoPorAprobar | undefined> {
    const [egreso] = await db.select().from(egresosPorAprobar).where(eq(egresosPorAprobar.id, id));
    return egreso || undefined;
  }

  async getTotalEgresosPorAprobarCount(filters?: {
    tipoEgresoId?: string;
    metodoPagoId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<number> {
    const conditions = [];
    if (filters?.tipoEgresoId) {
      conditions.push(eq(egresosPorAprobar.tipoEgresoId, filters.tipoEgresoId));
    }
    if (filters?.metodoPagoId) {
      conditions.push(eq(egresosPorAprobar.metodoPagoId, filters.metodoPagoId));
    }
    if (filters?.startDate) {
      conditions.push(gte(egresosPorAprobar.fecha, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(egresosPorAprobar.fecha, filters.endDate));
    }
    
    // Build the complete query in one go
    const queryBuilder = db.select({ count: count() }).from(egresosPorAprobar);
    const finalQuery = conditions.length > 0 
      ? queryBuilder.where(and(...conditions))
      : queryBuilder;
    
    const [{ count: totalCount }] = await finalQuery;
    return totalCount;
  }

  async aprobarEgreso(id: string, egresoData: {
    monedaId: string;
    bancoId: string;
    referencia?: string;
    observaciones?: string;
  }): Promise<Egreso> {
    // Get the egreso por aprobar first
    const egresoPorAprobar = await this.getEgresoPorAprobarById(id);
    if (!egresoPorAprobar) {
      throw new Error('Egreso por aprobar no encontrado');
    }

    // Create the egreso in the main table with additional data
    const [newEgreso] = await db
      .insert(egresos)
      .values({
        fecha: egresoPorAprobar.fecha,
        descripcion: egresoPorAprobar.descripcion,
        monto: egresoPorAprobar.monto,
        monedaId: egresoData.monedaId,
        tipoEgresoId: egresoPorAprobar.tipoEgresoId,
        metodoPagoId: egresoPorAprobar.metodoPagoId,
        bancoId: egresoData.bancoId,
        referencia: egresoData.referencia || '',
        estado: 'registrado',
        observaciones: egresoPorAprobar.descripcion || '',
        pendienteInfo: true, // Mark as pending complete payment info (orange color)
      })
      .returning();

    // Delete from egresos por aprobar
    await this.deleteEgresoPorAprobar(id);

    return newEgreso;
  }

  async completarInfoPagoEgreso(id: string, updates: {
    bancoId?: string;
    referencia?: string;
    observaciones?: string;
  }): Promise<Egreso | undefined> {
    // Get current egreso to preserve existing observaciones
    const [currentEgreso] = await db
      .select()
      .from(egresos)
      .where(eq(egresos.id, id))
      .limit(1);

    if (!currentEgreso) {
      throw new Error('Egreso not found');
    }

    const [updatedEgreso] = await db
      .update(egresos)
      .set({
        bancoId: updates.bancoId,
        referencia: updates.referencia,
        observaciones: updates.observaciones || currentEgreso.observaciones, // Preserve original if no new value
        estado: 'aprobado', // Now fully approved with complete payment info
        pendienteInfo: false, // Remove pending flag
        updatedAt: new Date(),
      })
      .where(eq(egresos.id, id))
      .returning();

    return updatedEgreso || undefined;
  }

  // Update existing Cashea orders from TO DELIVER to PROCESSING
  async updateCasheaOrdersToProcessing(): Promise<number> {
    const result = await db
      .update(sales)
      .set({
        estadoEntrega: 'En proceso',
        updatedAt: new Date(),
      })
      .where(
        and(
          or(
            eq(sales.canal, 'Cashea'),
            eq(sales.canal, 'cashea')
          ),
          eq(sales.estadoEntrega, 'A despachar')
        )
      )
      .returning();
    
    return result.length;
  }

  // Payment Installments
  async getInstallmentsBySale(saleId: string): Promise<PaymentInstallment[]> {
    const installments = await db
      .select()
      .from(paymentInstallments)
      .where(eq(paymentInstallments.saleId, saleId))
      .orderBy(paymentInstallments.installmentNumber);
    return installments;
  }

  async getInstallmentById(id: string): Promise<PaymentInstallment | undefined> {
    const [installment] = await db
      .select()
      .from(paymentInstallments)
      .where(eq(paymentInstallments.id, id))
      .limit(1);
    return installment || undefined;
  }

  async createInstallment(saleId: string, data: Partial<InsertPaymentInstallment>): Promise<PaymentInstallment> {
    // Get the next installment number
    const existingInstallments = await this.getInstallmentsBySale(saleId);
    const nextInstallmentNumber = Math.max(0, ...existingInstallments.map(i => i.installmentNumber)) + 1;

    // Get sale info for orden field
    const sale = await this.getSaleById(saleId);
    
    const [newInstallment] = await db
      .insert(paymentInstallments)
      .values({
        saleId,
        orden: sale?.orden || null,
        installmentNumber: nextInstallmentNumber,
        ...data,
      })
      .returning();

    // Recompute balances after creating
    await this.recomputeInstallmentSequenceAndBalances(saleId);
    
    return newInstallment;
  }

  async updateInstallment(id: string, data: Partial<InsertPaymentInstallment>): Promise<PaymentInstallment | undefined> {
    const [updatedInstallment] = await db
      .update(paymentInstallments)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(paymentInstallments.id, id))
      .returning();

    if (updatedInstallment) {
      // Recompute balances after updating
      await this.recomputeInstallmentSequenceAndBalances(updatedInstallment.saleId);
    }
    
    return updatedInstallment || undefined;
  }

  async deleteInstallment(id: string): Promise<boolean> {
    const [installment] = await db
      .select()
      .from(paymentInstallments)
      .where(eq(paymentInstallments.id, id))
      .limit(1);

    if (!installment) {
      return false;
    }

    const result = await db.delete(paymentInstallments).where(eq(paymentInstallments.id, id));
    const deleted = (result.rowCount ?? 0) > 0;

    if (deleted) {
      // Recompute balances after deleting
      await this.recomputeInstallmentSequenceAndBalances(installment.saleId);
    }
    
    return deleted;
  }

  async recomputeInstallmentSequenceAndBalances(saleId: string): Promise<void> {
    // Get sale and installments
    const sale = await this.getSaleById(saleId);
    if (!sale) return;

    const installments = await this.getInstallmentsBySale(saleId);
    
    // Sort installments by installment number and recompute balances
    const sortedInstallments = installments.sort((a, b) => a.installmentNumber - b.installmentNumber);
    
    const totalUsd = parseFloat(sale.totalUsd);
    const pagoInicialUsd = parseFloat(sale.pagoInicialUsd || '0');
    let runningBalance = totalUsd - pagoInicialUsd;

    // Track total verified payments for validation
    let totalVerifiedPayments = 0;

    for (const installment of sortedInstallments) {
      const cuotaAmount = parseFloat(installment.cuotaAmount || '0');
      
      // Only reduce balance if installment is verified
      if (installment.verificado) {
        runningBalance -= cuotaAmount;
        totalVerifiedPayments += cuotaAmount;
      }
      
      // Safeguard: Warn if balance goes negative (indicates overpayment)
      if (runningBalance < -0.01) { // Allow for small floating point errors
        console.warn(`Balance calculation warning for sale ${saleId}: Running balance is ${runningBalance.toFixed(2)} after installment ${installment.installmentNumber}. This indicates overpayment.`);
      }
      
      // Update the saldo remaining with proper rounding to avoid floating point issues
      await db
        .update(paymentInstallments)
        .set({ 
          saldoRemaining: Math.max(0, runningBalance).toFixed(2), // Prevent negative balance display
          updatedAt: new Date() 
        })
        .where(eq(paymentInstallments.id, installment.id));
    }

    // Final validation: Check if total payments exceed sale amount
    const finalTotalPaid = pagoInicialUsd + totalVerifiedPayments;
    if (finalTotalPaid > totalUsd + 0.01) { // Allow for small floating point errors
      console.error(`Overpayment detected for sale ${saleId}: Total paid ${finalTotalPaid.toFixed(2)} exceeds sale total ${totalUsd.toFixed(2)} by ${(finalTotalPaid - totalUsd).toFixed(2)}`);
    }
  }

  async getInstallmentSummary(saleId: string): Promise<{
    totalOrderUsd: number;
    pagoInicialUsd: number;
    totalCuotas: number;
    totalPagado: number;
    saldoPendiente: number;
  }> {
    const sale = await this.getSaleById(saleId);
    if (!sale) {
      return {
        totalOrderUsd: 0,
        pagoInicialUsd: 0,
        totalCuotas: 0,
        totalPagado: 0,
        saldoPendiente: 0,
      };
    }

    const installments = await this.getInstallmentsBySale(saleId);
    const verifiedInstallments = installments.filter(i => i.verificado);
    
    const totalOrderUsd = parseFloat(sale.totalOrderUsd || '0');
    const pagoInicialUsd = parseFloat(sale.pagoInicialUsd || '0');
    const totalCuotas = installments.length;
    
    // Calculate total paid with proper rounding to avoid floating point issues
    const verifiedInstallmentsTotal = verifiedInstallments.reduce((sum, i) => {
      return sum + parseFloat(i.cuotaAmount || '0');
    }, 0);
    
    const totalPagado = pagoInicialUsd + verifiedInstallmentsTotal;
    const saldoPendiente = Math.max(0, totalOrderUsd - totalPagado); // Prevent negative balance display

    // Validation: Log warning if overpayment detected
    if (totalPagado > totalOrderUsd + 0.01) { // Allow for small floating point errors
      console.warn(`Overpayment detected in installment summary for sale ${saleId}: Total paid ${totalPagado.toFixed(2)} exceeds sale total ${totalOrderUsd.toFixed(2)}`);
    }

    return {
      totalOrderUsd: Math.round(totalOrderUsd * 100) / 100, // Round to 2 decimal places
      pagoInicialUsd: Math.round(pagoInicialUsd * 100) / 100,
      totalCuotas,
      totalPagado: Math.round(totalPagado * 100) / 100,
      saldoPendiente: Math.round(saldoPendiente * 100) / 100,
    };
  }

  async isPaymentFullyVerified(saleId: string): Promise<boolean> {
    const summary = await this.getInstallmentSummary(saleId);
    // Consider a payment fully verified if the remaining balance is $5 or less
    // This allows for business flexibility in completing orders
    return summary.saldoPendiente <= 5.00;
  }

  async getVerificationPayments(filters?: {
    startDate?: string;
    endDate?: string;
    bancoId?: string;
    orden?: string;
    tipoPago?: string;
  }): Promise<any[]> {
    const payments: any[] = [];

    // Build the base query with filters
    let salesQuery = db
      .select({
        orden: sales.orden,
        saleId: sales.id,
        pagoInicialUsd: sales.pagoInicialUsd,
        fechaPagoInicial: sales.fechaPagoInicial,
        bancoId: sales.bancoId,
        referenciaInicial: sales.referenciaInicial,
        montoInicialBs: sales.montoInicialBs,
        montoInicialUsd: sales.montoInicialUsd,
        estadoVerificacionInicial: sales.estadoVerificacionInicial,
        notasVerificacionInicial: sales.notasVerificacionInicial,
        pagoFleteUsd: sales.pagoFleteUsd,
        fechaFlete: sales.fechaFlete,
        bancoReceptorFlete: sales.bancoReceptorFlete,
        referenciaFlete: sales.referenciaFlete,
        montoFleteBs: sales.montoFleteBs,
        estadoVerificacionFlete: sales.estadoVerificacionFlete,
        notasVerificacionFlete: sales.notasVerificacionFlete,
        estadoEntrega: sales.estadoEntrega,
      })
      .from(sales)
      .where(and(
        or(
          eq(sales.estadoEntrega, 'Pendiente'),
          eq(sales.estadoEntrega, 'En proceso')
        ),
        filters?.orden ? eq(sales.orden, filters.orden) : undefined
      ));

    const salesData = await salesQuery;

    // Process Pago Inicial payments
    for (const sale of salesData) {
      if (sale.pagoInicialUsd && parseFloat(sale.pagoInicialUsd) > 0) {
        // Apply filters
        if (filters?.tipoPago && filters.tipoPago !== 'Inicial/Total') continue;
        if (filters?.startDate && sale.fechaPagoInicial && sale.fechaPagoInicial < new Date(filters.startDate)) continue;
        if (filters?.endDate && sale.fechaPagoInicial && sale.fechaPagoInicial > new Date(filters.endDate)) continue;
        if (filters?.bancoId && sale.bancoId !== filters.bancoId) continue;

        payments.push({
          paymentId: sale.saleId,
          paymentType: 'Inicial/Total',
          orden: sale.orden,
          tipoPago: 'Inicial/Total',
          montoBs: sale.montoInicialBs ? parseFloat(sale.montoInicialBs) : null,
          montoUsd: sale.montoInicialUsd ? parseFloat(sale.montoInicialUsd) : null,
          referencia: sale.referenciaInicial,
          bancoId: sale.bancoId,
          estadoVerificacion: sale.estadoVerificacionInicial || 'Por verificar',
          notasVerificacion: sale.notasVerificacionInicial,
          fecha: sale.fechaPagoInicial,
        });
      }

      // Process Flete payments
      if (sale.pagoFleteUsd && parseFloat(sale.pagoFleteUsd) > 0) {
        // Apply filters
        if (filters?.tipoPago && filters.tipoPago !== 'Flete') continue;
        if (filters?.startDate && sale.fechaFlete && sale.fechaFlete < new Date(filters.startDate)) continue;
        if (filters?.endDate && sale.fechaFlete && sale.fechaFlete > new Date(filters.endDate)) continue;
        if (filters?.bancoId && sale.bancoReceptorFlete !== filters.bancoId) continue;

        payments.push({
          paymentId: sale.saleId,
          paymentType: 'Flete',
          orden: sale.orden,
          tipoPago: 'Flete',
          montoBs: sale.montoFleteBs ? parseFloat(sale.montoFleteBs) : null,
          montoUsd: null, // Flete doesn't have a separate USD monto field
          referencia: sale.referenciaFlete,
          bancoId: sale.bancoReceptorFlete,
          estadoVerificacion: sale.estadoVerificacionFlete || 'Por verificar',
          notasVerificacion: sale.notasVerificacionFlete,
          fecha: sale.fechaFlete,
        });
      }
    }

    // Process Cuota payments
    let cuotasQuery = db
      .select({
        installmentId: paymentInstallments.id,
        saleId: paymentInstallments.saleId,
        orden: paymentInstallments.orden,
        installmentNumber: paymentInstallments.installmentNumber,
        fecha: paymentInstallments.fecha,
        cuotaAmountBs: paymentInstallments.cuotaAmountBs,
        pagoCuotaUsd: paymentInstallments.pagoCuotaUsd,
        referencia: paymentInstallments.referencia,
        bancoId: paymentInstallments.bancoId,
        estadoVerificacion: paymentInstallments.estadoVerificacion,
        notasVerificacion: paymentInstallments.notasVerificacion,
      })
      .from(paymentInstallments)
      .where(
        filters?.orden ? eq(paymentInstallments.orden, filters.orden) : undefined
      );

    const cuotasData = await cuotasQuery;

    for (const cuota of cuotasData) {
      // Apply filters
      if (filters?.tipoPago && filters.tipoPago !== 'Cuota') continue;
      if (filters?.startDate && cuota.fecha && cuota.fecha < new Date(filters.startDate)) continue;
      if (filters?.endDate && cuota.fecha && cuota.fecha > new Date(filters.endDate)) continue;
      if (filters?.bancoId && cuota.bancoId !== filters.bancoId) continue;

      payments.push({
        paymentId: cuota.installmentId,
        paymentType: 'Cuota',
        orden: cuota.orden,
        tipoPago: `Cuota ${cuota.installmentNumber}`,
        montoBs: cuota.cuotaAmountBs ? parseFloat(cuota.cuotaAmountBs) : null,
        montoUsd: cuota.pagoCuotaUsd ? parseFloat(cuota.pagoCuotaUsd) : null,
        referencia: cuota.referencia,
        bancoId: cuota.bancoId,
        estadoVerificacion: cuota.estadoVerificacion || 'Por verificar',
        notasVerificacion: cuota.notasVerificacion,
        fecha: cuota.fecha,
      });
    }

    // Sort by date (most recent first)
    return payments.sort((a, b) => {
      if (!a.fecha) return 1;
      if (!b.fecha) return -1;
      return new Date(b.fecha).getTime() - new Date(a.fecha).getTime();
    });
  }

  async updatePaymentVerification(data: {
    paymentId: string;
    paymentType: string;
    estadoVerificacion?: string;
    notasVerificacion?: string;
  }): Promise<any> {
    const { paymentId, paymentType, estadoVerificacion, notasVerificacion } = data;

    if (paymentType === 'Inicial/Total') {
      const [updated] = await db
        .update(sales)
        .set({
          estadoVerificacionInicial: estadoVerificacion,
          notasVerificacionInicial: notasVerificacion,
          updatedAt: new Date(),
        })
        .where(eq(sales.id, paymentId))
        .returning();
      return updated;
    } else if (paymentType === 'Flete') {
      const [updated] = await db
        .update(sales)
        .set({
          estadoVerificacionFlete: estadoVerificacion,
          notasVerificacionFlete: notasVerificacion,
          updatedAt: new Date(),
        })
        .where(eq(sales.id, paymentId))
        .returning();
      return updated;
    } else if (paymentType === 'Cuota') {
      const [updated] = await db
        .update(paymentInstallments)
        .set({
          estadoVerificacion: estadoVerificacion,
          notasVerificacion: notasVerificacion,
          updatedAt: new Date(),
        })
        .where(eq(paymentInstallments.id, paymentId))
        .returning();
      return updated;
    }

    return null;
  }
}

export const storage = new DatabaseStorage();
