import { 
  sales, uploadHistory, users, bancos, tiposEgresos, productos, metodosPago, monedas, categorias, canales, egresos, egresosPorAprobar,
  type User, type InsertUser, type Sale, type InsertSale, type UploadHistory, type InsertUploadHistory,
  type Banco, type InsertBanco, type TipoEgreso, type InsertTipoEgreso,
  type Producto, type InsertProducto, type MetodoPago, type InsertMetodoPago,
  type Moneda, type InsertMoneda, type Categoria, type InsertCategoria,
  type Canal, type InsertCanal, type Egreso, type InsertEgreso,
  type EgresoPorAprobar, type InsertEgresoPorAprobar
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, count, sum, avg, and, gte, lte, or, ne, like, ilike, isNotNull } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Sales methods
  createSale(sale: InsertSale): Promise<Sale>;
  createSales(salesData: InsertSale[]): Promise<Sale[]>;
  updateSale(id: string, sale: Partial<InsertSale>): Promise<Sale | undefined>;
  getSales(filters?: {
    canal?: string;
    estadoEntrega?: string;
    estado?: string;
    orden?: string;
    startDate?: Date;
    endDate?: Date;
    excludePendingManual?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<Sale[]>;
  getSaleById(id: string): Promise<Sale | undefined>;
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
  getTotalSalesCount(filters?: {
    canal?: string;
    estadoEntrega?: string;
    estado?: string;
    startDate?: Date;
    endDate?: Date;
    excludePendingManual?: boolean;
  }): Promise<number>;
  
  // Analytics methods
  getSalesMetrics(): Promise<{
    totalSales: number;
    completedOrders: number;
    pendingOrders: number;
    activeReservations: number;
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

  async getSales(filters?: {
    canal?: string;
    estadoEntrega?: string;
    estado?: string;
    orden?: string;
    startDate?: Date;
    endDate?: Date;
    excludePendingManual?: boolean;
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
    if (filters?.estado) {
      conditions.push(eq(sales.estado, filters.estado));
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
    if (filters?.excludePendingManual) {
      // Exclude only manual sales that are still pending (estado = "pendiente")
      // Include all other sales (cashea, Shopify, Treble) and manual sales that are active
      conditions.push(
        or(
          // Include all non-manual sales regardless of status (using lowercase for cashea)
          eq(sales.canal, "cashea"),
          eq(sales.canal, "Cashea"),
          eq(sales.canal, "Shopify"), 
          eq(sales.canal, "Treble"),
          // Include manual sales only if they are active (payment verified)
          and(eq(sales.canal, "manual"), eq(sales.estado, "activo"))
        )
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
    
    return await finalQuery;
  }

  async getSaleById(id: string): Promise<Sale | undefined> {
    const [sale] = await db.select().from(sales).where(eq(sales.id, id));
    return sale || undefined;
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
    // Get orders that are ready for delivery (A Despachar status)
    // AND have freight status "A Despacho" (ready for dispatch)
    const ordersForDispatch = await db
      .select()
      .from(sales)
      .where(
        and(
          eq(sales.estadoEntrega, 'A Despachar'), // Must be A Despachar status
          eq(sales.statusFlete, 'A Despacho') // Must have flete status "A Despacho"
        )
      )
      .orderBy(desc(sales.fecha))
      .limit(limit)
      .offset(offset);

    // Get total count
    const [{ totalCount }] = await db
      .select({ totalCount: count() })
      .from(sales)
      .where(
        and(
          eq(sales.estadoEntrega, 'A Despachar'), // Must be A Despachar status
          eq(sales.statusFlete, 'A Despacho') // Must have flete status "A Despacho"
        )
      );

    return {
      data: ordersForDispatch,
      total: totalCount,
    };
  }

  async updateSaleDeliveryStatus(saleId: string, newStatus: string): Promise<Sale | undefined> {
    const [updatedSale] = await db
      .update(sales)
      .set({ 
        estadoEntrega: newStatus,
        updatedAt: new Date()
      })
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
    referenciaFlete?: string;
    montoFleteVes?: string;
    bancoReceptorFlete?: string;
  }): Promise<Sale | undefined> {
    const updateData: any = {};
    
    // Add all flete fields to update data
    if (flete.montoFleteUsd !== undefined) {
      updateData.montoFleteUsd = flete.montoFleteUsd === "" ? null : flete.montoFleteUsd;
    }
    if (flete.fechaFlete !== undefined) {
      updateData.fechaFlete = flete.fechaFlete ? new Date(flete.fechaFlete) : null;
    }
    if (flete.referenciaFlete !== undefined) {
      updateData.referenciaFlete = flete.referenciaFlete === "" ? null : flete.referenciaFlete;
    }
    if (flete.montoFleteVes !== undefined) {
      updateData.montoFleteVes = flete.montoFleteVes === "" ? null : flete.montoFleteVes;
    }
    if (flete.bancoReceptorFlete !== undefined) {
      updateData.bancoReceptorFlete = flete.bancoReceptorFlete === "" ? null : flete.bancoReceptorFlete;
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

  async getTotalSalesCount(filters?: {
    canal?: string;
    estadoEntrega?: string;
    estado?: string;
    orden?: string;
    startDate?: Date;
    endDate?: Date;
    excludePendingManual?: boolean;
  }): Promise<number> {
    const conditions = [];
    if (filters?.canal) {
      conditions.push(eq(sales.canal, filters.canal));
    }
    if (filters?.estadoEntrega) {
      conditions.push(eq(sales.estadoEntrega, filters.estadoEntrega));
    }
    if (filters?.estado) {
      conditions.push(eq(sales.estado, filters.estado));
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
    if (filters?.excludePendingManual) {
      // Exclude only manual sales that are still pending (estado = "pendiente")  
      // Include all other sales (cashea, Shopify, Treble) and manual sales that are active
      conditions.push(
        or(
          // Include all non-manual sales regardless of status (using lowercase for cashea)
          eq(sales.canal, "cashea"),
          eq(sales.canal, "Cashea"),
          eq(sales.canal, "Shopify"),
          eq(sales.canal, "Treble"), 
          // Include manual sales only if they are active (payment verified)
          and(eq(sales.canal, "manual"), eq(sales.estado, "activo"))
        )
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
    totalSales: number;
    completedOrders: number;
    pendingOrders: number;
    activeReservations: number;
    salesByChannel: { canal: string; total: number; orders: number }[];
    salesByDeliveryStatus: { status: string; count: number }[];
  }> {
    // Total sales amount (excluding cancelled orders)
    const [totalSalesResult] = await db
      .select({ total: sum(sales.totalUsd) })
      .from(sales)
      .where(ne(sales.estadoEntrega, "CANCELLED"));
    
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
      .where(ne(sales.estadoEntrega, "CANCELLED"))
      .groupBy(sales.canal);
    
    const completedOrders = deliveryStatusCounts.find(s => s.status === 'entregado')?.count || 0;
    const pendingOrders = deliveryStatusCounts.find(s => s.status === 'pendiente')?.count || 0;
    const activeReservations = deliveryStatusCounts.find(s => s.status === 'reservado')?.count || 0;
    
    return {
      totalSales: Number(totalSalesResult.total) || 0,
      completedOrders,
      pendingOrders,
      activeReservations,
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
    const [updatedEgreso] = await db
      .update(egresos)
      .set({
        bancoId: updates.bancoId,
        referencia: updates.referencia,
        observaciones: updates.observaciones,
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
        estadoEntrega: 'PROCESSING',
        updatedAt: new Date(),
      })
      .where(
        and(
          or(
            eq(sales.canal, 'Cashea'),
            eq(sales.canal, 'cashea')
          ),
          eq(sales.estadoEntrega, 'A Despachar')
        )
      )
      .returning();
    
    return result.length;
  }
}

export const storage = new DatabaseStorage();
