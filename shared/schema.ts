import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, integer, boolean, index, unique, check } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  tipoCheck: check("tipo_check", sql`${table.tipo} IN ('Receptor', 'Emisor')`),
}));

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
  categoria: text("categoria").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const productosBackup = pgTable("productos_backup", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nombre: text("nombre").notNull(),
  sku: text("sku"),
  categoria: text("categoria").notNull(),
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
  nombre: text("nombre").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

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

export const sales = pgTable("sales", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nombre: text("nombre").notNull(),
  cedula: text("cedula"),
  telefono: text("telefono"),
  email: text("email"),
  totalUsd: decimal("total_usd", { precision: 10, scale: 2 }).notNull(),
  totalOrderUsd: decimal("total_order_usd", { precision: 10, scale: 2 }),
  sucursal: text("sucursal"),
  tienda: text("tienda"),
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
  // Asesor asignado
  asesorId: varchar("asesor_id"),
  // Email tracking
  emailSentAt: timestamp("email_sent_at"),
  // Verification fields for Pago Inicial
  estadoVerificacionInicial: text("estado_verificacion_inicial").default("Por verificar"), // Por verificar, Verificado, Rechazado
  notasVerificacionInicial: text("notas_verificacion_inicial"),
  // Verification fields for Flete
  estadoVerificacionFlete: text("estado_verificacion_flete").default("Por verificar"), // Por verificar, Verificado, Rechazado
  notasVerificacionFlete: text("notas_verificacion_flete"),
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

export const egresos = pgTable("egresos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fecha: timestamp("fecha").notNull(),
  descripcion: text("descripcion").notNull(),
  monto: decimal("monto", { precision: 15, scale: 2 }).notNull(),
  monedaId: varchar("moneda_id").notNull(),
  tipoEgresoId: varchar("tipo_egreso_id").notNull(),
  metodoPagoId: varchar("metodo_pago_id").notNull(),
  bancoId: varchar("banco_id").notNull(),
  referencia: text("referencia"),
  estado: text("estado").notNull().default("registrado"), // registrado, aprobado, pagado, anulado
  observaciones: text("observaciones"),
  pendienteInfo: boolean("pendiente_info").default(false), // true when approved from egresos_por_aprobar
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const egresosPorAprobar = pgTable("egresos_por_aprobar", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fecha: timestamp("fecha").notNull(),
  descripcion: text("descripcion").notNull(),
  monto: decimal("monto", { precision: 15, scale: 2 }).notNull(),
  tipoEgresoId: varchar("tipo_egreso_id").notNull(),
  metodoPagoId: varchar("metodo_pago_id").notNull(),
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

export const insertEgresoSchema = createInsertSchema(egresos).omit({
  id: true,
  pendienteInfo: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  fecha: z.union([z.date(), z.string().transform((val) => new Date(val))]),
});

export const insertEgresoPorAprobarSchema = createInsertSchema(egresosPorAprobar).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  fecha: z.union([z.date(), z.string().transform((val) => new Date(val))]),
});

export const insertPaymentInstallmentSchema = createInsertSchema(paymentInstallments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  fecha: z.union([z.date(), z.string().transform((val) => new Date(val))]).optional(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Sale = typeof sales.$inferSelect;
export type InsertSale = z.infer<typeof insertSaleSchema>;
export type UploadHistory = typeof uploadHistory.$inferSelect;
export type InsertUploadHistory = z.infer<typeof insertUploadHistorySchema>;

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
export type Egreso = typeof egresos.$inferSelect;
export type InsertEgreso = z.infer<typeof insertEgresoSchema>;
export type EgresoPorAprobar = typeof egresosPorAprobar.$inferSelect;
export type InsertEgresoPorAprobar = z.infer<typeof insertEgresoPorAprobarSchema>;
export type PaymentInstallment = typeof paymentInstallments.$inferSelect;
export type InsertPaymentInstallment = z.infer<typeof insertPaymentInstallmentSchema>;
