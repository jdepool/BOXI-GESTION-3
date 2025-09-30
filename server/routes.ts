import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertSaleSchema, insertUploadHistorySchema, insertBancoSchema, insertTipoEgresoSchema, 
  insertProductoSchema, insertMetodoPagoSchema, insertMonedaSchema, insertCategoriaSchema,
  insertEgresoSchema, insertEgresoPorAprobarSchema, insertPaymentInstallmentSchema, insertAsesorSchema
} from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import * as XLSX from "xlsx";
import { parse as parseCSV } from "csv-parse/sync";
import { nanoid } from "nanoid";
import session from "express-session";
import MemoryStore from "memorystore";
import crypto from "crypto";
import fetch from "node-fetch";
import { sendOrderConfirmationEmail, type OrderEmailData } from "./services/email-service";

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv', // .csv (standard)
      'application/csv', // .csv (alternative)
      'application/octet-stream' // .csv (generic binary)
    ];
    
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel (.xlsx, .xls) and CSV (.csv) files are allowed'));
    }
  },
});

// Webhook function to send data to Zapier
async function sendWebhookToZapier(data: any, canal: string): Promise<void> {
  const webhookUrl = process.env.ZAPIER_WEBHOOK_URL;
  
  if (!webhookUrl) {
    console.log('No Zapier webhook URL configured, skipping webhook notification');
    return;
  }

  try {
    const webhookData = {
      canal,
      timestamp: new Date().toISOString(),
      recordsProcessed: data.recordsProcessed,
      duplicatesIgnored: data.duplicatesIgnored,
      filename: data.filename,
      salesData: data.salesData.slice(0, 10), // Send first 10 records as sample
      totalRecords: data.salesData.length,
      uploadedAt: new Date().toISOString()
    };

    console.log(`📨 Sending ${canal} data to Zapier webhook...`);
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookData),
    });

    if (response.ok) {
      console.log(`✅ Successfully sent ${canal} data to Zapier webhook`);
    } else {
      console.error(`❌ Failed to send ${canal} data to Zapier webhook:`, response.status, response.statusText);
    }
  } catch (error) {
    console.error(`❌ Error sending ${canal} data to Zapier webhook:`, error);
  }
}

const getSalesQuerySchema = z.object({
  canal: z.string().optional(),
  estadoEntrega: z.string().optional(),
  estado: z.string().optional(),
  orden: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  tipo: z.string().optional(),
  asesorId: z.string().optional(),
  excludePendingManual: z.coerce.boolean().optional(),
  excludeReservas: z.coerce.boolean().optional(),
  excludeADespachar: z.coerce.boolean().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

// Transform Shopify webhook order data to CSV format for existing mapping logic
// Returns an array of CSV-like objects, one for each line item in the order
function transformShopifyWebhookToCSV(shopifyOrder: any) {
  const lineItems = shopifyOrder.line_items || [];
  
  // Create one record per line item (product) in the order
  return lineItems.map((lineItem: any) => ({
    // Order info (same for all line items)
    'Created at': shopifyOrder.created_at,
    'Name': shopifyOrder.name, // Order number like #1001
    'Email': shopifyOrder.email,
    'Lineitem price': lineItem.price, // Individual line item price
    
    // Customer billing info (same for all line items)
    'Billing Name': shopifyOrder.billing_address?.name || 
                   `${shopifyOrder.billing_address?.first_name || ''} ${shopifyOrder.billing_address?.last_name || ''}`.trim(),
    'Billing Phone': shopifyOrder.billing_address?.phone,
    'Billing Country': shopifyOrder.billing_address?.country,
    'Billing Province name': shopifyOrder.billing_address?.province,
    'Billing City': shopifyOrder.billing_address?.city,
    'Billing Address1': shopifyOrder.billing_address?.address1,
    'Billing Address2': shopifyOrder.billing_address?.address2,
    
    // Shipping info (same for all line items)
    'Shipping Country': shopifyOrder.shipping_address?.country,
    'Shipping Province name': shopifyOrder.shipping_address?.province,
    'Shipping City': shopifyOrder.shipping_address?.city,
    'Shipping Address1': shopifyOrder.shipping_address?.address1,
    'Shipping Address2': shopifyOrder.shipping_address?.address2,
    
    // Product info (specific to this line item)
    'Lineitem name': lineItem.name || lineItem.title,
    'Lineitem quantity': lineItem.quantity || 1,
    'Lineitem sku': lineItem.sku || null, // Add SKU mapping from Shopify line item
  }));
}

function parseFile(buffer: Buffer, canal: string, filename: string) {
  try {
    let data: any[];
    
    // Determine file type and parse accordingly
    if (filename.endsWith('.csv')) {
      // Parse CSV file
      const csvString = buffer.toString('utf-8');
      data = parseCSV(csvString, {
        columns: true, // Use first row as column headers
        skip_empty_lines: true,
        trim: true
      });
    } else {
      // Parse Excel file
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      data = XLSX.utils.sheet_to_json(worksheet);
    }

    const salesData = data.map((row: any) => {
      // Parse date based on channel
      let fecha = new Date();
      
      if (canal.toLowerCase() === 'shopify') {
        // For Shopify: Created at field
        if (row['Created at']) {
          if (typeof row['Created at'] === 'number') {
            // Excel date serial number
            fecha = new Date((row['Created at'] - 25569) * 86400 * 1000);
          } else {
            fecha = new Date(row['Created at']);
          }
        }
      } else {
        // For Cashea and others: Fecha field
        if (row.Fecha) {
          if (typeof row.Fecha === 'number') {
            // Excel date serial number
            fecha = new Date((row.Fecha - 25569) * 86400 * 1000);
          } else {
            fecha = new Date(row.Fecha);
          }
        }
      }

      if (canal.toLowerCase() === 'shopify') {
        // Shopify specific mapping
        return {
          nombre: String(row['Billing Name'] || ''),
          cedula: null, // Shopify doesn't have cedula field
          telefono: row['Billing Phone'] ? String(row['Billing Phone']) : null,
          email: row.Email ? String(row.Email) : null,
          totalUsd: String(row['Lineitem price'] || '0'), // Use individual line item price
          sucursal: null, // Shopify doesn't have sucursal
          tienda: null, // Shopify doesn't have tienda  
          fecha,
          canal: canal,
          estado: 'pendiente', // Shopify orders start as pending for completion
          estadoPagoInicial: null,
          pagoInicialUsd: null,
          metodoPagoId: null,
          bancoId: null,
          orden: row.Name ? String(row.Name) : null, // Name maps to Order
          factura: null,
          referencia: null,
          montoBs: null,
          montoUsd: String(row['Lineitem price'] || '0'), // Use individual line item price
          estadoEntrega: 'En Proceso', // Route Shopify orders to "Ventas por Completar"
          product: String(row['Lineitem name'] || ''),
          sku: row['Lineitem sku'] ? String(row['Lineitem sku']) : null, // Map SKU from Shopify
          cantidad: Number(row['Lineitem quantity'] || 1),
          // Billing address mapping
          direccionFacturacionPais: row['Billing Country'] ? String(row['Billing Country']) : null,
          direccionFacturacionEstado: row['Billing Province name'] ? String(row['Billing Province name']) : null,
          direccionFacturacionCiudad: row['Billing City'] ? String(row['Billing City']) : null,
          direccionFacturacionDireccion: row['Billing Address1'] ? String(row['Billing Address1']) : null,
          direccionFacturacionUrbanizacion: row['Billing Address2'] ? String(row['Billing Address2']) : null,
          direccionFacturacionReferencia: null,
          direccionDespachoIgualFacturacion: 'false',
          // Shipping address mapping  
          direccionDespachoPais: row['Shipping Country'] ? String(row['Shipping Country']) : null,
          direccionDespachoEstado: row['Shipping Province name'] ? String(row['Shipping Province name']) : null,
          direccionDespachoCiudad: row['Shipping City'] ? String(row['Shipping City']) : null,
          direccionDespachoDireccion: row['Shipping Address1'] ? String(row['Shipping Address1']) : null,
          direccionDespachoUrbanizacion: row['Shipping Address2'] ? String(row['Shipping Address2']) : null,
          direccionDespachoReferencia: null,
          // Default freight values
          montoFleteUsd: null,
          fechaFlete: null,
          referenciaFlete: null,
          montoFleteVes: null,
          bancoReceptorFlete: null,
          statusFlete: 'Pendiente',
          fleteGratis: false,
          notas: null,
          // Auto-detect RESERVA products and set tipo accordingly
          tipo: String(row['Lineitem name'] || '').toUpperCase().includes('RESERVA') ? 'Reserva' : 'Inmediato',
          fechaEntrega: undefined,
        };
      } else {
        // Expected columns from Cashea/other files: Nombre, Cedula, Telefono, Email, Total usd, Sucursal, Tienda, Fecha, Canal, Estado, Estado pago inicial, Pago inicial usd, Orden, Factura, Referencia, Monto en bs, Estado de entrega, Product, Cantidad
        return {
          nombre: String(row.Nombre || ''),
          cedula: row.Cedula ? String(row.Cedula) : null,
          telefono: row.Telefono ? String(row.Telefono) : null,
          email: row.Email ? String(row.Email) : null,
          totalUsd: String(row['Total usd'] || '0'),
          sucursal: row.Sucursal ? String(row.Sucursal) : null,
          tienda: row.Tienda ? String(row.Tienda) : null,
          fecha,
          canal: canal, // Use the provided canal parameter
          estado: String(row.Estado || ''),
          estadoPagoInicial: row['Estado pago inicial'] ? String(row['Estado pago inicial']) : null,
          pagoInicialUsd: row['Pago inicial usd'] ? String(row['Pago inicial usd']) : null,
          metodoPagoId: null,
          bancoId: null,
          orden: row.Orden ? String(row.Orden) : null,
          factura: row.Factura ? String(row.Factura) : null,
          referencia: row.Referencia ? String(row.Referencia) : null,
          montoBs: row['Monto en bs'] ? String(row['Monto en bs']) : null,
          montoUsd: null,
          estadoEntrega: canal.toLowerCase() === 'cashea' ? 
            'En Proceso' : // All Cashea orders start with "En Proceso"
            String(row['Estado de entrega'] || 'En Proceso'),
          product: String(row.Product || ''),
          cantidad: Number(row.Cantidad || 1),
          // New fields for sales system overhaul
          tipo: 'Inmediato', // Default to Inmediato, users can change this later
          fechaEntrega: undefined,
        };
      }
    });

    return salesData;
  } catch (error) {
    throw new Error(`Error parsing file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function parseProductosFile(buffer: Buffer, filename: string, validCategorias: string[]) {
  try {
    let data: any[];
    
    // Determine file type and parse accordingly
    if (filename.endsWith('.csv')) {
      // Parse CSV file
      const csvString = buffer.toString('utf-8');
      data = parseCSV(csvString, {
        columns: true, // Use first row as column headers
        skip_empty_lines: true,
        trim: true
      });
    } else {
      // Parse Excel file
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      data = XLSX.utils.sheet_to_json(worksheet);
    }

    // Note: validCategorias should be passed as parameter instead of fetched here

    // Map the Excel/CSV data to producto format with row-level error handling
    const productosData = data.map((row: any, index: number) => {
      const rowNumber = index + 2; // +2 because Excel is 1-indexed and first row is header
      
      try {
        // Handle different possible column names (case insensitive)
        const nombre = row['Producto'] || row['producto'] || row['Nombre'] || row['nombre'];
        const sku = row['SKU'] || row['sku'] || row['Sku'];
        const categoria = row['Categoría'] || row['Categoria'] || row['categoria'] || row['Category'] || row['category'];

        // Collect validation errors for this row
        const rowErrors = [];
        
        if (!nombre || String(nombre).trim() === '') {
          rowErrors.push('Missing required field: Producto/Nombre');
        }
        if (!categoria || String(categoria).trim() === '') {
          rowErrors.push('Missing required field: Categoria');
        } else if (!validCategorias.includes(String(categoria).trim())) {
          rowErrors.push(`Invalid categoria: "${categoria}". Must be one of: ${validCategorias.join(', ')}`);
        }

        if (rowErrors.length > 0) {
          return {
            row: rowNumber, // Use 'row' to match frontend expectations
            error: rowErrors.join('; '),
            data: null
          };
        }

        return {
          row: rowNumber, // Use 'row' to match frontend expectations
          error: null,
          data: {
            nombre: String(nombre).trim(),
            sku: sku ? String(sku).trim() || undefined : undefined, // Convert empty strings to undefined
            categoria: String(categoria).trim()
          }
        };
      } catch (error) {
        return {
          row: rowNumber, // Use 'row' to match frontend expectations
          error: `Error processing row: ${error instanceof Error ? error.message : 'Unknown error'}`,
          data: null
        };
      }
    });

    return productosData;
  } catch (error) {
    throw new Error(`Error parsing productos file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function parseBankStatementFile(buffer: Buffer) {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Get the raw data without headers first
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    console.log('Total rows in spreadsheet:', rawData.length);
    
    // Find the header row by looking for common banking terms
    let headerRowIndex = -1;
    const bankingTerms = [
      'referencia', 'reference', 'ref', 'numero', 'número', 'no.', 'nro',
      'monto', 'importe', 'amount', 'valor', 'haber', 'crédito', 'credito', 'débito', 'debito',
      'fecha', 'date', 'dia'
    ];
    
    for (let i = 0; i < Math.min(rawData.length, 30); i++) { // Check first 30 rows
      const row = rawData[i] as any[];
      if (!row || row.length === 0) continue;
      
      const rowText = row.join('|').toLowerCase();
      const foundTerms = bankingTerms.filter(term => rowText.includes(term));
      
      console.log(`Row ${i + 1}:`, row.slice(0, 5)); // Log first 5 columns
      console.log(`Found ${foundTerms.length} banking terms:`, foundTerms);
      
      if (foundTerms.length >= 2) { // Need at least 2 banking terms to consider it a header
        headerRowIndex = i;
        console.log(`Found potential header row at index ${i + 1}`);
        break;
      }
    }
    
    if (headerRowIndex === -1) {
      throw new Error('Could not find header row in bank statement. Headers should contain terms like "Referencia", "Monto", "Fecha"');
    }
    
    // Parse data starting from the header row
    const dataWithHeaders = XLSX.utils.sheet_to_json(worksheet, { 
      header: headerRowIndex, 
      range: headerRowIndex 
    });
    
    console.log('Bank statement columns found:', headerRowIndex >= 0 && dataWithHeaders.length > 0 ? Object.keys(dataWithHeaders[0] as Record<string, unknown>) : 'No headers found');
    console.log('Number of data rows found:', dataWithHeaders.length);

    // Filter out empty rows and the header row itself
    const filteredData = dataWithHeaders.filter((row: any, index: number) => {
      if (index === 0) return false; // Skip the header row itself
      
      // Check if row has meaningful data
      const values = Object.values(row || {});
      const hasData = values.some(val => val !== null && val !== undefined && String(val).trim() !== '');
      return hasData;
    });
    
    console.log('Filtered data rows:', filteredData.length);

    // Expected columns: Fecha, Referencia, Monto, Descripcion
    const transactions = filteredData.map((row: any) => {
      // Parse date
      let fecha = new Date();
      if (row.Fecha || row.fecha) {
        const dateValue = row.Fecha || row.fecha;
        if (typeof dateValue === 'number') {
          // Excel date serial number
          fecha = new Date((dateValue - 25569) * 86400 * 1000);
        } else {
          fecha = new Date(dateValue);
        }
      }

      // Handle multiple possible reference column names
      const referencia = String(
        row.Referencia || 
        row.referencia || 
        row['Número de Referencia'] ||
        row['Numero de Referencia'] ||
        row['N° Referencia'] ||
        row['No. Referencia'] ||
        row['Num Referencia'] ||
        row['Ref'] ||
        row['Reference'] ||
        row['REFERENCIA'] ||
        ''
      );

      // Handle multiple possible amount column names
      const montoValue = 
        row.Monto || 
        row.monto || 
        row.Importe || 
        row.importe ||
        row.Cantidad || 
        row.cantidad ||
        row.Amount || 
        row.amount ||
        row.Valor || 
        row.valor ||
        row.Haber || 
        row.haber ||
        row.Crédito || 
        row.credito ||
        row['Crédito'] ||
        row.Débito || 
        row.debito ||
        row['Débito'] ||
        row.MONTO ||
        row.IMPORTE ||
        row.HABER ||
        '0';

      const monto = parseFloat(String(montoValue).replace(/[^\d.-]/g, '')) || 0;

      // Handle multiple possible description column names
      const descripcion = String(
        row.Descripcion || 
        row.descripcion || 
        row.Descripción || 
        row.DESCRIPCION ||
        row.Concepto ||
        row.concepto ||
        row.Detalle ||
        row.detalle ||
        row.Observaciones ||
        row.observaciones ||
        ''
      );

      console.log('Parsed transaction:', { referencia, monto, fecha: fecha.toISOString().split('T')[0], descripcion });

      return {
        referencia,
        monto,
        fecha: fecha.toISOString().split('T')[0],
        descripcion,
      };
    });

    console.log(`Parsed ${transactions.length} transactions from bank statement`);
    return transactions;
  } catch (error) {
    throw new Error(`Error parsing bank statement file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function parseEgresosExcelFile(buffer: Buffer) {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    // Expected columns for egresos: Fecha, Descripcion, Monto, Moneda, Tipo, Metodo, Banco, Referencia, Estado, Observaciones
    const egresosData = data.map((row: any) => {
      // Parse date
      let fecha = new Date();
      if (row.Fecha) {
        if (typeof row.Fecha === 'number') {
          // Excel date serial number
          fecha = new Date((row.Fecha - 25569) * 86400 * 1000);
        } else {
          fecha = new Date(row.Fecha);
        }
      }

      return {
        fecha,
        descripcion: String(row.Descripcion || row.Descripción || ''),
        monto: String(row.Monto || '0'),
        monedaId: String(row.MonedaId || row.Moneda || ''),
        tipoEgresoId: String(row.TipoEgresoId || row.Tipo || ''),
        metodoPagoId: String(row.MetodoPagoId || row.Metodo || ''),
        bancoId: String(row.BancoId || row.Banco || ''),
        referencia: row.Referencia ? String(row.Referencia) : null,
        estado: String(row.Estado || 'registrado'),
        observaciones: row.Observaciones ? String(row.Observaciones) : null,
      };
    });

    return egresosData;
  } catch (error) {
    throw new Error(`Error parsing egresos Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Authentication middleware
declare module "express-session" {
  interface SessionData {
    user: {
      email: string;
      isAuthenticated: boolean;
    } | null;
  }
}

// Simple in-memory session store for development
const Store = MemoryStore(session);

// Valid login credentials
const VALID_CREDENTIALS = {
  email: 'marketplace@boxisleep.com',
  password: 'Boxisleep123'
};

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Configure session middleware
  app.use(session({
    secret: process.env.SESSION_SECRET || 'boxisleep-dev-secret-key-12345',
    resave: false,
    saveUninitialized: false,
    store: new Store({
      checkPeriod: 86400000 // prune expired entries every 24h
    }),
    cookie: {
      secure: false, // Set to true in production with HTTPS
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

  // Authentication middleware function
  const requireAuth = (req: any, res: any, next: any) => {
    if (req.session?.user?.isAuthenticated) {
      return next();
    }
    return res.status(401).json({ message: 'Unauthorized' });
  };

  // Login endpoint
  app.post('/api/auth/login', (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: 'Email y contraseña son requeridos' });
      }

      if (email === VALID_CREDENTIALS.email && password === VALID_CREDENTIALS.password) {
        req.session.user = {
          email: email,
          isAuthenticated: true
        };
        
        res.json({ 
          success: true, 
          user: { email, isAuthenticated: true } 
        });
      } else {
        res.status(401).json({ message: 'Email o contraseña incorrectos' });
      }
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  });

  // Check current user endpoint
  app.get('/api/auth/me', (req, res) => {
    if (req.session?.user?.isAuthenticated) {
      res.json(req.session.user);
    } else {
      res.status(401).json({ message: 'Not authenticated' });
    }
  });

  // Logout endpoint
  app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error('Logout error:', err);
        return res.status(500).json({ message: 'Error logging out' });
      }
      res.clearCookie('connect.sid'); // Clear session cookie
      res.json({ success: true });
    });
  });

  // Get sales metrics for dashboard
  app.get("/api/sales/metrics", async (req, res) => {
    try {
      const metrics = await storage.getSalesMetrics();
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching sales metrics:", error);
      res.status(500).json({ error: "Failed to fetch sales metrics" });
    }
  });

  // Get sales data with filters
  app.get("/api/sales", async (req, res) => {
    try {
      const query = getSalesQuerySchema.parse(req.query);
      
      // Normalize asesorId filter values
      let normalizedAsesorId = query.asesorId;
      if (query.asesorId === 'all') {
        normalizedAsesorId = undefined; // Don't filter by asesor
      } else if (query.asesorId === 'none') {
        normalizedAsesorId = 'null'; // Special value to indicate null filter
      }
      
      const filters = {
        canal: query.canal,
        estadoEntrega: query.estadoEntrega,
        estado: query.estado,
        orden: query.orden,
        startDate: query.startDate ? new Date(query.startDate) : undefined,
        endDate: query.endDate ? new Date(query.endDate) : undefined,
        tipo: query.tipo,
        asesorId: normalizedAsesorId,
        excludePendingManual: query.excludePendingManual,
        excludeReservas: query.excludeReservas,
        excludeADespachar: query.excludeADespachar,
        limit: query.limit,
        offset: query.offset,
      };

      const [salesData, totalCount] = await Promise.all([
        storage.getSales(filters),
        storage.getTotalSalesCount(filters),
      ]);

      res.json({
        data: salesData,
        total: totalCount,
        limit: query.limit,
        offset: query.offset,
      });
    } catch (error) {
      console.error("Error fetching sales:", error);
      res.status(500).json({ error: "Failed to fetch sales data" });
    }
  });





  // Get orders with addresses for dispatch
  app.get("/api/sales/dispatch", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;

      const result = await storage.getOrdersWithAddresses(limit, offset);
      res.json({
        data: result.data,
        total: result.total,
        limit,
        offset
      });
    } catch (error) {
      console.error("Get dispatch orders error:", error);
      res.status(500).json({ error: "Failed to get dispatch orders" });
    }
  });

  // Export sales data to Excel
  app.get("/api/sales/export", async (req, res) => {
    try {
      const query = getSalesQuerySchema.parse(req.query);
      
      // Normalize asesorId filter values
      let normalizedAsesorId = query.asesorId;
      if (query.asesorId === 'all') {
        normalizedAsesorId = undefined; // Don't filter by asesor
      } else if (query.asesorId === 'none') {
        normalizedAsesorId = 'null'; // Special value to indicate null filter
      }
      
      const filters = {
        canal: query.canal,
        estadoEntrega: query.estadoEntrega,
        estado: query.estado,
        orden: query.orden,
        startDate: query.startDate ? new Date(query.startDate) : undefined,
        endDate: query.endDate ? new Date(query.endDate) : undefined,
        tipo: query.tipo,
        asesorId: normalizedAsesorId,
        excludePendingManual: query.excludePendingManual,
        excludeReservas: query.excludeReservas,
        excludeADespachar: query.excludeADespachar,
        // For export, get all data without pagination
        limit: 10000,
        offset: 0,
      };

      // Check if we're exporting Reservas with installments
      const isReservasExport = filters.tipo === 'Reserva';
      
      let excelData: any[] = [];
      
      if (isReservasExport) {
        // For Reservas, get sales with installments and create separate rows per installment
        const salesWithInstallments = await storage.getSalesWithInstallments(filters);
        
        // Create one row per installment, or one row if no installments exist
        excelData = salesWithInstallments.flatMap(sale => {
          if (sale.installments.length === 0) {
            // If no installments, create one row with empty installment data
            return [{
              'Número de Orden': sale.orden,
              'Nombre': sale.nombre,
              'Cédula': sale.cedula,
              'Teléfono': sale.telefono,
              'Correo': sale.email,
              'Producto': sale.product,
              'Cantidad': sale.cantidad,
              'Canal': sale.canal,
              'Estado': sale.estado,
              'Estado de Entrega': sale.estadoEntrega,
              'Tipo': sale.tipo,
              'Fecha': new Date(sale.fecha).toLocaleDateString('es-ES'),
              'Total USD': sale.totalUsd,
              'Pago Inicial USD': sale.pagoInicialUsd,
              'Referencia': sale.referencia,
              'Monto Bs': sale.montoBs,
              'Asesor': sale.asesorId,
              
              // Billing Address
              'País (Facturación)': sale.direccionFacturacionPais || '',
              'Estado (Facturación)': sale.direccionFacturacionEstado || '',
              'Ciudad (Facturación)': sale.direccionFacturacionCiudad || '',
              'Dirección (Facturación)': sale.direccionFacturacionDireccion || '',
              'Urbanización (Facturación)': sale.direccionFacturacionUrbanizacion || '',
              'Referencia (Facturación)': sale.direccionFacturacionReferencia || '',
              
              // Shipping Address
              'Despacho Igual a Facturación': sale.direccionDespachoIgualFacturacion === "true" ? 'Sí' : 'No',
              'País (Despacho)': sale.direccionDespachoIgualFacturacion === "true" 
                ? sale.direccionFacturacionPais || '' 
                : sale.direccionDespachoPais || '',
              'Estado (Despacho)': sale.direccionDespachoIgualFacturacion === "true" 
                ? sale.direccionFacturacionEstado || '' 
                : sale.direccionDespachoEstado || '',
              'Ciudad (Despacho)': sale.direccionDespachoIgualFacturacion === "true" 
                ? sale.direccionFacturacionCiudad || '' 
                : sale.direccionDespachoCiudad || '',
              'Dirección (Despacho)': sale.direccionDespachoIgualFacturacion === "true" 
                ? sale.direccionFacturacionDireccion || '' 
                : sale.direccionDespachoDireccion || '',
              'Urbanización (Despacho)': sale.direccionDespachoIgualFacturacion === "true" 
                ? sale.direccionFacturacionUrbanizacion || '' 
                : sale.direccionDespachoUrbanizacion || '',
              'Referencia (Despacho)': sale.direccionDespachoIgualFacturacion === "true" 
                ? sale.direccionFacturacionReferencia || '' 
                : sale.direccionDespachoReferencia || '',
              
              // Flete fields
              'Monto Flete USD': sale.montoFleteUsd || '',
              'Fecha Flete': sale.fechaFlete ? new Date(sale.fechaFlete).toLocaleDateString('es-ES') : '',
              'Referencia Flete': sale.referenciaFlete || '',
              'Monto Flete Bs': sale.montoFleteVes || '',
              'Banco Receptor Flete': sale.bancoReceptorFlete || '',
              'Status Flete': sale.statusFlete || '',
              'Flete Gratis': sale.fleteGratis ? 'Sí' : 'No',
              
              'Notas': sale.notas || '',
              
              // Empty installment columns
              'Número de Cuota': '',
              'Fecha de Cuota': '',
              'Monto Cuota USD': '',
              'Monto Cuota Bs': '',
              'Referencia Cuota': '',
              'Banco Cuota': '',
              'Saldo Restante': '',
              'Verificado': ''
            }];
          } else {
            // Create one row per installment
            return sale.installments.map(installment => ({
              'Número de Orden': sale.orden,
              'Nombre': sale.nombre,
              'Cédula': sale.cedula,
              'Teléfono': sale.telefono,
              'Correo': sale.email,
              'Producto': sale.product,
              'Cantidad': sale.cantidad,
              'Canal': sale.canal,
              'Estado': sale.estado,
              'Estado de Entrega': sale.estadoEntrega,
              'Tipo': sale.tipo,
              'Fecha': new Date(sale.fecha).toLocaleDateString('es-ES'),
              'Total USD': sale.totalUsd,
              'Pago Inicial USD': sale.pagoInicialUsd,
              'Referencia': sale.referencia,
              'Monto Bs': sale.montoBs,
              'Asesor': sale.asesorId,
              
              // Billing Address
              'País (Facturación)': sale.direccionFacturacionPais || '',
              'Estado (Facturación)': sale.direccionFacturacionEstado || '',
              'Ciudad (Facturación)': sale.direccionFacturacionCiudad || '',
              'Dirección (Facturación)': sale.direccionFacturacionDireccion || '',
              'Urbanización (Facturación)': sale.direccionFacturacionUrbanizacion || '',
              'Referencia (Facturación)': sale.direccionFacturacionReferencia || '',
              
              // Shipping Address
              'Despacho Igual a Facturación': sale.direccionDespachoIgualFacturacion === "true" ? 'Sí' : 'No',
              'País (Despacho)': sale.direccionDespachoIgualFacturacion === "true" 
                ? sale.direccionFacturacionPais || '' 
                : sale.direccionDespachoPais || '',
              'Estado (Despacho)': sale.direccionDespachoIgualFacturacion === "true" 
                ? sale.direccionFacturacionEstado || '' 
                : sale.direccionDespachoEstado || '',
              'Ciudad (Despacho)': sale.direccionDespachoIgualFacturacion === "true" 
                ? sale.direccionFacturacionCiudad || '' 
                : sale.direccionDespachoCiudad || '',
              'Dirección (Despacho)': sale.direccionDespachoIgualFacturacion === "true" 
                ? sale.direccionFacturacionDireccion || '' 
                : sale.direccionDespachoDireccion || '',
              'Urbanización (Despacho)': sale.direccionDespachoIgualFacturacion === "true" 
                ? sale.direccionFacturacionUrbanizacion || '' 
                : sale.direccionDespachoUrbanizacion || '',
              'Referencia (Despacho)': sale.direccionDespachoIgualFacturacion === "true" 
                ? sale.direccionFacturacionReferencia || '' 
                : sale.direccionDespachoReferencia || '',
              
              // Flete fields
              'Monto Flete USD': sale.montoFleteUsd || '',
              'Fecha Flete': sale.fechaFlete ? new Date(sale.fechaFlete).toLocaleDateString('es-ES') : '',
              'Referencia Flete': sale.referenciaFlete || '',
              'Monto Flete Bs': sale.montoFleteVes || '',
              'Banco Receptor Flete': sale.bancoReceptorFlete || '',
              'Status Flete': sale.statusFlete || '',
              'Flete Gratis': sale.fleteGratis ? 'Sí' : 'No',
              
              'Notas': sale.notas || '',
              
              // Installment-specific columns
              'Número de Cuota': installment.installmentNumber || '',
              'Fecha de Cuota': installment.fecha ? new Date(installment.fecha).toLocaleDateString('es-ES') : '',
              'Monto Cuota USD': installment.cuotaAmount || '',
              'Monto Cuota Bs': installment.cuotaAmountBs || '',
              'Referencia Cuota': installment.referencia || '',
              'Banco Cuota': installment.bancoId || '',
              'Saldo Restante': installment.saldoRemaining || '',
              'Verificado': installment.verificado ? 'Sí' : 'No'
            }));
          }
        });
      } else {
        // For regular sales, use the existing logic
        const salesData = await storage.getSales(filters);
        excelData = salesData.map(sale => ({
        'Número de Orden': sale.orden,
        'Nombre': sale.nombre,
        'Cédula': sale.cedula,
        'Teléfono': sale.telefono,
        'Correo': sale.email,
        'Producto': sale.product,
        'Cantidad': sale.cantidad,
        'Canal': sale.canal,
        'Estado': sale.estado,
        'Estado de Entrega': sale.estadoEntrega,
        'Tipo': sale.tipo,
        'Fecha': new Date(sale.fecha).toLocaleDateString('es-ES'),
        'Total USD': sale.totalUsd,
        'Pago Inicial USD': sale.pagoInicialUsd,
        'Referencia': sale.referencia,
        'Monto Bs': sale.montoBs,
        'Asesor': sale.asesorId,
        
        // Billing Address
        'País (Facturación)': sale.direccionFacturacionPais || '',
        'Estado (Facturación)': sale.direccionFacturacionEstado || '',
        'Ciudad (Facturación)': sale.direccionFacturacionCiudad || '',
        'Dirección (Facturación)': sale.direccionFacturacionDireccion || '',
        'Urbanización (Facturación)': sale.direccionFacturacionUrbanizacion || '',
        'Referencia (Facturación)': sale.direccionFacturacionReferencia || '',
        
        // Shipping Address
        'Despacho Igual a Facturación': sale.direccionDespachoIgualFacturacion === "true" ? 'Sí' : 'No',
        'País (Despacho)': sale.direccionDespachoIgualFacturacion === "true" 
          ? sale.direccionFacturacionPais || '' 
          : sale.direccionDespachoPais || '',
        'Estado (Despacho)': sale.direccionDespachoIgualFacturacion === "true" 
          ? sale.direccionFacturacionEstado || '' 
          : sale.direccionDespachoEstado || '',
        'Ciudad (Despacho)': sale.direccionDespachoIgualFacturacion === "true" 
          ? sale.direccionFacturacionCiudad || '' 
          : sale.direccionDespachoCiudad || '',
        'Dirección (Despacho)': sale.direccionDespachoIgualFacturacion === "true" 
          ? sale.direccionFacturacionDireccion || '' 
          : sale.direccionDespachoDireccion || '',
        'Urbanización (Despacho)': sale.direccionDespachoIgualFacturacion === "true" 
          ? sale.direccionFacturacionUrbanizacion || '' 
          : sale.direccionDespachoUrbanizacion || '',
        'Referencia (Despacho)': sale.direccionDespachoIgualFacturacion === "true" 
          ? sale.direccionFacturacionReferencia || '' 
          : sale.direccionDespachoReferencia || '',
        
        // Flete fields
        'Monto Flete USD': sale.montoFleteUsd || '',
        'Fecha Flete': sale.fechaFlete ? new Date(sale.fechaFlete).toLocaleDateString('es-ES') : '',
        'Referencia Flete': sale.referenciaFlete || '',
        'Monto Flete Bs': sale.montoFleteVes || '',
        'Banco Receptor Flete': sale.bancoReceptorFlete || '',
        'Status Flete': sale.statusFlete || '',
        'Flete Gratis': sale.fleteGratis ? 'Sí' : 'No',
        
        'Notas': sale.notas || '',
        }));
      }

      // Convert to Excel format
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Ventas');

      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="ventas_boxisleep_${new Date().toISOString().split('T')[0]}.xlsx"`);
      res.send(buffer);

    } catch (error) {
      console.error("Error exporting sales:", error);
      res.status(500).json({ error: "Failed to export sales data" });
    }
  });

  // Export dispatch orders to Excel
  app.get("/api/sales/dispatch/export", async (req, res) => {
    try {
      // Get all orders with addresses (no pagination for export)
      const result = await storage.getOrdersWithAddresses(10000, 0);

      // Convert to Excel format
      const worksheet = XLSX.utils.json_to_sheet(result.data.map(sale => ({
        'Número de Orden': sale.orden,
        'Nombre': sale.nombre,
        'Cédula': sale.cedula,
        'Teléfono': sale.telefono,
        'Correo': sale.email,
        'Producto': sale.product,
        'Cantidad': sale.cantidad,
        'Canal': sale.canal,
        'Estado de Entrega': sale.estadoEntrega,
        'Fecha': new Date(sale.fecha).toLocaleDateString('es-ES'),
        'Total USD': sale.totalUsd,
        
        // Billing Address
        'País (Facturación)': sale.direccionFacturacionPais || '',
        'Estado (Facturación)': sale.direccionFacturacionEstado || '',
        'Ciudad (Facturación)': sale.direccionFacturacionCiudad || '',
        'Dirección (Facturación)': sale.direccionFacturacionDireccion || '',
        'Urbanización (Facturación)': sale.direccionFacturacionUrbanizacion || '',
        'Referencia (Facturación)': sale.direccionFacturacionReferencia || '',
        
        // Shipping Address
        'Despacho Igual a Facturación': sale.direccionDespachoIgualFacturacion === "true" ? 'Sí' : 'No',
        'País (Despacho)': sale.direccionDespachoIgualFacturacion === "true" 
          ? sale.direccionFacturacionPais || '' 
          : sale.direccionDespachoPais || '',
        'Estado (Despacho)': sale.direccionDespachoIgualFacturacion === "true" 
          ? sale.direccionFacturacionEstado || '' 
          : sale.direccionDespachoEstado || '',
        'Ciudad (Despacho)': sale.direccionDespachoIgualFacturacion === "true" 
          ? sale.direccionFacturacionCiudad || '' 
          : sale.direccionDespachoCiudad || '',
        'Dirección (Despacho)': sale.direccionDespachoIgualFacturacion === "true" 
          ? sale.direccionFacturacionDireccion || '' 
          : sale.direccionDespachoDireccion || '',
        'Urbanización (Despacho)': sale.direccionDespachoIgualFacturacion === "true" 
          ? sale.direccionFacturacionUrbanizacion || '' 
          : sale.direccionDespachoUrbanizacion || '',
        'Referencia (Despacho)': sale.direccionDespachoIgualFacturacion === "true" 
          ? sale.direccionFacturacionReferencia || '' 
          : sale.direccionDespachoReferencia || '',
      })));

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Despachos');

      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="despachos_boxisleep_${new Date().toISOString().split('T')[0]}.xlsx"`);
      res.send(buffer);

    } catch (error) {
      console.error("Error exporting dispatch orders:", error);
      res.status(500).json({ error: "Failed to export dispatch orders" });
    }
  });

  // Get specific sale by ID (MUST BE AFTER specific routes)
  app.get("/api/sales/:id", async (req, res) => {
    try {
      const sale = await storage.getSaleById(req.params.id);
      if (!sale) {
        return res.status(404).json({ error: "Sale not found" });
      }
      res.json(sale);
    } catch (error) {
      console.error("Error fetching sale:", error);
      res.status(500).json({ error: "Failed to fetch sale" });
    }
  });

  // Shopify webhook endpoint for order creation
  app.post("/api/webhooks/shopify", async (req, res) => {
    try {
      console.log("📥 Received Shopify webhook request");
      console.log("📦 Webhook payload:", JSON.stringify(req.body, null, 2));
      
      const shopifyOrder = req.body;
      
      // Basic validation that this is a Shopify order
      if (!shopifyOrder || !shopifyOrder.id || !shopifyOrder.name) {
        console.log("❌ Invalid Shopify order data received");
        return res.status(400).json({ error: "Invalid Shopify order data" });
      }

      console.log(`📦 Received Shopify webhook for order: ${shopifyOrder.name} (ID: ${shopifyOrder.id}) with ${shopifyOrder.line_items?.length || 0} line items`);
      
      // Transform Shopify webhook data to CSV format for existing mapping logic
      // This now returns an array of records, one per line item
      const csvFormatData = transformShopifyWebhookToCSV(shopifyOrder);
      
      
      if (csvFormatData.length === 0) {
        console.log(`⚠️ No line items found in Shopify order ${shopifyOrder.name}`);
        return res.status(400).json({ error: "No line items found in order" });
      }

      // Process each line item (product) in the order
      const salesData = csvFormatData.map((row: any) => {
        // Parse date based on channel
        let fecha = new Date();
        
        if (row['Created at']) {
          fecha = new Date(row['Created at']);
        }

        // Use existing Shopify mapping logic from parseFile function
        return {
          nombre: String(row['Billing Name'] || ''),
          cedula: null, // Shopify doesn't have cedula field
          telefono: row['Billing Phone'] ? String(row['Billing Phone']) : null,
          email: row.Email ? String(row.Email) : null,
          totalUsd: String(row['Lineitem price'] || '0'),
          sucursal: null, // Shopify doesn't have sucursal
          tienda: null, // Shopify doesn't have tienda  
          fecha,
          canal: 'shopify',
          estado: 'pendiente', // Shopify orders start as pending for completion
          estadoPagoInicial: null,
          pagoInicialUsd: null,
          metodoPagoId: null,
          bancoId: null,
          orden: row.Name ? String(row.Name) : null, // Name maps to Order
          factura: null,
          referencia: null,
          montoBs: null,
          montoUsd: String(row['Lineitem price'] || '0'),
          estadoEntrega: 'En Proceso', // Route Shopify orders to "Ventas por Completar"
          product: String(row['Lineitem name'] || ''),
          cantidad: Number(row['Lineitem quantity'] || 1),
          // Billing address mapping
          direccionFacturacionPais: row['Billing Country'] ? String(row['Billing Country']) : null,
          direccionFacturacionEstado: row['Billing Province name'] ? String(row['Billing Province name']) : null,
          direccionFacturacionCiudad: row['Billing City'] ? String(row['Billing City']) : null,
          direccionFacturacionDireccion: row['Billing Address1'] ? String(row['Billing Address1']) : null,
          direccionFacturacionUrbanizacion: row['Billing Address2'] ? String(row['Billing Address2']) : null,
          direccionFacturacionReferencia: null,
          direccionDespachoIgualFacturacion: 'false',
          // Shipping address mapping  
          direccionDespachoPais: row['Shipping Country'] ? String(row['Shipping Country']) : null,
          direccionDespachoEstado: row['Shipping Province name'] ? String(row['Shipping Province name']) : null,
          direccionDespachoCiudad: row['Shipping City'] ? String(row['Shipping City']) : null,
          direccionDespachoDireccion: row['Shipping Address1'] ? String(row['Shipping Address1']) : null,
          direccionDespachoUrbanizacion: row['Shipping Address2'] ? String(row['Shipping Address2']) : null,
          direccionDespachoReferencia: null,
          // Default freight values
          montoFleteUsd: null,
          fechaFlete: null,
          referenciaFlete: null,
          montoFleteVes: null,
          bancoReceptorFlete: null,
          statusFlete: 'Pendiente',
          fleteGratis: false,
          notas: null,
          // Auto-detect RESERVA products and set tipo accordingly
          tipo: String(row['Lineitem name'] || '').toUpperCase().includes('RESERVA') ? 'Reserva' : 'Inmediato',
          fechaEntrega: undefined,
        };
      });

      // Validate the sales data
      const validatedSales = [];
      const errors = [];
      
      for (let i = 0; i < salesData.length; i++) {
        try {
          const validatedSale = insertSaleSchema.parse(salesData[i]);
          validatedSales.push(validatedSale);
        } catch (error) {
          errors.push({
            row: i + 1,
            error: error instanceof z.ZodError ? error.errors : String(error)
          });
        }
      }

      if (errors.length > 0) {
        console.error(`❌ Validation errors in Shopify webhook order ${shopifyOrder.name}:`, errors);
        return res.status(400).json({
          error: "Validation errors found",
          details: errors
        });
      }

      // Smart deduplication for Shopify webhooks: check order number + product combination
      const newSales = [];
      let duplicatesSkipped = 0;
      
      for (const sale of validatedSales) {
        if (!sale.orden || !sale.product) {
          // If no order number or product, include it (shouldn't happen with good data)
          newSales.push(sale);
          continue;
        }
        
        // Get all existing orders with the same order number
        const existingOrdersWithSameNumber = await storage.getOrdersByOrderNumber(sale.orden);
        
        // Check if any existing order has the same product (case-insensitive comparison)
        const hasMatchingProduct = existingOrdersWithSameNumber.some(existing => 
          existing.product?.toLowerCase().trim() === sale.product?.toLowerCase().trim()
        );
        
        if (!hasMatchingProduct) {
          // No existing order with same order number + product combination, so include it
          newSales.push(sale);
          console.log(`✅ Processing line item: ${sale.orden} - ${sale.product}`);
        } else {
          // Skip this sale (it's a duplicate)
          duplicatesSkipped++;
          console.log(`⚠️ Skipping duplicate: ${sale.orden} - ${sale.product}`);
        }
      }
      
      if (newSales.length === 0) {
        console.log(`⚠️ All line items in Shopify order ${shopifyOrder.name} already exist - ${duplicatesSkipped} duplicates skipped`);
        return res.status(200).json({ 
          message: "All products in order already exist",
          duplicate: true,
          duplicatesSkipped: duplicatesSkipped
        });
      }

      // Save to database
      await storage.createSales(newSales);

      // Log successful webhook processing
      await storage.createUploadHistory({
        filename: `shopify_webhook_${shopifyOrder.name}`,
        canal: 'shopify',
        recordsCount: newSales.length,
        status: 'success',
        errorMessage: null,
      });

      console.log(`✅ Successfully processed Shopify webhook for order ${shopifyOrder.name}`);
      
      res.status(200).json({ 
        success: true, 
        message: "Order processed successfully",
        ordersCreated: newSales.length 
      });

    } catch (error) {
      console.error("Shopify webhook error:", error);
      res.status(500).json({ 
        error: "Failed to process Shopify webhook",
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Upload Excel file
  app.post("/api/upload", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const { canal } = req.body;
      if (!canal || !['cashea', 'shopify', 'treble'].includes(canal)) {
        return res.status(400).json({ error: "Invalid or missing canal. Must be: cashea, shopify, or treble" });
      }

      // Parse file (Excel or CSV)
      const salesData = parseFile(req.file.buffer, canal, req.file.originalname);
      
      // Validate each row
      const validatedSales = [];
      const errors = [];
      
      for (let i = 0; i < salesData.length; i++) {
        try {
          const validatedSale = insertSaleSchema.parse(salesData[i]);
          validatedSales.push(validatedSale);
        } catch (error) {
          errors.push({
            row: i + 2, // +2 because Excel is 1-indexed and first row is header
            error: error instanceof z.ZodError ? error.errors : String(error)
          });
        }
      }

      if (errors.length > 0) {
        // Log upload attempt with errors
        await storage.createUploadHistory({
          filename: req.file.originalname,
          canal,
          recordsCount: 0,
          status: 'error',
          errorMessage: `Validation errors in ${errors.length} rows`,
        });

        return res.status(400).json({
          error: "Validation errors found",
          details: errors.slice(0, 10), // Return first 10 errors
          totalErrors: errors.length
        });
      }

      // Check for existing order numbers to avoid duplicates
      let newSales = validatedSales;
      
      if (canal.toLowerCase() === 'shopify') {
        // Smart deduplication for Shopify: check order number + product combination
        const salesAfterDeduplication = [];
        
        for (const sale of validatedSales) {
          if (!sale.orden || !sale.product) {
            // If no order number or product, include it (shouldn't happen with good data)
            salesAfterDeduplication.push(sale);
            continue;
          }
          
          // Get all existing orders with the same order number
          const existingOrdersWithSameNumber = await storage.getOrdersByOrderNumber(sale.orden);
          
          // Check if any existing order has the same product (case-insensitive comparison)
          const hasMatchingProduct = existingOrdersWithSameNumber.some(existing => 
            existing.product?.toLowerCase().trim() === sale.product?.toLowerCase().trim()
          );
          
          if (!hasMatchingProduct) {
            // No existing order with same order number + product combination, so include it
            salesAfterDeduplication.push(sale);
          }
          // If hasMatchingProduct is true, skip this sale (it's a duplicate)
        }
        
        newSales = salesAfterDeduplication;
      } else {
        // Standard deduplication for non-Shopify: check order numbers only
        const orderNumbers = validatedSales.map(sale => sale.orden).filter(Boolean) as string[];
        const existingOrders = await storage.getExistingOrderNumbers(orderNumbers);
        
        newSales = validatedSales.filter(sale => 
          !sale.orden || !existingOrders.includes(sale.orden)
        );
      }
      
      const duplicatesCount = validatedSales.length - newSales.length;

      // Save to database only new sales
      if (newSales.length > 0) {
        await storage.createSales(newSales);
      }

      // Log successful upload
      await storage.createUploadHistory({
        filename: req.file.originalname,
        canal,
        recordsCount: newSales.length,
        status: 'success',
        errorMessage: duplicatesCount > 0 ? `${duplicatesCount} duplicate order(s) ignored` : undefined,
      });

      // Send webhook notification for Cashea uploads
      if (canal.toLowerCase() === 'cashea' && newSales.length > 0) {
        try {
          await sendWebhookToZapier({
            recordsProcessed: newSales.length,
            duplicatesIgnored: duplicatesCount,
            filename: req.file.originalname,
            salesData: newSales
          }, canal);
        } catch (webhookError) {
          console.error('Webhook notification failed, but upload was successful:', webhookError);
          // Don't fail the upload if webhook fails
        }
      }

      res.json({
        success: true,
        recordsProcessed: newSales.length,
        duplicatesIgnored: duplicatesCount,
        message: duplicatesCount > 0 
          ? `Successfully uploaded ${newSales.length} sales records. ${duplicatesCount} duplicate order(s) were ignored.`
          : `Successfully uploaded ${newSales.length} sales records`
      });

    } catch (error) {
      console.error("Error uploading file:", error);
      
      // Log failed upload
      if (req.file && req.body.canal) {
        await storage.createUploadHistory({
          filename: req.file.originalname,
          canal: req.body.canal,
          recordsCount: 0,
          status: 'error',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      res.status(500).json({
        error: "Failed to process upload",
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get recent uploads
  app.get("/api/uploads/recent", async (req, res) => {
    try {
      const uploads = await storage.getRecentUploads(10);
      res.json(uploads);
    } catch (error) {
      console.error("Error fetching recent uploads:", error);
      res.status(500).json({ error: "Failed to fetch upload history" });
    }
  });

  // CASHEA API Functions
  async function callCasheaApi(startDate: string, endDate: string): Promise<any[]> {
    const casheaEmail = process.env.CASHEA_EMAIL;
    const casheaPassword = process.env.CASHEA_PASSWORD;

    if (!casheaEmail || !casheaPassword) {
      throw new Error("CASHEA credentials not configured");
    }

    console.log(`🔍 CASHEA API Investigation for date range: ${startDate} to ${endDate}`);
    console.log(`📧 Using credentials: ${casheaEmail}`);

    // Convert user input dates to ISO format for CASHEA API
    const startDateISO = new Date(startDate + "T04:00:00.000Z").toISOString();
    const endDateISO = new Date(endDate + "T04:00:00.000Z").toISOString();

    console.log(`📅 Date conversion: ${startDate} -> ${startDateISO}`);
    console.log(`📅 Date conversion: ${endDate} -> ${endDateISO}`);

    const url = "https://cashea.retool.com/api/public/83942c1c-e0a6-11ee-9c54-4bdcfcdd4f2c/query?queryName=getOnlineOrdersWithProducts";
    
    const body = JSON.stringify({
      "userParams": {
        "queryParams": {
          "0": "Boxi Sleep",
          "1": "Boxi Sleep", 
          "2": startDateISO,
          "3": endDateISO,
          "length": 4
        },
        "databaseNameOverrideParams": { "length": 0 },
        "databaseHostOverrideParams": { "length": 0 },
        "databasePasswordOverrideParams": { "length": 0 },
        "databaseUsernameOverrideParams": { "length": 0 }
      },
      "environment": "production",
      "frontendVersion": "1",
      "includeQueryExecutionMetadata": true,
      "isInGlobalWidget": true,
      "password": "",
      "queryType": "SqlQueryUnified",
      "releaseVersion": null,
      "streamResponse": false
    });

    const headers = {
      "Content-Type": "application/json",
      "Authorization": `Basic ${Buffer.from(`${casheaEmail}:${casheaPassword}`).toString('base64')}`,
    };

    console.log(`🧪 Trying: ✅ User-Provided Exact CASHEA Format`);
    console.log(`📡 URL: ${url}`);
    console.log(`🔧 Method: POST`);

    const response = await fetch(url, {
      method: "POST",
      headers: headers,
      body: body,
    });

    console.log(`📊 Response: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      throw new Error(`CASHEA API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`🎉 CASHEA API SUCCESS! Status: ${response.status}`);
    console.log(`📊 Response size: ${JSON.stringify(data).length} bytes`);

    return [data];
  }

  function transformCasheaData(rawData: any[]): any[] {
    if (!rawData || rawData.length === 0) {
      return [];
    }
    
    const casheaEntry = rawData[0];
    
    if (!casheaEntry || !casheaEntry.__retoolWrappedQuery__ || !casheaEntry.queryData) {
      return rawData; // Return as-is if not CASHEA format
    }
    
    const queryData = casheaEntry.queryData;
    const ordenes = queryData['# Orden'] || [];
    const nombres = queryData.Nombre || [];
    const cedulas = queryData.Cédula || [];
    const telefonos = queryData.Teléfono || [];
    const emails = queryData.Email || [];
    const totalesUSD = queryData['Total (USD)'] || [];
    const fechas = queryData.Fecha || [];
    const canales = queryData.Canal || [];
    const pagosIniciales = queryData['Pago Inicial (USD)'] || [];
    const referencias = queryData['# Referencia'] || [];
    const montosBs = queryData['Monto en Bs'] || [];
    const estadosEntrega = queryData['Estado de Entrega'] || [];
    const productos = queryData.Product || [];
    
    // Convert arrays into individual records
    const records: any[] = [];
    const maxLength = Math.max(
      ordenes.length, nombres.length, cedulas.length, telefonos.length,
      emails.length, totalesUSD.length, fechas.length, canales.length,
      pagosIniciales.length, referencias.length, montosBs.length,
      estadosEntrega.length, productos.length
    );
    
    for (let i = 0; i < maxLength; i++) {
      const fecha = fechas[i] ? new Date(fechas[i]) : new Date();
      
      records.push({
        nombre: String(nombres[i] || 'Unknown Customer'),
        cedula: String(cedulas[i] || ''),
        telefono: telefonos[i] ? String(telefonos[i]) : null,
        email: emails[i] ? String(emails[i]) : null,
        totalUsd: String(totalesUSD[i] || '0'),
        sucursal: null,
        tienda: null,
        fecha,
        canal: 'cashea',
        estado: 'confirmado',
        estadoEntrega: 'En Proceso', // All CASHEA orders start as "En Proceso"
        estadoPagoInicial: null,
        pagoInicialUsd: null,
        metodoPagoId: null,
        bancoId: null,
        orden: ordenes[i] ? String(ordenes[i]) : null,
        factura: null,
        referencia: referencias[i] ? String(referencias[i]) : null,
        montoBs: montosBs[i] ? String(montosBs[i]) : null,
        montoUsd: String(totalesUSD[i] || '0'),
        direccionFacturacionPais: null,
        direccionFacturacionEstado: null,
        direccionFacturacionCiudad: null,
        direccionFacturacionDireccion: null,
        direccionFacturacionUrbanizacion: null,
        direccionFacturacionReferencia: null,
        direccionDespachoIgualFacturacion: 'false',
        direccionDespachoPais: null,
        direccionDespachoEstado: null,
        direccionDespachoCiudad: null,
        direccionDespachoDireccion: null,
        direccionDespachoUrbanizacion: null,
        direccionDespachoReferencia: null,
        montoFleteUsd: null,
        fechaFlete: null,
        referenciaFlete: null,
        montoFleteVes: null,
        bancoReceptorFlete: null,
        statusFlete: null,
        fleteGratis: false,
        notas: null,
        fechaAtencion: null,
        product: productos[i] ? String(productos[i]) : 'CASHEA Product',
        cantidad: 1
      });
    }
    
    
    return records;
  }

  // CASHEA API endpoint
  app.post("/api/cashea/download", async (req, res) => {
    try {
      const { startDate, endDate } = req.body;

      if (!startDate || !endDate) {
        return res.status(400).json({ error: "Start date and end date are required" });
      }

      console.log(`📊 CASHEA download request: ${startDate} to ${endDate}`);

      // Call CASHEA API
      const casheaData = await callCasheaApi(startDate, endDate);
      
      // Transform the data
      const transformedData = transformCasheaData(casheaData);
      // Validate each row (same as file upload)
      const validatedSales = [];
      const errors = [];
      
      for (let i = 0; i < transformedData.length; i++) {
        try {
          const validatedSale = insertSaleSchema.parse(transformedData[i]);
          validatedSales.push(validatedSale);
        } catch (error) {
          errors.push({
            row: i + 1,
            error: error instanceof z.ZodError ? error.errors : String(error)
          });
        }
      }

      if (errors.length > 0) {
        await storage.createUploadHistory({
          filename: `cashea_download_${startDate}_to_${endDate}`,
          canal: 'cashea',
          recordsCount: 0,
          status: 'error',
          errorMessage: `Validation errors in ${errors.length} rows`,
        });

        return res.status(400).json({
          error: "Validation errors found",
          details: errors.slice(0, 10),
          totalErrors: errors.length
        });
      }

      // Check for existing order numbers to avoid duplicates (same as file upload)
      const orderNumbers = validatedSales.map(sale => sale.orden).filter(Boolean) as string[];
      const existingOrders = await storage.getExistingOrderNumbers(orderNumbers);
      
      // Filter out sales with existing order numbers
      const newSales = validatedSales.filter(sale => 
        !sale.orden || !existingOrders.includes(sale.orden)
      );
      
      const duplicatesCount = validatedSales.length - newSales.length;

      // Save to database only new sales
      if (newSales.length > 0) {
        await storage.createSales(newSales);
      }

      // Log successful download
      await storage.createUploadHistory({
        filename: `cashea_download_${startDate}_to_${endDate}`,
        canal: 'cashea',
        recordsCount: newSales.length,
        status: 'success',
        errorMessage: duplicatesCount > 0 ? `${duplicatesCount} duplicate order(s) ignored` : undefined,
      });

      // Send webhook notification for Cashea downloads
      if (newSales.length > 0) {
        try {
          await sendWebhookToZapier({
            recordsProcessed: newSales.length,
            duplicatesIgnored: duplicatesCount,
            filename: `cashea_download_${startDate}_to_${endDate}`,
            salesData: newSales
          }, 'cashea');
        } catch (webhookError) {
          console.error('Webhook notification failed, but download was successful:', webhookError);
          // Don't fail the download if webhook fails
        }
      }

      console.log(`✅ Transformed ${transformedData.length} CASHEA records`);

      res.json({
        success: true,
        data: transformedData,
        recordsProcessed: newSales.length,
        duplicatesIgnored: duplicatesCount,
        message: duplicatesCount > 0 
          ? `Downloaded ${newSales.length} CASHEA records. ${duplicatesCount} duplicate order(s) were ignored.`
          : `Downloaded ${newSales.length} CASHEA records successfully`,
        recordCount: newSales.length
      });

    } catch (error) {
      console.error("Error downloading CASHEA data:", error);
      
      // Log failed download
      await storage.createUploadHistory({
        filename: `cashea_download_${req.body.startDate || 'unknown'}_to_${req.body.endDate || 'unknown'}`,
        canal: 'cashea',
        recordsCount: 0,
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });

      res.status(500).json({ 
        error: "Failed to download CASHEA data",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Update sale delivery status
  app.put("/api/sales/:saleId/delivery-status", async (req, res) => {
    try {
      const { saleId } = req.params;
      const { status } = req.body;

      // Validate status
      const validStatuses = ['En Proceso', 'A Despachar', 'Despachado', 'Cancelado', 'Pospuesto'];
      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({ 
          error: "Invalid status. Must be one of: " + validStatuses.join(', ')
        });
      }

      // Validate that sale exists
      const existingSale = await storage.getSaleById(saleId);
      if (!existingSale) {
        return res.status(404).json({ error: "Sale not found" });
      }

      const updatedSale = await storage.updateSaleDeliveryStatus(saleId, status);
      
      if (!updatedSale) {
        return res.status(500).json({ error: "Failed to update delivery status" });
      }

      res.json({ success: true, sale: updatedSale });
    } catch (error) {
      console.error("Update delivery status error:", error);
      res.status(500).json({ error: "Failed to update delivery status" });
    }
  });

  // Update sale addresses
  app.put("/api/sales/:saleId/addresses", async (req, res) => {
    try {
      const { saleId } = req.params;
      const addressData = req.body;

      // Validate that sale exists
      const existingSale = await storage.getSaleById(saleId);
      if (!existingSale) {
        return res.status(404).json({ error: "Sale not found" });
      }

      const updatedSale = await storage.updateSaleAddresses(saleId, addressData);
      
      if (!updatedSale) {
        return res.status(500).json({ error: "Failed to update addresses" });
      }

      res.json({ success: true, sale: updatedSale });
    } catch (error) {
      console.error("Update addresses error:", error);
      res.status(500).json({ error: "Failed to update addresses" });
    }
  });

  // Update sale flete
  app.put("/api/sales/:saleId/flete", async (req, res) => {
    try {
      const { saleId } = req.params;
      const fleteData = req.body;

      // Validate that sale exists
      const existingSale = await storage.getSaleById(saleId);
      if (!existingSale) {
        return res.status(404).json({ error: "Sale not found" });
      }

      const updatedSale = await storage.updateSaleFlete(saleId, fleteData);
      
      if (!updatedSale) {
        return res.status(500).json({ error: "Failed to update flete" });
      }

      res.json({ success: true, sale: updatedSale });
    } catch (error) {
      console.error("Update flete error:", error);
      res.status(500).json({ error: "Failed to update flete" });
    }
  });

  // Update flete status
  app.put("/api/sales/:saleId/flete-status", async (req, res) => {
    try {
      const { saleId } = req.params;
      const { status } = req.body;

      // Validate status
      const validStatuses = ['Pendiente', 'En Proceso', 'A Despacho'];
      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({ 
          error: "Invalid status. Must be one of: " + validStatuses.join(', ')
        });
      }

      // Validate that sale exists
      const existingSale = await storage.getSaleById(saleId);
      if (!existingSale) {
        return res.status(404).json({ error: "Sale not found" });
      }

      const updatedSale = await storage.updateFleteStatus(saleId, status);
      
      if (!updatedSale) {
        return res.status(500).json({ error: "Failed to update flete status" });
      }

      res.json({ success: true, sale: updatedSale });
    } catch (error) {
      console.error("Update flete status error:", error);
      res.status(500).json({ error: "Failed to update flete status" });
    }
  });

  // Update sale notes
  app.put("/api/sales/:saleId/notes", async (req, res) => {
    try {
      const { saleId } = req.params;
      const { notas } = req.body;

      // Validate notes length (max 150 characters)
      if (notas && notas.length > 150) {
        return res.status(400).json({ error: "Notes cannot exceed 150 characters" });
      }

      // Validate that sale exists
      const existingSale = await storage.getSaleById(saleId);
      if (!existingSale) {
        return res.status(404).json({ error: "Sale not found" });
      }

      const updatedSale = await storage.updateSaleNotes(saleId, notas);
      
      if (!updatedSale) {
        return res.status(500).json({ error: "Failed to update sale notes" });
      }

      res.json({ success: true, sale: updatedSale });
    } catch (error) {
      console.error("Update sale notes error:", error);
      res.status(500).json({ error: "Failed to update sale notes" });
    }
  });

  // Update sale tipo with smart routing logic
  app.put("/api/sales/:saleId/tipo", async (req, res) => {
    try {
      const { saleId } = req.params;
      const { tipo } = req.body;

      // Validate tipo
      const validTipos = ['Inmediato', 'Reserva'];
      if (!tipo || !validTipos.includes(tipo)) {
        return res.status(400).json({ 
          error: "Invalid tipo. Must be one of: " + validTipos.join(', ')
        });
      }

      // Validate that sale exists
      const existingSale = await storage.getSaleById(saleId);
      if (!existingSale) {
        return res.status(404).json({ error: "Sale not found" });
      }

      // Smart routing logic based on tipo change and payment verification status
      let updates: Partial<any> = { tipo };

      // Check if switching from Reserva to Inmediato
      if (existingSale.tipo === 'Reserva' && tipo === 'Inmediato') {
        // Check if payments are fully verified
        const isFullyVerified = await storage.isPaymentFullyVerified(saleId);
        
        if (isFullyVerified) {
          // Route to Lista de Ventas - set estado to completed
          updates.estado = 'completado';
        } else {
          // Route to Ventas por Completar - set estado to pending
          updates.estado = 'pendiente';
        }
      }
      // For Inmediato to Reserva, no additional estado changes needed - will route to Reservas tab automatically

      // Update the sale with all necessary changes
      const updatedSale = await storage.updateSale(saleId, updates);
      
      if (!updatedSale) {
        return res.status(500).json({ error: "Failed to update sale tipo" });
      }

      res.json({ success: true, sale: updatedSale });
    } catch (error) {
      console.error("Update sale tipo error:", error);
      res.status(500).json({ error: "Failed to update sale tipo" });
    }
  });

  // Update sale fecha entrega
  app.put("/api/sales/:saleId/fecha-entrega", async (req, res) => {
    try {
      const { saleId } = req.params;
      const { fechaEntrega } = req.body;

      // Validate fecha entrega (should be null or a valid date string)
      let parsedDate: Date | null = null;
      if (fechaEntrega !== null && fechaEntrega !== undefined && fechaEntrega !== "") {
        parsedDate = new Date(fechaEntrega);
        if (isNaN(parsedDate.getTime())) {
          return res.status(400).json({ error: "Invalid date format" });
        }
      }

      // Validate that sale exists
      const existingSale = await storage.getSaleById(saleId);
      if (!existingSale) {
        return res.status(404).json({ error: "Sale not found" });
      }

      const updatedSale = await storage.updateSaleFechaEntrega(saleId, parsedDate);
      
      if (!updatedSale) {
        return res.status(500).json({ error: "Failed to update fecha entrega" });
      }

      res.json(updatedSale);
    } catch (error) {
      console.error('Failed to update sale fecha entrega:', error);
      res.status(500).json({ error: "Failed to update sale fecha entrega" });
    }
  });

  // Assign asesor to sale
  app.put("/api/sales/:saleId/asesor", async (req, res) => {
    try {
      const { saleId } = req.params;
      
      // Validate request body with Zod
      const updateAsesorSchema = z.object({
        asesorId: z.string().nullable(),
      });
      
      const { asesorId } = updateAsesorSchema.parse(req.body);

      // If asesorId is provided (not null), validate that the asesor exists and is active
      if (asesorId) {
        const asesor = await storage.getAsesorById(asesorId);
        if (!asesor) {
          return res.status(400).json({ error: "Asesor not found" });
        }
        if (!asesor.activo) {
          return res.status(400).json({ error: "Cannot assign inactive asesor" });
        }
      }

      const updatedSale = await storage.updateSale(saleId, { asesorId });
      if (!updatedSale) {
        return res.status(404).json({ error: "Sale not found" });
      }

      res.json(updatedSale);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request data", details: error.errors });
      }
      console.error("Update sale asesor error:", error);
      res.status(500).json({ error: "Failed to update sale asesor" });
    }
  });

  // ===========================================
  // ADMIN CONFIGURATION ENDPOINTS
  // ===========================================

  // BANCOS endpoints
  // Canales endpoints
  app.get("/api/admin/canales", async (req, res) => {
    try {
      const canales = await storage.getCanales();
      res.json(canales);
    } catch (error) {
      console.error("Get canales error:", error);
      res.status(500).json({ error: "Failed to get canales" });
    }
  });

  app.post("/api/admin/canales", async (req, res) => {
    try {
      const { insertCanalSchema } = await import("@shared/schema");
      const validatedData = insertCanalSchema.parse(req.body);
      const canal = await storage.createCanal(validatedData);
      res.status(201).json(canal);
    } catch (error) {
      console.error("Create canal error:", error);
      res.status(500).json({ error: "Failed to create canal" });
    }
  });

  app.put("/api/admin/canales/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { insertCanalSchema } = await import("@shared/schema");
      const validatedData = insertCanalSchema.partial().parse(req.body);
      const canal = await storage.updateCanal(id, validatedData);
      if (!canal) {
        return res.status(404).json({ error: "Canal not found" });
      }
      res.json(canal);
    } catch (error) {
      console.error("Update canal error:", error);
      res.status(500).json({ error: "Failed to update canal" });
    }
  });

  app.delete("/api/admin/canales/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteCanal(id);
      if (!deleted) {
        return res.status(404).json({ error: "Canal not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Delete canal error:", error);
      res.status(500).json({ error: "Failed to delete canal" });
    }
  });

  app.get("/api/admin/bancos", async (req, res) => {
    try {
      const bancos = await storage.getBancos();
      res.json(bancos);
    } catch (error) {
      console.error("Get bancos error:", error);
      res.status(500).json({ error: "Failed to get bancos" });
    }
  });

  app.post("/api/admin/bancos", async (req, res) => {
    try {
      const validatedData = insertBancoSchema.parse(req.body);
      const banco = await storage.createBanco(validatedData);
      res.status(201).json(banco);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Create banco error:", error);
      res.status(500).json({ error: "Failed to create banco" });
    }
  });

  app.put("/api/admin/bancos/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertBancoSchema.partial().parse(req.body);
      const banco = await storage.updateBanco(id, validatedData);
      if (!banco) {
        return res.status(404).json({ error: "Banco not found" });
      }
      res.json(banco);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Update banco error:", error);
      res.status(500).json({ error: "Failed to update banco" });
    }
  });

  app.delete("/api/admin/bancos/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteBanco(id);
      if (!deleted) {
        return res.status(404).json({ error: "Banco not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Delete banco error:", error);
      res.status(500).json({ error: "Failed to delete banco" });
    }
  });

  // TIPOS DE EGRESOS endpoints
  app.get("/api/admin/tipos-egresos", async (req, res) => {
    try {
      const tipos = await storage.getTiposEgresos();
      res.json(tipos);
    } catch (error) {
      console.error("Get tipos egresos error:", error);
      res.status(500).json({ error: "Failed to get tipos egresos" });
    }
  });

  app.post("/api/admin/tipos-egresos", async (req, res) => {
    try {
      const validatedData = insertTipoEgresoSchema.parse(req.body);
      const tipo = await storage.createTipoEgreso(validatedData);
      res.status(201).json(tipo);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Create tipo egreso error:", error);
      res.status(500).json({ error: "Failed to create tipo egreso" });
    }
  });

  app.put("/api/admin/tipos-egresos/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertTipoEgresoSchema.partial().parse(req.body);
      const tipo = await storage.updateTipoEgreso(id, validatedData);
      if (!tipo) {
        return res.status(404).json({ error: "Tipo egreso not found" });
      }
      res.json(tipo);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Update tipo egreso error:", error);
      res.status(500).json({ error: "Failed to update tipo egreso" });
    }
  });

  app.delete("/api/admin/tipos-egresos/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteTipoEgreso(id);
      if (!deleted) {
        return res.status(404).json({ error: "Tipo egreso not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Delete tipo egreso error:", error);
      res.status(500).json({ error: "Failed to delete tipo egreso" });
    }
  });

  // PRODUCTOS endpoints
  app.get("/api/admin/productos", async (req, res) => {
    try {
      const productos = await storage.getProductos();
      res.json(productos);
    } catch (error) {
      console.error("Get productos error:", error);
      res.status(500).json({ error: "Failed to get productos" });
    }
  });

  app.post("/api/admin/productos", async (req, res) => {
    try {
      const validatedData = insertProductoSchema.parse(req.body);
      const producto = await storage.createProducto(validatedData);
      res.status(201).json(producto);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Create producto error:", error);
      res.status(500).json({ error: "Failed to create producto" });
    }
  });

  app.put("/api/admin/productos/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertProductoSchema.partial().parse(req.body);
      const producto = await storage.updateProducto(id, validatedData);
      if (!producto) {
        return res.status(404).json({ error: "Producto not found" });
      }
      res.json(producto);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Update producto error:", error);
      res.status(500).json({ error: "Failed to update producto" });
    }
  });

  app.delete("/api/admin/productos/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteProducto(id);
      if (!deleted) {
        return res.status(404).json({ error: "Producto not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Delete producto error:", error);
      res.status(500).json({ error: "Failed to delete producto" });
    }
  });

  app.post("/api/admin/productos/upload-excel", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Get valid categorias from database (or fallback to hardcoded if no table exists)
      let validCategorias = ["Colchón", "Seat", "Pillow", "Topper", "Bed"];
      try {
        const existingCategorias = await storage.getCategorias();
        if (existingCategorias && existingCategorias.length > 0) {
          validCategorias = existingCategorias.map(cat => cat.nombre);
        }
      } catch (error) {
        // Fallback to hardcoded list if categorias table doesn't exist or isn't accessible
        console.log("Using fallback categorias list");
      }

      // Parse file with row-level error handling
      const parsedRows = parseProductosFile(req.file.buffer, req.file.originalname, validCategorias);
      
      // Separate valid rows from invalid rows
      const validRows = parsedRows.filter(row => !row.error && row.data);
      const invalidRows = parsedRows.filter(row => row.error);
      
      if (validRows.length === 0) {
        return res.status(400).json({
          error: "No valid rows found",
          details: invalidRows.slice(0, 10).map(row => ({ row: row.row, error: row.error })),
          totalErrors: invalidRows.length
        });
      }

      // Check for duplicates within file and against database
      const existingProducts = await storage.getProductos();
      const existingNombres = new Set(existingProducts.map(p => p.nombre.toLowerCase()));
      const existingSKUs = new Set(existingProducts.map(p => p.sku).filter(Boolean));
      
      const nombresInFile = new Set<string>();
      const skusInFile = new Set<string>();
      const additionalErrors = [];
      const validProductos = [];
      
      for (const row of validRows) {
        const { data } = row;
        if (!data) continue;
        
        let hasError = false;
        
        // Check for duplicate nombres within file
        if (nombresInFile.has(data.nombre.toLowerCase())) {
          additionalErrors.push({
            row: row.row,
            error: `Duplicate product name "${data.nombre}" found in file`
          });
          hasError = true;
        } else {
          nombresInFile.add(data.nombre.toLowerCase());
        }
        
        // Check for duplicate nombres against database
        if (existingNombres.has(data.nombre.toLowerCase())) {
          additionalErrors.push({
            row: row.row,
            error: `Product name "${data.nombre}" already exists in database`
          });
          hasError = true;
        }
        
        // Check for duplicate SKUs within file
        if (data.sku && skusInFile.has(data.sku)) {
          additionalErrors.push({
            row: row.row,
            error: `Duplicate SKU "${data.sku}" found in file`
          });
          hasError = true;
        } else if (data.sku) {
          skusInFile.add(data.sku);
        }
        
        // Check for duplicate SKUs against database
        if (data.sku && existingSKUs.has(data.sku)) {
          additionalErrors.push({
            row: row.row,
            error: `SKU "${data.sku}" already exists in database`
          });
          hasError = true;
        }
        
        if (!hasError) {
          try {
            const validatedProducto = insertProductoSchema.parse(data);
            validProductos.push(validatedProducto);
          } catch (error) {
            additionalErrors.push({
              row: row.row,
              error: error instanceof z.ZodError ? error.errors.map(e => e.message).join(', ') : String(error)
            });
          }
        }
      }

      // Combine all errors (standardize to 'row' property)
      const allErrors = [
        ...invalidRows.map(row => ({ row: row.row, error: row.error })),
        ...additionalErrors
      ];

      // Import valid produtos
      const createdProductos = [];
      const creationErrors = [];
      
      for (const producto of validProductos) {
        try {
          const created = await storage.createProducto(producto);
          createdProductos.push(created);
        } catch (error) {
          creationErrors.push({
            row: 'unknown', // We've lost the original row mapping at this point
            error: `Database error: ${error instanceof Error ? error.message : 'Unknown error'}`
          });
        }
      }

      // Return results with detailed statistics
      res.json({
        success: true,
        created: createdProductos.length,
        total: parsedRows.length,
        errors: allErrors.length + creationErrors.length,
        details: {
          validRows: validRows.length,
          invalidRows: invalidRows.length,
          duplicates: additionalErrors.length,
          creationErrors: creationErrors.length,
          errorList: [...allErrors, ...creationErrors].slice(0, 20) // Show first 20 errors
        }
      });

    } catch (error) {
      console.error("Upload productos error:", error);
      res.status(500).json({ 
        error: "Failed to process upload",
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // MÉTODOS DE PAGO endpoints
  app.get("/api/admin/metodos-pago", async (req, res) => {
    try {
      const metodos = await storage.getMetodosPago();
      res.json(metodos);
    } catch (error) {
      console.error("Get metodos pago error:", error);
      res.status(500).json({ error: "Failed to get metodos pago" });
    }
  });

  app.post("/api/admin/metodos-pago", async (req, res) => {
    try {
      const validatedData = insertMetodoPagoSchema.parse(req.body);
      const metodo = await storage.createMetodoPago(validatedData);
      res.status(201).json(metodo);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Create metodo pago error:", error);
      res.status(500).json({ error: "Failed to create metodo pago" });
    }
  });

  app.put("/api/admin/metodos-pago/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertMetodoPagoSchema.partial().parse(req.body);
      const metodo = await storage.updateMetodoPago(id, validatedData);
      if (!metodo) {
        return res.status(404).json({ error: "Metodo pago not found" });
      }
      res.json(metodo);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Update metodo pago error:", error);
      res.status(500).json({ error: "Failed to update metodo pago" });
    }
  });

  app.delete("/api/admin/metodos-pago/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteMetodoPago(id);
      if (!deleted) {
        return res.status(404).json({ error: "Metodo pago not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Delete metodo pago error:", error);
      res.status(500).json({ error: "Failed to delete metodo pago" });
    }
  });

  // MONEDAS endpoints
  app.get("/api/admin/monedas", async (req, res) => {
    try {
      const monedas = await storage.getMonedas();
      res.json(monedas);
    } catch (error) {
      console.error("Get monedas error:", error);
      res.status(500).json({ error: "Failed to get monedas" });
    }
  });

  app.post("/api/admin/monedas", async (req, res) => {
    try {
      const validatedData = insertMonedaSchema.parse(req.body);
      const moneda = await storage.createMoneda(validatedData);
      res.status(201).json(moneda);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Create moneda error:", error);
      res.status(500).json({ error: "Failed to create moneda" });
    }
  });

  app.put("/api/admin/monedas/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertMonedaSchema.partial().parse(req.body);
      const moneda = await storage.updateMoneda(id, validatedData);
      if (!moneda) {
        return res.status(404).json({ error: "Moneda not found" });
      }
      res.json(moneda);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Update moneda error:", error);
      res.status(500).json({ error: "Failed to update moneda" });
    }
  });

  app.delete("/api/admin/monedas/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteMoneda(id);
      if (!deleted) {
        return res.status(404).json({ error: "Moneda not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Delete moneda error:", error);
      res.status(500).json({ error: "Failed to delete moneda" });
    }
  });

  // CATEGORÍAS endpoints
  app.get("/api/admin/categorias", async (req, res) => {
    try {
      const categorias = await storage.getCategorias();
      res.json(categorias);
    } catch (error) {
      console.error("Get categorias error:", error);
      res.status(500).json({ error: "Failed to get categorias" });
    }
  });

  app.post("/api/admin/categorias", async (req, res) => {
    try {
      const validatedData = insertCategoriaSchema.parse(req.body);
      const categoria = await storage.createCategoria(validatedData);
      res.status(201).json(categoria);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Create categoria error:", error);
      res.status(500).json({ error: "Failed to create categoria" });
    }
  });

  app.put("/api/admin/categorias/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertCategoriaSchema.partial().parse(req.body);
      const categoria = await storage.updateCategoria(id, validatedData);
      if (!categoria) {
        return res.status(404).json({ error: "Categoria not found" });
      }
      res.json(categoria);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Update categoria error:", error);
      res.status(500).json({ error: "Failed to update categoria" });
    }
  });

  app.delete("/api/admin/categorias/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteCategoria(id);
      if (!deleted) {
        return res.status(404).json({ error: "Categoria not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Delete categoria error:", error);
      res.status(500).json({ error: "Failed to delete categoria" });
    }
  });

  // ASESORES endpoints
  app.get("/api/admin/asesores", async (req, res) => {
    try {
      const asesores = await storage.getAsesores();
      res.json(asesores);
    } catch (error) {
      console.error("Fetch asesores error:", error);
      res.status(500).json({ error: "Failed to fetch asesores" });
    }
  });

  app.post("/api/admin/asesores", async (req, res) => {
    try {
      const validatedData = insertAsesorSchema.parse(req.body);
      const asesor = await storage.createAsesor(validatedData);
      res.status(201).json(asesor);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Create asesor error:", error);
      res.status(500).json({ error: "Failed to create asesor" });
    }
  });

  app.put("/api/admin/asesores/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertAsesorSchema.partial().parse(req.body);
      const asesor = await storage.updateAsesor(id, validatedData);
      if (!asesor) {
        return res.status(404).json({ error: "Asesor not found" });
      }
      res.json(asesor);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Update asesor error:", error);
      res.status(500).json({ error: "Failed to update asesor" });
    }
  });

  app.delete("/api/admin/asesores/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteAsesor(id);
      if (!deleted) {
        return res.status(404).json({ error: "Asesor not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Delete asesor error:", error);
      res.status(500).json({ error: "Failed to delete asesor" });
    }
  });

  // EGRESOS endpoints
  const getEgresosQuerySchema = z.object({
    tipoEgresoId: z.string().optional(),
    metodoPagoId: z.string().optional(),
    bancoId: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    limit: z.coerce.number().min(1).max(100).default(20),
    offset: z.coerce.number().min(0).default(0),
  });

  app.get("/api/egresos", async (req, res) => {
    try {
      const query = getEgresosQuerySchema.parse(req.query);
      
      const filters = {
        tipoEgresoId: query.tipoEgresoId,
        metodoPagoId: query.metodoPagoId,
        bancoId: query.bancoId,
        startDate: query.startDate ? new Date(query.startDate) : undefined,
        endDate: query.endDate ? new Date(query.endDate) : undefined,
        limit: query.limit,
        offset: query.offset,
      };

      const [egresosData, totalCount] = await Promise.all([
        storage.getEgresos(filters),
        storage.getTotalEgresosCount(filters),
      ]);

      res.json({
        data: egresosData,
        total: totalCount,
        limit: query.limit,
        offset: query.offset,
      });
    } catch (error) {
      console.error("Error fetching egresos:", error);
      res.status(500).json({ error: "Failed to fetch egresos" });
    }
  });

  app.post("/api/egresos", async (req, res) => {
    try {
      const validatedData = insertEgresoSchema.parse(req.body);
      const egreso = await storage.createEgreso(validatedData);
      res.status(201).json(egreso);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Create egreso error:", error);
      res.status(500).json({ error: "Failed to create egreso" });
    }
  });

  app.put("/api/egresos/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertEgresoSchema.partial().parse(req.body);
      const egreso = await storage.updateEgreso(id, validatedData);
      if (!egreso) {
        return res.status(404).json({ error: "Egreso not found" });
      }
      res.json(egreso);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Update egreso error:", error);
      res.status(500).json({ error: "Failed to update egreso" });
    }
  });

  app.delete("/api/egresos/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteEgreso(id);
      if (!deleted) {
        return res.status(404).json({ error: "Egreso not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Delete egreso error:", error);
      res.status(500).json({ error: "Failed to delete egreso" });
    }
  });

  app.get("/api/egresos/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const egreso = await storage.getEgresoById(id);
      if (!egreso) {
        return res.status(404).json({ error: "Egreso not found" });
      }
      res.json(egreso);
    } catch (error) {
      console.error("Get egreso error:", error);
      res.status(500).json({ error: "Failed to get egreso" });
    }
  });

  // Egresos Por Aprobar endpoints
  const getEgresosPorAprobarQuerySchema = z.object({
    tipoEgresoId: z.string().optional(),
    metodoPagoId: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    limit: z.coerce.number().min(1).max(100).default(20),
    offset: z.coerce.number().min(0).default(0),
  });

  app.get("/api/egresos-por-aprobar", async (req, res) => {
    try {
      const query = getEgresosPorAprobarQuerySchema.parse(req.query);
      
      const filters = {
        tipoEgresoId: query.tipoEgresoId,
        metodoPagoId: query.metodoPagoId,
        startDate: query.startDate ? new Date(query.startDate) : undefined,
        endDate: query.endDate ? new Date(query.endDate) : undefined,
        limit: query.limit,
        offset: query.offset,
      };

      const [egresosPorAprobarData, totalCount] = await Promise.all([
        storage.getEgresosPorAprobar(filters),
        storage.getTotalEgresosPorAprobarCount(filters),
      ]);

      res.json({
        data: egresosPorAprobarData,
        total: totalCount,
        limit: query.limit,
        offset: query.offset,
      });
    } catch (error) {
      console.error("Error fetching egresos por aprobar:", error);
      res.status(500).json({ error: "Failed to fetch egresos por aprobar" });
    }
  });

  app.post("/api/egresos-por-aprobar", async (req, res) => {
    try {
      const validatedData = insertEgresoPorAprobarSchema.parse(req.body);
      const egreso = await storage.createEgresoPorAprobar(validatedData);
      res.status(201).json(egreso);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Create egreso por aprobar error:", error);
      res.status(500).json({ error: "Failed to create egreso por aprobar" });
    }
  });

  app.put("/api/egresos-por-aprobar/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertEgresoPorAprobarSchema.partial().parse(req.body);
      const updatedEgreso = await storage.updateEgresoPorAprobar(id, validatedData);
      if (!updatedEgreso) {
        return res.status(404).json({ error: "Egreso por aprobar not found" });
      }
      res.json(updatedEgreso);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Update egreso por aprobar error:", error);
      res.status(500).json({ error: "Failed to update egreso por aprobar" });
    }
  });

  app.delete("/api/egresos-por-aprobar/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteEgresoPorAprobar(id);
      if (!success) {
        return res.status(404).json({ error: "Egreso por aprobar not found" });
      }
      res.json({ message: "Egreso por aprobar deleted successfully" });
    } catch (error) {
      console.error("Delete egreso por aprobar error:", error);
      res.status(500).json({ error: "Failed to delete egreso por aprobar" });
    }
  });

  app.get("/api/egresos-por-aprobar/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const egreso = await storage.getEgresoPorAprobarById(id);
      if (!egreso) {
        return res.status(404).json({ error: "Egreso por aprobar not found" });
      }
      res.json(egreso);
    } catch (error) {
      console.error("Get egreso por aprobar error:", error);
      res.status(500).json({ error: "Failed to get egreso por aprobar" });
    }
  });

  const aprobarEgresoSchema = z.object({
    monedaId: z.string(),
    bancoId: z.string(),
    referencia: z.string().optional(),
    observaciones: z.string().optional(),
  });

  app.post("/api/egresos-por-aprobar/:id/aprobar", async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = aprobarEgresoSchema.parse(req.body);
      const newEgreso = await storage.aprobarEgreso(id, validatedData);
      res.status(201).json(newEgreso);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Aprobar egreso error:", error);
      res.status(500).json({ error: "Failed to approve egreso" });
    }
  });

  // Complete payment info for egreso
  const completarInfoPagoSchema = z.object({
    bancoId: z.string().optional(),
    referencia: z.string().optional(),
    observaciones: z.string().optional(),
  });

  app.put("/api/egresos/:id/completar-pago", async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = completarInfoPagoSchema.parse(req.body);
      const updatedEgreso = await storage.completarInfoPagoEgreso(id, validatedData);
      if (!updatedEgreso) {
        return res.status(404).json({ error: "Egreso not found" });
      }
      res.json(updatedEgreso);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Complete payment info error:", error);
      res.status(500).json({ error: "Failed to complete payment info" });
    }
  });

  // Update sale
  app.put("/api/sales/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const body = req.body;
      
      // Check if sale exists
      const existingSale = await storage.getSaleById(id);
      if (!existingSale) {
        return res.status(404).json({ error: "Sale not found" });
      }

      // Helper function to handle numeric fields
      const handleNumericField = (value: any, existingValue: any) => {
        if (value === undefined) return existingValue;
        if (value === "" || value === null) return null;
        return value.toString();
      };

      // Helper function to handle integer fields
      const handleIntegerField = (value: any, existingValue: any) => {
        if (value === undefined) return existingValue;
        if (value === "" || value === null) return null;
        return parseInt(value) || null;
      };

      // Prepare updated sale data
      const saleData = {
        // Core fields
        nombre: body.nombre || existingSale.nombre,
        totalUsd: handleNumericField(body.totalUsd, existingSale.totalUsd),
        fecha: body.fecha ? new Date(body.fecha) : existingSale.fecha,
        product: body.product || existingSale.product,
        cantidad: handleIntegerField(body.cantidad, existingSale.cantidad),
        
        // Optional fields
        cedula: body.cedula !== undefined ? body.cedula : existingSale.cedula,
        telefono: body.telefono !== undefined ? body.telefono : existingSale.telefono,
        email: body.email !== undefined ? body.email : existingSale.email,
        referencia: body.referencia !== undefined ? body.referencia : existingSale.referencia,
        montoBs: handleNumericField(body.montoBs, existingSale.montoBs),
        montoUsd: handleNumericField(body.montoUsd, existingSale.montoUsd),
        pagoInicialUsd: handleNumericField(body.pagoInicialUsd, existingSale.pagoInicialUsd),
        metodoPagoId: body.metodoPagoId !== undefined ? body.metodoPagoId : existingSale.metodoPagoId,
        bancoId: body.bancoId !== undefined ? body.bancoId : existingSale.bancoId,
        estadoEntrega: body.estadoEntrega !== undefined ? body.estadoEntrega : existingSale.estadoEntrega,
        
        // Address fields
        direccionFacturacionPais: body.direccionFacturacionPais !== undefined ? body.direccionFacturacionPais : existingSale.direccionFacturacionPais,
        direccionFacturacionEstado: body.direccionFacturacionEstado !== undefined ? body.direccionFacturacionEstado : existingSale.direccionFacturacionEstado,
        direccionFacturacionCiudad: body.direccionFacturacionCiudad !== undefined ? body.direccionFacturacionCiudad : existingSale.direccionFacturacionCiudad,
        direccionFacturacionDireccion: body.direccionFacturacionDireccion !== undefined ? body.direccionFacturacionDireccion : existingSale.direccionFacturacionDireccion,
        direccionFacturacionUrbanizacion: body.direccionFacturacionUrbanizacion !== undefined ? body.direccionFacturacionUrbanizacion : existingSale.direccionFacturacionUrbanizacion,
        direccionFacturacionReferencia: body.direccionFacturacionReferencia !== undefined ? body.direccionFacturacionReferencia : existingSale.direccionFacturacionReferencia,
        
        // Handle shipping address logic
        direccionDespachoIgualFacturacion: body.direccionDespachoIgualFacturacion !== undefined ? 
          (body.direccionDespachoIgualFacturacion ? "true" : "false") : 
          existingSale.direccionDespachoIgualFacturacion,
        direccionDespachoPais: body.direccionDespachoIgualFacturacion ? 
          (body.direccionFacturacionPais || existingSale.direccionFacturacionPais) : 
          (body.direccionDespachoPais !== undefined ? body.direccionDespachoPais : existingSale.direccionDespachoPais),
        direccionDespachoEstado: body.direccionDespachoIgualFacturacion ? 
          (body.direccionFacturacionEstado || existingSale.direccionFacturacionEstado) : 
          (body.direccionDespachoEstado !== undefined ? body.direccionDespachoEstado : existingSale.direccionDespachoEstado),
        direccionDespachoCiudad: body.direccionDespachoIgualFacturacion ? 
          (body.direccionFacturacionCiudad || existingSale.direccionFacturacionCiudad) : 
          (body.direccionDespachoCiudad !== undefined ? body.direccionDespachoCiudad : existingSale.direccionDespachoCiudad),
        direccionDespachoDireccion: body.direccionDespachoIgualFacturacion ? 
          (body.direccionFacturacionDireccion || existingSale.direccionFacturacionDireccion) : 
          (body.direccionDespachoDireccion !== undefined ? body.direccionDespachoDireccion : existingSale.direccionDespachoDireccion),
        direccionDespachoUrbanizacion: body.direccionDespachoIgualFacturacion ? 
          (body.direccionFacturacionUrbanizacion || existingSale.direccionFacturacionUrbanizacion) : 
          (body.direccionDespachoUrbanizacion !== undefined ? body.direccionDespachoUrbanizacion : existingSale.direccionDespachoUrbanizacion),
        direccionDespachoReferencia: body.direccionDespachoIgualFacturacion ? 
          (body.direccionFacturacionReferencia || existingSale.direccionFacturacionReferencia) : 
          (body.direccionDespachoReferencia !== undefined ? body.direccionDespachoReferencia : existingSale.direccionDespachoReferencia),
      };

      const updatedSale = await storage.updateSale(id, saleData);
      if (!updatedSale) {
        return res.status(404).json({ error: "Failed to update sale" });
      }
      
      // Check if we need to update sale status when payment info is filled up
      if (existingSale.estado === "pendiente" && existingSale.canal?.toLowerCase() === "manual") {
        // Check if any payment information is being provided
        const hasPaymentInfo = !!(
          saleData.referencia || 
          saleData.bancoId || 
          saleData.metodoPagoId ||
          (saleData.montoUsd && parseFloat(saleData.montoUsd) > 0) ||
          (saleData.pagoInicialUsd && parseFloat(saleData.pagoInicialUsd) > 0)
        );
        
        if (hasPaymentInfo) {
          // Update estado to move from Ventas por Completar to Lista de Ventas
          const finalUpdatedSale = await storage.updateSale(id, {
            estado: "activo",
            estadoEntrega: "En Proceso"
          });
          res.json(finalUpdatedSale || updatedSale);
        } else {
          res.json(updatedSale);
        }
      } else {
        res.json(updatedSale);
      }
    } catch (error) {
      console.error("Error updating sale:", error);
      res.status(500).json({ error: "Failed to update sale" });
    }
  });

  // Verify payment for manual sale
  app.put("/api/sales/:id/verify-payment", async (req, res) => {
    try {
      const { id } = req.params;
      
      // Update the sale status from "pendiente" to "completado" to move it from Ventas por Completar to Lista de Ventas
      // Keep estadoEntrega as "En Proceso" as requested by the user
      const updatedSale = await storage.updateSale(id, { 
        estado: "completado",
        estadoEntrega: "En Proceso"
      });
      
      if (!updatedSale) {
        return res.status(404).json({ error: "Sale not found" });
      }
      
      res.json(updatedSale);
    } catch (error) {
      console.error("Error verifying payment:", error);
      res.status(500).json({ error: "Failed to verify payment" });
    }
  });

  // Delete sale
  app.delete("/api/sales/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      // Check if sale exists
      const existingSale = await storage.getSaleById(id);
      if (!existingSale) {
        return res.status(404).json({ error: "Sale not found" });
      }
      
      const deleted = await storage.deleteSale(id);
      if (!deleted) {
        return res.status(500).json({ error: "Failed to delete sale" });
      }
      
      res.json({ success: true, message: "Sale deleted successfully" });
    } catch (error) {
      console.error("Error deleting sale:", error);
      res.status(500).json({ error: "Failed to delete sale" });
    }
  });

  // Create manual sale
  app.post("/api/sales/manual", async (req, res) => {
    try {
      // Parse and validate the request body
      const body = req.body;
      
      // Generate order number starting from 20000 for manual entries
      const existingManualSales = await storage.getSales({ canal: "manual" });
      const maxOrderNumber = existingManualSales
        .map(s => parseInt(s.orden || "0"))
        .filter(n => !isNaN(n) && n >= 20000)
        .sort((a, b) => b - a)[0] || 19999;
      
      const newOrderNumber = (maxOrderNumber + 1).toString();

      // Prepare sale data with defaults for manual entries
      const saleData = {
        // Required fields
        nombre: body.nombre,
        totalUsd: body.totalUsd.toString(),
        fecha: new Date(body.fecha),
        canal: body.canal || "Manual",
        estado: "pendiente", // Manual sales start as pending until payment is verified
        estadoEntrega: "En Proceso",
        product: body.product,
        cantidad: parseInt(body.cantidad) || 1,
        
        // Optional fields
        cedula: body.cedula || null,
        telefono: body.telefono || null,
        email: body.email || null,
        sucursal: null,
        tienda: null,
        estadoPagoInicial: "pendiente",
        pagoInicialUsd: (body.pagoInicialUsd !== undefined && body.pagoInicialUsd !== null) ? String(body.pagoInicialUsd) : null,
        orden: newOrderNumber,
        factura: null,
        referencia: body.referencia || null,
        montoBs: body.montoBs || null,
        montoUsd: body.montoUsd || null,
        metodoPagoId: body.metodoPagoId || null,
        bancoId: body.bancoId || null,
        
        // Address fields
        direccionFacturacionPais: body.direccionFacturacionPais || null,
        direccionFacturacionEstado: body.direccionFacturacionEstado || null,
        direccionFacturacionCiudad: body.direccionFacturacionCiudad || null,
        direccionFacturacionDireccion: body.direccionFacturacionDireccion || null,
        direccionFacturacionUrbanizacion: body.direccionFacturacionUrbanizacion || null,
        direccionFacturacionReferencia: body.direccionFacturacionReferencia || null,
        
        // Handle shipping address logic
        direccionDespachoIgualFacturacion: body.direccionDespachoIgualFacturacion ? "true" : "false",
        direccionDespachoPais: body.direccionDespachoIgualFacturacion ? 
          body.direccionFacturacionPais : body.direccionDespachoPais,
        direccionDespachoEstado: body.direccionDespachoIgualFacturacion ? 
          body.direccionFacturacionEstado : body.direccionDespachoEstado,
        direccionDespachoCiudad: body.direccionDespachoIgualFacturacion ? 
          body.direccionFacturacionCiudad : body.direccionDespachoCiudad,
        direccionDespachoDireccion: body.direccionDespachoIgualFacturacion ? 
          body.direccionFacturacionDireccion : body.direccionDespachoDireccion,
        direccionDespachoUrbanizacion: body.direccionDespachoIgualFacturacion ? 
          body.direccionFacturacionUrbanizacion : body.direccionDespachoUrbanizacion,
        direccionDespachoReferencia: body.direccionDespachoIgualFacturacion ? 
          body.direccionFacturacionReferencia : body.direccionDespachoReferencia,
        
        // New fields for sales system overhaul
        tipo: body.tipo || 'Inmediato', // Default to Inmediato if not provided
        fechaEntrega: body.fechaEntrega ? new Date(body.fechaEntrega) : undefined,
        
        // Medida especial
        medidaEspecial: body.hasMedidaEspecial && body.medidaEspecial && body.medidaEspecial.trim() 
          ? body.medidaEspecial.trim() 
          : null,
      };

      const newSale = await storage.createSale(saleData);
      res.status(201).json(newSale);
    } catch (error) {
      console.error("Error creating manual sale:", error);
      res.status(500).json({ error: "Failed to create manual sale" });
    }
  });

  // Process bank statement for Cashea payment verification
  app.post('/api/admin/process-bank-statement', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const transactions = parseBankStatementFile(req.file.buffer);
      
      res.json({
        transactions,
        count: transactions.length
      });
    } catch (error) {
      console.error('Bank statement processing error:', error);
      res.status(500).json({ 
        error: 'Failed to process bank statement',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Verify Cashea payments and update status to A Despachar
  app.post('/api/admin/verify-cashea-payments', async (req, res) => {
    try {
      const { matches } = req.body;
      
      if (!Array.isArray(matches)) {
        return res.status(400).json({ error: 'Invalid matches data' });
      }

      let verifiedCount = 0;
      
      for (const match of matches) {
        if (match.confidence >= 80) {
          try {
            await storage.updateSaleDeliveryStatus(match.sale.id, 'A Despachar');
            verifiedCount++;
          } catch (error) {
            console.error(`Error updating sale ${match.sale.id}:`, error);
          }
        }
      }
      
      res.json({
        verified: verifiedCount,
        total: matches.length
      });
    } catch (error) {
      console.error('Payment verification error:', error);
      res.status(500).json({ 
        error: 'Failed to verify payments',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Update existing Cashea orders from A Despachar to En Proceso
  app.post('/api/admin/update-cashea-status', async (req, res) => {
    try {
      const updatedCount = await storage.updateCasheaOrdersToProcessing();
      
      res.json({
        updated: updatedCount,
        message: `Successfully updated ${updatedCount} Cashea orders from A Despachar to En Proceso`
      });
    } catch (error) {
      console.error('Cashea status update error:', error);
      res.status(500).json({ 
        error: 'Failed to update Cashea orders',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Payment Installments Routes
  
  // GET /api/sales/:saleId/installments - Returns installments + summary
  app.get("/api/sales/:saleId/installments", async (req, res) => {
    try {
      const { saleId } = req.params;
      
      // Validate that sale exists
      const sale = await storage.getSaleById(saleId);
      if (!sale) {
        return res.status(404).json({ error: "Sale not found" });
      }

      const [installments, summary] = await Promise.all([
        storage.getInstallmentsBySale(saleId),
        storage.getInstallmentSummary(saleId),
      ]);

      res.json({
        installments,
        summary,
      });
    } catch (error) {
      console.error("Get installments error:", error);
      res.status(500).json({ error: "Failed to get installments" });
    }
  });

  // POST /api/sales/:saleId/installments - Create new installment
  app.post("/api/sales/:saleId/installments", async (req, res) => {
    try {
      const { saleId } = req.params;
      
      // Validate that sale exists
      const sale = await storage.getSaleById(saleId);
      if (!sale) {
        return res.status(404).json({ error: "Sale not found" });
      }

      // Validate request body (exclude fields managed by server)
      const validatedData = insertPaymentInstallmentSchema.omit({
        saleId: true,
        installmentNumber: true,
        orden: true,
        saldoRemaining: true
      }).parse(req.body);

      // Check for overpayment
      const summary = await storage.getInstallmentSummary(saleId);
      const newAmount = parseFloat(validatedData.cuotaAmount || '0');
      
      if (newAmount <= 0) {
        return res.status(400).json({ error: "Payment amount must be positive" });
      }

      if (validatedData.verificado && (summary.totalPagado + newAmount > summary.totalUsd)) {
        return res.status(400).json({ 
          error: "Payment would exceed total amount",
          details: {
            totalUsd: summary.totalUsd,
            currentPaid: summary.totalPagado,
            attemptedPayment: newAmount,
            wouldExceedBy: (summary.totalPagado + newAmount) - summary.totalUsd
          }
        });
      }

      const installment = await storage.createInstallment(saleId, validatedData);
      
      // If this is the first payment info for a pending manual sale, move it to Lista de Ventas
      if (sale.estado === "pendiente" && sale.canal?.toLowerCase() === "manual" && 
          validatedData.cuotaAmount && parseFloat(validatedData.cuotaAmount) > 0) {
        await storage.updateSale(saleId, {
          estado: "activo",
          estadoEntrega: "En Proceso"
        });
      }
      
      // Check if Reserva order is now fully paid and verified - move to Lista de Ventas
      if (sale.tipo === "Reserva" && await storage.isPaymentFullyVerified(saleId)) {
        // First, set estado to completado so it appears in Lista de Ventas
        await storage.updateSale(saleId, { estado: "completado" });
        // Then, use proper delivery status update to handle freight initialization and business logic
        await storage.updateSaleDeliveryStatus(saleId, "A Despachar");
      }
      
      res.status(201).json(installment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Create installment error:", error);
      res.status(500).json({ error: "Failed to create installment" });
    }
  });

  // PATCH /api/installments/:id - Update installment
  app.patch("/api/installments/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      // Validate request body (partial update)
      const validatedData = insertPaymentInstallmentSchema.partial().parse(req.body);

      // Validate amount if provided
      if (validatedData.cuotaAmount !== undefined && parseFloat(validatedData.cuotaAmount || '0') <= 0) {
        return res.status(400).json({ error: "Payment amount must be positive" });
      }

      // Get current installment to check for overpayment
      const currentInstallment = await storage.getInstallmentById(id);
      if (!currentInstallment) {
        return res.status(404).json({ error: "Installment not found" });
      }

      // Get installment summary to check for overpayment
      const summary = await storage.getInstallmentSummary(currentInstallment.saleId);
      
      // Determine new values after update
      const newAmount = validatedData.cuotaAmount !== undefined ? 
        parseFloat(validatedData.cuotaAmount || '0') : 
        parseFloat(currentInstallment.cuotaAmount || '0');
      
      const newVerificado = validatedData.verificado !== undefined ? 
        validatedData.verificado : 
        currentInstallment.verificado;

      // Calculate current verified amount from this installment
      const currentVerifiedAmount = currentInstallment.verificado ? 
        parseFloat(currentInstallment.cuotaAmount || '0') : 0;

      // Calculate new verified amount from this installment  
      const newVerifiedAmount = newVerificado ? newAmount : 0;

      // Calculate what total paid would be with this update
      const totalPaidWithUpdate = summary.totalPagado - currentVerifiedAmount + newVerifiedAmount;

      // Check for overpayment
      if (totalPaidWithUpdate > summary.totalUsd) {
        return res.status(400).json({ 
          error: "Update would exceed total sale amount",
          details: {
            totalUsd: summary.totalUsd,
            currentTotalPaid: summary.totalPagado,
            currentInstallmentPaid: currentVerifiedAmount,
            newInstallmentAmount: newVerifiedAmount,
            wouldResultInTotalPaid: totalPaidWithUpdate,
            wouldExceedBy: totalPaidWithUpdate - summary.totalUsd
          }
        });
      }

      const installment = await storage.updateInstallment(id, validatedData);
      if (!installment) {
        return res.status(404).json({ error: "Installment not found" });
      }
      
      // Check if we need to update sale status when payment info is filled up
      const sale = await storage.getSaleById(currentInstallment.saleId);
      if (sale && sale.estado === "pendiente" && sale.canal?.toLowerCase() === "manual" && 
          validatedData.cuotaAmount && parseFloat(validatedData.cuotaAmount) > 0) {
        await storage.updateSale(currentInstallment.saleId, {
          estado: "activo", 
          estadoEntrega: "En Proceso"
        });
      }
      
      // Check if Reserva order is now fully paid and verified - move to Lista de Ventas
      if (sale && sale.tipo === "Reserva" && await storage.isPaymentFullyVerified(currentInstallment.saleId)) {
        // First, set estado to completado so it appears in Lista de Ventas
        await storage.updateSale(currentInstallment.saleId, { estado: "completado" });
        // Then, use proper delivery status update to handle freight initialization and business logic
        await storage.updateSaleDeliveryStatus(currentInstallment.saleId, "A Despachar");
      }
      
      res.json(installment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Update installment error:", error);
      res.status(500).json({ error: "Failed to update installment" });
    }
  });

  // DELETE /api/installments/:id - Delete installment
  app.delete("/api/installments/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      const deleted = await storage.deleteInstallment(id);
      if (!deleted) {
        return res.status(404).json({ error: "Installment not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Delete installment error:", error);
      res.status(500).json({ error: "Failed to delete installment" });
    }
  });

  // POST /api/sales/:id/send-email - Send order confirmation email
  app.post("/api/sales/:id/send-email", async (req, res) => {
    try {
      const { id } = req.params;
      
      // Get the sale details
      const sale = await storage.getSaleById(id);
      if (!sale) {
        return res.status(404).json({ error: "Sale not found" });
      }

      // Validate that the sale has the required information for email
      if (!sale.email) {
        return res.status(400).json({ error: "Sale must have a customer email address" });
      }

      if (!sale.nombre) {
        return res.status(400).json({ error: "Sale must have a customer name" });
      }

      // Get asesor name if available
      let asesorName = undefined;
      if (sale.asesorId) {
        const asesor = await storage.getAsesorById(sale.asesorId);
        asesorName = asesor?.nombre;
      }

      // Prepare email data
      const emailData: OrderEmailData = {
        customerName: sale.nombre,
        customerEmail: sale.email,
        orderNumber: sale.orden || `ORD-${sale.id.slice(-8).toUpperCase()}`,
        product: sale.product || 'Producto BoxiSleep',
        quantity: sale.cantidad || 1,
        totalUsd: parseFloat(sale.totalUsd?.toString() || '0'),
        fecha: sale.fecha.toISOString(),
        sku: sale.sku || undefined,
        asesorName
      };

      // Send the email
      await sendOrderConfirmationEmail(emailData);

      res.json({ 
        success: true, 
        message: `Order confirmation email sent successfully to ${sale.email}`,
        emailData: {
          to: emailData.customerEmail,
          orderNumber: emailData.orderNumber,
          sentAt: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error("Send email error:", error);
      
      // Provide more specific error messages based on the error type
      if (error instanceof Error) {
        if (error.message.includes('Outlook not connected')) {
          return res.status(500).json({ 
            error: "Email service not configured", 
            details: "Outlook connection is not properly set up" 
          });
        }
        if (error.message.includes('X_REPLIT_TOKEN')) {
          return res.status(500).json({ 
            error: "Authentication error", 
            details: "Unable to authenticate with email service" 
          });
        }
      }
      
      res.status(500).json({ 
        error: "Failed to send email", 
        details: error instanceof Error ? error.message : "Unknown error occurred" 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
