import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertSaleSchema, insertUploadHistorySchema } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import * as XLSX from "xlsx";

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
  startDate: z.string().optional(),
  endDate: z.string().optional(),
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
        estadoEntrega: String(row['Estado de entrega'] || 'pendiente'),
        product: String(row.Product || ''),
        cantidad: Number(row.Cantidad || 1),
      };
    });

    return salesData;
  } catch (error) {
    throw new Error(`Error parsing Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
        startDate: query.startDate ? new Date(query.startDate) : undefined,
        endDate: query.endDate ? new Date(query.endDate) : undefined,
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

  // Get specific sale by ID
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

  // Get Cashea orders for address management
  app.get("/api/sales/cashea", async (req, res) => {
    try {
      const results = await storage.getCasheaOrders(50);
      res.json({ data: results });
    } catch (error) {
      console.error("Get Cashea orders error:", error);
      res.status(500).json({ error: "Failed to get Cashea orders" });
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

  // Export sales data
  app.get("/api/sales/export", async (req, res) => {
    try {
      const query = getSalesQuerySchema.parse(req.query);
      
      const filters = {
        canal: query.canal,
        estadoEntrega: query.estadoEntrega,
        startDate: query.startDate ? new Date(query.startDate) : undefined,
        endDate: query.endDate ? new Date(query.endDate) : undefined,
        limit: 10000, // Large limit for export
        offset: 0,
      };

      const salesData = await storage.getSales(filters);

      // Convert to Excel format
      const worksheet = XLSX.utils.json_to_sheet(salesData.map(sale => ({
        'Nombre': sale.nombre,
        'Cedula': sale.cedula,
        'Telefono': sale.telefono,
        'Email': sale.email,
        'Total USD': sale.totalUsd,
        'Sucursal': sale.sucursal,
        'Tienda': sale.tienda,
        'Fecha': sale.fecha,
        'Canal': sale.canal,
        'Estado': sale.estado,
        'Estado Pago Inicial': sale.estadoPagoInicial,
        'Pago Inicial USD': sale.pagoInicialUsd,
        'Orden': sale.orden,
        'Factura': sale.factura,
        'Referencia': sale.referencia,
        'Monto Bs': sale.montoBs,
        'Estado de Entrega': sale.estadoEntrega,
        'Producto': sale.product,
        'Cantidad': sale.cantidad,
      })));

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

  const httpServer = createServer(app);
  return httpServer;
}
