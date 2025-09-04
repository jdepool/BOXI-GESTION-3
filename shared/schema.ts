import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
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
  orden: text("orden"),
  factura: text("factura"),
  referencia: text("referencia"),
  montoBs: decimal("monto_bs", { precision: 15, scale: 2 }),
  estadoEntrega: text("estado_entrega").notNull(),
  product: text("product").notNull(),
  cantidad: integer("cantidad").notNull(),
  // Direcciones
  direccionFacturacionCalle: text("direccion_facturacion_calle"),
  direccionFacturacionCiudad: text("direccion_facturacion_ciudad"),
  direccionFacturacionEstado: text("direccion_facturacion_estado"),
  direccionFacturacionCodigoPostal: text("direccion_facturacion_codigo_postal"),
  direccionFacturacionPais: text("direccion_facturacion_pais"),
  direccionDespachoIgualFacturacion: text("direccion_despacho_igual_facturacion").default("false"),
  direccionDespachoCalle: text("direccion_despacho_calle"),
  direccionDespachoCiudad: text("direccion_despacho_ciudad"),
  direccionDespachoEstado: text("direccion_despacho_estado"),
  direccionDespachoCodigoPostal: text("direccion_despacho_codigo_postal"),
  direccionDespachoPais: text("direccion_despacho_pais"),
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

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Sale = typeof sales.$inferSelect;
export type InsertSale = z.infer<typeof insertSaleSchema>;
export type UploadHistory = typeof uploadHistory.$inferSelect;
export type InsertUploadHistory = z.infer<typeof insertUploadHistorySchema>;
