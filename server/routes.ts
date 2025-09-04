import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertSaleSchema, insertUploadHistorySchema, insertBancoSchema, insertTipoEgresoSchema, 
  insertProductoSchema, insertMetodoPagoSchema, insertMonedaSchema, insertCategoriaSchema,
  insertEgresoSchema
} from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import * as XLSX from "xlsx";
import { nanoid } from "nanoid";

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.mimetype === 'application/vnd.ms-excel') {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed'));
    }
  },
});

const getSalesQuerySchema = z.object({
  canal: z.string().optional(),
  estadoEntrega: z.string().optional(),
  estado: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  excludePendingManual: z.coerce.boolean().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

function parseExcelFile(buffer: Buffer, canal: string) {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    // Expected columns: Nombre, Cedula, Telefono, Email, Total usd, Sucursal, Tienda, Fecha, Canal, Estado, Estado pago inicial, Pago inicial usd, Orden, Factura, Referencia, Monto en bs, Estado de entrega, Product, Cantidad
    const salesData = data.map((row: any) => {
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
        orden: row.Orden ? String(row.Orden) : null,
        factura: row.Factura ? String(row.Factura) : null,
        referencia: row.Referencia ? String(row.Referencia) : null,
        montoBs: row['Monto en bs'] ? String(row['Monto en bs']) : null,
        estadoEntrega: canal.toLowerCase() === 'cashea' ? 
          (String(row['Estado de entrega'] || '').toLowerCase() === 'to deliver' ? 'PROCESSING' : String(row['Estado de entrega'] || 'pendiente')) :
          String(row['Estado de entrega'] || 'pendiente'),
        product: String(row.Product || ''),
        cantidad: Number(row.Cantidad || 1),
      };
    });

    return salesData;
  } catch (error) {
    throw new Error(`Error parsing Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function parseBankStatementFile(buffer: Buffer) {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    // Expected columns: Fecha, Referencia, Monto, Descripcion
    const transactions = data.map((row: any) => {
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
        referencia: String(row.Referencia || row.referencia || ''),
        monto: parseFloat(String(row.Monto || row.monto || '0')),
        fecha: fecha.toISOString().split('T')[0],
        descripcion: String(row.Descripcion || row.descripcion || row.Descripción || ''),
      };
    });

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

export async function registerRoutes(app: Express): Promise<Server> {
  
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
      
      const filters = {
        canal: query.canal,
        estadoEntrega: query.estadoEntrega,
        estado: query.estado,
        startDate: query.startDate ? new Date(query.startDate) : undefined,
        endDate: query.endDate ? new Date(query.endDate) : undefined,
        excludePendingManual: query.excludePendingManual,
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

      // Parse Excel file
      const salesData = parseExcelFile(req.file.buffer, canal);
      
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

      // Save to database
      await storage.createSales(validatedSales);

      // Log successful upload
      await storage.createUploadHistory({
        filename: req.file.originalname,
        canal,
        recordsCount: validatedSales.length,
        status: 'success',
      });

      res.json({
        success: true,
        recordsProcessed: validatedSales.length,
        message: `Successfully uploaded ${validatedSales.length} sales records`
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



  // Update sale delivery status
  app.put("/api/sales/:saleId/delivery-status", async (req, res) => {
    try {
      const { saleId } = req.params;
      const { status } = req.body;

      // Validate status
      const validStatuses = ['TO DELIVER', 'Despachado', 'Cancelado', 'Pospuesto'];
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

      // Prepare updated sale data
      const saleData = {
        // Core fields
        nombre: body.nombre || existingSale.nombre,
        totalUsd: body.totalUsd ? body.totalUsd.toString() : existingSale.totalUsd,
        fecha: body.fecha ? new Date(body.fecha) : existingSale.fecha,
        product: body.product || existingSale.product,
        cantidad: body.cantidad ? parseInt(body.cantidad) : existingSale.cantidad,
        
        // Optional fields
        cedula: body.cedula !== undefined ? body.cedula : existingSale.cedula,
        telefono: body.telefono !== undefined ? body.telefono : existingSale.telefono,
        email: body.email !== undefined ? body.email : existingSale.email,
        referencia: body.referencia !== undefined ? body.referencia : existingSale.referencia,
        montoBs: body.montoBs !== undefined ? body.montoBs : existingSale.montoBs,
        montoUsd: body.montoUsd !== undefined ? body.montoUsd : existingSale.montoUsd,
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
      res.json(updatedSale);
    } catch (error) {
      console.error("Error updating sale:", error);
      res.status(500).json({ error: "Failed to update sale" });
    }
  });

  // Verify payment for manual sale
  app.put("/api/sales/:id/verify-payment", async (req, res) => {
    try {
      const { id } = req.params;
      
      // Update the sale status from "pendiente" to "activo" and set delivery status to "TO DELIVER"
      const updatedSale = await storage.updateSale(id, { 
        estado: "activo",
        estadoEntrega: "TO DELIVER"
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
        estadoEntrega: (body.canal && body.canal.toLowerCase() === 'cashea') ? "PROCESSING" : "pendiente",
        product: body.product,
        cantidad: parseInt(body.cantidad) || 1,
        
        // Optional fields
        cedula: body.cedula || null,
        telefono: body.telefono || null,
        email: body.email || null,
        sucursal: null,
        tienda: null,
        estadoPagoInicial: "pendiente",
        pagoInicialUsd: null,
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

  // Verify Cashea payments and update status to TO DELIVER
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
            await storage.updateSaleDeliveryStatus(match.sale.id, 'TO DELIVER');
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

  const httpServer = createServer(app);
  return httpServer;
}
