import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, integer, boolean } from "drizzle-orm/pg-core";
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
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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
  categoria: text("categoria").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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

export const sales = pgTable("sales", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nombre: text("nombre").notNull(),
  cedula: text("cedula"),
  telefono: text("telefono"),
  email: text("email"),
  totalUsd: decimal("total_usd", { precision: 10, scale: 2 }).notNull(),
  sucursal: text("sucursal"),
  tienda: text("tienda"),
  fecha: timestamp("fecha").notNull(),
  canal: text("canal").notNull(), // cashea, shopify, treble
  estado: text("estado").notNull(),
  estadoPagoInicial: text("estado_pago_inicial"),
  pagoInicialUsd: decimal("pago_inicial_usd", { precision: 10, scale: 2 }),
  metodoPagoId: varchar("metodo_pago_id"),
  bancoId: varchar("banco_id"),
  orden: text("orden"),
  factura: text("factura"),
  referencia: text("referencia"),
  montoBs: decimal("monto_bs", { precision: 15, scale: 2 }),
  montoUsd: decimal("monto_usd", { precision: 15, scale: 2 }),
  estadoEntrega: text("estado_entrega").notNull(),
  product: text("product").notNull(),
  cantidad: integer("cantidad").notNull(),
  // Direcciones
  direccionFacturacionPais: text("direccion_facturacion_pais"),
  direccionFacturacionEstado: text("direccion_facturacion_estado"),
  direccionFacturacionCiudad: text("direccion_facturacion_ciudad"),
  direccionFacturacionDireccion: text("direccion_facturacion_direccion"),
  direccionFacturacionUrbanizacion: text("direccion_facturacion_urbanizacion"),
  direccionFacturacionReferencia: text("direccion_facturacion_referencia"),
  direccionDespachoIgualFacturacion: text("direccion_despacho_igual_facturacion").default("false"),
  direccionDespachoPais: text("direccion_despacho_pais"),
  direccionDespachoEstado: text("direccion_despacho_estado"),
  direccionDespachoCiudad: text("direccion_despacho_ciudad"),
  direccionDespachoDireccion: text("direccion_despacho_direccion"),
  direccionDespachoUrbanizacion: text("direccion_despacho_urbanizacion"),
  direccionDespachoReferencia: text("direccion_despacho_referencia"),
  // Flete
  montoFleteUsd: decimal("monto_flete_usd", { precision: 10, scale: 2 }),
  fechaFlete: timestamp("fecha_flete"),
  referenciaFlete: text("referencia_flete"),
  montoFleteVes: decimal("monto_flete_ves", { precision: 15, scale: 2 }),
  bancoReceptorFlete: text("banco_receptor_flete"),
  statusFlete: text("status_flete"), // Pendiente, En Proceso, A Despacho
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

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
export type Egreso = typeof egresos.$inferSelect;
export type InsertEgreso = z.infer<typeof insertEgresoSchema>;
export type EgresoPorAprobar = typeof egresosPorAprobar.$inferSelect;
export type InsertEgresoPorAprobar = z.infer<typeof insertEgresoPorAprobarSchema>;
