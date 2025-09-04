import { sales, uploadHistory, users, type User, type InsertUser, type Sale, type InsertSale, type UploadHistory, type InsertUploadHistory } from "@shared/schema";
import { db } from "./db";
import { eq, desc, count, sum, avg, and, gte, lte } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Sales methods
  createSale(sale: InsertSale): Promise<Sale>;
  createSales(salesData: InsertSale[]): Promise<Sale[]>;
  getSales(filters?: {
    canal?: string;
    estadoEntrega?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<Sale[]>;
  getSaleById(id: string): Promise<Sale | undefined>;
  getTotalSalesCount(filters?: {
    canal?: string;
    estadoEntrega?: string;
    startDate?: Date;
    endDate?: Date;
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

  async getSales(filters?: {
    canal?: string;
    estadoEntrega?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<Sale[]> {
    let query = db.select().from(sales);
    
    const conditions = [];
    if (filters?.canal) {
      conditions.push(eq(sales.canal, filters.canal));
    }
    if (filters?.estadoEntrega) {
      conditions.push(eq(sales.estadoEntrega, filters.estadoEntrega));
    }
    if (filters?.startDate) {
      conditions.push(gte(sales.fecha, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(sales.fecha, filters.endDate));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    query = query.orderBy(desc(sales.fecha));
    
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    if (filters?.offset) {
      query = query.offset(filters.offset);
    }
    
    return await query;
  }

  async getSaleById(id: string): Promise<Sale | undefined> {
    const [sale] = await db.select().from(sales).where(eq(sales.id, id));
    return sale || undefined;
  }

  async getTotalSalesCount(filters?: {
    canal?: string;
    estadoEntrega?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<number> {
    let query = db.select({ count: count() }).from(sales);
    
    const conditions = [];
    if (filters?.canal) {
      conditions.push(eq(sales.canal, filters.canal));
    }
    if (filters?.estadoEntrega) {
      conditions.push(eq(sales.estadoEntrega, filters.estadoEntrega));
    }
    if (filters?.startDate) {
      conditions.push(gte(sales.fecha, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(sales.fecha, filters.endDate));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    const [result] = await query;
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
    // Total sales amount
    const [totalSalesResult] = await db
      .select({ total: sum(sales.totalUsd) })
      .from(sales);
    
    // Count by delivery status
    const deliveryStatusCounts = await db
      .select({
        status: sales.estadoEntrega,
        count: count()
      })
      .from(sales)
      .groupBy(sales.estadoEntrega);
    
    // Sales by channel
    const channelStats = await db
      .select({
        canal: sales.canal,
        total: sum(sales.totalUsd),
        orders: count()
      })
      .from(sales)
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
}

export const storage = new DatabaseStorage();
