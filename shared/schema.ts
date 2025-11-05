import { sql } from "drizzle-orm";
import { pgTable, pgSequence, text, varchar, decimal, timestamp, integer, boolean, index, unique, check, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Sequence for egresos correlative numbering
export const egresosNumeroSeq = pgSequence("egresos_numero_seq", {
  startWith: 1001,
  cache: 1,
});

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

// Admin configuration tables
export const bancos = pgTable("bancos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  banco: text("banco").notNull(),
  numeroCuenta: text("numero_cuenta").notNull(),
  tipo: text("tipo").notNull().default("Receptor"),
  monedaId: varchar("moneda_id"),
  metodoPagoId: varchar("metodo_pago_id"),
  position: integer("position"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  tipoCheck: check("tipo_check", sql`${table.tipo} IN ('Receptor', 'Emisor')`),
}));

export const bancosBackup = pgTable("bancos_backup", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  banco: text("banco").notNull(),
  numeroCuenta: text("numero_cuenta").notNull(),
  tipo: text("tipo").notNull().default("Receptor"),
  monedaId: varchar("moneda_id"),
  metodoPagoId: varchar("metodo_pago_id"),
  position: integer("position"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
  originalId: varchar("original_id"),
  backedUpAt: timestamp("backed_up_at").defaultNow(),
});

export const tiposEgresos = pgTable("tipos_egresos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nombre: text("nombre").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const productos = pgTable("productos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nombre: text("nombre").notNull().unique(),
  sku: text("sku").unique(),
  categoria: text("categoria"), // Legacy field - kept for backward compatibility
  marcaId: varchar("marca_id"),
  categoriaId: varchar("categoria_id"),
  subcategoriaId: varchar("subcategoria_id"),
  caracteristicaId: varchar("caracteristica_id"),
  position: integer("position"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const productosBackup = pgTable("productos_backup", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nombre: text("nombre").notNull(),
  sku: text("sku"),
  categoria: text("categoria"), // Legacy field - kept for backward compatibility
  marcaId: varchar("marca_id"),
  categoriaId: varchar("categoria_id"),
  subcategoriaId: varchar("subcategoria_id"),
  caracteristicaId: varchar("caracteristica_id"),
  position: integer("position"),
  originalId: varchar("original_id"),
  backedUpAt: timestamp("backed_up_at").defaultNow(),
});

export const metodosPago = pgTable("metodos_pago", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nombre: text("nombre").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const monedas = pgTable("monedas", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  codigo: text("codigo").notNull().unique(),
  nombre: text("nombre").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const categorias = pgTable("categorias", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nombre: text("nombre").notNull(),
  tipo: text("tipo").notNull().default("Categoría"), // Marca, Categoría, Subcategoría, Característica
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  tipoCheck: check("tipo_check", sql`${table.tipo} IN ('Marca', 'Categoría', 'Subcategoría', 'Característica')`),
  nombreTipoUnique: unique("nombre_tipo_unique").on(table.nombre, table.tipo),
}));

export const canales = pgTable("canales", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nombre: text("nombre").notNull().unique(),
  activo: text("activo").notNull().default("true"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const asesores = pgTable("asesores", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nombre: text("nombre").notNull().unique(),
  activo: boolean("activo").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const transportistas = pgTable("transportistas", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nombre: text("nombre").notNull(),
  telefono: text("telefono"),
  email: text("email"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const estados = pgTable("estados", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nombre: text("nombre").notNull().unique(),
  activo: boolean("activo").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const ciudades = pgTable("ciudades", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nombre: text("nombre").notNull(),
  estadoId: varchar("estado_id").notNull(),
  activo: boolean("activo").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  nombreEstadoUnique: unique("nombre_estado_unique").on(table.nombre, table.estadoId),
}));

export const seguimientoConfig = pgTable("seguimiento_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tipo: text("tipo").notNull().default("prospectos"), // prospectos, ordenes
  diasFase1: integer("dias_fase_1").notNull().default(2),
  diasFase2: integer("dias_fase_2").notNull().default(4),
  diasFase3: integer("dias_fase_3").notNull().default(7),
  emailRecordatorio: text("email_recordatorio"),
  asesorEmails: jsonb("asesor_emails").$type<Array<{ asesorId: string; email: string }>>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  tipoCheck: check("tipo_check", sql`${table.tipo} IN ('prospectos', 'ordenes')`),
  tipoUnique: unique().on(table.tipo),
}));

export const precios = pgTable("precios", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  pais: text("pais").notNull().default("Venezuela"),
  sku: text("sku").notNull(),
  precioInmediataUsd: decimal("precio_inmediata_usd", { precision: 10, scale: 2 }).notNull(),
  precioReservaUsd: decimal("precio_reserva_usd", { precision: 10, scale: 2 }).notNull(),
  precioCasheaUsd: decimal("precio_cashea_usd", { precision: 10, scale: 2 }).notNull(),
  costoUnitarioUsd: decimal("costo_unitario_usd", { precision: 10, scale: 2 }).notNull(),
  fechaVigenciaDesde: timestamp("fecha_vigencia_desde").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const preciosBackup = pgTable("precios_backup", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  pais: text("pais").notNull(),
  sku: text("sku").notNull(),
  precioInmediataUsd: decimal("precio_inmediata_usd", { precision: 10, scale: 2 }).notNull(),
  precioReservaUsd: decimal("precio_reserva_usd", { precision: 10, scale: 2 }).notNull(),
  precioCasheaUsd: decimal("precio_cashea_usd", { precision: 10, scale: 2 }).notNull(),
  costoUnitarioUsd: decimal("costo_unitario_usd", { precision: 10, scale: 2 }).notNull(),
  fechaVigenciaDesde: timestamp("fecha_vigencia_desde").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
  originalId: varchar("original_id"),
  backedUpAt: timestamp("backed_up_at").defaultNow(),
});

export const sales = pgTable("sales", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nombre: text("nombre").notNull(),
  cedula: text("cedula"),
  telefono: text("telefono"),
  email: text("email"),
  totalUsd: decimal("total_usd", { precision: 10, scale: 2 }).notNull(),
  totalOrderUsd: decimal("total_order_usd", { precision: 10, scale: 2 }),
  fecha: timestamp("fecha").notNull(),
  canal: text("canal").notNull(), // cashea, shopify, treble
  estadoPagoInicial: text("estado_pago_inicial"),
  pagoInicialUsd: decimal("pago_inicial_usd", { precision: 10, scale: 2 }),
  fechaPagoInicial: timestamp("fecha_pago_inicial"),
  metodoPagoId: varchar("metodo_pago_id"),
  bancoReceptorInicial: varchar("banco_receptor_inicial"),
  orden: text("orden"),
  factura: text("factura"),
  referenciaInicial: text("referencia_inicial"),
  montoInicialBs: decimal("monto_inicial_bs", { precision: 15, scale: 2 }),
  montoInicialUsd: decimal("monto_inicial_usd", { precision: 15, scale: 2 }),
  estadoEntrega: text("estado_entrega").notNull().default("Pendiente"), // Pendiente, Perdida, En proceso, A despachar, En tránsito, Entregado, A devolver, Devuelto, Cancelada
  product: text("product").notNull(),
  sku: text("sku"), // Manual override SKU or SKU from Shopify orders
  cantidad: integer("cantidad").notNull(),
  // Direcciones
  direccionFacturacionPais: text("direccion_facturacion_pais"),
  direccionFacturacionEstado: text("direccion_facturacion_estado"),
  direccionFacturacionCiudad: text("direccion_facturacion_ciudad"),
  direccionFacturacionDireccion: text("direccion_facturacion_direccion"),
  direccionFacturacionUrbanizacion: text("direccion_facturacion_urbanizacion"),
  direccionFacturacionReferencia: text("direccion_facturacion_referencia"),
  direccionDespachoIgualFacturacion: text("direccion_despacho_igual_facturacion").default("true"),
  direccionDespachoPais: text("direccion_despacho_pais"),
  direccionDespachoEstado: text("direccion_despacho_estado"),
  direccionDespachoCiudad: text("direccion_despacho_ciudad"),
  direccionDespachoDireccion: text("direccion_despacho_direccion"),
  direccionDespachoUrbanizacion: text("direccion_despacho_urbanizacion"),
  direccionDespachoReferencia: text("direccion_despacho_referencia"),
  // Flete
  fleteAPagar: decimal("flete_a_pagar", { precision: 10, scale: 2 }), // Amount that SHOULD be paid for freight
  montoFleteUsd: decimal("monto_flete_usd", { precision: 10, scale: 2 }),
  fechaFlete: timestamp("fecha_flete"),
  pagoFleteUsd: decimal("pago_flete_usd", { precision: 10, scale: 2 }),
  referenciaFlete: text("referencia_flete"),
  montoFleteBs: decimal("monto_flete_bs", { precision: 15, scale: 2 }),
  bancoReceptorFlete: text("banco_receptor_flete"),
  statusFlete: text("status_flete"), // Pendiente, En Proceso, A Despacho
  fleteGratis: boolean("flete_gratis").default(false),
  // Tipo y fecha de entrega para Reservas
  tipo: text("tipo").notNull().default("Inmediato"), // Inmediato, Reserva
  fechaEntrega: timestamp("fecha_entrega"),
  // Notas adicionales
  notas: text("notas"),
  // Medida especial (custom measurement for manual sales)
  medidaEspecial: varchar("medida_especial", { length: 10 }),
  // Obsequio (gift item)
  esObsequio: boolean("es_obsequio").default(false),
  // Asesor asignado
  asesorId: varchar("asesor_id"),
  // Transportista asignado
  transportistaId: varchar("transportista_id"),
  // Shipping tracking
  nroGuia: varchar("nro_guia", { length: 100 }),
  fechaDespacho: varchar("fecha_despacho", { length: 10 }),
  fechaCliente: varchar("fecha_cliente", { length: 10 }),
  fechaDevolucion: varchar("fecha_devolucion", { length: 10 }),
  datosDevolucion: text("datos_devolucion"),
  tipoDevolucion: text("tipo_devolucion"),
  // Email tracking
  emailSentAt: timestamp("email_sent_at"),
  emailFleteSentAt: timestamp("email_flete_sent_at"),
  // Verification fields for Pago Inicial
  estadoVerificacionInicial: text("estado_verificacion_inicial").default("Por verificar"), // Por verificar, Verificado, Rechazado
  notasVerificacionInicial: text("notas_verificacion_inicial"),
  // Verification fields for Flete
  estadoVerificacionFlete: text("estado_verificacion_flete").default("Por verificar"), // Por verificar, Verificado, Rechazado
  notasVerificacionFlete: text("notas_verificacion_flete"),
  // Follow-up tracking (for pending orders) - stored as YYYY-MM-DD strings
  fechaSeguimiento1: text("fecha_seguimiento1"),
  respuestaSeguimiento1: text("respuesta_seguimiento1"),
  fechaSeguimiento2: text("fecha_seguimiento2"),
  respuestaSeguimiento2: text("respuesta_seguimiento2"),
  fechaSeguimiento3: text("fecha_seguimiento3"),
  respuestaSeguimiento3: text("respuesta_seguimiento3"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Check constraint to enforce tipo values
  tipoCheck: check("tipo_check", sql`${table.tipo} IN ('Inmediato', 'Reserva')`),
  // Check constraint to enforce estadoEntrega values
  estadoEntregaCheck: check("estado_entrega_check", sql`${table.estadoEntrega} IN ('Pendiente', 'Perdida', 'En proceso', 'A despachar', 'En tránsito', 'Entregado', 'A devolver', 'Devuelto', 'Cancelada')`),
  // Index for performance on asesor queries
  asesorIdIdx: index("sales_asesor_id_idx").on(table.asesorId),
}));

export const paymentInstallments = pgTable("payment_installments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  saleId: varchar("sale_id").notNull(),
  orden: text("orden"), // Duplicated for faster queries
  installmentNumber: integer("installment_number").notNull(), // 1, 2, 3, etc.
  fecha: timestamp("fecha"), // Payment date
  cuotaAmount: decimal("cuota_amount", { precision: 10, scale: 2 }), // Payment amount USD (legacy - kept for backward compatibility)
  cuotaAmountBs: decimal("cuota_amount_bs", { precision: 15, scale: 2 }), // Payment amount BS (legacy - kept for backward compatibility)
  saldoRemaining: decimal("saldo_remaining", { precision: 10, scale: 2 }), // Balance after payment
  referencia: text("referencia"), // Payment reference
  bancoReceptorCuota: varchar("banco_receptor_cuota"), // Banco Receptor used for payment
  pagoCuotaUsd: decimal("pago_cuota_usd", { precision: 10, scale: 2 }), // Agreed payment amount in USD (required to save modal)
  montoCuotaUsd: decimal("monto_cuota_usd", { precision: 10, scale: 2 }), // Actual payment amount in USD (displayed in Verificación)
  montoCuotaBs: decimal("monto_cuota_bs", { precision: 15, scale: 2 }), // Actual payment amount in Bs (displayed in Verificación)
  verificado: boolean("verificado").default(true), // Whether payment is verified
  // Verification fields for Cuotas
  estadoVerificacion: text("estado_verificacion").default("Por verificar"), // Por verificar, Verificado, Rechazado
  notasVerificacion: text("notas_verificacion"),
  // Email tracking for installment payments
  emailSentAt: timestamp("email_sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Unique constraint to prevent duplicate installment numbers per sale
  uniqueSaleInstallment: unique().on(table.saleId, table.installmentNumber),
  // Index for performance on common queries
  saleIdIdx: index("payment_installments_sale_id_idx").on(table.saleId),
  ordenIdx: index("payment_installments_orden_idx").on(table.orden),
}));

export const uploadHistory = pgTable("upload_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  filename: text("filename").notNull(),
  canal: text("canal").notNull(),
  recordsCount: integer("records_count").notNull(),
  status: text("status").notNull(), // success, error
  errorMessage: text("error_message"),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

export const casheaAutomationConfig = pgTable("cashea_automation_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  enabled: boolean("enabled").notNull().default(false),
  frequency: text("frequency").notNull().default("2 hours"), // 30 minutes, 1 hour, 2 hours, 4 hours, 8 hours, 16 hours, 24 hours
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const casheaAutomaticDownloads = pgTable("cashea_automatic_downloads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  recordsCount: integer("records_count").notNull(),
  status: text("status").notNull(), // success, error
  errorMessage: text("error_message"),
  downloadedAt: timestamp("downloaded_at").defaultNow(),
});

// Autorizadores table for egreso approval workflow
export const autorizadores = pgTable("autorizadores", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nombre: text("nombre").notNull(),
  criterio: text("criterio"), // Optional criteria description for when this authorizer is needed
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// New egresos table with 4-stage workflow
export const egresos = pgTable("egresos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Correlative number assigned when egreso is submitted (not in draft)
  numeroEgreso: integer("numero_egreso").unique(),
  
  // Stage 1: Registration fields
  fechaRegistro: timestamp("fecha_registro").notNull().defaultNow(),
  ctaPorPagarUsd: decimal("cta_por_pagar_usd", { precision: 15, scale: 2 }),
  ctaPorPagarBs: decimal("cta_por_pagar_bs", { precision: 15, scale: 2 }),
  tipoEgresoId: varchar("tipo_egreso_id"),
  descripcion: text("descripcion"),
  beneficiario: text("beneficiario"),
  fechaCompromiso: timestamp("fecha_compromiso"),
  numeroFacturaProveedor: text("numero_factura_proveedor"),
  requiereAprobacion: boolean("requiere_aprobacion").default(false),
  autorizadorId: varchar("autorizador_id"),
  
  // Stage 2: Authorization fields
  fechaAutorizacion: timestamp("fecha_autorizacion"),
  accionAutorizacion: text("accion_autorizacion"), // Aprueba, Rechaza
  notasAutorizacion: text("notas_autorizacion"),
  
  // Stage 3: Payment registration fields
  fechaPago: timestamp("fecha_pago"),
  montoPagadoUsd: decimal("monto_pagado_usd", { precision: 15, scale: 2 }),
  montoPagadoBs: decimal("monto_pagado_bs", { precision: 15, scale: 2 }),
  tasaCambio: decimal("tasa_cambio", { precision: 10, scale: 2 }),
  bancoId: varchar("banco_id"),
  referenciaPago: text("referencia_pago"),
  numeroFacturaPagada: text("numero_factura_pagada"),
  
  // Stage 4: Verification fields (handled in Verificación tab)
  estadoVerificacion: text("estado_verificacion").default("Por verificar"), // Por verificar, Verificado, Rechazado
  fechaVerificacion: timestamp("fecha_verificacion"),
  notasVerificacion: text("notas_verificacion"),
  
  // Overall status
  estado: text("estado").notNull().default("Borrador"), // Borrador, Por autorizar, Por pagar, Por verificar, Verificado, Rechazado
  
  // Draft indicator - true when missing required fields
  esBorrador: boolean("es_borrador").default(true),
  
  // Recurrence fields - no parent/child hierarchy, all egresos in a series are equal
  esRecurrente: boolean("es_recurrente").default(false),
  frecuenciaRecurrencia: text("frecuencia_recurrencia"), // Diario, Semanal, Quincenal, Mensual, Trimestral, Semestral, Anual
  serieRecurrenciaId: varchar("serie_recurrencia_id"), // UUID shared by all egresos in the same recurrence series
  numeroEnSerie: integer("numero_en_serie"), // Position in series (1, 2, 3...) for display "3 de 12"
  numeroRepeticiones: integer("numero_repeticiones"), // Total repetitions for the series
  ultimaFechaGenerada: timestamp("ultima_fecha_generada"), // Last date when an egreso was auto-generated in this series
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertSaleSchema = createInsertSchema(sales).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  fecha: z.union([z.date(), z.string().transform((val) => new Date(val))]),
  fechaEntrega: z.union([z.date(), z.string().transform((val) => new Date(val))]).optional(),
  emailSentAt: z.union([z.date(), z.string().transform((val) => new Date(val))]).optional(),
  tipo: z.enum(["Inmediato", "Reserva"]).default("Inmediato"),
});

export const insertUploadHistorySchema = createInsertSchema(uploadHistory).omit({
  id: true,
  uploadedAt: true,
});

// Admin schemas
export const insertBancoSchema = createInsertSchema(bancos).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTipoEgresoSchema = createInsertSchema(tiposEgresos).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProductoSchema = createInsertSchema(productos).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMetodoPagoSchema = createInsertSchema(metodosPago).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMonedaSchema = createInsertSchema(monedas).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCategoriaSchema = createInsertSchema(categorias).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCanalSchema = createInsertSchema(canales).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAsesorSchema = createInsertSchema(asesores).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTransportistaSchema = createInsertSchema(transportistas).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEstadoSchema = createInsertSchema(estados).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCiudadSchema = createInsertSchema(ciudades).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSeguimientoConfigSchema = createInsertSchema(seguimientoConfig).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  emailRecordatorio: z.string().nullable().optional(),
  asesorEmails: z.array(z.object({
    asesorId: z.string(),
    email: z.string().email(),
  })).max(5).nullable().optional(),
});

export const insertPrecioSchema = createInsertSchema(precios).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  fechaVigenciaDesde: z.union([z.date(), z.string().transform((val) => new Date(val))]),
});

// Autorizadores schemas
export const insertAutorizadorSchema = createInsertSchema(autorizadores).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Autorizador = typeof autorizadores.$inferSelect;
export type InsertAutorizador = z.infer<typeof insertAutorizadorSchema>;

// Egresos schemas
export const insertEgresoSchema = createInsertSchema(egresos).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  fechaRegistro: z.union([z.date(), z.string().transform((val) => new Date(val))]).optional(),
  fechaCompromiso: z.union([z.date(), z.string().transform((val) => new Date(val))]).optional(),
  fechaAutorizacion: z.union([z.date(), z.string().transform((val) => new Date(val))]).optional(),
  fechaPago: z.union([z.date(), z.string().transform((val) => new Date(val))]).optional(),
  fechaVerificacion: z.union([z.date(), z.string().transform((val) => new Date(val))]).optional(),
});

export type Egreso = typeof egresos.$inferSelect;
export type InsertEgreso = z.infer<typeof insertEgresoSchema>;


export const insertPaymentInstallmentSchema = createInsertSchema(paymentInstallments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  fecha: z.union([z.date(), z.string().transform((val) => new Date(val))]).optional(),
});

export const insertCasheaAutomationConfigSchema = createInsertSchema(casheaAutomationConfig).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCasheaAutomaticDownloadSchema = createInsertSchema(casheaAutomaticDownloads).omit({
  id: true,
  downloadedAt: true,
}).extend({
  startDate: z.union([z.date(), z.string().transform((val) => new Date(val))]),
  endDate: z.union([z.date(), z.string().transform((val) => new Date(val))]),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Sale = typeof sales.$inferSelect;
export type InsertSale = z.infer<typeof insertSaleSchema>;
export type UploadHistory = typeof uploadHistory.$inferSelect;
export type InsertUploadHistory = z.infer<typeof insertUploadHistorySchema>;
export type CasheaAutomationConfig = typeof casheaAutomationConfig.$inferSelect;
export type InsertCasheaAutomationConfig = z.infer<typeof insertCasheaAutomationConfigSchema>;
export type CasheaAutomaticDownload = typeof casheaAutomaticDownloads.$inferSelect;
export type InsertCasheaAutomaticDownload = z.infer<typeof insertCasheaAutomaticDownloadSchema>;

// Admin types
export type Banco = typeof bancos.$inferSelect;
export type InsertBanco = z.infer<typeof insertBancoSchema>;
export type TipoEgreso = typeof tiposEgresos.$inferSelect;
export type InsertTipoEgreso = z.infer<typeof insertTipoEgresoSchema>;
export type Producto = typeof productos.$inferSelect;
export type InsertProducto = z.infer<typeof insertProductoSchema>;
export type MetodoPago = typeof metodosPago.$inferSelect;
export type InsertMetodoPago = z.infer<typeof insertMetodoPagoSchema>;
export type Moneda = typeof monedas.$inferSelect;
export type InsertMoneda = z.infer<typeof insertMonedaSchema>;
export type Categoria = typeof categorias.$inferSelect;
export type InsertCategoria = z.infer<typeof insertCategoriaSchema>;
export type Canal = typeof canales.$inferSelect;
export type InsertCanal = z.infer<typeof insertCanalSchema>;
export type Asesor = typeof asesores.$inferSelect;
export type InsertAsesor = z.infer<typeof insertAsesorSchema>;
export type Transportista = typeof transportistas.$inferSelect;
export type InsertTransportista = z.infer<typeof insertTransportistaSchema>;
export type Estado = typeof estados.$inferSelect;
export type InsertEstado = z.infer<typeof insertEstadoSchema>;
export type Ciudad = typeof ciudades.$inferSelect;
export type InsertCiudad = z.infer<typeof insertCiudadSchema>;
export type SeguimientoConfig = typeof seguimientoConfig.$inferSelect;
export type InsertSeguimientoConfig = z.infer<typeof insertSeguimientoConfigSchema>;
export type Precio = typeof precios.$inferSelect;
export type InsertPrecio = z.infer<typeof insertPrecioSchema>;
export type PaymentInstallment = typeof paymentInstallments.$inferSelect;
export type InsertPaymentInstallment = z.infer<typeof insertPaymentInstallmentSchema>;

// Prospectos table
export const prospectos = pgTable("prospectos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  prospecto: text("prospecto").notNull().unique(), // Sequential prospecto number (P-0001, P-0002, etc.)
  nombre: text("nombre").notNull(),
  cedula: text("cedula"),
  telefono: text("telefono").notNull(),
  email: text("email"),
  canal: text("canal"),
  estadoProspecto: text("estado_prospecto").notNull().default("Activo"),
  asesorId: varchar("asesor_id"),
  fechaEntrega: timestamp("fecha_entrega"),
  totalUsd: decimal("total_usd", { precision: 10, scale: 2 }),
  products: text("products"), // JSON array of products [{producto, sku, cantidad, totalUsd, medidaEspecial}]
  // Direcciones
  direccionFacturacionPais: text("direccion_facturacion_pais"),
  direccionFacturacionEstado: text("direccion_facturacion_estado"),
  direccionFacturacionCiudad: text("direccion_facturacion_ciudad"),
  direccionFacturacionDireccion: text("direccion_facturacion_direccion"),
  direccionFacturacionUrbanizacion: text("direccion_facturacion_urbanizacion"),
  direccionFacturacionReferencia: text("direccion_facturacion_referencia"),
  direccionDespachoIgualFacturacion: text("direccion_despacho_igual_facturacion").default("true"),
  direccionDespachoPais: text("direccion_despacho_pais"),
  direccionDespachoEstado: text("direccion_despacho_estado"),
  direccionDespachoCiudad: text("direccion_despacho_ciudad"),
  direccionDespachoDireccion: text("direccion_despacho_direccion"),
  direccionDespachoUrbanizacion: text("direccion_despacho_urbanizacion"),
  direccionDespachoReferencia: text("direccion_despacho_referencia"),
  notas: text("notas"),
  // Follow-up tracking - stored as YYYY-MM-DD strings
  fechaSeguimiento1: text("fecha_seguimiento1"),
  respuestaSeguimiento1: text("respuesta_seguimiento1"),
  fechaSeguimiento2: text("fecha_seguimiento2"),
  respuestaSeguimiento2: text("respuesta_seguimiento2"),
  fechaSeguimiento3: text("fecha_seguimiento3"),
  respuestaSeguimiento3: text("respuesta_seguimiento3"),
  fechaCreacion: timestamp("fecha_creacion").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  estadoProspectoCheck: check("estado_prospecto_check", sql`${table.estadoProspecto} IN ('Activo', 'Perdido', 'Convertido')`),
}));

export const insertProspectoSchema = createInsertSchema(prospectos).omit({
  id: true,
  prospecto: true,
  fechaCreacion: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  nombre: z.string().min(1, "Nombre es requerido"),
  telefono: z.string().min(1, "Teléfono es requerido"),
  estadoProspecto: z.enum(["Activo", "Perdido", "Convertido"]).optional(),
  cedula: z.preprocess((val) => (val === "" || val === null) ? undefined : val, z.string().optional()),
  email: z.preprocess((val) => (val === "" || val === null) ? undefined : val, z.string().email("Email inválido").optional()),
  canal: z.preprocess((val) => (val === "" || val === null) ? undefined : val, z.string().optional()),
  asesorId: z.preprocess((val) => (val === "" || val === null) ? undefined : val, z.string().optional().nullable()),
  fechaEntrega: z.preprocess(
    (val) => {
      if (val === "" || val === null || val === undefined) return undefined;
      if (typeof val === "string") return new Date(val);
      return val;
    },
    z.date().nullable().optional()
  ),
  totalUsd: z.preprocess((val) => (val === "" || val === null) ? undefined : val, z.string().optional()),
  products: z.preprocess((val) => (val === "" || val === null) ? undefined : val, z.string().optional()),
  direccionFacturacionPais: z.preprocess((val) => (val === "" || val === null) ? undefined : val, z.string().optional()),
  direccionFacturacionEstado: z.preprocess((val) => (val === "" || val === null) ? undefined : val, z.string().optional()),
  direccionFacturacionCiudad: z.preprocess((val) => (val === "" || val === null) ? undefined : val, z.string().optional()),
  direccionFacturacionDireccion: z.preprocess((val) => (val === "" || val === null) ? undefined : val, z.string().optional()),
  direccionFacturacionUrbanizacion: z.preprocess((val) => (val === "" || val === null) ? undefined : val, z.string().optional()),
  direccionFacturacionReferencia: z.preprocess((val) => (val === "" || val === null) ? undefined : val, z.string().optional()),
  direccionDespachoIgualFacturacion: z.preprocess((val) => (val === "" || val === null) ? undefined : val, z.string().optional()),
  direccionDespachoPais: z.preprocess((val) => (val === "" || val === null) ? undefined : val, z.string().optional()),
  direccionDespachoEstado: z.preprocess((val) => (val === "" || val === null) ? undefined : val, z.string().optional()),
  direccionDespachoCiudad: z.preprocess((val) => (val === "" || val === null) ? undefined : val, z.string().optional()),
  direccionDespachoDireccion: z.preprocess((val) => (val === "" || val === null) ? undefined : val, z.string().optional()),
  direccionDespachoUrbanizacion: z.preprocess((val) => (val === "" || val === null) ? undefined : val, z.string().optional()),
  direccionDespachoReferencia: z.preprocess((val) => (val === "" || val === null) ? undefined : val, z.string().optional()),
  notas: z.preprocess((val) => (val === "" || val === null) ? undefined : val, z.string().optional()),
});

export type Prospecto = typeof prospectos.$inferSelect;
export type InsertProspecto = z.infer<typeof insertProspectoSchema>;
