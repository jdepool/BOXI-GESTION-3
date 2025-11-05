import { 
  sales, uploadHistory, users, bancos, bancosBackup, tiposEgresos, autorizadores, egresos, productos, productosBackup, metodosPago, monedas, categorias, canales, asesores, transportistas, estados, ciudades, seguimientoConfig, precios, preciosBackup, paymentInstallments, prospectos,
  type User, type InsertUser, type Sale, type InsertSale, type UploadHistory, type InsertUploadHistory,
  type Banco, type InsertBanco, type TipoEgreso, type InsertTipoEgreso, type Autorizador, type InsertAutorizador, type Egreso, type InsertEgreso,
  type Producto, type InsertProducto, type MetodoPago, type InsertMetodoPago,
  type Moneda, type InsertMoneda, type Categoria, type InsertCategoria,
  type Canal, type InsertCanal, type Asesor, type InsertAsesor, type Transportista, type InsertTransportista, type Estado, type InsertEstado, type Ciudad, type InsertCiudad, type SeguimientoConfig, type InsertSeguimientoConfig, type Precio, type InsertPrecio,
  type PaymentInstallment, type InsertPaymentInstallment,
  type Prospecto, type InsertProspecto
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, count, sum, avg, and, gte, lte, or, ne, like, ilike, isNotNull, isNull, sql, inArray } from "drizzle-orm";

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
  deleteSalesByOrderNumbers(orderNumbers: string[]): Promise<number>;
  getSales(filters?: {
    canal?: string;
    estadoEntrega?: string;
    orden?: string;
    search?: string; // Search by order number or customer name
    startDate?: string;
    endDate?: string;
    tipo?: string;
    asesorId?: string;
    excludePendingManual?: boolean;
    excludeReservas?: boolean;
    excludeADespachar?: boolean;
    excludePerdida?: boolean;
    excludePendiente?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<Sale[]>;
  getSaleById(id: string): Promise<Sale | undefined>;
  getSalesByOrderNumber(orderNumber: string): Promise<Sale[]>;
  getMaxOrderNumberInRange(minOrderNumber: number): Promise<number>;
  getCasheaOrders(limit?: number): Promise<Sale[]>;
  getOrdersWithAddresses(limit?: number, offset?: number, filters?: {
    canal?: string;
    estadoEntrega?: string;
    transportistaId?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
  }): Promise<{ data: Sale[]; total: number }>;
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
  updateOrderAddressesByOrderNumber(orderNumber: string, addresses: {
    direccionFacturacionPais?: string;
    direccionFacturacionEstado?: string;
    direccionFacturacionCiudad?: string;
    direccionFacturacionDireccion?: string;
    direccionFacturacionUrbanizacion?: string;
    direccionFacturacionReferencia?: string;
    direccionDespachoIgualFacturacion?: string;
    direccionDespachoPais?: string;
    direccionDespachoEstado?: string;
    direccionDespachoCiudad?: string;
    direccionDespachoDireccion?: string;
    direccionDespachoUrbanizacion?: string;
    direccionDespachoReferencia?: string;
  }): Promise<Sale[]>;
  updateSaleNroGuia(id: string, nroGuia: string | null): Promise<Sale | undefined>;
  updateSaleFechaDespacho(id: string, fechaDespacho: string | null): Promise<Sale | undefined>;
  updateSaleFechaCliente(id: string, fechaCliente: string | null): Promise<Sale | undefined>;
  updateSaleFechaDevolucion(id: string, fechaDevolucion: string | null): Promise<Sale | undefined>;
  updateSaleFechaEntrega(saleId: string, fechaEntrega: Date | null): Promise<Sale | undefined>;
  getTotalSalesCount(filters?: {
    canal?: string;
    estadoEntrega?: string;
    orden?: string;
    search?: string; // Search by order number or customer name
    startDate?: string;
    endDate?: string;
    tipo?: string;
    asesorId?: string;
    excludePendingManual?: boolean;
    excludeReservas?: boolean;
    excludeADespachar?: boolean;
    excludePerdida?: boolean;
    excludePendiente?: boolean;
  }): Promise<number>;
  getExistingOrderNumbers(orders: string[]): Promise<string[]>;
  getOrdersByOrderNumber(orderNumber: string): Promise<{orden: string; product: string}[]>;
  getSalesWithInstallments(filters?: {
    canal?: string;
    estadoEntrega?: string;
    orden?: string;
    startDate?: string;
    endDate?: string;
    tipo?: string;
    asesorId?: string;
    excludePendingManual?: boolean;
    excludeReservas?: boolean;
    excludeADespachar?: boolean;
    excludePerdida?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<Array<Sale & { installments: PaymentInstallment[] }>>;
  getOrdersForPayments(filters?: {
    limit?: number;
    offset?: number;
    canal?: string;
    canalMompox?: string;
    canalBoxi?: string;
    orden?: string;
    startDate?: string;
    endDate?: string;
    asesorId?: string;
    estadoEntrega?: string;
    excludePerdida?: boolean;
  }): Promise<{
    data: Array<{
      orden: string;
      nombre: string;
      fecha: Date;
      canal: string | null;
      tipo: string | null;
      estadoEntrega: string | null;
      asesorId: string | null;
      totalOrderUsd: number | null;
      productCount: number;
      hasPagoInicial: boolean;
      hasFlete: boolean;
      installmentCount: number;
      pagoInicialUsd: number;
      pagoFleteUsd: number;
      fleteAPagar: number;
      fleteGratis: boolean;
      ordenPlusFlete: number;
      totalCuotas: number;
      totalPagado: number;
      totalVerificado: number;
      saldoPendiente: number;
      notas: string | null;
    }>;
    total: number;
  }>;
  
  // Upload history methods
  createUploadHistory(uploadData: InsertUploadHistory): Promise<UploadHistory>;
  getRecentUploads(limit?: number): Promise<UploadHistory[]>;

  // Cashea automation methods
  getCasheaAutomationConfig(): Promise<any>;
  updateCasheaAutomationConfig(enabled: boolean, frequency: string): Promise<any>;
  getCasheaAutomaticDownloads(limit?: number): Promise<any[]>;

  // Admin configuration methods
  // Bancos
  getBancos(): Promise<Banco[]>;
  createBanco(banco: InsertBanco): Promise<Banco>;
  updateBanco(id: string, banco: Partial<InsertBanco>): Promise<Banco | undefined>;
  deleteBanco(id: string): Promise<boolean>;
  backupBancos(): Promise<void>;
  restoreBancosFromBackup(): Promise<void>;
  replaceBancos(bancos: InsertBanco[]): Promise<{ created: number }>;

  // Tipos de Egresos
  getTiposEgresos(): Promise<TipoEgreso[]>;
  createTipoEgreso(tipo: InsertTipoEgreso): Promise<TipoEgreso>;
  updateTipoEgreso(id: string, tipo: Partial<InsertTipoEgreso>): Promise<TipoEgreso | undefined>;
  deleteTipoEgreso(id: string): Promise<boolean>;

  // Autorizadores
  getAutorizadores(): Promise<Autorizador[]>;
  createAutorizador(autorizador: InsertAutorizador): Promise<Autorizador>;
  updateAutorizador(id: string, autorizador: Partial<InsertAutorizador>): Promise<Autorizador | undefined>;
  deleteAutorizador(id: string): Promise<boolean>;

  // Egresos
  getEgresos(filters?: {
    estado?: string[];
    tipoEgresoId?: string;
    autorizadorId?: string;
    bancoId?: string;
    startDate?: string;
    endDate?: string;
    esBorrador?: boolean;
    requiereAprobacion?: boolean;
    estadoVerificacion?: string;
    limit?: number;
    offset?: number;
  }): Promise<Egreso[]>;
  getEgresoById(id: string): Promise<Egreso | undefined>;
  createEgreso(egreso: InsertEgreso): Promise<Egreso>;
  updateEgreso(id: string, egreso: Partial<InsertEgreso>): Promise<Egreso | undefined>;
  deleteEgreso(id: string): Promise<boolean>;
  autorizarEgreso(id: string, accion: string, notas?: string): Promise<Egreso | undefined>;
  registrarPagoEgreso(id: string, pago: {
    fechaPago: Date;
    montoPagadoUsd?: string;
    montoPagadoBs?: string;
    tasaCambio?: string;
    bancoId: string;
    referenciaPago?: string;
    numeroFacturaPagada?: string;
  }): Promise<Egreso | undefined>;
  verificarEgreso(id: string, accion: string, notas?: string): Promise<Egreso | undefined>;
  getTotalEgresosCount(filters?: {
    estado?: string[];
    tipoEgresoId?: string;
    autorizadorId?: string;
    bancoId?: string;
    startDate?: string;
    endDate?: string;
    esBorrador?: boolean;
    estadoVerificacion?: string;
  }): Promise<number>;

  // Productos
  getProductos(): Promise<any[]>;
  getProductoByNombre(nombre: string): Promise<Producto | undefined>;
  createProducto(producto: InsertProducto): Promise<Producto>;
  updateProducto(id: string, producto: Partial<InsertProducto>): Promise<Producto | undefined>;
  deleteProducto(id: string): Promise<boolean>;
  backupProductos(): Promise<void>;
  restoreProductosFromBackup(): Promise<void>;
  replaceProductos(productos: InsertProducto[]): Promise<{ created: number }>;

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
  getCategoriaByNombreAndTipo(nombre: string, tipo: string): Promise<Categoria | undefined>;
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

  // Transportistas
  getTransportistas(): Promise<Transportista[]>;
  createTransportista(transportista: InsertTransportista): Promise<Transportista>;
  updateTransportista(id: string, transportista: Partial<InsertTransportista>): Promise<Transportista | undefined>;
  deleteTransportista(id: string): Promise<boolean>;

  // Estados
  getEstados(): Promise<Estado[]>;
  createEstado(estado: InsertEstado): Promise<Estado>;
  updateEstado(id: string, estado: Partial<InsertEstado>): Promise<Estado | undefined>;
  deleteEstado(id: string): Promise<boolean>;

  // Ciudades
  getCiudades(): Promise<Ciudad[]>;
  getCiudadesByEstadoId(estadoId: string): Promise<Ciudad[]>;
  createCiudad(ciudad: InsertCiudad): Promise<Ciudad>;
  updateCiudad(id: string, ciudad: Partial<InsertCiudad>): Promise<Ciudad | undefined>;
  deleteCiudad(id: string): Promise<boolean>;

  // Seguimiento Config
  getSeguimientoConfig(tipo?: string): Promise<SeguimientoConfig | undefined>;
  updateSeguimientoConfig(tipo: string, config: Partial<InsertSeguimientoConfig>): Promise<SeguimientoConfig>;

  // Precios
  getPrecios(): Promise<Precio[]>;
  getPrecioBySkuLatest(sku: string): Promise<Precio | undefined>;
  createPrecio(precio: InsertPrecio): Promise<Precio>;
  updatePrecio(id: string, precio: Partial<InsertPrecio>): Promise<Precio | undefined>;
  deletePrecio(id: string): Promise<boolean>;
  backupPrecios(): Promise<void>;
  restorePreciosFromBackup(): Promise<void>;
  hasPreciosBackup(): Promise<boolean>;


  // Payment Installments
  getInstallmentsBySale(saleId: string): Promise<PaymentInstallment[]>;
  getInstallmentsByOrder(orden: string): Promise<PaymentInstallment[]>;
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

  // Prospectos
  getProspectos(filters?: {
    asesorId?: string;
    estadoProspecto?: string;
    canal?: string;
    prospecto?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }): Promise<Prospecto[]>;
  getProspectoById(id: string): Promise<Prospecto | undefined>;
  createProspecto(prospecto: InsertProspecto): Promise<Prospecto>;
  updateProspecto(id: string, prospecto: Partial<InsertProspecto>): Promise<Prospecto | undefined>;
  deleteProspecto(id: string): Promise<boolean>;
  getTotalProspectosCount(filters?: {
    asesorId?: string;
    estadoProspecto?: string;
    canal?: string;
    prospecto?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<number>;
  getNextProspectoNumber(): Promise<string>;

  // Reports
  getReporteOrdenes(filters?: {
    startDate?: string;
    endDate?: string;
  }): Promise<Array<{
    sale: Sale;
    categoria: string | null;
    bancoNombre: string | null;
    asesorNombre: string | null;
    installments: PaymentInstallment[];
    saldoPendiente: number;
  }>>;
  getReportePerdidas(filters?: {
    startDate?: string;
    endDate?: string;
  }): Promise<Array<{
    sale: Sale;
    categoria: string | null;
    bancoNombre: string | null;
    asesorNombre: string | null;
    installments: PaymentInstallment[];
    saldoPendiente: number;
  }>>;
  getReporteProspectosPerdidos(filters?: {
    startDate?: string;
    endDate?: string;
  }): Promise<Array<{
    prospecto: Prospecto;
    asesorNombre: string | null;
  }>>;
  
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
  updateSaleNotes(id: string, notas: string | null): Promise<Sale | undefined>;
  updateOrderFlete(orderNumber: string, flete: {
    montoFleteUsd?: string;
    fechaFlete?: string;
    pagoFleteUsd?: string;
    referenciaFlete?: string;
    montoFleteBs?: string;
    bancoReceptorFlete?: string;
    fleteGratis?: boolean;
    fleteAPagar?: string;
  }): Promise<Sale[]>;
  updateOrderPagoInicial(orderNumber: string, pagoData: {
    fechaPagoInicial?: string | null;
    pagoInicialUsd?: number | null;
    bancoReceptorInicial?: string | null;
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
    estadoVerificacion?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ data: any[]; total: number }>;
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

  async deleteSalesByOrderNumbers(orderNumbers: string[]): Promise<number> {
    if (orderNumbers.length === 0) return 0;
    
    // Build OR condition for all order numbers
    const conditions = orderNumbers.map(orderNum => eq(sales.orden, orderNum));
    const result = await db.delete(sales).where(or(...conditions));
    return result.rowCount ?? 0;
  }

  async getSales(filters?: {
    canal?: string;
    canalMompox?: string; // Filter for ShopMom OR canals containing "MP"
    canalBoxi?: string; // Filter for Boxi channels (exclude ShopMom and MP)
    estadoEntrega?: string;
    search?: string; // Search by order number OR customer name
    orden?: string;
    ordenExacto?: string; // For exact order match (modals, forms)
    startDate?: string;
    endDate?: string;
    tipo?: string;
    asesorId?: string;
    excludePendingManual?: boolean;
    excludeReservas?: boolean;
    excludeADespachar?: boolean;
    excludePerdida?: boolean;
    excludePendiente?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<Sale[]> {
    const conditions = [];
    if (filters?.canalMompox === "true") {
      // Filter for ShopMom OR any canal containing "MP" (Manual MP, Cashea MP, Tienda MP)
      conditions.push(
        or(
          eq(sales.canal, "ShopMom"),
          like(sales.canal, "%MP%")
        )
      );
    } else if (filters?.canalBoxi === "true") {
      // Filter for Boxi channels (exclude ShopMom and any canal containing "MP")
      conditions.push(sql`${sales.canal} != 'ShopMom' AND ${sales.canal} NOT LIKE '%MP%'`);
    } else if (filters?.canal) {
      conditions.push(ilike(sales.canal, filters.canal));
    }
    if (filters?.estadoEntrega) {
      conditions.push(eq(sales.estadoEntrega, filters.estadoEntrega));
    }
    // Use search if provided, otherwise fall back to orden filter
    if (filters?.search) {
      // Search by order number OR customer name (case-insensitive)
      conditions.push(
        or(
          ilike(sales.orden, `%${filters.search}%`),
          ilike(sales.nombre, `%${filters.search}%`)
        )
      );
    } else if (filters?.ordenExacto) {
      // Exact match for orden (used by modals/forms to avoid partial matches)
      conditions.push(eq(sales.orden, filters.ordenExacto));
    } else if (filters?.orden) {
      // Partial match for orden (used by table search)
      conditions.push(ilike(sales.orden, `%${filters.orden}%`));
    }
    if (filters?.startDate) {
      // Parse yyyy-MM-dd as local date to avoid timezone shifts
      const [year, month, day] = filters.startDate.split('-').map(Number);
      const startDateTime = new Date(year, month - 1, day, 0, 0, 0, 0);
      conditions.push(gte(sales.fecha, startDateTime));
    }
    if (filters?.endDate) {
      // Parse yyyy-MM-dd as local date and set to end of day
      const [year, month, day] = filters.endDate.split('-').map(Number);
      const endDateTime = new Date(year, month - 1, day, 23, 59, 59, 999);
      conditions.push(lte(sales.fecha, endDateTime));
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
    // Only apply excludePerdida if estadoEntrega is not explicitly set
    // This prevents conflict when user explicitly filters for "Perdida" status
    if (filters?.excludePerdida && !filters?.estadoEntrega) {
      // Exclude orders with estadoEntrega "Perdida" - lost sales hidden by default
      conditions.push(
        ne(sales.estadoEntrega, "Perdida")
      );
    }
    if (filters?.excludePendiente) {
      // Exclude orders with estadoEntrega "Pendiente" - for Lista de Ventas to show only completed sales
      conditions.push(
        ne(sales.estadoEntrega, "Pendiente")
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
    startDate?: string;
    endDate?: string;
    tipo?: string;
    asesorId?: string;
    excludePendingManual?: boolean;
    excludeReservas?: boolean;
    excludeADespachar?: boolean;
    excludePerdida?: boolean;
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
    canal?: string;
    canalMompox?: string; // Filter for ShopMom OR canals containing "MP"
    canalBoxi?: string; // Filter for Boxi channels (exclude ShopMom and MP)
    orden?: string;
    startDate?: string;
    endDate?: string;
    asesorId?: string;
    estadoEntrega?: string;
    excludePerdida?: boolean;
  }): Promise<{
    data: Array<{
      orden: string;
      nombre: string;
      fecha: Date;
      canal: string | null;
      tipo: string | null;
      estadoEntrega: string | null;
      asesorId: string | null;
      totalOrderUsd: number | null;
      productCount: number;
      hasPagoInicial: boolean;
      hasFlete: boolean;
      installmentCount: number;
      pagoInicialUsd: number;
      pagoFleteUsd: number;
      fleteAPagar: number;
      ordenPlusFlete: number;
      totalCuotas: number;
      totalPagado: number;
      totalVerificado: number;
      saldoPendiente: number;
      notas: string | null;
    }>;
    total: number;
  }> {
    // Build filter conditions
    const conditions: any[] = [
      isNotNull(sales.orden)
    ];

    // PAGOS TABLE LOGIC: Only show Pendiente and En proceso orders (temporary workspace)
    // When estadoEntrega filter is explicitly provided, validate it's one of the allowed statuses
    if (filters?.estadoEntrega) {
      // Only allow Pendiente, En proceso, or Perdida in the filter
      const allowedStatuses = ['Pendiente', 'En proceso', 'Perdida'];
      if (allowedStatuses.includes(filters.estadoEntrega)) {
        conditions.push(eq(sales.estadoEntrega, filters.estadoEntrega));
      } else {
        // If invalid status selected, default to showing Pendiente and En proceso
        conditions.push(or(
          eq(sales.estadoEntrega, 'Pendiente'),
          eq(sales.estadoEntrega, 'En proceso')
        ));
      }
    } else {
      // Default behavior: Only show Pendiente and En proceso orders
      // Exclude Perdida unless explicitly selected
      if (filters?.excludePerdida) {
        // Show Pendiente and En proceso only (exclude Perdida)
        conditions.push(or(
          eq(sales.estadoEntrega, 'Pendiente'),
          eq(sales.estadoEntrega, 'En proceso')
        ));
      } else {
        // Show Pendiente, En proceso, and Perdida (Perdida filter selected)
        conditions.push(or(
          eq(sales.estadoEntrega, 'Pendiente'),
          eq(sales.estadoEntrega, 'En proceso'),
          eq(sales.estadoEntrega, 'Perdida')
        ));
      }
    }

    // Add canal filter if provided
    if (filters?.canalMompox === "true") {
      // Filter for ShopMom OR any canal containing "MP" (Manual MP, Cashea MP, Tienda MP)
      conditions.push(
        or(
          eq(sales.canal, "ShopMom"),
          like(sales.canal, "%MP%")
        )
      );
    } else if (filters?.canalBoxi === "true") {
      // Filter for Boxi channels (exclude ShopMom and any canal containing "MP")
      conditions.push(sql`${sales.canal} != 'ShopMom' AND ${sales.canal} NOT LIKE '%MP%'`);
    } else if (filters?.canal) {
      conditions.push(eq(sales.canal, filters.canal));
    }

    // Add orden filter if provided - search both order number AND customer name
    if (filters?.orden) {
      conditions.push(
        or(
          sql`${sales.orden} ILIKE ${`%${filters.orden}%`}`,
          sql`${sales.nombre} ILIKE ${`%${filters.orden}%`}`
        )
      );
    }

    // Add asesor filter if provided
    if (filters?.asesorId) {
      if (filters.asesorId === 'null') {
        // Filter for orders with no asesor
        conditions.push(isNull(sales.asesorId));
      } else {
        // Filter for specific asesor
        conditions.push(eq(sales.asesorId, filters.asesorId));
      }
    }

    // Add date range filters
    if (filters?.startDate) {
      conditions.push(sql`${sales.fecha} >= ${filters.startDate}`);
    }
    if (filters?.endDate) {
      // Add 23:59:59 to include the entire end date
      const endDateTime = new Date(filters.endDate);
      endDateTime.setHours(23, 59, 59, 999);
      conditions.push(sql`${sales.fecha} <= ${endDateTime}`);
    }

    const estadoCondition = and(...conditions);

    // Get grouped orders with aggregated data
    const ordersData = await db
      .select({
        orden: sales.orden,
        nombre: sql<string>`MAX(${sales.nombre})`.as('nombre'),
        fecha: sql<Date>`MAX(${sales.fecha})`.as('fecha'),
        canal: sql<string | null>`MAX(${sales.canal})`.as('canal'),
        isCasheaOrder: sql<boolean>`BOOL_OR(LOWER(TRIM(${sales.canal})) = 'cashea')`.as('isCasheaOrder'),
        tipo: sql<string | null>`MAX(${sales.tipo})`.as('tipo'),
        estadoEntrega: sql<string | null>`MAX(${sales.estadoEntrega})`.as('estadoEntrega'),
        asesorId: sql<string | null>`MAX(${sales.asesorId})`.as('asesorId'),
        totalOrderUsd: sql<number | null>`MAX(${sales.totalOrderUsd})`.as('totalOrderUsd'),
        productCount: sql<number>`COUNT(*)`.as('productCount'),
        hasPagoInicial: sql<boolean>`BOOL_OR(${sales.pagoInicialUsd} IS NOT NULL OR ${sales.fechaPagoInicial} IS NOT NULL)`.as('hasPagoInicial'),
        hasFlete: sql<boolean>`BOOL_OR(${sales.pagoFleteUsd} IS NOT NULL)`.as('hasFlete'),
        pagoInicialUsd: sql<number | null>`MAX(${sales.pagoInicialUsd})`.as('pagoInicialUsd'),
        pagoFleteUsd: sql<number | null>`MAX(${sales.pagoFleteUsd})`.as('pagoFleteUsd'),
        fleteAPagar: sql<number | null>`MAX(${sales.fleteAPagar})`.as('fleteAPagar'),
        fleteGratis: sql<boolean>`BOOL_OR(${sales.fleteGratis})`.as('fleteGratis'),
        estadoVerificacionInicial: sql<string | null>`MAX(${sales.estadoVerificacionInicial})`.as('estadoVerificacionInicial'),
        estadoVerificacionFlete: sql<string | null>`MAX(${sales.estadoVerificacionFlete})`.as('estadoVerificacionFlete'),
        notas: sql<string | null>`MAX(${sales.notas})`.as('notas'),
      })
      .from(sales)
      .where(estadoCondition)
      .groupBy(sales.orden)
      .orderBy(desc(sql`MAX(${sales.fecha})`), desc(sql`MAX(${sales.orden})`))
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
    let totalCuotasVerificadasMap = new Map<string, number>();
    
    if (ordersData.length > 0) {
      const installmentData = await db
        .select({
          orden: paymentInstallments.orden,
          count: sql<number>`COUNT(*)`.as('count'),
          totalCuotas: sql<number>`COALESCE(SUM(${paymentInstallments.pagoCuotaUsd}), 0)`.as('totalCuotas'),
          totalCuotasVerificadas: sql<number>`COALESCE(SUM(CASE WHEN ${paymentInstallments.estadoVerificacion} = 'Verificado' THEN ${paymentInstallments.pagoCuotaUsd} ELSE 0 END), 0)`.as('totalCuotasVerificadas'),
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
      
      totalCuotasVerificadasMap = new Map(
        installmentData
          .filter(ic => ic.orden !== null)
          .map(ic => [ic.orden!, Number(ic.totalCuotasVerificadas)])
      );
    }

    const processedOrders = await Promise.all(
      ordersData.map(async (order) => {
        // Convert decimal strings to numbers for calculations
        const pagoInicial = Number(order.pagoInicialUsd) || 0;
        const pagoFlete = Number(order.pagoFleteUsd) || 0;
        const fleteAPagar = Number(order.fleteAPagar) || 0;
        const totalOrderUsd = Number(order.totalOrderUsd) || 0;
        
        // For Cashea orders, use 0 (only collect freight); for others, use totalOrderUsd
        // Use the aggregated boolean flag from the query (BOOL_OR) which is true if ANY sale in the order is from Cashea
        const baseAmount = order.isCasheaOrder ? 0 : totalOrderUsd;
        // Use fleteAPagar (the amount that SHOULD be paid) instead of pagoFleteUsd (the amount actually paid)
        // Safety check: ensure fleteGratis overrides any residual fleteAPagar value
        const ordenPlusFlete = baseAmount + (order.fleteGratis ? 0 : fleteAPagar);
        const totalCuotas = totalCuotasMap.get(order.orden!) || 0;
        
        // Calculate Total Pagado (Por verificar payments) and Total Verificado (Verificado payments)
        // Use getVerificationPayments to ensure only complete payments (with banco + referencia) are counted
        let totalPagado = 0; // Por verificar payments
        let totalVerificado = 0; // Verificado payments
        
        // Get payments "Por verificar" for this order (only complete payments with USD + Banco + Referencia)
        const porVerificarPayments = await this.getVerificationPayments({
          orden: order.orden!,
          estadoVerificacion: 'Por verificar',
          limit: 9999
        });
        
        // Sum all "Por verificar" payments (already filtered for complete payments)
        totalPagado = porVerificarPayments.data.reduce((sum, payment) => {
          return sum + (payment.montoUsd || 0);
        }, 0);
        
        // Get payments "Verificado" for this order (only complete payments with USD + Banco + Referencia)
        const verificadoPayments = await this.getVerificationPayments({
          orden: order.orden!,
          estadoVerificacion: 'Verificado',
          limit: 9999
        });
        
        // Sum all "Verificado" payments (already filtered for complete payments)
        totalVerificado = verificadoPayments.data.reduce((sum, payment) => {
          return sum + (payment.montoUsd || 0);
        }, 0);
        
        const saldoPendiente = ordenPlusFlete - totalVerificado;
        
        return {
          orden: order.orden!, // Non-null assertion safe because we filter isNotNull(sales.orden)
          nombre: order.nombre,
          fecha: order.fecha,
          canal: order.canal,
          tipo: order.tipo,
          estadoEntrega: order.estadoEntrega,
          asesorId: order.asesorId,
          totalOrderUsd: totalOrderUsd,
          productCount: Number(order.productCount),
          hasPagoInicial: order.hasPagoInicial,
          hasFlete: order.hasFlete,
          installmentCount: installmentCountMap.get(order.orden!) || 0,
          pagoInicialUsd: pagoInicial,
          pagoFleteUsd: pagoFlete,
          fleteAPagar: fleteAPagar,
          fleteGratis: order.fleteGratis || false,
          ordenPlusFlete,
          totalCuotas,
          totalPagado,
          totalVerificado,
          saldoPendiente,
          notas: order.notas,
        };
      })
    );

    return {
      data: processedOrders,
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

  async getMaxOrderNumberInRange(minOrderNumber: number): Promise<number> {
    // Efficiently get the maximum order number within a 10,000-number range
    // For Manual: 20000-29999, for Tienda: 30000-39999, etc.
    // Filter to only numeric orden values to avoid casting errors on alphanumeric IDs (e.g., Shopify "#1001")
    const maxOrderNumber = minOrderNumber + 9999; // Define the upper bound of the range
    const result = await db
      .select({ maxOrder: sql<string>`MAX(CAST(${sales.orden} AS INTEGER))` })
      .from(sales)
      .where(sql`${sales.orden} ~ '^[0-9]+$' AND CAST(${sales.orden} AS INTEGER) >= ${minOrderNumber} AND CAST(${sales.orden} AS INTEGER) <= ${maxOrderNumber}`);
    
    const maxOrder = result[0]?.maxOrder;
    return maxOrder ? parseInt(maxOrder) : minOrderNumber - 1;
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

  async getOrdersWithAddresses(
    limit: number = 20, 
    offset: number = 0, 
    filters?: {
      canal?: string;
      estadoEntrega?: string;
      transportistaId?: string;
      startDate?: string;
      endDate?: string;
      search?: string;
    }
  ): Promise<{ data: Sale[]; total: number }> {
    // Build conditions array
    const conditions = [];
    
    // ALWAYS exclude "Entregado" orders from Despachos view
    conditions.push(ne(sales.estadoEntrega, 'Entregado'));
    
    // Base condition: only include orders in dispatch pipeline (unless specific status filter is provided)
    if (filters?.estadoEntrega) {
      // If specific status is provided, use that instead of base condition
      conditions.push(eq(sales.estadoEntrega, filters.estadoEntrega));
    } else {
      // Otherwise, show all orders in dispatch pipeline
      const dispatchStatuses = or(
        eq(sales.estadoEntrega, 'En proceso'),
        eq(sales.estadoEntrega, 'A despachar')
      );
      conditions.push(dispatchStatuses);
    }
    
    // Apply other filters
    if (filters?.canal) {
      conditions.push(ilike(sales.canal, filters.canal));
    }
    
    if (filters?.transportistaId) {
      conditions.push(eq(sales.transportistaId, filters.transportistaId));
    }
    
    // Date range filter (using YYYY-MM-DD format to avoid timezone issues)
    if (filters?.startDate) {
      conditions.push(sql`DATE(${sales.fecha}) >= ${filters.startDate}`);
    }
    if (filters?.endDate) {
      conditions.push(sql`DATE(${sales.fecha}) <= ${filters.endDate}`);
    }
    
    // Search filter (orden, nombre, cedula, telefono)
    if (filters?.search && filters.search.trim()) {
      const searchTerm = `%${filters.search.trim()}%`;
      conditions.push(
        or(
          ilike(sales.orden, searchTerm),
          ilike(sales.nombre, searchTerm),
          ilike(sales.cedula, searchTerm),
          ilike(sales.telefono, searchTerm)
        )
      );
    }

    const whereClause = and(...conditions);

    const ordersForDispatch = await db
      .select()
      .from(sales)
      .where(whereClause)
      .orderBy(sql`${sales.fechaEntrega} ASC NULLS FIRST`, sales.orden)
      .limit(limit)
      .offset(offset);

    // Get total count with same conditions
    const [{ totalCount }] = await db
      .select({ totalCount: count() })
      .from(sales)
      .where(whereClause);

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

  async updateSaleNotes(id: string, notas: string | null): Promise<Sale | undefined> {
    // First, get the sale to find its order number
    const existingSale = await this.getSaleById(id);
    if (!existingSale) {
      return undefined;
    }

    // If sale has an order number, update ALL sales with the same order number to keep notes in sync
    // This ensures that when Pagos uses MAX(notas), it gets the correct value
    if (existingSale.orden) {
      const updatedSales = await db
        .update(sales)
        .set({ notas, updatedAt: new Date() })
        .where(eq(sales.orden, existingSale.orden))
        .returning();
      
      // Return the originally requested sale
      return updatedSales.find(s => s.id === id) || updatedSales[0];
    }
    
    // Fallback: If no order number exists, just update this single sale
    const [updatedSale] = await db
      .update(sales)
      .set({ notas, updatedAt: new Date() })
      .where(eq(sales.id, id))
      .returning();
    
    return updatedSale || undefined;
  }

  async updateSaleTransportista(id: string, transportistaId: string | null): Promise<Sale | undefined> {
    const [updatedSale] = await db
      .update(sales)
      .set({ transportistaId, updatedAt: new Date() })
      .where(eq(sales.id, id))
      .returning();
    return updatedSale || undefined;
  }

  async updateSaleNroGuia(id: string, nroGuia: string | null): Promise<Sale | undefined> {
    const [updatedSale] = await db
      .update(sales)
      .set({ nroGuia, updatedAt: new Date() })
      .where(eq(sales.id, id))
      .returning();
    return updatedSale || undefined;
  }

  async updateSaleFechaDespacho(id: string, fechaDespacho: string | null): Promise<Sale | undefined> {
    const [updatedSale] = await db
      .update(sales)
      .set({ fechaDespacho, updatedAt: new Date() })
      .where(eq(sales.id, id))
      .returning();
    return updatedSale || undefined;
  }

  async updateSaleFechaCliente(id: string, fechaCliente: string | null): Promise<Sale | undefined> {
    const [updatedSale] = await db
      .update(sales)
      .set({ fechaCliente, updatedAt: new Date() })
      .where(eq(sales.id, id))
      .returning();
    return updatedSale || undefined;
  }

  async updateSaleFechaDevolucion(id: string, fechaDevolucion: string | null): Promise<Sale | undefined> {
    const [updatedSale] = await db
      .update(sales)
      .set({ fechaDevolucion, updatedAt: new Date() })
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

  async updateOrderAddressesByOrderNumber(orderNumber: string, addresses: {
    direccionFacturacionPais?: string;
    direccionFacturacionEstado?: string;
    direccionFacturacionCiudad?: string;
    direccionFacturacionDireccion?: string;
    direccionFacturacionUrbanizacion?: string;
    direccionFacturacionReferencia?: string;
    direccionDespachoIgualFacturacion?: string;
    direccionDespachoPais?: string;
    direccionDespachoEstado?: string;
    direccionDespachoCiudad?: string;
    direccionDespachoDireccion?: string;
    direccionDespachoUrbanizacion?: string;
    direccionDespachoReferencia?: string;
  }): Promise<Sale[]> {
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
      updateData.direccionDespachoIgualFacturacion = addresses.direccionDespachoIgualFacturacion;
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

    const updatedSales = await db
      .update(sales)
      .set(updateData)
      .where(eq(sales.orden, orderNumber))
      .returning();

    return updatedSales;
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

  async updateOrderFlete(orderNumber: string, flete: {
    montoFleteUsd?: string;
    fechaFlete?: string;
    pagoFleteUsd?: string;
    referenciaFlete?: string;
    montoFleteBs?: string;
    bancoReceptorFlete?: string;
    fleteGratis?: boolean;
    fleteAPagar?: string;
  }): Promise<Sale[]> {
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
    if (flete.fleteAPagar !== undefined) {
      // Convert string to number, handle empty string as null
      const numericValue = flete.fleteAPagar === "" ? null : parseFloat(flete.fleteAPagar);
      updateData.fleteAPagar = numericValue;
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

  async updateOrderPagoInicial(orderNumber: string, pagoData: {
    fechaPagoInicial?: string | null;
    pagoInicialUsd?: number | null;
    bancoReceptorInicial?: string | null;
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
    if (pagoData.bancoReceptorInicial !== undefined) {
      updateData.bancoReceptorInicial = pagoData.bancoReceptorInicial === "" ? null : pagoData.bancoReceptorInicial;
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
    canalMompox?: string; // Filter for ShopMom OR canals containing "MP"
    canalBoxi?: string; // Filter for Boxi channels (exclude ShopMom and MP)
    estadoEntrega?: string;
    search?: string; // Search by order number OR customer name
    orden?: string;
    ordenExacto?: string; // For exact order match (modals, forms)
    startDate?: string;
    endDate?: string;
    tipo?: string;
    asesorId?: string;
    excludePendingManual?: boolean;
    excludeReservas?: boolean;
    excludeADespachar?: boolean;
    excludePerdida?: boolean;
    excludePendiente?: boolean;
  }): Promise<number> {
    const conditions = [];
    if (filters?.canalMompox === "true") {
      // Filter for ShopMom OR any canal containing "MP" (Manual MP, Cashea MP, Tienda MP)
      conditions.push(
        or(
          eq(sales.canal, "ShopMom"),
          like(sales.canal, "%MP%")
        )
      );
    } else if (filters?.canalBoxi === "true") {
      // Filter for Boxi channels (exclude ShopMom and any canal containing "MP")
      conditions.push(sql`${sales.canal} != 'ShopMom' AND ${sales.canal} NOT LIKE '%MP%'`);
    } else if (filters?.canal) {
      conditions.push(ilike(sales.canal, filters.canal));
    }
    if (filters?.estadoEntrega) {
      conditions.push(eq(sales.estadoEntrega, filters.estadoEntrega));
    }
    // Use search if provided, otherwise fall back to orden filter
    if (filters?.search) {
      // Search by order number OR customer name (case-insensitive)
      conditions.push(
        or(
          ilike(sales.orden, `%${filters.search}%`),
          ilike(sales.nombre, `%${filters.search}%`)
        )
      );
    } else if (filters?.ordenExacto) {
      // Exact match for orden (used by modals/forms to avoid partial matches)
      conditions.push(eq(sales.orden, filters.ordenExacto));
    } else if (filters?.orden) {
      // Partial match for orden (used by table search)
      conditions.push(ilike(sales.orden, `%${filters.orden}%`));
    }
    if (filters?.startDate) {
      // Parse yyyy-MM-dd as local date to avoid timezone shifts
      const [year, month, day] = filters.startDate.split('-').map(Number);
      const startDateTime = new Date(year, month - 1, day, 0, 0, 0, 0);
      conditions.push(gte(sales.fecha, startDateTime));
    }
    if (filters?.endDate) {
      // Parse yyyy-MM-dd as local date and set to end of day
      const [year, month, day] = filters.endDate.split('-').map(Number);
      const endDateTime = new Date(year, month - 1, day, 23, 59, 59, 999);
      conditions.push(lte(sales.fecha, endDateTime));
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
    // Only apply excludePerdida if estadoEntrega is not explicitly set
    // This prevents conflict when user explicitly filters for "Perdida" status
    if (filters?.excludePerdida && !filters?.estadoEntrega) {
      // Exclude orders with estadoEntrega "Perdida" - lost sales hidden by default
      conditions.push(
        ne(sales.estadoEntrega, "Perdida")
      );
    }
    if (filters?.excludePendiente) {
      // Exclude orders with estadoEntrega "Pendiente" - for Lista de Ventas to show only completed sales
      conditions.push(
        ne(sales.estadoEntrega, "Pendiente")
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

  // Cashea automation methods implementation
  async getCasheaAutomationConfig(): Promise<any> {
    const { casheaAutomationConfig } = await import('@shared/schema');
    const configs = await db.select().from(casheaAutomationConfig).limit(1);
    
    if (configs.length === 0) {
      // Create default config
      const [newConfig] = await db.insert(casheaAutomationConfig).values({
        enabled: false,
        frequency: '2 hours'
      }).returning();
      return newConfig;
    }
    
    return configs[0];
  }

  async updateCasheaAutomationConfig(enabled: boolean, frequency: string): Promise<any> {
    const { casheaAutomationConfig } = await import('@shared/schema');
    const existingConfig = await this.getCasheaAutomationConfig();
    
    const [updatedConfig] = await db
      .update(casheaAutomationConfig)
      .set({ enabled, frequency })
      .where(eq(casheaAutomationConfig.id, existingConfig.id))
      .returning();
    
    return updatedConfig;
  }

  async getCasheaAutomaticDownloads(limit = 5): Promise<any[]> {
    const { casheaAutomaticDownloads } = await import('@shared/schema');
    const downloads = await db
      .select()
      .from(casheaAutomaticDownloads)
      .orderBy(desc(casheaAutomaticDownloads.downloadedAt))
      .limit(limit);
    
    // Convert timestamps to ISO format for proper frontend parsing
    return downloads.map(download => ({
      ...download,
      downloadedAt: download.downloadedAt ? new Date(download.downloadedAt).toISOString() : null,
      startDate: download.startDate ? new Date(download.startDate).toISOString() : null,
      endDate: download.endDate ? new Date(download.endDate).toISOString() : null,
    }));
  }

  // Admin configuration methods implementation

  // Bancos methods
  async getBancos(): Promise<Banco[]> {
    return await db.select().from(bancos).orderBy(bancos.position, bancos.banco);
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

  async backupBancos(): Promise<void> {
    // First, clear existing backup
    await db.delete(bancosBackup);
    
    // Then, backup all current bancos
    const currentBancos = await db.select().from(bancos);
    
    if (currentBancos.length > 0) {
      await db.insert(bancosBackup).values(
        currentBancos.map(b => ({
          banco: b.banco,
          numeroCuenta: b.numeroCuenta,
          tipo: b.tipo,
          monedaId: b.monedaId,
          metodoPagoId: b.metodoPagoId,
          position: b.position,
          createdAt: b.createdAt,
          updatedAt: b.updatedAt,
          originalId: b.id,
          backedUpAt: new Date(),
        }))
      );
    }
  }

  async restoreBancosFromBackup(): Promise<void> {
    // Get backup bancos
    const backup = await db.select().from(bancosBackup);
    
    if (backup.length === 0) {
      throw new Error("No backup found");
    }
    
    // Clear current bancos
    await db.delete(bancos);
    
    // Restore from backup
    await db.insert(bancos).values(
      backup.map(b => ({
        banco: b.banco,
        numeroCuenta: b.numeroCuenta,
        tipo: b.tipo,
        monedaId: b.monedaId || undefined,
        metodoPagoId: b.metodoPagoId || undefined,
        position: b.position,
        createdAt: new Date(),
        updatedAt: new Date(),
      }))
    );
    
    // Clear backup after restore
    await db.delete(bancosBackup);
  }

  async replaceBancos(bancosData: { banco: string; numeroCuenta: string; tipo: string; moneda?: string; metodoPago?: string }[]): Promise<{ created: number }> {
    // Fetch all monedas and metodos de pago for lookup
    const allMonedas = await db.select().from(monedas);
    const allMetodosPago = await db.select().from(metodosPago);
    
    // Delete all existing bancos
    await db.delete(bancos);
    
    // Insert all new bancos with position tracking
    const bancosToInsert = bancosData.map((bancoData, index) => {
      // Lookup monedaId by codigo or nombre (case-insensitive)
      let monedaId: string | undefined = undefined;
      if (bancoData.moneda) {
        const moneda = allMonedas.find(m => 
          m.codigo.toLowerCase() === bancoData.moneda!.toLowerCase() ||
          m.nombre.toLowerCase() === bancoData.moneda!.toLowerCase()
        );
        monedaId = moneda?.id;
      }
      
      // Lookup metodoPagoId by nombre (case-insensitive)
      let metodoPagoId: string | undefined = undefined;
      if (bancoData.metodoPago) {
        const metodoPago = allMetodosPago.find(mp => 
          mp.nombre.toLowerCase() === bancoData.metodoPago!.toLowerCase()
        );
        metodoPagoId = metodoPago?.id;
      }
      
      return {
        banco: bancoData.banco,
        numeroCuenta: bancoData.numeroCuenta,
        tipo: bancoData.tipo,
        monedaId,
        metodoPagoId,
        position: index,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    });
    
    if (bancosToInsert.length > 0) {
      await db.insert(bancos).values(bancosToInsert);
    }
    
    return { created: bancosToInsert.length };
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

  // Autorizadores methods
  async getAutorizadores(): Promise<Autorizador[]> {
    return await db.select().from(autorizadores).orderBy(autorizadores.nombre);
  }

  async createAutorizador(autorizador: InsertAutorizador): Promise<Autorizador> {
    const [newAutorizador] = await db.insert(autorizadores).values({
      ...autorizador,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return newAutorizador;
  }

  async updateAutorizador(id: string, autorizador: Partial<InsertAutorizador>): Promise<Autorizador | undefined> {
    const [updated] = await db
      .update(autorizadores)
      .set({ ...autorizador, updatedAt: new Date() })
      .where(eq(autorizadores.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteAutorizador(id: string): Promise<boolean> {
    const result = await db.delete(autorizadores).where(eq(autorizadores.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Egresos methods
  async getEgresos(filters?: {
    estado?: string[];
    tipoEgresoId?: string;
    autorizadorId?: string;
    bancoId?: string;
    startDate?: string;
    endDate?: string;
    esBorrador?: boolean;
    requiereAprobacion?: boolean;
    estadoVerificacion?: string;
    limit?: number;
    offset?: number;
  }): Promise<Egreso[]> {
    const conditions = [];

    if (filters?.estado && filters.estado.length > 0) {
      if (filters.estado.length === 1) {
        conditions.push(eq(egresos.estado, filters.estado[0]));
      } else {
        conditions.push(inArray(egresos.estado, filters.estado));
      }
    }

    if (filters?.tipoEgresoId) {
      conditions.push(eq(egresos.tipoEgresoId, filters.tipoEgresoId));
    }

    if (filters?.autorizadorId) {
      conditions.push(eq(egresos.autorizadorId, filters.autorizadorId));
    }

    if (filters?.bancoId) {
      conditions.push(eq(egresos.bancoId, filters.bancoId));
    }

    if (filters?.esBorrador !== undefined) {
      conditions.push(eq(egresos.esBorrador, filters.esBorrador));
    }

    if (filters?.requiereAprobacion !== undefined) {
      conditions.push(eq(egresos.requiereAprobacion, filters.requiereAprobacion));
    }

    if (filters?.estadoVerificacion) {
      conditions.push(eq(egresos.estadoVerificacion, filters.estadoVerificacion));
    }

    if (filters?.startDate) {
      conditions.push(gte(egresos.fechaRegistro, new Date(filters.startDate)));
    }

    if (filters?.endDate) {
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999);
      conditions.push(lte(egresos.fechaRegistro, endDate));
    }

    let query = db.select().from(egresos);

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    // Order by fechaCompromiso (most urgent first) for Por Autorizar and Por Pagar
    // Otherwise, order by fechaRegistro (newest first)
    if (filters?.estado && (filters.estado.includes('Por autorizar') || filters.estado.includes('Por pagar'))) {
      query = query.orderBy(asc(egresos.fechaCompromiso)) as any;
    } else {
      query = query.orderBy(desc(egresos.fechaRegistro)) as any;
    }

    if (filters?.limit) {
      query = query.limit(filters.limit) as any;
    }

    if (filters?.offset) {
      query = query.offset(filters.offset) as any;
    }

    return await query;
  }

  async getEgresoById(id: string): Promise<Egreso | undefined> {
    const [egreso] = await db.select().from(egresos).where(eq(egresos.id, id));
    return egreso || undefined;
  }

  async createEgreso(egreso: InsertEgreso): Promise<Egreso> {
    const [newEgreso] = await db.insert(egresos).values({
      ...egreso,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return newEgreso;
  }

  async updateEgreso(id: string, egreso: Partial<InsertEgreso>): Promise<Egreso | undefined> {
    const [updated] = await db
      .update(egresos)
      .set({ ...egreso, updatedAt: new Date() })
      .where(eq(egresos.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteEgreso(id: string): Promise<boolean> {
    const result = await db.delete(egresos).where(eq(egresos.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async autorizarEgreso(id: string, accion: string, notas?: string): Promise<Egreso | undefined> {
    const nuevoEstado = accion === 'Aprobar' ? 'Por pagar' : 'Por autorizar';
    
    const [updated] = await db
      .update(egresos)
      .set({
        fechaAutorizacion: new Date(),
        accionAutorizacion: accion,
        notasAutorizacion: notas || null,
        estado: nuevoEstado,
        esBorrador: false,
        updatedAt: new Date(),
      })
      .where(eq(egresos.id, id))
      .returning();
    return updated || undefined;
  }

  async registrarPagoEgreso(id: string, pago: {
    fechaPago: Date;
    montoPagadoUsd?: string;
    montoPagadoBs?: string;
    tasaCambio?: string;
    bancoId: string;
    referenciaPago?: string;
    numeroFacturaPagada?: string;
  }): Promise<Egreso | undefined> {
    const [updated] = await db
      .update(egresos)
      .set({
        fechaPago: pago.fechaPago,
        montoPagadoUsd: pago.montoPagadoUsd || null,
        montoPagadoBs: pago.montoPagadoBs || null,
        tasaCambio: pago.tasaCambio || null,
        bancoId: pago.bancoId,
        referenciaPago: pago.referenciaPago || null,
        numeroFacturaPagada: pago.numeroFacturaPagada || null,
        estado: 'Por verificar',
        esBorrador: false,
        estadoVerificacion: 'Por verificar',
        updatedAt: new Date(),
      })
      .where(eq(egresos.id, id))
      .returning();
    return updated || undefined;
  }

  async verificarEgreso(id: string, accion: string, notas?: string): Promise<Egreso | undefined> {
    const nuevoEstadoVerificacion = accion === 'Verificar' ? 'Verificado' : 'Rechazado';
    const nuevoEstado = accion === 'Verificar' ? 'Verificado' : 'Rechazado';
    
    const [updated] = await db
      .update(egresos)
      .set({
        fechaVerificacion: new Date(),
        estadoVerificacion: nuevoEstadoVerificacion,
        notasVerificacion: notas || null,
        estado: nuevoEstado,
        updatedAt: new Date(),
      })
      .where(eq(egresos.id, id))
      .returning();
    return updated || undefined;
  }

  async getTotalEgresosCount(filters?: {
    estado?: string[];
    tipoEgresoId?: string;
    autorizadorId?: string;
    bancoId?: string;
    startDate?: string;
    endDate?: string;
    esBorrador?: boolean;
    estadoVerificacion?: string;
  }): Promise<number> {
    const conditions = [];

    if (filters?.estado && filters.estado.length > 0) {
      if (filters.estado.length === 1) {
        conditions.push(eq(egresos.estado, filters.estado[0]));
      } else {
        conditions.push(inArray(egresos.estado, filters.estado));
      }
    }

    if (filters?.tipoEgresoId) {
      conditions.push(eq(egresos.tipoEgresoId, filters.tipoEgresoId));
    }

    if (filters?.autorizadorId) {
      conditions.push(eq(egresos.autorizadorId, filters.autorizadorId));
    }

    if (filters?.bancoId) {
      conditions.push(eq(egresos.bancoId, filters.bancoId));
    }

    if (filters?.esBorrador !== undefined) {
      conditions.push(eq(egresos.esBorrador, filters.esBorrador));
    }

    if (filters?.estadoVerificacion) {
      conditions.push(eq(egresos.estadoVerificacion, filters.estadoVerificacion));
    }

    if (filters?.startDate) {
      conditions.push(gte(egresos.fechaRegistro, new Date(filters.startDate)));
    }

    if (filters?.endDate) {
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999);
      conditions.push(lte(egresos.fechaRegistro, endDate));
    }

    let query = db.select({ count: count() }).from(egresos);

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const result = await query;
    return result[0]?.count || 0;
  }

  // Productos methods
  async getProductos(): Promise<any[]> {
    const results = await db
      .select({
        id: productos.id,
        nombre: productos.nombre,
        sku: productos.sku,
        categoria: productos.categoria,
        marcaId: productos.marcaId,
        categoriaId: productos.categoriaId,
        subcategoriaId: productos.subcategoriaId,
        caracteristicaId: productos.caracteristicaId,
        position: productos.position,
        createdAt: productos.createdAt,
        updatedAt: productos.updatedAt,
        marcaNombre: categorias.nombre,
      })
      .from(productos)
      .leftJoin(categorias, and(eq(productos.marcaId, categorias.id), eq(categorias.tipo, 'Marca')))
      .orderBy(productos.position, productos.categoria, productos.nombre);
    
    return results;
  }

  async getProductoByNombre(nombre: string): Promise<Producto | undefined> {
    const trimmedNombre = nombre.trim();
    const [producto] = await db
      .select()
      .from(productos)
      .where(ilike(productos.nombre, trimmedNombre))
      .limit(1);
    return producto;
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

  async backupProductos(): Promise<void> {
    // First, clear existing backup
    await db.delete(productosBackup);
    
    // Then, backup all current productos
    const currentProductos = await db.select().from(productos);
    
    if (currentProductos.length > 0) {
      await db.insert(productosBackup).values(
        currentProductos.map(p => ({
          nombre: p.nombre,
          sku: p.sku,
          categoria: p.categoria,
          position: p.position,
          originalId: p.id,
          backedUpAt: new Date(),
        }))
      );
    }
  }

  async restoreProductosFromBackup(): Promise<void> {
    // Get backup products
    const backup = await db.select().from(productosBackup);
    
    if (backup.length === 0) {
      throw new Error("No backup found");
    }
    
    // Clear current productos
    await db.delete(productos);
    
    // Restore from backup
    await db.insert(productos).values(
      backup.map(p => ({
        nombre: p.nombre,
        sku: p.sku || undefined,
        categoria: p.categoria,
        position: p.position,
        createdAt: new Date(),
        updatedAt: new Date(),
      }))
    );
    
    // Clear backup after restore
    await db.delete(productosBackup);
  }

  async replaceProductos(productosData: InsertProducto[]): Promise<{ created: number }> {
    // Delete all existing productos
    await db.delete(productos);
    
    // Insert all new productos with position tracking
    const productosToInsert = productosData.map((producto, index) => ({
      ...producto,
      position: index,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    
    if (productosToInsert.length > 0) {
      await db.insert(productos).values(productosToInsert);
    }
    
    return { created: productosToInsert.length };
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

  async getCategoriaByNombreAndTipo(nombre: string, tipo: string): Promise<Categoria | undefined> {
    const [categoria] = await db
      .select()
      .from(categorias)
      .where(and(eq(categorias.nombre, nombre), eq(categorias.tipo, tipo)))
      .limit(1);
    return categoria || undefined;
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

  // Transportistas methods implementation
  async getTransportistas(): Promise<Transportista[]> {
    return await db.select().from(transportistas).orderBy(transportistas.nombre);
  }

  async createTransportista(transportista: InsertTransportista): Promise<Transportista> {
    const [newTransportista] = await db.insert(transportistas).values({
      ...transportista,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return newTransportista;
  }

  async updateTransportista(id: string, transportista: Partial<InsertTransportista>): Promise<Transportista | undefined> {
    const [updated] = await db
      .update(transportistas)
      .set({ ...transportista, updatedAt: new Date() })
      .where(eq(transportistas.id, id))
      .returning();
    return updated;
  }

  async deleteTransportista(id: string): Promise<boolean> {
    const result = await db.delete(transportistas).where(eq(transportistas.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Estados methods implementation
  async getEstados(): Promise<Estado[]> {
    return await db.select().from(estados).orderBy(estados.nombre);
  }

  async createEstado(estado: InsertEstado): Promise<Estado> {
    const [newEstado] = await db.insert(estados).values({
      ...estado,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return newEstado;
  }

  async updateEstado(id: string, estado: Partial<InsertEstado>): Promise<Estado | undefined> {
    const [updated] = await db
      .update(estados)
      .set({ ...estado, updatedAt: new Date() })
      .where(eq(estados.id, id))
      .returning();
    return updated;
  }

  async deleteEstado(id: string): Promise<boolean> {
    const result = await db.delete(estados).where(eq(estados.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Ciudades methods implementation
  async getCiudades(): Promise<Ciudad[]> {
    return await db.select().from(ciudades).orderBy(ciudades.nombre);
  }

  async getCiudadesByEstadoId(estadoId: string): Promise<Ciudad[]> {
    return await db.select().from(ciudades).where(eq(ciudades.estadoId, estadoId)).orderBy(ciudades.nombre);
  }

  async createCiudad(ciudad: InsertCiudad): Promise<Ciudad> {
    const [newCiudad] = await db.insert(ciudades).values({
      ...ciudad,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return newCiudad;
  }

  async updateCiudad(id: string, ciudad: Partial<InsertCiudad>): Promise<Ciudad | undefined> {
    const [updated] = await db
      .update(ciudades)
      .set({ ...ciudad, updatedAt: new Date() })
      .where(eq(ciudades.id, id))
      .returning();
    return updated;
  }

  async deleteCiudad(id: string): Promise<boolean> {
    const result = await db.delete(ciudades).where(eq(ciudades.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Seguimiento Config methods implementation
  async getSeguimientoConfig(tipo: string = 'prospectos'): Promise<SeguimientoConfig | undefined> {
    const [config] = await db
      .select()
      .from(seguimientoConfig)
      .where(eq(seguimientoConfig.tipo, tipo))
      .limit(1);
    return config;
  }

  async updateSeguimientoConfig(tipo: string, config: Partial<InsertSeguimientoConfig>): Promise<SeguimientoConfig> {
    // Check if a config row exists for this tipo
    const existing = await this.getSeguimientoConfig(tipo);
    
    if (existing) {
      // Update existing config
      const [updated] = await db
        .update(seguimientoConfig)
        .set({ ...config, updatedAt: new Date() })
        .where(eq(seguimientoConfig.id, existing.id))
        .returning();
      return updated;
    } else {
      // Create new config with defaults
      const [newConfig] = await db.insert(seguimientoConfig).values({
        tipo,
        diasFase1: config.diasFase1 ?? 2,
        diasFase2: config.diasFase2 ?? 4,
        diasFase3: config.diasFase3 ?? 7,
        emailRecordatorio: config.emailRecordatorio ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();
      return newConfig;
    }
  }

  // Precios methods implementation
  async getPrecios(): Promise<Precio[]> {
    return await db.select().from(precios).orderBy(desc(precios.fechaVigenciaDesde));
  }

  async getPrecioBySkuLatest(sku: string): Promise<Precio | undefined> {
    const [precio] = await db
      .select()
      .from(precios)
      .where(eq(precios.sku, sku))
      .orderBy(desc(precios.fechaVigenciaDesde))
      .limit(1);
    return precio;
  }

  async createPrecio(precio: InsertPrecio): Promise<Precio> {
    const [newPrecio] = await db.insert(precios).values({
      ...precio,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return newPrecio;
  }

  async updatePrecio(id: string, precio: Partial<InsertPrecio>): Promise<Precio | undefined> {
    const [updated] = await db
      .update(precios)
      .set({ ...precio, updatedAt: new Date() })
      .where(eq(precios.id, id))
      .returning();
    return updated;
  }

  async deletePrecio(id: string): Promise<boolean> {
    const result = await db.delete(precios).where(eq(precios.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async backupPrecios(): Promise<void> {
    // First, clear existing backup
    await db.delete(preciosBackup);
    
    // Then, backup all current precios
    const currentPrecios = await db.select().from(precios);
    
    if (currentPrecios.length > 0) {
      await db.insert(preciosBackup).values(
        currentPrecios.map(p => ({
          pais: p.pais,
          sku: p.sku,
          precioInmediataUsd: p.precioInmediataUsd,
          precioReservaUsd: p.precioReservaUsd,
          precioCasheaUsd: p.precioCasheaUsd,
          costoUnitarioUsd: p.costoUnitarioUsd,
          fechaVigenciaDesde: p.fechaVigenciaDesde,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
          originalId: p.id,
          backedUpAt: new Date(),
        }))
      );
    }
  }

  async restorePreciosFromBackup(): Promise<void> {
    // Get backup precios
    const backup = await db.select().from(preciosBackup);
    
    if (backup.length === 0) {
      throw new Error("No backup found");
    }
    
    // Clear current precios
    await db.delete(precios);
    
    // Restore from backup
    await db.insert(precios).values(
      backup.map(p => ({
        pais: p.pais,
        sku: p.sku,
        precioInmediataUsd: p.precioInmediataUsd,
        precioReservaUsd: p.precioReservaUsd,
        precioCasheaUsd: p.precioCasheaUsd,
        costoUnitarioUsd: p.costoUnitarioUsd,
        fechaVigenciaDesde: p.fechaVigenciaDesde,
        createdAt: new Date(),
        updatedAt: new Date(),
      }))
    );
  }

  async hasPreciosBackup(): Promise<boolean> {
    const backup = await db.select().from(preciosBackup).limit(1);
    return backup.length > 0;
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

  async getInstallmentsByOrder(orden: string): Promise<PaymentInstallment[]> {
    const installments = await db
      .select()
      .from(paymentInstallments)
      .where(eq(paymentInstallments.orden, orden))
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
    // Get sale info for orden field
    const sale = await this.getSaleById(saleId);
    
    // Get the next installment number by orden (not saleId) since installments are per order
    const existingInstallments = sale?.orden ? await this.getInstallmentsByOrder(sale.orden) : [];
    const nextInstallmentNumber = Math.max(0, ...existingInstallments.map(i => i.installmentNumber)) + 1;
    
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

  // Reports
  async getReporteOrdenes(filters?: {
    startDate?: string;
    endDate?: string;
  }): Promise<Array<{
    sale: Sale;
    categoria: string | null;
    bancoNombre: string | null;
    asesorNombre: string | null;
    installments: PaymentInstallment[];
    saldoPendiente: number;
  }>> {
    const whereConditions = [];

    // Date filtering
    if (filters?.startDate) {
      whereConditions.push(gte(sales.fecha, new Date(filters.startDate)));
    }
    if (filters?.endDate) {
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999);
      whereConditions.push(lte(sales.fecha, endDate));
    }

    // Fetch all sales with date filter
    const salesData = await db
      .select()
      .from(sales)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(desc(sales.fecha));

    // Fetch all necessary lookup data
    const productosData = await db.select().from(productos);
    const bancosData = await db.select().from(bancos);
    const asesoresData = await db.select().from(asesores);

    // Create lookup maps
    const productoMap = new Map(productosData.map(p => [p.nombre, p.categoria]));
    const bancoMap = new Map(bancosData.map(b => [b.id, b.banco]));
    const asesorMap = new Map(asesoresData.map(a => [a.id, a.nombre]));

    // Get all installments for these sales
    const saleIds = salesData.map(s => s.id);
    const allInstallments = saleIds.length > 0 
      ? await db
          .select()
          .from(paymentInstallments)
          .where(sql`${paymentInstallments.saleId} IN ${saleIds}`)
          .orderBy(paymentInstallments.installmentNumber)
      : [];

    // Group installments by saleId
    const installmentsBySaleId = new Map<string, PaymentInstallment[]>();
    for (const installment of allInstallments) {
      if (!installmentsBySaleId.has(installment.saleId)) {
        installmentsBySaleId.set(installment.saleId, []);
      }
      installmentsBySaleId.get(installment.saleId)!.push(installment);
    }

    // Get unique order numbers from the sales data
    const uniqueOrdersSet = new Set(salesData.map(s => s.orden).filter(o => o !== null));
    const uniqueOrders = Array.from(uniqueOrdersSet) as string[];

    // Fetch saldoPendiente from Pagos calculation for all orders
    // This ensures consistency with the Pagos tab
    const saldoPendienteMap = new Map<string, number>();
    
    if (uniqueOrders.length > 0) {
      // Get payment summary for all orders (no filters other than orders themselves)
      const ordersData = await this.getOrdersForPayments({
        limit: 999999,
        offset: 0,
        excludePerdida: false, // Include all orders regardless of status for report
      });

      // Build map of orden -> saldoPendiente
      for (const order of ordersData.data) {
        if (uniqueOrders.includes(order.orden)) {
          saldoPendienteMap.set(order.orden, order.saldoPendiente);
        }
      }
    }

    // Build result array
    return salesData.map(sale => ({
      sale,
      categoria: productoMap.get(sale.product) || null,
      bancoNombre: sale.bancoReceptorInicial ? bancoMap.get(sale.bancoReceptorInicial) || null : null,
      asesorNombre: sale.asesorId ? asesorMap.get(sale.asesorId) || null : null,
      installments: installmentsBySaleId.get(sale.id) || [],
      saldoPendiente: sale.orden ? (saldoPendienteMap.get(sale.orden) ?? 0) : 0,
    }));
  }

  async getReportePerdidas(filters?: {
    startDate?: string;
    endDate?: string;
  }): Promise<Array<{
    sale: Sale;
    categoria: string | null;
    bancoNombre: string | null;
    asesorNombre: string | null;
    installments: PaymentInstallment[];
    saldoPendiente: number;
  }>> {
    const whereConditions = [eq(sales.estadoEntrega, 'Perdida')];

    // Date filtering
    if (filters?.startDate) {
      whereConditions.push(gte(sales.fecha, new Date(filters.startDate)));
    }
    if (filters?.endDate) {
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999);
      whereConditions.push(lte(sales.fecha, endDate));
    }

    // Fetch all Perdida sales with date filter
    const salesData = await db
      .select()
      .from(sales)
      .where(and(...whereConditions))
      .orderBy(desc(sales.fecha));

    // Fetch all necessary lookup data
    const productosData = await db.select().from(productos);
    const bancosData = await db.select().from(bancos);
    const asesoresData = await db.select().from(asesores);

    // Create lookup maps
    const productoMap = new Map(productosData.map(p => [p.nombre, p.categoria]));
    const bancoMap = new Map(bancosData.map(b => [b.id, b.banco]));
    const asesorMap = new Map(asesoresData.map(a => [a.id, a.nombre]));

    // Get all installments for these sales
    const saleIds = salesData.map(s => s.id);
    const allInstallments = saleIds.length > 0 
      ? await db
          .select()
          .from(paymentInstallments)
          .where(sql`${paymentInstallments.saleId} IN ${saleIds}`)
          .orderBy(paymentInstallments.installmentNumber)
      : [];

    // Group installments by saleId
    const installmentsBySaleId = new Map<string, PaymentInstallment[]>();
    for (const installment of allInstallments) {
      if (!installmentsBySaleId.has(installment.saleId)) {
        installmentsBySaleId.set(installment.saleId, []);
      }
      installmentsBySaleId.get(installment.saleId)!.push(installment);
    }

    // Get unique order numbers from the sales data
    const uniqueOrdersSet = new Set(salesData.map(s => s.orden).filter(o => o !== null));
    const uniqueOrders = Array.from(uniqueOrdersSet) as string[];

    // Fetch saldoPendiente from Pagos calculation for all orders
    const saldoPendienteMap = new Map<string, number>();
    
    if (uniqueOrders.length > 0) {
      const ordersData = await this.getOrdersForPayments({
        limit: 999999,
        offset: 0,
        excludePerdida: false,
      });

      for (const order of ordersData.data) {
        if (uniqueOrders.includes(order.orden)) {
          saldoPendienteMap.set(order.orden, order.saldoPendiente);
        }
      }
    }

    // Build result array
    return salesData.map(sale => ({
      sale,
      categoria: productoMap.get(sale.product) || null,
      bancoNombre: sale.bancoReceptorInicial ? bancoMap.get(sale.bancoReceptorInicial) || null : null,
      asesorNombre: sale.asesorId ? asesorMap.get(sale.asesorId) || null : null,
      installments: installmentsBySaleId.get(sale.id) || [],
      saldoPendiente: sale.orden ? (saldoPendienteMap.get(sale.orden) ?? 0) : 0,
    }));
  }

  async getReporteProspectosPerdidos(filters?: {
    startDate?: string;
    endDate?: string;
  }): Promise<Array<{
    prospecto: Prospecto;
    asesorNombre: string | null;
  }>> {
    const whereConditions = [eq(prospectos.estadoProspecto, 'Perdido')];

    // Date filtering on fechaCreacion
    if (filters?.startDate) {
      whereConditions.push(gte(prospectos.fechaCreacion, new Date(filters.startDate)));
    }
    if (filters?.endDate) {
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999);
      whereConditions.push(lte(prospectos.fechaCreacion, endDate));
    }

    // Fetch all Perdido prospectos with date filter
    const prospectosData = await db
      .select()
      .from(prospectos)
      .where(and(...whereConditions))
      .orderBy(desc(prospectos.fechaCreacion));

    // Fetch asesores for lookup
    const asesoresData = await db.select().from(asesores);

    // Create lookup map
    const asesorMap = new Map(asesoresData.map(a => [a.id, a.nombre]));

    // Build result array
    return prospectosData.map(prospecto => ({
      prospecto,
      asesorNombre: prospecto.asesorId ? asesorMap.get(prospecto.asesorId) || null : null,
    }));
  }

  /**
   * Get verification payments for Ingresos table
   * 
   * CRITICAL BUSINESS RULE - Payment Amount Calculations:
   * - Returns PAGO USD fields (agreed amounts) for metric calculations: pagoInicialUsd, pagoFleteUsd, pagoCuotaUsd
   * - MONTO USD/BS fields are ONLY for verification purposes with bank statements, NOT for calculations
   * - A payment is counted only if it has: Pago USD + Banco Receptor + Referencia
   */
  async getVerificationPayments(filters?: {
    startDate?: string;
    endDate?: string;
    bancoId?: string;
    orden?: string;
    tipoPago?: string;
    estadoVerificacion?: string;
    estadoEntrega?: string[];
    limit?: number;
    offset?: number;
  }): Promise<{ data: any[]; total: number }> {
    const payments: any[] = [];

    // Build the base query with filters
    const whereConditions = [];
    
    // Optional estado_entrega filter - if provided, filter by those statuses
    // If not provided, show all orders regardless of delivery status
    if (filters?.estadoEntrega && filters.estadoEntrega.length > 0) {
      whereConditions.push(
        or(...filters.estadoEntrega.map(status => eq(sales.estadoEntrega, status)))
      );
    }
    
    // Order filter
    if (filters?.orden) {
      whereConditions.push(eq(sales.orden, filters.orden));
    }

    let salesQuery = db
      .select({
        orden: sales.orden,
        saleId: sales.id,
        nombre: sales.nombre,
        canal: sales.canal,
        pagoInicialUsd: sales.pagoInicialUsd,
        fechaPagoInicial: sales.fechaPagoInicial,
        bancoReceptorInicial: sales.bancoReceptorInicial,
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
        montoFleteUsd: sales.montoFleteUsd,
        estadoVerificacionFlete: sales.estadoVerificacionFlete,
        notasVerificacionFlete: sales.notasVerificacionFlete,
        estadoEntrega: sales.estadoEntrega,
      })
      .from(sales)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

    const salesData = await salesQuery;

    // Track which orders have already had their Pago Inicial and Flete payments added
    // to prevent duplicates (since these are order-level payments, not product-level)
    const processedPagoInicial = new Set<string>();
    const processedFlete = new Set<string>();

    // Process Pago Inicial payments
    for (const sale of salesData) {
      // COMPLETE PAYMENT CRITERIA: Must have agreed amount (pagoInicialUsd) + Banco + Referencia
      // Note: Customers can pay in Bs or USD, so we check agreed amount, not actual Monto USD
      const hasAgreedAmount = sale.pagoInicialUsd && parseFloat(sale.pagoInicialUsd) > 0;
      
      if (hasAgreedAmount) {
        // Only show payments with both Banco Receptor AND Referencia filled
        const hasCompletePaymentInfo = sale.bancoReceptorInicial && sale.referenciaInicial;
        
        // Skip if we've already processed Pago Inicial for this order (prevents duplicates)
        const alreadyProcessed = sale.orden && processedPagoInicial.has(sale.orden);
        
        // Apply filters
        const matchesTipoPago = !filters?.tipoPago || filters.tipoPago === 'Inicial/Total';
        const matchesStartDate = !filters?.startDate || !sale.fechaPagoInicial || sale.fechaPagoInicial >= new Date(filters.startDate);
        const matchesEndDate = !filters?.endDate || !sale.fechaPagoInicial || (() => {
          const endDateTime = new Date(filters.endDate);
          endDateTime.setHours(23, 59, 59, 999);
          return sale.fechaPagoInicial <= endDateTime;
        })();
        const matchesBanco = !filters?.bancoId || sale.bancoReceptorInicial === filters.bancoId;
        
        // Filter by estadoVerificacion
        const estadoVerificacionInicial = sale.estadoVerificacionInicial || 'Por verificar';
        const matchesEstadoVerificacion = !filters?.estadoVerificacion || estadoVerificacionInicial === filters.estadoVerificacion;

        // Only add if all conditions pass
        if (hasCompletePaymentInfo && !alreadyProcessed && matchesTipoPago && matchesStartDate && matchesEndDate && matchesBanco && matchesEstadoVerificacion) {
          payments.push({
            paymentId: sale.saleId,
            paymentType: 'Inicial/Total',
            orden: sale.orden,
            nombre: sale.nombre,
            canal: sale.canal,
            tipoPago: 'Inicial/Total',
            montoBs: sale.montoInicialBs ? parseFloat(sale.montoInicialBs) : null,
            montoUsd: sale.pagoInicialUsd ? parseFloat(sale.pagoInicialUsd) : null, // Use agreed amount (Pago USD) for calculations
            referencia: sale.referenciaInicial,
            bancoId: sale.bancoReceptorInicial,
            estadoVerificacion: sale.estadoVerificacionInicial || 'Por verificar',
            notasVerificacion: sale.notasVerificacionInicial,
            fecha: sale.fechaPagoInicial,
          });
          
          // Mark this order as processed for Pago Inicial
          if (sale.orden) processedPagoInicial.add(sale.orden);
        }
      }

      // Process Flete payments
      // COMPLETE PAYMENT CRITERIA: Must have agreed amount (pagoFleteUsd) + Banco + Referencia
      // Note: Customers can pay in Bs or USD, so we check agreed amount, not actual Monto USD
      const hasAgreedFleteAmount = sale.pagoFleteUsd && parseFloat(sale.pagoFleteUsd) > 0;
      
      if (hasAgreedFleteAmount) {
        // Only show payments with both Banco Receptor AND Referencia filled
        if (!sale.bancoReceptorFlete || !sale.referenciaFlete) {
          continue;
        }
        
        // Skip if we've already processed Flete for this order (prevents duplicates)
        if (sale.orden && processedFlete.has(sale.orden)) {
          continue;
        }
        
        // Apply filters
        if (filters?.tipoPago && filters.tipoPago !== 'Flete') {
          continue;
        }
        if (filters?.startDate && sale.fechaFlete && sale.fechaFlete < new Date(filters.startDate)) {
          continue;
        }
        if (filters?.endDate && sale.fechaFlete) {
          const endDateTime = new Date(filters.endDate);
          endDateTime.setHours(23, 59, 59, 999);
          if (sale.fechaFlete > endDateTime) {
            continue;
          }
        }
        if (filters?.bancoId && sale.bancoReceptorFlete !== filters.bancoId) {
          continue;
        }
        
        // Filter by estadoVerificacion
        const estadoVerificacionFlete = sale.estadoVerificacionFlete || 'Por verificar';
        if (filters?.estadoVerificacion && estadoVerificacionFlete !== filters.estadoVerificacion) {
          continue;
        }

        payments.push({
          paymentId: sale.saleId,
          paymentType: 'Flete',
          orden: sale.orden,
          nombre: sale.nombre,
          canal: sale.canal,
          tipoPago: 'Flete',
          montoBs: sale.montoFleteBs ? parseFloat(sale.montoFleteBs) : null,
          montoUsd: sale.pagoFleteUsd ? parseFloat(sale.pagoFleteUsd) : null, // Use agreed amount (Pago USD) for calculations
          referencia: sale.referenciaFlete,
          bancoId: sale.bancoReceptorFlete,
          estadoVerificacion: sale.estadoVerificacionFlete || 'Por verificar',
          notasVerificacion: sale.notasVerificacionFlete,
          fecha: sale.fechaFlete,
        });
        
        // Mark this order as processed for Flete
        if (sale.orden) processedFlete.add(sale.orden);
      }
    }

    // Process Cuota payments
    // Need to join with sales to get nombre and canal for display
    let cuotasQuery = db
      .select({
        installmentId: paymentInstallments.id,
        saleId: paymentInstallments.saleId,
        orden: paymentInstallments.orden,
        nombre: sales.nombre,
        canal: sales.canal,
        installmentNumber: paymentInstallments.installmentNumber,
        fecha: paymentInstallments.fecha,
        cuotaAmount: paymentInstallments.cuotaAmount, // Legacy USD field (fallback)
        cuotaAmountBs: paymentInstallments.cuotaAmountBs, // Legacy Bs field (fallback)
        pagoCuotaUsd: paymentInstallments.pagoCuotaUsd, // Agreed payment (for condition)
        montoCuotaUsd: paymentInstallments.montoCuotaUsd, // Actual USD payment (for display)
        montoCuotaBs: paymentInstallments.montoCuotaBs, // Actual Bs payment (for display)
        referencia: paymentInstallments.referencia,
        bancoReceptorCuota: paymentInstallments.bancoReceptorCuota,
        estadoVerificacion: paymentInstallments.estadoVerificacion,
        notasVerificacion: paymentInstallments.notasVerificacion,
      })
      .from(paymentInstallments)
      .leftJoin(sales, eq(paymentInstallments.saleId, sales.id))
      .where(
        filters?.orden ? eq(paymentInstallments.orden, filters.orden) : undefined
      );

    const cuotasData = await cuotasQuery;

    for (const cuota of cuotasData) {
      // COMPLETE PAYMENT CRITERIA: Must have agreed amount (pagoCuotaUsd) + Banco + Referencia
      // Note: Customers can pay in Bs or USD, so we check agreed amount, not actual Monto USD
      const hasAgreedCuotaAmount = cuota.pagoCuotaUsd && parseFloat(cuota.pagoCuotaUsd) > 0;
      
      if (!hasAgreedCuotaAmount) continue;
      
      // Only show payments with both Banco Receptor AND Referencia filled
      if (!cuota.bancoReceptorCuota || !cuota.referencia) continue;
      
      // Apply filters
      if (filters?.tipoPago && filters.tipoPago !== 'Cuota') continue;
      if (filters?.startDate && cuota.fecha && cuota.fecha < new Date(filters.startDate)) continue;
      if (filters?.endDate && cuota.fecha && cuota.fecha > new Date(filters.endDate)) continue;
      if (filters?.bancoId && cuota.bancoReceptorCuota !== filters.bancoId) continue;
      
      // Filter by estadoVerificacion
      const estadoVerificacionCuota = cuota.estadoVerificacion || 'Por verificar';
      if (filters?.estadoVerificacion && estadoVerificacionCuota !== filters.estadoVerificacion) continue;

      payments.push({
        paymentId: cuota.installmentId,
        paymentType: 'Cuota',
        orden: cuota.orden,
        nombre: cuota.nombre,
        canal: cuota.canal,
        tipoPago: `Cuota ${cuota.installmentNumber}`,
        montoBs: cuota.montoCuotaBs ? parseFloat(cuota.montoCuotaBs) : (cuota.cuotaAmountBs ? parseFloat(cuota.cuotaAmountBs) : null),
        montoUsd: cuota.pagoCuotaUsd ? parseFloat(cuota.pagoCuotaUsd) : null, // Use agreed amount (Pago USD) for calculations
        referencia: cuota.referencia,
        bancoId: cuota.bancoReceptorCuota,
        estadoVerificacion: cuota.estadoVerificacion || 'Por verificar',
        notasVerificacion: cuota.notasVerificacion,
        fecha: cuota.fecha,
      });
    }

    // Sort by date (oldest first), then by orden (to group same-order payments)
    const sortedPayments = payments.sort((a, b) => {
      // Payments without dates go to the end
      if (!a.fecha) return 1;
      if (!b.fecha) return -1;
      
      // Primary sort: by date (oldest first)
      const dateComparison = new Date(a.fecha).getTime() - new Date(b.fecha).getTime();
      if (dateComparison !== 0) return dateComparison;
      
      // Secondary sort: by orden (to group payments from same order)
      if (!a.orden) return 1;
      if (!b.orden) return -1;
      return a.orden.localeCompare(b.orden);
    });

    // Apply pagination
    const total = sortedPayments.length;
    const limit = filters?.limit || 20;
    const offset = filters?.offset || 0;
    const paginatedPayments = sortedPayments.slice(offset, offset + limit);

    return {
      data: paginatedPayments,
      total,
    };
  }

  async updatePaymentVerification(data: {
    paymentId: string;
    paymentType: string;
    estadoVerificacion?: string;
    notasVerificacion?: string;
  }): Promise<boolean> {
    const { paymentId, paymentType, estadoVerificacion, notasVerificacion } = data;

    if (paymentType === 'Inicial/Total') {
      const updated = await db
        .update(sales)
        .set({
          estadoVerificacionInicial: estadoVerificacion,
          notasVerificacionInicial: notasVerificacion,
          updatedAt: new Date(),
        })
        .where(eq(sales.id, paymentId))
        .returning();
      return updated.length > 0;
    } else if (paymentType === 'Flete') {
      const updated = await db
        .update(sales)
        .set({
          estadoVerificacionFlete: estadoVerificacion,
          notasVerificacionFlete: notasVerificacion,
          updatedAt: new Date(),
        })
        .where(eq(sales.id, paymentId))
        .returning();
      return updated.length > 0;
    } else if (paymentType === 'Cuota') {
      const updated = await db
        .update(paymentInstallments)
        .set({
          estadoVerificacion: estadoVerificacion,
          notasVerificacion: notasVerificacion,
          updatedAt: new Date(),
        })
        .where(eq(paymentInstallments.id, paymentId))
        .returning();
      return updated.length > 0;
    }

    return false;
  }

  // Prospectos methods
  async getProspectos(filters?: {
    asesorId?: string;
    estadoProspecto?: string;
    canal?: string;
    canalMompox?: string; // Filter for ShopMom OR canals containing "MP"
    canalBoxi?: string; // Filter for Boxi channels (exclude ShopMom and MP)
    prospecto?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }): Promise<Prospecto[]> {
    const whereConditions = [];

    if (filters?.asesorId) {
      whereConditions.push(eq(prospectos.asesorId, filters.asesorId));
    }

    // Default to 'Activo' if no estadoProspecto filter is provided
    const estadoFilter = filters?.estadoProspecto || 'Activo';
    whereConditions.push(eq(prospectos.estadoProspecto, estadoFilter));

    if (filters?.canalMompox === "true") {
      // Filter for ShopMom OR any canal containing "MP" (Manual MP, Cashea MP, Tienda MP)
      whereConditions.push(
        or(
          eq(prospectos.canal, "ShopMom"),
          like(prospectos.canal, "%MP%")
        )
      );
    } else if (filters?.canalBoxi === "true") {
      // Filter for Boxi channels (exclude ShopMom and any canal containing "MP")
      whereConditions.push(sql`${prospectos.canal} != 'ShopMom' AND ${prospectos.canal} NOT LIKE '%MP%'`);
    } else if (filters?.canal) {
      whereConditions.push(ilike(prospectos.canal, filters.canal));
    }

    if (filters?.prospecto) {
      whereConditions.push(ilike(prospectos.prospecto, `%${filters.prospecto}%`));
    }

    if (filters?.startDate) {
      whereConditions.push(gte(prospectos.fechaCreacion, new Date(filters.startDate)));
    }

    if (filters?.endDate) {
      whereConditions.push(lte(prospectos.fechaCreacion, new Date(filters.endDate)));
    }

    return await db
      .select()
      .from(prospectos)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(desc(prospectos.fechaCreacion))
      .limit(filters?.limit || 1000)
      .offset(filters?.offset || 0);
  }

  async getProspectoById(id: string): Promise<Prospecto | undefined> {
    const result = await db
      .select()
      .from(prospectos)
      .where(eq(prospectos.id, id))
      .limit(1);
    return result[0];
  }

  async createProspecto(prospecto: InsertProspecto): Promise<Prospecto> {
    const prospectoNumber = await this.getNextProspectoNumber();
    const [newProspecto] = await db
      .insert(prospectos)
      .values({
        ...prospecto,
        prospecto: prospectoNumber,
      })
      .returning();
    return newProspecto;
  }

  async updateProspecto(id: string, prospecto: Partial<InsertProspecto>): Promise<Prospecto | undefined> {
    const [updated] = await db
      .update(prospectos)
      .set({
        ...prospecto,
        updatedAt: new Date(),
      })
      .where(eq(prospectos.id, id))
      .returning();
    return updated;
  }

  async deleteProspecto(id: string): Promise<boolean> {
    const result = await db
      .delete(prospectos)
      .where(eq(prospectos.id, id))
      .returning();
    return result.length > 0;
  }

  async getTotalProspectosCount(filters?: {
    asesorId?: string;
    estadoProspecto?: string;
    canal?: string;
    canalMompox?: string; // Filter for ShopMom OR canals containing "MP"
    canalBoxi?: string; // Filter for Boxi channels (exclude ShopMom and MP)
    prospecto?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<number> {
    const whereConditions = [];

    if (filters?.asesorId) {
      whereConditions.push(eq(prospectos.asesorId, filters.asesorId));
    }

    // Default to 'Activo' if no estadoProspecto filter is provided
    const estadoFilter = filters?.estadoProspecto || 'Activo';
    whereConditions.push(eq(prospectos.estadoProspecto, estadoFilter));

    if (filters?.canalMompox === "true") {
      // Filter for ShopMom OR any canal containing "MP" (Manual MP, Cashea MP, Tienda MP)
      whereConditions.push(
        or(
          eq(prospectos.canal, "ShopMom"),
          like(prospectos.canal, "%MP%")
        )
      );
    } else if (filters?.canalBoxi === "true") {
      // Filter for Boxi channels (exclude ShopMom and any canal containing "MP")
      whereConditions.push(sql`${prospectos.canal} != 'ShopMom' AND ${prospectos.canal} NOT LIKE '%MP%'`);
    } else if (filters?.canal) {
      whereConditions.push(ilike(prospectos.canal, filters.canal));
    }

    if (filters?.prospecto) {
      whereConditions.push(ilike(prospectos.prospecto, `%${filters.prospecto}%`));
    }

    if (filters?.startDate) {
      whereConditions.push(gte(prospectos.fechaCreacion, new Date(filters.startDate)));
    }

    if (filters?.endDate) {
      whereConditions.push(lte(prospectos.fechaCreacion, new Date(filters.endDate)));
    }

    const result = await db
      .select({ count: count() })
      .from(prospectos)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);
    
    return result[0]?.count || 0;
  }

  async getNextProspectoNumber(): Promise<string> {
    // Get the latest prospecto number
    const latestProspecto = await db
      .select({ prospecto: prospectos.prospecto })
      .from(prospectos)
      .orderBy(desc(prospectos.prospecto))
      .limit(1);

    if (latestProspecto.length === 0) {
      return 'P-0001';
    }

    // Extract the number from the prospecto (e.g., "P-0001" -> 1)
    const lastNumber = parseInt(latestProspecto[0].prospecto.split('-')[1]);
    const nextNumber = lastNumber + 1;

    // Format with leading zeros (e.g., 2 -> "P-0002")
    return `P-${nextNumber.toString().padStart(4, '0')}`;
  }
}

export const storage = new DatabaseStorage();
