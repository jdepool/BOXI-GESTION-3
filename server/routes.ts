import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db, withRetry } from "./db";
import { sales } from "@shared/schema";
import { eq } from "drizzle-orm";
import { 
  insertSaleSchema, insertUploadHistorySchema, insertBancoSchema, insertTipoEgresoSchema, 
  insertProductoSchema, insertMetodoPagoSchema, insertMonedaSchema, insertCategoriaSchema,
  insertEgresoSchema, insertEgresoPorAprobarSchema, insertPaymentInstallmentSchema, insertAsesorSchema, insertTransportistaSchema, insertPrecioSchema, insertProspectoSchema
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
import { performCasheaDownload } from "./services/cashea-download";

// Helper function to normalize estadoEntrega casing
// Prevents case-sensitivity bugs in status comparisons and database storage
// Returns null for invalid/empty input to preserve validation
function normalizeEstadoEntrega(status: string | null | undefined): string | null {
  if (!status || status.trim() === '') return null; // Return null for empty/invalid input
  
  const normalized = status.toLowerCase().trim();
  
  // Map lowercase to correct casing
  const statusMap: Record<string, string> = {
    'pendiente': 'Pendiente',
    'perdida': 'Perdida',
    'en proceso': 'En proceso',
    'a despachar': 'A despachar',
    'en tránsito': 'En tránsito',
    'entregado': 'Entregado',
    'a devolver': 'A devolver',
    'devuelto': 'Devuelto',
    'cancelada': 'Cancelada'
  };
  
  return statusMap[normalized] || status; // Return original if not found in map
}

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
  orden: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  tipo: z.string().optional(),
  asesorId: z.string().optional(),
  excludePendingManual: z.coerce.boolean().optional(),
  excludeReservas: z.coerce.boolean().optional(),
  excludeADespachar: z.coerce.boolean().optional(),
  excludePerdida: z.coerce.boolean().optional(),
  excludePendiente: z.coerce.boolean().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

// Transform Shopify webhook order data to CSV format for existing mapping logic
// Returns an array of CSV-like objects, one for each line item in the order
function transformShopifyWebhookToCSV(shopifyOrder: any) {
  const lineItems = shopifyOrder.line_items || [];
  
  // Create one record per line item (product) in the order
  return lineItems.map((lineItem: any) => {
    const unitPrice = parseFloat(lineItem.price || 0);
    const quantity = lineItem.quantity || 1;
    const totalPrice = (unitPrice * quantity).toFixed(2);
    
    return {
      // Order info (same for all line items)
      'Created at': shopifyOrder.created_at,
      'Name': shopifyOrder.name, // Order number like #1001
      'Email': shopifyOrder.email,
      'Lineitem price': totalPrice, // Total price for this line item (unit price × quantity)
      'Total': shopifyOrder.total_price || shopifyOrder.current_total_price, // Full order total
    
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
    };
  });
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
            // Parse date in local timezone to prevent shifts
            const fechaStr = String(row['Created at']);
            const dateOnly = fechaStr.includes('T') ? fechaStr.split('T')[0] : fechaStr;
            // Append local time to force local interpretation (not UTC)
            fecha = new Date(dateOnly + 'T00:00:00');
          }
        }
      } else {
        // For Cashea and others: Fecha field
        if (row.Fecha) {
          if (typeof row.Fecha === 'number') {
            // Excel date serial number
            fecha = new Date((row.Fecha - 25569) * 86400 * 1000);
          } else {
            // Parse date in local timezone to prevent shifts
            const fechaStr = String(row.Fecha);
            const dateOnly = fechaStr.includes('T') ? fechaStr.split('T')[0] : fechaStr;
            // Append local time to force local interpretation (not UTC)
            fecha = new Date(dateOnly + 'T00:00:00');
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
          totalUsd: String((parseFloat(row['Lineitem price'] || 0) * Number(row['Lineitem quantity'] || 1)).toFixed(2)), // Total price for this line item (unit price × quantity)
          totalOrderUsd: row['Total'] ? String(row['Total']) : null, // Full order total from Shopify
          fecha,
          canal: canal,
          estadoPagoInicial: null,
          pagoInicialUsd: null,
          metodoPagoId: null,
          bancoReceptorInicial: null,
          orden: row.Name ? String(row.Name) : null, // Name maps to Order
          factura: null,
          referenciaInicial: null,
          montoInicialBs: null,
          montoInicialUsd: null,
          estadoEntrega: 'Pendiente', // Route Shopify orders to "Ventas por Completar"
          product: String(row['Lineitem name'] || ''),
          sku: row['Lineitem sku'] || row['Lineitem SKU'] || row['lineitem sku'] || row['SKU'] ? 
               String(row['Lineitem sku'] || row['Lineitem SKU'] || row['lineitem sku'] || row['SKU']) : null, // Map SKU from Shopify with fallbacks
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
          montoFleteBs: null,
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
        const totalUsdValue = String(row['Total usd'] || '0');
        const isCashea = canal.toLowerCase() === 'cashea';
        const totalOrderUsdValue = isCashea ? totalUsdValue : null;
        
        return {
          nombre: String(row.Nombre || ''),
          cedula: row.Cedula ? String(row.Cedula) : null,
          telefono: row.Telefono ? String(row.Telefono) : null,
          email: row.Email ? String(row.Email) : null,
          totalUsd: totalUsdValue,
          totalOrderUsd: totalOrderUsdValue,
          fecha,
          canal: canal, // Use the provided canal parameter
          estadoPagoInicial: row['Estado pago inicial'] ? String(row['Estado pago inicial']) : null,
          pagoInicialUsd: row['Pago inicial usd'] ? String(row['Pago inicial usd']) : null,
          metodoPagoId: null,
          bancoReceptorInicial: isCashea ? '450504fa-8107-477a-b5ce-064cebe6d416' : null, // Auto-assign Cashea banco for Cashea sales
          fechaPagoInicial: isCashea ? fecha : null, // Auto-assign fecha as fechaPagoInicial for Cashea sales
          orden: row.Orden ? String(row.Orden) : null,
          factura: row.Factura ? String(row.Factura) : null,
          referenciaInicial: row.Referencia ? String(row.Referencia) : null,
          montoInicialBs: row['Monto en bs'] ? String(row['Monto en bs']) : null,
          montoInicialUsd: null,
          estadoEntrega: canal.toLowerCase() === 'cashea' ? 
            'En proceso' : // All Cashea orders start with "En proceso"
            (normalizeEstadoEntrega(String(row['Estado de entrega'] || '')) || 'En proceso'), // Default to 'En proceso' if normalization fails
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

function parseBancosFile(buffer: Buffer, filename: string) {
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

    // Map the Excel/CSV data to banco format with row-level error handling
    const bancosData = data.map((row: any, index: number) => {
      const rowNumber = index + 2; // +2 because Excel is 1-indexed and first row is header
      
      try {
        // Handle different possible column names (case insensitive)
        const banco = row['Banco'] || row['banco'];
        const numeroCuenta = row['Número de Cuenta'] || row['Numero de Cuenta'] || row['numero_cuenta'] || row['numeroCuenta'] || row['NumeroCuenta'];
        const tipo = row['Tipo'] || row['tipo'];
        const moneda = row['Moneda'] || row['moneda'];
        const metodoPago = row['Método de Pago'] || row['Metodo de Pago'] || row['metodo_pago'] || row['metodoPago'] || row['MetodoPago'];

        // Collect validation errors for this row
        const rowErrors = [];
        
        if (!banco || String(banco).trim() === '') {
          rowErrors.push('Missing required field: Banco');
        }
        if (!numeroCuenta || String(numeroCuenta).trim() === '') {
          rowErrors.push('Missing required field: Número de Cuenta');
        }
        if (!tipo || String(tipo).trim() === '') {
          rowErrors.push('Missing required field: Tipo');
        } else if (!['Receptor', 'Emisor'].includes(String(tipo).trim())) {
          rowErrors.push(`Invalid Tipo: "${tipo}". Must be "Receptor" or "Emisor"`);
        }

        if (rowErrors.length > 0) {
          return {
            row: rowNumber,
            error: rowErrors.join('; '),
            data: null
          };
        }

        return {
          row: rowNumber,
          error: null,
          data: {
            banco: String(banco).trim(),
            numeroCuenta: String(numeroCuenta).trim(),
            tipo: String(tipo).trim(),
            moneda: moneda ? String(moneda).trim() : undefined,
            metodoPago: metodoPago ? String(metodoPago).trim() : undefined
          }
        };
      } catch (error) {
        return {
          row: rowNumber,
          error: `Error processing row: ${error instanceof Error ? error.message : 'Unknown error'}`,
          data: null
        };
      }
    });

    return bancosData;
  } catch (error) {
    throw new Error(`Error parsing bancos file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function parseSpanishNumber(value: any): number {
  if (typeof value === 'number') return value;
  
  let str = String(value).trim();
  if (!str) return 0;
  
  const isNegative = str.startsWith('(') && str.endsWith(')');
  if (isNegative) {
    str = str.slice(1, -1).trim();
  }
  
  str = str.replace(/[^\d.,-]/g, '');
  
  let result = 0;
  if (str.includes(',') && str.includes('.')) {
    const lastComma = str.lastIndexOf(',');
    const lastPeriod = str.lastIndexOf('.');
    
    if (lastComma > lastPeriod) {
      result = parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
    } else {
      result = parseFloat(str.replace(/,/g, '')) || 0;
    }
  } else if (str.includes(',')) {
    result = parseFloat(str.replace(',', '.')) || 0;
  } else {
    result = parseFloat(str) || 0;
  }
  
  return isNegative ? -result : result;
}

function parseBankStatementFile(buffer: Buffer) {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    console.log('=== BANK STATEMENT PARSER ===');
    console.log('Total rows in spreadsheet:', rawData.length);
    
    let headerRowIndex = -1;
    const bankingTerms = [
      'referencia', 'reference', 'ref', 'numero', 'número', 'no.', 'nro',
      'monto', 'importe', 'amount', 'valor', 'haber', 'crédito', 'credito', 'débito', 'debito',
      'fecha', 'date', 'dia'
    ];
    
    for (let i = 0; i < Math.min(rawData.length, 30); i++) {
      const row = rawData[i] as any[];
      if (!row || row.length === 0) continue;
      
      const rowText = row.join('|').toLowerCase();
      const foundTerms = bankingTerms.filter(term => rowText.includes(term));
      
      if (foundTerms.length >= 2) {
        headerRowIndex = i;
        console.log(`✓ Found header row at index ${i + 1}:`, row);
        break;
      }
    }
    
    if (headerRowIndex === -1) {
      console.log('First 10 rows for debugging:');
      rawData.slice(0, 10).forEach((row, i) => {
        console.log(`Row ${i + 1}:`, row);
      });
      throw new Error('Could not find header row in bank statement. Headers should contain terms like "Referencia", "Monto", "Fecha", or "Haber"');
    }
    
    const dataWithHeaders = XLSX.utils.sheet_to_json(worksheet, { 
      header: headerRowIndex, 
      range: headerRowIndex 
    });
    
    const columnNames = dataWithHeaders.length > 0 ? Object.keys(dataWithHeaders[0] as Record<string, unknown>) : [];
    console.log('📋 Column names found:', columnNames);
    console.log('Number of data rows:', dataWithHeaders.length);

    const filteredData = dataWithHeaders.filter((row: any, index: number) => {
      if (index === 0) return false;
      const values = Object.values(row || {});
      const hasData = values.some(val => val !== null && val !== undefined && String(val).trim() !== '');
      return hasData;
    });
    
    console.log('Filtered data rows:', filteredData.length);
    
    if (filteredData.length > 0) {
      console.log('Sample row data:', filteredData[0]);
    }

    const transactions = filteredData.map((row: any, index: number) => {
      let fecha = new Date();
      if (row.Fecha || row.fecha || row.__EMPTY) {
        const dateValue = row.Fecha || row.fecha || row.__EMPTY;
        if (typeof dateValue === 'number') {
          fecha = new Date((dateValue - 25569) * 86400 * 1000);
        } else {
          fecha = new Date(dateValue);
        }
      }

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
        row.__EMPTY_11 ||
        ''
      ).trim();

      // For BNC statements: __EMPTY_12 is Debe (debits), __EMPTY_14 is Haber (credits)
      // Check both columns and use the non-zero one
      const debeValue = row.Debe || row.debe || row.DEBE || row.__EMPTY_12 || 0;
      const haberValue = row.Haber || row.haber || row.HABER || row.__EMPTY_14 || 0;
      
      const debeMonto = parseSpanishNumber(debeValue);
      const haberMonto = parseSpanishNumber(haberValue);
      
      // Use the non-zero value (prefer Haber for incoming payments)
      const montoValue = haberMonto > 0 ? haberValue : (debeMonto > 0 ? debeValue : (
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
        row.Crédito || 
        row.credito ||
        row['Crédito'] ||
        row.Débito || 
        row.debito ||
        row['Débito'] ||
        row.MONTO ||
        row.IMPORTE ||
        '0'
      ));

      const monto = parseSpanishNumber(montoValue);

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
        row.__EMPTY_6 ||
        ''
      ).trim();

      let fechaStr = new Date().toISOString().split('T')[0];
      try {
        if (fecha && !isNaN(fecha.getTime())) {
          fechaStr = fecha.toISOString().split('T')[0];
        }
      } catch (e) {
        console.warn(`Invalid date for row ${index + 1}, using current date`);
      }

      if (index < 3) {
        console.log(`Transaction ${index + 1}:`, { 
          referencia, 
          monto, 
          rawMonto: montoValue,
          fecha: fechaStr
        });
      }

      return {
        referencia,
        monto,
        fecha: fechaStr,
        descripcion,
      };
    });

    const validTransactions = transactions.filter(t => t.referencia && t.monto > 0);
    console.log(`✓ Parsed ${transactions.length} total rows, ${validTransactions.length} valid transactions`);
    
    return transactions;
  } catch (error) {
    console.error('Bank statement parsing error:', error);
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
        orden: query.orden,
        startDate: query.startDate,
        endDate: query.endDate,
        tipo: query.tipo,
        asesorId: normalizedAsesorId,
        excludePendingManual: query.excludePendingManual,
        excludeReservas: query.excludeReservas,
        excludeADespachar: query.excludeADespachar,
        excludePerdida: query.excludePerdida,
        excludePendiente: query.excludePendiente,
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
      
      // Extract filter parameters
      const filters: {
        canal?: string;
        estadoEntrega?: string;
        transportistaId?: string;
        startDate?: string;
        endDate?: string;
        search?: string;
      } = {};
      
      if (req.query.canal) filters.canal = req.query.canal as string;
      if (req.query.estadoEntrega) filters.estadoEntrega = req.query.estadoEntrega as string;
      if (req.query.transportistaId) filters.transportistaId = req.query.transportistaId as string;
      if (req.query.startDate) filters.startDate = req.query.startDate as string;
      if (req.query.endDate) filters.endDate = req.query.endDate as string;
      if (req.query.search) filters.search = req.query.search as string;

      const result = await storage.getOrdersWithAddresses(limit, offset, filters);
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

  // Get sales with "A devolver" status for devoluciones
  app.get("/api/sales/devoluciones", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;

      const filters = {
        estadoEntrega: "A devolver",
        limit,
        offset,
      };

      const [salesData, totalCount] = await Promise.all([
        storage.getSales(filters),
        storage.getTotalSalesCount(filters),
      ]);

      res.json({
        data: salesData,
        total: totalCount,
        limit,
        offset
      });
    } catch (error) {
      console.error("Get devoluciones error:", error);
      res.status(500).json({ error: "Failed to get devoluciones" });
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
        orden: query.orden,
        startDate: query.startDate,
        endDate: query.endDate,
        tipo: query.tipo,
        asesorId: normalizedAsesorId,
        excludePendingManual: query.excludePendingManual,
        excludeReservas: query.excludeReservas,
        excludeADespachar: query.excludeADespachar,
        excludePerdida: query.excludePerdida,
        excludePendiente: query.excludePendiente,
        // For export, get all data without pagination
        limit: 10000,
        offset: 0,
      };

      // Get sales data and bancos for lookup
      const [salesData, bancos] = await Promise.all([
        storage.getSales(filters),
        storage.getBancos()
      ]);
      
      // Create banco lookup map (ID -> banco name)
      const bancoMap = new Map(bancos.map(banco => [banco.id, banco.banco]));
      
      // Map to Excel columns
      const excelData = salesData.map(sale => {
        // Get banco name (match SalesTable display logic)
        let bancoNombre = 'N/A';
        if (sale.bancoReceptorInicial) {
          if (sale.bancoReceptorInicial === 'otro') {
            bancoNombre = 'Otro($)';
          } else {
            bancoNombre = bancoMap.get(sale.bancoReceptorInicial) || 'N/A';
          }
        }
        
        return {
          // Basic fields
          'Número de Orden': sale.orden,
          'Nombre': sale.nombre,
          'Cédula': sale.cedula,
          'Teléfono': sale.telefono,
          'Correo': sale.email,
          'Producto': sale.product,
          'SKU': sale.sku,
          'Cantidad': sale.cantidad,
          'Canal': sale.canal,
          'Estado de Entrega': sale.estadoEntrega,
          'Tipo': sale.tipo,
          'Fecha': new Date(sale.fecha).toLocaleDateString('es-ES'),
          
          // Totals
          'Total Orden USD': sale.totalOrderUsd,
          'Total USD': sale.totalUsd,
          
          // Payment fields visible in table
          'Pago Inicial USD': sale.pagoInicialUsd,
          'Referencia': sale.referenciaInicial,
          'Banco Receptor': bancoNombre,
          'Monto Bs': sale.montoInicialBs,
        
        // Asesor
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
        
          // Notas
          'Notas': sale.notas || '',
        };
      });

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

  // Export Perdida orders to Excel
  app.get("/api/sales/perdida/export", async (req, res) => {
    try {
      // Get all Perdida orders (no pagination for export)
      const filters = {
        estadoEntrega: "Perdida",
        limit: 10000,
        offset: 0,
      };

      const [salesData, bancos] = await Promise.all([
        storage.getSales(filters),
        storage.getBancos()
      ]);
      
      // Create banco lookup map (ID -> banco name)
      const bancoMap = new Map(bancos.map(banco => [banco.id, banco.banco]));
      
      // Map to Excel columns
      const excelData = salesData.map(sale => {
        // Get banco name
        let bancoNombre = 'N/A';
        if (sale.bancoReceptorInicial) {
          if (sale.bancoReceptorInicial === 'otro') {
            bancoNombre = 'Otro($)';
          } else {
            bancoNombre = bancoMap.get(sale.bancoReceptorInicial) || 'N/A';
          }
        }
        
        return {
          // Basic fields
          'Número de Orden': sale.orden,
          'Nombre': sale.nombre,
          'Cédula': sale.cedula,
          'Teléfono': sale.telefono,
          'Correo': sale.email,
          'Producto': sale.product,
          'SKU': sale.sku,
          'Cantidad': sale.cantidad,
          'Canal': sale.canal,
          'Estado de Entrega': sale.estadoEntrega,
          'Tipo': sale.tipo,
          'Fecha': new Date(sale.fecha).toLocaleDateString('es-ES'),
          
          // Totals
          'Total Orden USD': sale.totalOrderUsd,
          'Total USD': sale.totalUsd,
          
          // Payment fields
          'Pago Inicial USD': sale.pagoInicialUsd,
          'Referencia': sale.referenciaInicial,
          'Banco Receptor': bancoNombre,
          'Monto Bs': sale.montoInicialBs,
        
          // Asesor
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
          
          // Notas
          'Notas': sale.notas || '',
        };
      });

      // Convert to Excel format
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Ordenes Perdidas');

      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="ordenes_perdidas_${new Date().toISOString().split('T')[0]}.xlsx"`);
      res.send(buffer);

    } catch (error) {
      console.error("Error exporting Perdida orders:", error);
      res.status(500).json({ error: "Failed to export Perdida orders" });
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
        
        // Shipping fields
        'Nro Guía': sale.nroGuia || '',
        'Fecha Despacho': sale.fechaDespacho ? (() => {
          const [year, month, day] = sale.fechaDespacho.split('-');
          return `${day}/${month}/${year}`;
        })() : '',
        
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

  // Get all products for an order by order number
  app.get("/api/sales/order/:orderNumber", async (req, res) => {
    try {
      const { orderNumber } = req.params;
      const sales = await storage.getSalesByOrderNumber(orderNumber);
      if (!sales || sales.length === 0) {
        return res.status(404).json({ error: "Order not found" });
      }
      res.json(sales);
    } catch (error) {
      console.error("Error fetching order:", error);
      res.status(500).json({ error: "Failed to fetch order" });
    }
  });

  // Update all products for an order by order number
  app.put("/api/sales/order/:orderNumber", async (req, res) => {
    try {
      const { orderNumber } = req.params;
      const { nombre, cedula, telefono, email, canal, totalUsd, products } = req.body;

      // Check if order exists
      const existingSales = await storage.getSalesByOrderNumber(orderNumber);
      if (!existingSales || existingSales.length === 0) {
        return res.status(404).json({ error: "Order not found" });
      }

      // Use database transaction to make delete-and-create atomic
      const result = await db.transaction(async (tx) => {
        // Delete all existing sales for this order within transaction
        for (const sale of existingSales) {
          await tx.delete(sales).where(eq(sales.id, sale.id));
        }

        // Create new sales with updated information within transaction
        const newSalesData = products.map((product: any) => ({
          orden: orderNumber,
          nombre,
          cedula: cedula || null,
          telefono: telefono || null,
          email: email || null,
          canal: canal || existingSales[0].canal,
          totalUsd: product.totalUsd?.toString() || "0",
          totalOrderUsd: parseFloat(totalUsd) || null,
          product: product.producto,
          sku: product.sku || null,
          cantidad: product.cantidad || 1,
          esObsequio: product.esObsequio || false,
          medidaEspecial: product.medidaEspecial || null,
          fecha: existingSales[0].fecha,
          estadoEntrega: existingSales[0].estadoEntrega,
          tipo: existingSales[0].tipo,
          // Preserve addresses
          direccionFacturacionPais: existingSales[0].direccionFacturacionPais,
          direccionFacturacionEstado: existingSales[0].direccionFacturacionEstado,
          direccionFacturacionCiudad: existingSales[0].direccionFacturacionCiudad,
          direccionFacturacionDireccion: existingSales[0].direccionFacturacionDireccion,
          direccionFacturacionUrbanizacion: existingSales[0].direccionFacturacionUrbanizacion,
          direccionFacturacionReferencia: existingSales[0].direccionFacturacionReferencia,
          direccionDespachoIgualFacturacion: existingSales[0].direccionDespachoIgualFacturacion,
          direccionDespachoPais: existingSales[0].direccionDespachoPais,
          direccionDespachoEstado: existingSales[0].direccionDespachoEstado,
          direccionDespachoCiudad: existingSales[0].direccionDespachoCiudad,
          direccionDespachoDireccion: existingSales[0].direccionDespachoDireccion,
          direccionDespachoUrbanizacion: existingSales[0].direccionDespachoUrbanizacion,
          direccionDespachoReferencia: existingSales[0].direccionDespachoReferencia,
          // Preserve other fields
          metodoPagoId: existingSales[0].metodoPagoId,
          bancoReceptorInicial: existingSales[0].bancoReceptorInicial,
          referenciaInicial: existingSales[0].referenciaInicial,
          montoInicialBs: existingSales[0].montoInicialBs,
          montoInicialUsd: existingSales[0].montoInicialUsd,
          asesorId: existingSales[0].asesorId,
          pagoInicialUsd: existingSales[0].pagoInicialUsd,
          fechaPagoInicial: existingSales[0].fechaPagoInicial,
          pagoFleteUsd: existingSales[0].pagoFleteUsd,
          fleteGratis: existingSales[0].fleteGratis,
          seguimientoPago: existingSales[0].seguimientoPago,
          notas: existingSales[0].notas,
        }));

        const createdSales = await tx.insert(sales).values(newSalesData).returning();
        return createdSales;
      });

      res.json(result);
    } catch (error) {
      console.error("Error updating order:", error);
      res.status(500).json({ error: "Failed to update order" });
    }
  });

  // Get orders for payments tab (grouped by order number)
  app.get("/api/sales/orders", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      const canal = req.query.canal && req.query.canal !== 'all' ? req.query.canal as string : undefined;
      const orden = req.query.orden as string | undefined;
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;
      
      // Validate estadoEntrega against known delivery statuses (must match database schema)
      const validEstadoEntrega = [
        "Pendiente", "Perdida", "En proceso", "A despachar", "En tránsito",
        "Entregado", "A devolver", "Devuelto", "Cancelada"
      ];
      const estadoEntregaParam = req.query.estadoEntrega as string | undefined;
      const estadoEntrega = estadoEntregaParam && validEstadoEntrega.includes(estadoEntregaParam)
        ? estadoEntregaParam
        : undefined;
      
      const excludePerdida = req.query.excludePerdida === 'true';
      
      // Handle asesorId filter - normalize 'all' to undefined, keep 'none' as 'null' for null filter
      let asesorId: string | undefined;
      if (req.query.asesorId && req.query.asesorId !== 'all') {
        asesorId = req.query.asesorId === 'none' ? 'null' : req.query.asesorId as string;
      }

      const result = await storage.getOrdersForPayments({ 
        limit, 
        offset, 
        canal, 
        orden, 
        startDate, 
        endDate,
        asesorId,
        estadoEntrega,
        excludePerdida
      });
      res.json(result);
    } catch (error) {
      console.error("Error fetching orders for payments:", error);
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  // GET /api/sales/orders/export - Export orders for payments tab to Excel (with complete payment details)
  app.get("/api/sales/orders/export", async (req, res) => {
    try {
      const canal = req.query.canal && req.query.canal !== 'all' ? req.query.canal as string : undefined;
      const orden = req.query.orden as string | undefined;
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;
      
      // Validate estadoEntrega against known delivery statuses - matching the Pagos tab UI
      const validEstadoEntrega = [
        "Pendiente", "En proceso", "Perdida", "A despachar", 
        "En tránsito", "Entregado", "A devolver", "Devuelto", "Cancelada"
      ];
      const estadoEntregaParam = req.query.estadoEntrega as string | undefined;
      const estadoEntrega = estadoEntregaParam && validEstadoEntrega.includes(estadoEntregaParam)
        ? estadoEntregaParam
        : undefined;
      
      const excludePerdida = req.query.excludePerdida === 'true';
      
      // Handle asesorId filter - normalize 'all' to undefined, keep 'none' as 'null' for null filter
      let asesorId: string | undefined;
      if (req.query.asesorId && req.query.asesorId !== 'all') {
        asesorId = req.query.asesorId === 'none' ? 'null' : req.query.asesorId as string;
      }

      // Get orders summary data (for metrics)
      const ordersResult = await storage.getOrdersForPayments({ 
        limit: 999999,
        offset: 0, 
        canal, 
        orden, 
        startDate, 
        endDate,
        asesorId,
        estadoEntrega,
        excludePerdida
      });

      // Fetch bancos for name lookup
      const bancos = await storage.getBancos();
      const bancoMap = new Map(bancos.map(banco => [banco.id, banco.banco]));
      
      // For each order, get the detailed payment data from sales table and installments
      const excelData: any[] = [];
      
      for (const orderSummary of ordersResult.data) {
        // Get one sale from this order to get payment details
        const salesInOrder = await storage.getSalesByOrderNumber(orderSummary.orden);
        if (salesInOrder.length === 0) continue;
        
        // Use the first sale as representative (all sales in same order share payment data)
        const sale = salesInOrder[0];
        
        // Get installments for this order
        const installments = await storage.getInstallmentsByOrder(orderSummary.orden);
        
        // Helper function to get banco name
        const getBancoName = (bancoId: string | null | undefined) => {
          if (!bancoId) return 'N/A';
          if (bancoId === 'otro') return 'Otro($)';
          return bancoMap.get(bancoId) || 'N/A';
        };
        
        // Base row data (common to all rows for this order)
        const baseData = {
          'Orden': orderSummary.orden,
          'Nombre': orderSummary.nombre,
          'Teléfono': sale.telefono || '',
          'Email': sale.email || '',
          'Dirección de Despacho': sale.direccionDespachoDireccion || '',
          'Fecha': orderSummary.fecha ? new Date(orderSummary.fecha).toLocaleDateString('es-ES') : '',
          'Canal': orderSummary.canal || '',
          'Tipo': orderSummary.tipo || '',
          'Estado de Entrega': orderSummary.estadoEntrega || '',
          'Asesor': orderSummary.asesorId || '',
          'Productos': orderSummary.productCount,
          
          // Metric card data
          'Orden + Flete': orderSummary.ordenPlusFlete || 0,
          'Total Pagado': orderSummary.totalPagado || 0,
          'Total Verificado': orderSummary.totalVerificado || 0,
          'Pendiente': orderSummary.saldoPendiente || 0,
          
          // Seguimiento Pago notes
          'Seguimiento Pago': sale.seguimientoPago || '',
          
          // Initial Payment details
          'Pago Inicial USD': sale.pagoInicialUsd || '',
          'Monto Inicial USD': sale.montoInicialUsd || '',
          'Monto Inicial Bs': sale.montoInicialBs || '',
          'Fecha Pago Inicial': sale.fechaPagoInicial ? new Date(sale.fechaPagoInicial).toLocaleDateString('es-ES') : '',
          'Referencia Inicial': sale.referenciaInicial || '',
          'Banco Receptor Inicial': getBancoName(sale.bancoReceptorInicial),
          'Estado Verificación Inicial': sale.estadoVerificacionInicial || '',
          'Notas Verificación Inicial': sale.notasVerificacionInicial || '',
          
          // Flete details
          'Flete Gratis': sale.fleteGratis ? 'Sí' : 'No',
          'Pago Flete USD': sale.pagoFleteUsd || '',
          'Monto Flete USD': sale.montoFleteUsd || '',
          'Monto Flete Bs': sale.montoFleteBs || '',
          'Fecha Flete': sale.fechaFlete ? new Date(sale.fechaFlete).toLocaleDateString('es-ES') : '',
          'Referencia Flete': sale.referenciaFlete || '',
          'Banco Receptor Flete': getBancoName(sale.bancoReceptorFlete),
          'Estado Verificación Flete': sale.estadoVerificacionFlete || '',
          'Notas Verificación Flete': sale.notasVerificacionFlete || '',
        };
        
        // If order has installments, create one row per installment
        if (installments.length > 0) {
          for (const installment of installments) {
            excelData.push({
              ...baseData,
              'Cuota #': installment.installmentNumber,
              'Cuota Fecha': installment.fecha ? new Date(installment.fecha).toLocaleDateString('es-ES') : '',
              'Pago Cuota USD': installment.pagoCuotaUsd || '',
              'Monto Cuota USD': installment.montoCuotaUsd || '',
              'Monto Cuota Bs': installment.montoCuotaBs || '',
              'Cuota Referencia': installment.referencia || '',
              'Cuota Banco Receptor': getBancoName(installment.bancoReceptorCuota),
              'Cuota Estado Verificación': installment.estadoVerificacion || '',
              'Cuota Notas Verificación': installment.notasVerificacion || '',
            });
          }
        } else {
          // No installments, create one row with N/A for cuota fields
          excelData.push({
            ...baseData,
            'Cuota #': 'N/A',
            'Cuota Fecha': '',
            'Pago Cuota USD': '',
            'Monto Cuota USD': '',
            'Monto Cuota Bs': '',
            'Cuota Referencia': '',
            'Cuota Banco Receptor': '',
            'Cuota Estado Verificación': '',
            'Cuota Notas Verificación': '',
          });
        }
      }

      // Convert to Excel format
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Pagos');

      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="pagos_boxisleep_${new Date().toISOString().split('T')[0]}.xlsx"`);
      res.send(buffer);

    } catch (error) {
      console.error("Error exporting orders for payments:", error);
      res.status(500).json({ error: "Failed to export orders" });
    }
  });

  // GET /api/sales/verification-payments - Get all payments flattened for verification
  app.get("/api/sales/verification-payments", async (req, res) => {
    try {
      const { startDate, endDate, bancoId, orden, tipoPago, estadoVerificacion, estadoEntrega, limit, offset } = req.query;

      const result = await storage.getVerificationPayments({
        startDate: startDate as string,
        endDate: endDate as string,
        bancoId: bancoId as string,
        orden: orden as string,
        tipoPago: tipoPago as string,
        estadoVerificacion: estadoVerificacion as string,
        estadoEntrega: estadoEntrega ? (estadoEntrega as string).split(',') : undefined,
        limit: limit ? parseInt(limit as string) : 20,
        offset: offset ? parseInt(offset as string) : 0
      });

      res.json(result);
    } catch (error) {
      console.error("Get verification payments error:", error);
      res.status(500).json({ error: "Failed to get verification payments" });
    }
  });

  // GET /api/sales/verification-payments/export - Export verification payments to Excel
  app.get("/api/sales/verification-payments/export", async (req, res) => {
    try {
      const { startDate, endDate, bancoId, orden, tipoPago, estadoVerificacion, estadoEntrega } = req.query;

      const result = await storage.getVerificationPayments({
        startDate: startDate as string,
        endDate: endDate as string,
        bancoId: bancoId as string,
        orden: orden as string,
        tipoPago: tipoPago as string,
        estadoVerificacion: estadoVerificacion as string,
        estadoEntrega: estadoEntrega ? (estadoEntrega as string).split(',') : undefined,
        limit: 999999, // Get all records for export
        offset: 0
      });

      // Format data for Excel export
      const excelData = result.data.map(payment => ({
        'Orden': payment.orden,
        'Tipo de Pago': payment.tipoPago,
        'Fecha de Pago': payment.fecha ? new Date(payment.fecha).toLocaleDateString('es-ES') : '-',
        'Monto Bs': payment.montoBs ? `Bs ${payment.montoBs.toFixed(2)}` : '-',
        'Monto USD': payment.montoUsd ? `$${payment.montoUsd.toFixed(2)}` : '-',
        'Referencia': payment.referencia || '-',
        'Banco': payment.bancoId || '-',
        'Estado de Verificación': payment.estadoVerificacion,
        'Notas': payment.notasVerificacion || '-'
      }));

      // Convert to Excel format
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Verificación');

      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="verificacion_boxisleep_${new Date().toISOString().split('T')[0]}.xlsx"`);
      res.send(buffer);

    } catch (error) {
      console.error("Error exporting verification payments:", error);
      res.status(500).json({ error: "Failed to export verification payments" });
    }
  });

  // PATCH /api/sales/verification - Update verification status and notes
  app.patch("/api/sales/verification", async (req, res) => {
    try {
      const { paymentId, paymentType, estadoVerificacion, notasVerificacion } = req.body;

      if (!paymentId || !paymentType) {
        return res.status(400).json({ error: "Payment ID and type are required" });
      }

      // Wrap in retry logic to handle transient connection errors
      const result = await withRetry(async () => {
        return await storage.updatePaymentVerification({
          paymentId,
          paymentType,
          estadoVerificacion,
          notasVerificacion
        });
      });

      if (!result) {
        return res.status(404).json({ error: "Payment not found" });
      }

      // If payment was verified, check if Pendiente = 0 and auto-update to "A despachar"
      if (estadoVerificacion === 'Verificado') {
        // Get order number and payment amount from the payment being verified
        let orden: string | null = null;
        let currentPaymentAmount = 0;
        
        if (paymentType === 'Inicial/Total') {
          const sale = await withRetry(() => storage.getSaleById(paymentId));
          orden = sale?.orden || null;
          currentPaymentAmount = Number(sale?.pagoInicialUsd || 0);
        } else if (paymentType === 'Flete') {
          const sale = await withRetry(() => storage.getSaleById(paymentId));
          orden = sale?.orden || null;
          currentPaymentAmount = Number(sale?.pagoFleteUsd || 0);
        } else if (paymentType === 'Cuota') {
          const installment = await withRetry(() => storage.getInstallmentById(paymentId));
          orden = installment?.orden || null;
          currentPaymentAmount = Number(installment?.pagoCuotaUsd || 0); // Use agreed amount (Pago USD)
        }

        if (orden) {
          // Get all sales in the order to calculate Pendiente
          const salesInOrder = await withRetry(() => storage.getSalesByOrderNumber(orden!));
          
          if (salesInOrder.length > 0) {
            // Calculate ordenPlusFlete (A pagar + Flete)
            const firstSale = salesInOrder[0];
            const totalOrderUsd = Number(firstSale.totalOrderUsd || 0);
            const pagoInicialUsd = Number(firstSale.pagoInicialUsd || 0);
            const pagoFleteUsd = Number(firstSale.pagoFleteUsd || 0);
            const fleteGratis = firstSale.fleteGratis || false;
            // For Cashea orders, use pagoInicialUsd; for others, use totalOrderUsd (matching Pagos table logic)
            const isCasheaOrder = firstSale.canal === 'cashea';
            const baseAmount = isCasheaOrder ? pagoInicialUsd : totalOrderUsd;
            const ordenPlusFlete = baseAmount + (fleteGratis ? 0 : pagoFleteUsd);

            // Calculate totalPagado (sum of all verified payments)
            // Note: We need to check old status from DB and include current payment being verified
            let pagoInicialVerificado = 0;
            if (paymentType === 'Inicial/Total') {
              // This payment is being verified now, so include it
              pagoInicialVerificado = currentPaymentAmount;
            } else {
              // Check if it was already verified
              pagoInicialVerificado = firstSale.estadoVerificacionInicial === 'Verificado' ? Number(firstSale.pagoInicialUsd || 0) : 0;
            }
            
            let fleteVerificado = 0;
            // Only count Flete if amount > 0 AND not marked as gratis (matching Pagos table logic)
            const hasFletePayment = pagoFleteUsd > 0 && !fleteGratis;
            if (hasFletePayment) {
              if (paymentType === 'Flete') {
                // This payment is being verified now, so include it
                fleteVerificado = currentPaymentAmount;
              } else {
                // Check if it was already verified
                fleteVerificado = firstSale.estadoVerificacionFlete === 'Verificado' ? Number(firstSale.pagoFleteUsd || 0) : 0;
              }
            }
            
            // Get verified cuotas (use agreed amounts - Pago USD)
            const installments = await withRetry(() => storage.getInstallmentsByOrder(orden!));
            let cuotasVerificadas = 0;
            if (paymentType === 'Cuota') {
              // Include all previously verified cuotas PLUS the one being verified now
              cuotasVerificadas = installments
                .filter(inst => inst.estadoVerificacion === 'Verificado' || inst.id === paymentId)
                .reduce((sum, inst) => sum + Number(inst.pagoCuotaUsd || 0), 0); // Use agreed amount (Pago USD)
            } else {
              // Just get previously verified cuotas
              cuotasVerificadas = installments
                .filter(inst => inst.estadoVerificacion === 'Verificado')
                .reduce((sum, inst) => sum + Number(inst.pagoCuotaUsd || 0), 0); // Use agreed amount (Pago USD)
            }
            
            const totalVerificado = pagoInicialVerificado + fleteVerificado + cuotasVerificadas;
            const saldoPendiente = ordenPlusFlete - totalVerificado;

            console.log(`Order ${orden} - A pagar + Flete: $${ordenPlusFlete}, Total Verificado: $${totalVerificado}, Pendiente: $${saldoPendiente}`);

            // Only auto-update if Pendiente is in range -1 to +1 and current status is "Pendiente" or "En proceso"
            // CRITICAL: Balance must be within -1 to +1 USD range to handle calculation inaccuracies
            // Use case-insensitive comparison to handle "En proceso" vs "En Proceso" data inconsistencies
            const currentStatus = firstSale.estadoEntrega?.toLowerCase() || '';
            if (Math.abs(saldoPendiente) <= 1 && (currentStatus === 'pendiente' || currentStatus === 'en proceso')) {
              const updatePromises = salesInOrder.map(sale => 
                withRetry(() => storage.updateSaleDeliveryStatus(sale.id, 'A despachar'))
              );
              await Promise.all(updatePromises);
              console.log(`✅ Auto-updated order ${orden} to "A despachar" (Pendiente = $${saldoPendiente.toFixed(2)})`);
            }
          }
        }
      }

      res.json({ success: true, data: result });
    } catch (error: any) {
      console.error("Update verification error:", error);
      
      // Provide more specific error messages
      if (error.message?.includes('connection')) {
        return res.status(503).json({ error: "Database connection issue. Please try again in a moment." });
      }
      
      if (error.code === '23505') { // Unique constraint violation
        return res.status(409).json({ error: "A conflicting record already exists." });
      }
      
      if (error.code === '23503') { // Foreign key violation
        return res.status(400).json({ error: "Referenced record not found." });
      }
      
      res.status(500).json({ error: "Failed to update verification" });
    }
  });

  // GET /api/sales/installments - Get installments by order number (query param)
  // MUST BE BEFORE /api/sales/:id to avoid route matching conflicts
  app.get("/api/sales/installments", async (req, res) => {
    try {
      const { orden } = req.query;
      
      if (!orden || typeof orden !== 'string') {
        return res.status(400).json({ error: "Order number is required" });
      }
      
      const installments = await storage.getInstallmentsByOrder(orden);
      res.json(installments);
    } catch (error) {
      console.error("Get installments error:", error);
      res.status(500).json({ error: "Failed to get installments" });
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
        const totalUsdValue = String(row['Lineitem price'] || '0');
        
        return {
          nombre: String(row['Billing Name'] || ''),
          cedula: null, // Shopify doesn't have cedula field
          telefono: row['Billing Phone'] ? String(row['Billing Phone']) : null,
          email: row.Email ? String(row.Email) : null,
          totalUsd: totalUsdValue,
          totalOrderUsd: row['Total'] ? String(row['Total']) : null, // Full order total from Shopify
          fecha,
          canal: 'shopify',
          estadoPagoInicial: null,
          pagoInicialUsd: null,
          metodoPagoId: null,
          bancoReceptorInicial: null,
          orden: row.Name ? String(row.Name) : null, // Name maps to Order
          factura: null,
          referenciaInicial: null,
          montoInicialBs: null,
          montoInicialUsd: null,
          estadoEntrega: 'Pendiente', // Route Shopify orders to "Ventas por Completar"
          product: String(row['Lineitem name'] || ''),
          sku: row['Lineitem sku'] || row['Lineitem SKU'] || row['lineitem sku'] || row['SKU'] ? 
               String(row['Lineitem sku'] || row['Lineitem SKU'] || row['lineitem sku'] || row['SKU']) : null,
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
          montoFleteBs: null,
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
    // Start date: beginning of the day (4 AM UTC = midnight Venezuela time UTC-4)
    const startDateISO = new Date(startDate + "T04:00:00.000Z").toISOString();
    // End date: add 24 hours to capture the full day (next day at 4 AM UTC)
    const endDateObj = new Date(endDate + "T04:00:00.000Z");
    endDateObj.setDate(endDateObj.getDate() + 1);
    const endDateISO = endDateObj.toISOString();

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
    console.log(`🔍 CASHEA API Response Structure:`, JSON.stringify(data, null, 2));

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
    const cantidades = queryData.Cantidad || [];
    
    // Convert arrays into individual records
    const records: any[] = [];
    const maxLength = Math.max(
      ordenes.length, nombres.length, cedulas.length, telefonos.length,
      emails.length, totalesUSD.length, fechas.length, canales.length,
      pagosIniciales.length, referencias.length, montosBs.length,
      estadosEntrega.length, productos.length, cantidades.length
    );
    
    for (let i = 0; i < maxLength; i++) {
      // Parse date in local timezone to prevent timezone shifts
      // If fechas[i] is "2024-09-14T11:35:55.000Z", extract "2024-09-14"
      // Then append T00:00:00 to create local date (not UTC) so Sept 14 stays Sept 14
      let fecha = new Date();
      if (fechas[i]) {
        const fechaStr = String(fechas[i]);
        const dateOnly = fechaStr.includes('T') ? fechaStr.split('T')[0] : fechaStr;
        // Append local time to force local interpretation (not UTC)
        fecha = new Date(dateOnly + 'T00:00:00');
      }
      const totalUsdValue = String(totalesUSD[i] || '0');
      
      records.push({
        nombre: String(nombres[i] || 'Unknown Customer'),
        cedula: String(cedulas[i] || ''),
        telefono: telefonos[i] ? String(telefonos[i]) : null,
        email: emails[i] ? String(emails[i]) : null,
        totalUsd: totalUsdValue,
        totalOrderUsd: totalUsdValue, // For Cashea, set totalOrderUsd equal to totalUsd for each product
        fecha,
        canal: 'cashea',
        estadoEntrega: 'En proceso', // All CASHEA orders start as "En proceso"
        estadoPagoInicial: null,
        pagoInicialUsd: pagosIniciales[i] ? String(pagosIniciales[i]) : null,
        metodoPagoId: null,
        bancoReceptorInicial: 'f3de098b-58c0-4be0-a799-299a643a0018', // Auto-assign Cashea banco for API downloads
        fechaPagoInicial: fecha, // Auto-assign fecha as fechaPagoInicial for Cashea API downloads
        orden: ordenes[i] ? String(ordenes[i]) : null,
        factura: null,
        referenciaInicial: referencias[i] ? String(referencias[i]) : null,
        montoInicialBs: montosBs[i] ? String(montosBs[i]) : null,
        montoInicialUsd: null,
        direccionFacturacionPais: null,
        direccionFacturacionEstado: null,
        direccionFacturacionCiudad: null,
        direccionFacturacionDireccion: null,
        direccionFacturacionUrbanizacion: null,
        direccionFacturacionReferencia: null,
        direccionDespachoIgualFacturacion: 'true',
        direccionDespachoPais: null,
        direccionDespachoEstado: null,
        direccionDespachoCiudad: null,
        direccionDespachoDireccion: null,
        direccionDespachoUrbanizacion: null,
        direccionDespachoReferencia: null,
        montoFleteUsd: null,
        fechaFlete: null,
        referenciaFlete: null,
        montoFleteBs: null,
        bancoReceptorFlete: null,
        statusFlete: null,
        fleteGratis: false,
        notas: null,
        fechaAtencion: null,
        product: productos[i] ? String(productos[i]) : 'CASHEA Product',
        cantidad: Number(cantidades[i] || 1)
      });
    }
    
    
    return records;
  }

  // CASHEA API endpoint - Manual download
  app.post("/api/cashea/download", async (req, res) => {
    try {
      const { startDate, endDate } = req.body;

      if (!startDate || !endDate) {
        return res.status(400).json({ error: "Start date and end date are required" });
      }

      const result = await performCasheaDownload(startDate, endDate, storage);

      if (!result.success) {
        return res.status(400).json({
          error: "Validation errors found",
          details: result.errors.slice(0, 10),
          totalErrors: result.errors.length
        });
      }

      res.json({
        success: true,
        recordsProcessed: result.recordsProcessed,
        duplicatesIgnored: result.duplicatesIgnored,
        message: result.message,
        recordCount: result.recordsProcessed
      });

    } catch (error) {
      console.error("Error downloading CASHEA data:", error);

      res.status(500).json({ 
        error: "Failed to download CASHEA data",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get Cashea automation config
  app.get("/api/cashea/automation/config", async (req, res) => {
    try {
      const config = await storage.getCasheaAutomationConfig();
      res.json(config);
    } catch (error) {
      console.error("Error getting automation config:", error);
      res.status(500).json({ error: "Failed to get automation config" });
    }
  });

  // Update Cashea automation config
  app.put("/api/cashea/automation/config", async (req, res) => {
    try {
      const { enabled, frequency } = req.body;

      if (typeof enabled !== 'boolean') {
        return res.status(400).json({ error: "enabled must be a boolean" });
      }

      const validFrequencies = ['30 minutes', '1 hour', '2 hours', '4 hours', '8 hours', '16 hours', '24 hours'];
      if (!validFrequencies.includes(frequency)) {
        return res.status(400).json({ 
          error: "Invalid frequency. Must be one of: " + validFrequencies.join(', ')
        });
      }

      const config = await storage.updateCasheaAutomationConfig(enabled, frequency);
      
      // Restart scheduler with new config
      const { restartCasheaScheduler } = await import('./cashea-scheduler');
      await restartCasheaScheduler();

      res.json(config);
    } catch (error) {
      console.error("Error updating automation config:", error);
      res.status(500).json({ error: "Failed to update automation config" });
    }
  });

  // Get Cashea automation download history
  app.get("/api/cashea/automation/history", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;
      const history = await storage.getCasheaAutomaticDownloads(limit);
      res.json(history);
    } catch (error) {
      console.error("Error getting automation history:", error);
      res.status(500).json({ error: "Failed to get automation history" });
    }
  });

  // Manual 24-hour download (bypasses schedule)
  app.post("/api/cashea/automation/download-now", async (req, res) => {
    try {
      console.log('📥 Manual 24-hour download requested...');
      
      // Calculate 24 hours ago, but format as YYYY-MM-DD for API compatibility
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
      
      // Format as YYYY-MM-DD (the API will handle timezone conversion)
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      
      console.log(`📥 Downloading Cashea data (24hr lookback): ${startDateStr} to ${endDateStr}`);
      
      const result = await performCasheaDownload(startDateStr, endDateStr, storage);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.message,
          details: result.errors.slice(0, 10)
        });
      }
      
      res.json({
        success: true,
        recordsProcessed: result.recordsProcessed,
        duplicatesIgnored: result.duplicatesIgnored,
        message: result.message
      });
    } catch (error) {
      console.error("Manual 24-hour download failed:", error);
      res.status(500).json({ 
        success: false,
        error: "Failed to download data",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Update sale delivery status
  app.put("/api/sales/:saleId/delivery-status", async (req, res) => {
    try {
      const { saleId } = req.params;
      const { status } = req.body;

      // Normalize status casing to prevent case-sensitivity bugs
      const normalizedStatus = normalizeEstadoEntrega(status);

      // Validate status
      const validStatuses = ['Pendiente', 'Perdida', 'En proceso', 'A despachar', 'En tránsito', 'Entregado', 'A devolver', 'Devuelto', 'Cancelada'];
      if (!normalizedStatus || !validStatuses.includes(normalizedStatus)) {
        return res.status(400).json({ 
          error: "Invalid status. Must be one of: " + validStatuses.join(', ')
        });
      }

      // Validate that sale exists
      const existingSale = await storage.getSaleById(saleId);
      if (!existingSale) {
        return res.status(404).json({ error: "Sale not found" });
      }

      const updatedSale = await storage.updateSaleDeliveryStatus(saleId, normalizedStatus);
      
      if (!updatedSale) {
        return res.status(500).json({ error: "Failed to update delivery status" });
      }

      res.json({ success: true, sale: updatedSale });
    } catch (error) {
      console.error("Update delivery status error:", error);
      res.status(500).json({ error: "Failed to update delivery status" });
    }
  });

  // Update sale transportista
  app.put("/api/sales/:saleId/transportista", async (req, res) => {
    try {
      const { saleId } = req.params;
      const { transportistaId } = req.body;

      // Validate that sale exists
      const existingSale = await storage.getSaleById(saleId);
      if (!existingSale) {
        return res.status(404).json({ error: "Sale not found" });
      }

      const updatedSale = await storage.updateSaleTransportista(saleId, transportistaId || null);
      
      if (!updatedSale) {
        return res.status(500).json({ error: "Failed to update transportista" });
      }

      res.json({ success: true, sale: updatedSale });
    } catch (error) {
      console.error("Update transportista error:", error);
      res.status(500).json({ error: "Failed to update transportista" });
    }
  });

  // Update sale nroGuia
  app.put("/api/sales/:saleId/nro-guia", async (req, res) => {
    try {
      const { saleId } = req.params;
      const { nroGuia } = req.body;

      // Validate that sale exists
      const existingSale = await storage.getSaleById(saleId);
      if (!existingSale) {
        return res.status(404).json({ error: "Sale not found" });
      }

      const updatedSale = await storage.updateSaleNroGuia(saleId, nroGuia || null);
      
      if (!updatedSale) {
        return res.status(500).json({ error: "Failed to update nro guia" });
      }

      res.json({ success: true, sale: updatedSale });
    } catch (error) {
      console.error("Update nro guia error:", error);
      res.status(500).json({ error: "Failed to update nro guia" });
    }
  });

  // Update sale fechaDespacho
  app.put("/api/sales/:saleId/fecha-despacho", async (req, res) => {
    try {
      const { saleId } = req.params;
      const { fechaDespacho } = req.body;

      // Validate that sale exists
      const existingSale = await storage.getSaleById(saleId);
      if (!existingSale) {
        return res.status(404).json({ error: "Sale not found" });
      }

      const updatedSale = await storage.updateSaleFechaDespacho(saleId, fechaDespacho || null);
      
      if (!updatedSale) {
        return res.status(500).json({ error: "Failed to update fecha despacho" });
      }

      res.json({ success: true, sale: updatedSale });
    } catch (error) {
      console.error("Update fecha despacho error:", error);
      res.status(500).json({ error: "Failed to update fecha despacho" });
    }
  });

  // Update sale fechaCliente
  app.put("/api/sales/:saleId/fecha-cliente", async (req, res) => {
    try {
      const { saleId } = req.params;
      const { fechaCliente } = req.body;

      // Validate that sale exists
      const existingSale = await storage.getSaleById(saleId);
      if (!existingSale) {
        return res.status(404).json({ error: "Sale not found" });
      }

      const updatedSale = await storage.updateSaleFechaCliente(saleId, fechaCliente || null);
      
      if (!updatedSale) {
        return res.status(500).json({ error: "Failed to update fecha cliente" });
      }

      res.json({ success: true, sale: updatedSale });
    } catch (error) {
      console.error("Update fecha cliente error:", error);
      res.status(500).json({ error: "Failed to update fecha cliente" });
    }
  });

  // Mark all sales in an order as Perdida
  app.put("/api/sales/orders/:orderNumber/mark-perdida", async (req, res) => {
    try {
      const { orderNumber } = req.params;

      // Validate that order exists
      const existingSales = await storage.getSalesByOrderNumber(orderNumber);
      if (!existingSales || existingSales.length === 0) {
        return res.status(404).json({ error: "Order not found" });
      }

      const updatedSales = await storage.updateSalesByOrderNumber(orderNumber, { 
        estadoEntrega: "Perdida" 
      });
      
      if (!updatedSales || updatedSales.length === 0) {
        return res.status(500).json({ error: "Failed to mark order as Perdida" });
      }

      res.json({ 
        success: true, 
        message: `Marked ${updatedSales.length} sale(s) as Perdida`,
        salesUpdated: updatedSales.length 
      });
    } catch (error) {
      console.error("Mark order as Perdida error:", error);
      res.status(500).json({ error: "Failed to mark order as Perdida" });
    }
  });

  // Mark a single sale as Cancelada
  app.put("/api/sales/:saleId/cancel", async (req, res) => {
    try {
      const { saleId } = req.params;

      // Validate that sale exists
      const existingSale = await storage.getSaleById(saleId);
      if (!existingSale) {
        return res.status(404).json({ error: "Sale not found" });
      }

      const updatedSale = await storage.updateSale(saleId, { 
        estadoEntrega: "Cancelada" 
      });
      
      if (!updatedSale) {
        return res.status(500).json({ error: "Failed to cancel sale" });
      }

      res.json({ 
        success: true, 
        message: "Sale cancelled successfully",
        sale: updatedSale 
      });
    } catch (error) {
      console.error("Cancel sale error:", error);
      res.status(500).json({ error: "Failed to cancel sale" });
    }
  });

  // Mark a single sale as A devolver
  app.put("/api/sales/:saleId/return", async (req, res) => {
    try {
      const { saleId } = req.params;

      // Validate that sale exists
      const existingSale = await storage.getSaleById(saleId);
      if (!existingSale) {
        return res.status(404).json({ error: "Sale not found" });
      }

      const updatedSale = await storage.updateSale(saleId, { 
        estadoEntrega: "A devolver" 
      });
      
      if (!updatedSale) {
        return res.status(500).json({ error: "Failed to mark sale as returned" });
      }

      res.json({ 
        success: true, 
        message: "Sale marked as returned successfully",
        sale: updatedSale 
      });
    } catch (error) {
      console.error("Return sale error:", error);
      res.status(500).json({ error: "Failed to mark sale as returned" });
    }
  });

  // Update seguimientoPago for all sales in an order
  app.patch("/api/sales/orders/:orderNumber/seguimiento-pago", async (req, res) => {
    try {
      const { orderNumber } = req.params;
      const { seguimientoPago } = req.body;

      // Validate that order exists
      const existingSales = await storage.getSalesByOrderNumber(orderNumber);
      if (!existingSales || existingSales.length === 0) {
        return res.status(404).json({ error: "Order not found" });
      }

      const updatedSales = await storage.updateSalesByOrderNumber(orderNumber, { 
        seguimientoPago: seguimientoPago || null 
      });
      
      if (!updatedSales || updatedSales.length === 0) {
        return res.status(500).json({ error: "Failed to update seguimiento pago" });
      }

      res.json({ 
        success: true, 
        message: `Updated seguimiento pago for ${updatedSales.length} sale(s)`,
        salesUpdated: updatedSales.length 
      });
    } catch (error) {
      console.error("Update order seguimiento pago error:", error);
      res.status(500).json({ error: "Failed to update seguimiento pago" });
    }
  });

  // Update seguimiento (follow-up tracking) for all sales in an order
  app.patch("/api/sales/seguimiento/:orden", async (req, res) => {
    try {
      const { orden } = req.params;
      const seguimientoData = req.body;

      // Validate orden parameter
      if (!orden || orden.trim() === '' || orden === 'undefined' || orden === 'null') {
        return res.status(400).json({ error: "Order number is required" });
      }

      // Validate that order exists
      const existingSales = await storage.getSalesByOrderNumber(orden);
      if (!existingSales || existingSales.length === 0) {
        return res.status(404).json({ error: "Order not found" });
      }

      // Update seguimiento data for all sales with this order number
      const updatedSales = await storage.updateSalesByOrderNumber(orden, seguimientoData);
      
      if (!updatedSales || updatedSales.length === 0) {
        return res.status(500).json({ error: "Failed to update seguimiento" });
      }

      res.json({ 
        success: true, 
        message: `Updated seguimiento for ${updatedSales.length} sale(s)`,
        salesUpdated: updatedSales.length 
      });
    } catch (error) {
      console.error("Update order seguimiento error:", error);
      res.status(500).json({ error: "Failed to update seguimiento" });
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

  // Update pago inicial for all products in an order
  app.patch("/api/sales/:orderNumber/pago-inicial", async (req, res) => {
    try {
      const { orderNumber } = req.params;
      const pagoData = req.body;

      // Find all sales with this order number
      const salesInOrder = await storage.getSalesByOrderNumber(orderNumber);
      if (!salesInOrder || salesInOrder.length === 0) {
        return res.status(404).json({ error: "Order not found" });
      }

      // Store current estadoEntrega before update
      const currentEstadoEntrega = salesInOrder[0]?.estadoEntrega;

      // Update pago inicial data for all products in this order
      const updatedSales = await storage.updateOrderPagoInicial(orderNumber, pagoData);
      
      if (!updatedSales) {
        return res.status(500).json({ error: "Failed to update pago inicial" });
      }

      // Auto-update estadoEntrega from "Pendiente" to "En Proceso" when payment is complete
      let finalSales = updatedSales;
      if (currentEstadoEntrega === 'Pendiente' && updatedSales.length > 0) {
        const firstSale = updatedSales[0];
        // Check if all three payment fields are now filled
        const hasPaymentAmount = firstSale.pagoInicialUsd != null && Number(firstSale.pagoInicialUsd) > 0;
        const hasBanco = firstSale.bancoReceptorInicial != null && firstSale.bancoReceptorInicial.trim() !== '';
        const hasReferencia = firstSale.referenciaInicial != null && firstSale.referenciaInicial.trim() !== '';
        
        if (hasPaymentAmount && hasBanco && hasReferencia) {
          // Update estadoEntrega to "En Proceso"
          await storage.updateSalesByOrderNumber(orderNumber, { 
            estadoEntrega: 'En proceso'
          });
          console.log(`✅ Auto-updated order ${orderNumber} from "Pendiente" to "En proceso"`);
          
          // Refetch to get the updated estadoEntrega in response
          finalSales = await storage.getSalesByOrderNumber(orderNumber);

          // Auto-send email confirmation if not already sent and customer has email
          if (finalSales.length > 0 && finalSales[0].email && !finalSales[0].emailSentAt) {
            try {
              const firstSale = finalSales[0];
              
              // Build products array
              const products = finalSales.map(s => ({
                name: s.product || 'Producto BoxiSleep',
                quantity: s.cantidad || 1
              }));

              // Build shipping address
              let shippingAddress = undefined;
              if (firstSale.direccionDespachoDireccion) {
                const addressParts = [
                  firstSale.direccionDespachoDireccion,
                  firstSale.direccionDespachoUrbanizacion,
                  firstSale.direccionDespachoCiudad,
                  firstSale.direccionDespachoEstado,
                  firstSale.direccionDespachoPais
                ].filter(Boolean);
                shippingAddress = addressParts.join(', ');
              }

              // Prepare email data
              const emailData: OrderEmailData = {
                customerName: firstSale.nombre,
                customerEmail: firstSale.email!,
                orderNumber: orderNumber,
                products,
                totalOrderUsd: parseFloat(firstSale.totalOrderUsd?.toString() || '0'),
                fecha: firstSale.fecha.toISOString(),
                shippingAddress,
                montoInicialBs: firstSale.montoInicialBs?.toString(),
                montoInicialUsd: firstSale.montoInicialUsd?.toString(),
                referenciaInicial: firstSale.referenciaInicial || undefined
              };

              // Send email
              await sendOrderConfirmationEmail(emailData);
              
              // Update all sales with emailSentAt timestamp
              const emailSentTimestamp = new Date();
              await storage.updateSalesByOrderNumber(orderNumber, {
                emailSentAt: emailSentTimestamp
              });

              console.log(`📧 Auto-sent confirmation email to ${firstSale.email} for order ${orderNumber}`);
              
              // Refetch again to include emailSentAt in response
              finalSales = await storage.getSalesByOrderNumber(orderNumber);
            } catch (emailError) {
              console.error(`⚠️  Failed to auto-send email for order ${orderNumber}:`, emailError);
              // Don't fail the request if email fails - just log it
            }
          }
        }
      }

      res.json({ success: true, sales: finalSales });
    } catch (error) {
      console.error("Update pago inicial error:", error);
      res.status(500).json({ error: "Failed to update pago inicial" });
    }
  });

  // Update flete for all products in an order
  app.patch("/api/sales/:orderNumber/flete", async (req, res) => {
    try {
      const { orderNumber } = req.params;
      const fleteData = req.body;

      // Find all sales with this order number
      const salesInOrder = await storage.getSalesByOrderNumber(orderNumber);
      
      if (!salesInOrder || salesInOrder.length === 0) {
        return res.status(404).json({ error: "Order not found" });
      }

      // Update flete data for all products in this order
      const updatedSales = await storage.updateOrderFlete(orderNumber, fleteData);
      
      if (!updatedSales) {
        return res.status(500).json({ error: "Failed to update flete" });
      }

      res.json({ success: true, sales: updatedSales });
    } catch (error) {
      console.error("Update flete error:", error);
      res.status(500).json({ error: "Failed to update flete" });
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

  // Update estado entrega for all sales in an order
  app.patch("/api/sales/orders/:orderNumber/estado-entrega", async (req, res) => {
    try {
      const { orderNumber } = req.params;
      const { estadoEntrega } = req.body;

      // Validate estado entrega
      const validStatuses = ['Pendiente', 'En proceso', 'A despachar', 'En tránsito', 'Entregado', 'A devolver', 'Devuelto', 'Cancelada', 'Perdida'];
      if (!estadoEntrega || !validStatuses.includes(estadoEntrega)) {
        return res.status(400).json({ 
          error: "Invalid estadoEntrega. Must be one of: " + validStatuses.join(', ')
        });
      }

      // Find all sales with this order number
      const salesInOrder = await storage.getSalesByOrderNumber(orderNumber);
      if (!salesInOrder || salesInOrder.length === 0) {
        return res.status(404).json({ error: "Order not found" });
      }

      // Update all sales in the order
      const updatePromises = salesInOrder.map(sale => 
        storage.updateSaleDeliveryStatus(sale.id, estadoEntrega)
      );
      await Promise.all(updatePromises);

      res.json({ success: true, count: salesInOrder.length });
    } catch (error) {
      console.error("Update estado entrega error:", error);
      res.status(500).json({ error: "Failed to update estado entrega" });
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
          // Route to Lista de Ventas - already verified, keep current status
          updates.estadoEntrega = existingSale.estadoEntrega || 'En proceso';
        } else {
          // Route to Ventas por Completar - set to Pendiente
          updates.estadoEntrega = 'Pendiente';
        }
      }
      // For Inmediato to Reserva, no additional changes needed - will route to Reservas tab automatically

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

  // Assign asesor to sale (and automatically to all sales in the same order)
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

      // Get the sale to check if it has an orden
      const existingSale = await storage.getSaleById(saleId);
      if (!existingSale) {
        return res.status(404).json({ error: "Sale not found" });
      }

      // If the sale has an orden, update all sales in that order
      // This ensures one order = one asesor
      if (existingSale.orden) {
        const updatedSales = await storage.updateSalesByOrderNumber(existingSale.orden, { asesorId });
        if (!updatedSales || updatedSales.length === 0) {
          return res.status(500).json({ error: "Failed to update sales" });
        }
        // Return the first sale (the one that was clicked on)
        res.json(updatedSales.find(s => s.id === saleId) || updatedSales[0]);
      } else {
        // No orden, just update the single sale
        const updatedSale = await storage.updateSale(saleId, { asesorId });
        if (!updatedSale) {
          return res.status(404).json({ error: "Sale not found" });
        }
        res.json(updatedSale);
      }
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

  app.post("/api/admin/productos/undo", async (req, res) => {
    try {
      await storage.restoreProductosFromBackup();
      res.json({ success: true, message: "Products restored from backup" });
    } catch (error) {
      console.error("Undo productos error:", error);
      res.status(500).json({ 
        error: "Failed to restore products",
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // BANCOS upload/undo endpoints
  app.post("/api/admin/bancos/undo", async (req, res) => {
    try {
      await storage.restoreBancosFromBackup();
      res.json({ success: true, message: "Bancos restored from backup" });
    } catch (error) {
      console.error("Undo bancos error:", error);
      res.status(500).json({ 
        error: "Failed to restore bancos",
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.post("/api/admin/bancos/upload", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Create backup before processing
      await storage.backupBancos();

      // Parse file with row-level error handling
      const parsedRows = parseBancosFile(req.file.buffer, req.file.originalname);
      
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

      // Check for duplicates within file only (banco + numeroCuenta combination)
      const bancoCuentaInFile = new Set<string>();
      const additionalErrors = [];
      const validBancos = [];
      
      for (const row of validRows) {
        const { data } = row;
        if (!data) continue;
        
        let hasError = false;
        
        // Check for duplicate banco+cuenta within file
        const key = `${data.banco.toLowerCase()}|${data.numeroCuenta.toLowerCase()}`;
        if (bancoCuentaInFile.has(key)) {
          additionalErrors.push({
            row: row.row,
            error: `Duplicate banco "${data.banco}" with account number "${data.numeroCuenta}" found in file`
          });
          hasError = true;
        } else {
          bancoCuentaInFile.add(key);
        }
        
        if (!hasError) {
          validBancos.push(data);
        }
      }

      // Combine all errors
      const allErrors = [
        ...invalidRows.map(row => ({ row: row.row, error: row.error })),
        ...additionalErrors
      ];

      // Replace all bancos with new data (delete all, then insert)
      const { created } = await storage.replaceBancos(validBancos);

      // Return results with detailed statistics
      res.json({
        success: true,
        created,
        total: parsedRows.length,
        errors: allErrors.length,
        details: {
          validRows: validRows.length,
          invalidRows: invalidRows.length,
          duplicates: additionalErrors.length,
          errorList: allErrors.slice(0, 20) // Show first 20 errors
        }
      });

    } catch (error) {
      console.error("Upload bancos error:", error);
      res.status(500).json({ 
        error: "Failed to process upload",
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.post("/api/admin/productos/upload-excel", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Create backup before processing
      await storage.backupProductos();

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

      // Check for duplicates within file only
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

      // Replace all productos with new data (delete all, then insert)
      const { created } = await storage.replaceProductos(validProductos);

      // Return results with detailed statistics
      res.json({
        success: true,
        created,
        total: parsedRows.length,
        errors: allErrors.length,
        details: {
          validRows: validRows.length,
          invalidRows: invalidRows.length,
          duplicates: additionalErrors.length,
          errorList: allErrors.slice(0, 20) // Show first 20 errors
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

  // TRANSPORTISTAS endpoints
  app.get("/api/admin/transportistas", async (req, res) => {
    try {
      const transportistas = await storage.getTransportistas();
      res.json(transportistas);
    } catch (error) {
      console.error("Fetch transportistas error:", error);
      res.status(500).json({ error: "Failed to fetch transportistas" });
    }
  });

  app.post("/api/admin/transportistas", async (req, res) => {
    try {
      const validatedData = insertTransportistaSchema.parse(req.body);
      const transportista = await storage.createTransportista(validatedData);
      res.status(201).json(transportista);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Create transportista error:", error);
      res.status(500).json({ error: "Failed to create transportista" });
    }
  });

  app.put("/api/admin/transportistas/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertTransportistaSchema.partial().parse(req.body);
      const transportista = await storage.updateTransportista(id, validatedData);
      if (!transportista) {
        return res.status(404).json({ error: "Transportista not found" });
      }
      res.json(transportista);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Update transportista error:", error);
      res.status(500).json({ error: "Failed to update transportista" });
    }
  });

  app.delete("/api/admin/transportistas/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteTransportista(id);
      if (!deleted) {
        return res.status(404).json({ error: "Transportista not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Delete transportista error:", error);
      res.status(500).json({ error: "Failed to delete transportista" });
    }
  });

  // PRECIOS endpoints
  app.get("/api/admin/precios", async (req, res) => {
    try {
      const precios = await storage.getPrecios();
      res.json(precios);
    } catch (error) {
      console.error("Fetch precios error:", error);
      res.status(500).json({ error: "Failed to fetch precios" });
    }
  });

  app.post("/api/admin/precios", async (req, res) => {
    try {
      const validatedData = insertPrecioSchema.parse(req.body);
      const precio = await storage.createPrecio(validatedData);
      res.status(201).json(precio);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Create precio error:", error);
      res.status(500).json({ error: "Failed to create precio" });
    }
  });

  app.put("/api/admin/precios/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertPrecioSchema.partial().parse(req.body);
      const precio = await storage.updatePrecio(id, validatedData);
      if (!precio) {
        return res.status(404).json({ error: "Precio not found" });
      }
      res.json(precio);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Update precio error:", error);
      res.status(500).json({ error: "Failed to update precio" });
    }
  });

  app.delete("/api/admin/precios/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deletePrecio(id);
      if (!deleted) {
        return res.status(404).json({ error: "Precio not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Delete precio error:", error);
      res.status(500).json({ error: "Failed to delete precio" });
    }
  });

  // Check if Precios/Costos backup exists
  app.get("/api/admin/precios/has-backup", async (req, res) => {
    try {
      const hasBackup = await storage.hasPreciosBackup();
      res.json({ hasBackup });
    } catch (error) {
      console.error("Check precios backup error:", error);
      res.status(500).json({ error: "Failed to check backup status" });
    }
  });

  // Undo Precios/Costos endpoint
  app.post("/api/admin/precios/undo", async (req, res) => {
    try {
      await storage.restorePreciosFromBackup();
      res.json({ success: true, message: "Precios/Costos restored from backup" });
    } catch (error) {
      console.error("Undo precios error:", error);
      res.status(500).json({ 
        error: "Failed to restore precios",
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Excel upload for Precios/Costos
  app.post("/api/admin/precios/upload", (req, res, next) => {
    upload.single("file")(req, res, (err) => {
      if (err) {
        const errorMessage = err instanceof Error ? err.message : "Error al cargar el archivo";
        return res.status(400).json({ 
          error: errorMessage,
          message: errorMessage 
        });
      }
      next();
    });
  }, async (req, res) => {
    try {
      if (!req.file) {
        const errorMessage = "No se ha seleccionado ningún archivo";
        return res.status(400).json({ 
          error: errorMessage,
          message: errorMessage 
        });
      }

      // Parse Excel file
      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);

      if (data.length === 0) {
        const errorMessage = "El archivo Excel está vacío";
        return res.status(400).json({ 
          error: errorMessage,
          message: errorMessage 
        });
      }

      // Required columns
      const requiredColumns = [
        "País",
        "SKU",
        "Precio Inmediata USD",
        "Precio Reserva USD",
        "Precio Cashea USD",
        "Costo Unitario USD",
        "Fecha Vigencia Desde"
      ];

      // Check if all required columns exist
      const firstRow = data[0] as any;
      const missingColumns = requiredColumns.filter(col => !(col in firstRow));
      
      if (missingColumns.length > 0) {
        const errorMessage = `Faltan columnas requeridas: ${missingColumns.join(", ")}`;
        return res.status(400).json({ 
          error: errorMessage,
          message: errorMessage 
        });
      }

      // Parse and validate each row
      const preciosToCreate: any[] = [];
      const errors: string[] = [];

      for (let i = 0; i < data.length; i++) {
        const row = data[i] as any;
        const rowNum = i + 2; // +2 because Excel is 1-indexed and has header row

        try {
          // Parse fecha - handle Excel date serial number or date string
          let fechaVigenciaDesde: Date;
          const fechaValue = row["Fecha Vigencia Desde"];
          
          if (typeof fechaValue === 'number') {
            // Excel date serial number - convert to proper Date object
            // Excel stores dates as days since 1900-01-01 (with 1900 leap year bug)
            const excelEpoch = new Date(1899, 11, 30); // December 30, 1899
            const msPerDay = 24 * 60 * 60 * 1000;
            fechaVigenciaDesde = new Date(excelEpoch.getTime() + fechaValue * msPerDay);
          } else if (typeof fechaValue === 'string') {
            fechaVigenciaDesde = new Date(fechaValue);
          } else if (fechaValue instanceof Date) {
            fechaVigenciaDesde = fechaValue;
          } else {
            throw new Error("Formato de fecha inválido");
          }

          if (isNaN(fechaVigenciaDesde.getTime())) {
            throw new Error("Fecha inválida");
          }

          const precioData = {
            pais: String(row["País"] || "").trim(),
            sku: String(row["SKU"] || "").trim(),
            precioInmediataUsd: String(row["Precio Inmediata USD"] || "0"),
            precioReservaUsd: String(row["Precio Reserva USD"] || "0"),
            precioCasheaUsd: String(row["Precio Cashea USD"] || "0"),
            costoUnitarioUsd: String(row["Costo Unitario USD"] || "0"),
            fechaVigenciaDesde
          };

          // Validate with Zod schema
          const validated = insertPrecioSchema.parse(precioData);
          preciosToCreate.push(validated);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          errors.push(`Fila ${rowNum}: ${errorMsg}`);
        }
      }

      // If there are validation errors, return them
      if (errors.length > 0) {
        const errorMessage = `Errores de validación: ${errors.join("; ")}`;
        return res.status(400).json({ 
          error: errorMessage,
          message: errorMessage,
          details: errors 
        });
      }

      // Create backup before adding new records
      await storage.backupPrecios();

      // Create all precios in database using batch insert
      const createdPrecios = [];
      for (const precioData of preciosToCreate) {
        const precio = await storage.createPrecio(precioData);
        createdPrecios.push(precio);
      }

      res.json({
        success: true,
        message: `Se importaron ${createdPrecios.length} precios/costos exitosamente`,
        recordsAdded: createdPrecios.length
      });
    } catch (error) {
      console.error("Upload precios error:", error);
      const errorMessage = error instanceof Error ? error.message : "Error al procesar el archivo Excel";
      res.status(500).json({ 
        error: errorMessage,
        message: errorMessage 
      });
    }
  });

  // SEGUIMIENTO CONFIG endpoints
  app.get("/api/admin/seguimiento-config/:tipo", async (req, res) => {
    try {
      const { tipo } = req.params;
      if (tipo !== 'prospectos' && tipo !== 'ordenes') {
        return res.status(400).json({ error: "Invalid tipo. Must be 'prospectos' or 'ordenes'" });
      }
      
      const config = await storage.getSeguimientoConfig(tipo);
      // Return default values if no config exists yet
      if (!config) {
        return res.json({
          tipo,
          diasFase1: 2,
          diasFase2: 4,
          diasFase3: 7,
          emailRecordatorio: null,
          asesorEmails: null,
        });
      }
      res.json(config);
    } catch (error) {
      console.error("Fetch seguimiento config error:", error);
      res.status(500).json({ error: "Failed to fetch seguimiento config" });
    }
  });

  app.put("/api/admin/seguimiento-config/:tipo", async (req, res) => {
    try {
      const { tipo } = req.params;
      if (tipo !== 'prospectos' && tipo !== 'ordenes') {
        return res.status(400).json({ error: "Invalid tipo. Must be 'prospectos' or 'ordenes'" });
      }
      
      const { insertSeguimientoConfigSchema } = await import("@shared/schema");
      const validatedData = insertSeguimientoConfigSchema.partial().parse(req.body);
      const config = await storage.updateSeguimientoConfig(tipo, validatedData);
      res.json(config);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Update seguimiento config error:", error);
      res.status(500).json({ error: "Failed to update seguimiento config" });
    }
  });

  // Test endpoint for triggering seguimiento reminders manually
  app.post("/api/admin/trigger-seguimiento-reminders", async (req, res) => {
    try {
      const { triggerSeguimientoReminders } = await import("./seguimiento-scheduler");
      await triggerSeguimientoReminders();
      res.json({ success: true, message: "Seguimiento reminders triggered successfully" });
    } catch (error) {
      console.error("Error triggering seguimiento reminders:", error);
      res.status(500).json({ error: "Failed to trigger seguimiento reminders" });
    }
  });

  // Test endpoint to send a sample email with fake data
  app.post("/api/admin/test-email", async (req, res) => {
    try {
      console.log("📧 Starting test email send...");
      const { sendEmail, generateFollowUpEmailHtml, generateFollowUpEmailText } = await import("./services/seguimiento-email");
      
      // Create fake prospecto data
      const fakeReminders = [
        {
          prospecto: {
            id: "test-1",
            numeroProspecto: "P-0042",
            nombre: "María González",
            telefono: "0412-1234567",
            canal: "Tienda"
          },
          fase: 1 as const,
          fechaSeguimiento: new Date(),
          respuestaAnterior: null,
          status: "overdue" as const
        },
        {
          prospecto: {
            id: "test-2",
            numeroProspecto: "P-0087",
            nombre: "Carlos Rodríguez",
            telefono: "0424-9876543",
            canal: "Cashea"
          },
          fase: 2 as const,
          fechaSeguimiento: new Date(),
          respuestaAnterior: "Cliente interesado, solicitó cotización",
          status: "today" as const
        },
        {
          prospecto: {
            id: "test-3",
            numeroProspecto: "P-0125",
            nombre: "Ana Martínez",
            telefono: "0414-5555555",
            canal: "Tienda"
          },
          fase: 3 as const,
          fechaSeguimiento: new Date(),
          respuestaAnterior: "Comparando precios con competencia",
          status: "overdue" as const
        }
      ];
      
      console.log("📝 Generating email content...");
      const htmlContent = generateFollowUpEmailHtml("Test Asesor", fakeReminders);
      const textContent = generateFollowUpEmailText("Test Asesor", fakeReminders);
      console.log(`📄 HTML content length: ${htmlContent.length} chars`);
      console.log(`📄 Text content length: ${textContent.length} chars`);
      
      console.log("🚀 Sending email via Outlook...");
      await sendEmail(
        "labradormariaeugenia@gmail.com",
        "Recordatorio de Seguimientos - BoxiSleep CRM (PRUEBA)",
        htmlContent,
        textContent
      );
      
      console.log("✅ Test email sent successfully!");
      res.json({ 
        success: true, 
        message: "Test email sent successfully to labradormariaeugenia@gmail.com" 
      });
    } catch (error) {
      console.error("❌ Error sending test email:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      console.error("Stack trace:", errorStack);
      res.status(500).json({ 
        error: "Failed to send test email", 
        details: errorMessage,
        stack: errorStack
      });
    }
  });

  // PROSPECTOS endpoints
  const getProspectosQuerySchema = z.object({
    asesorId: z.string().optional(),
    estadoProspecto: z.string().optional(),
    canal: z.string().optional(),
    prospecto: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    limit: z.coerce.number().min(1).max(1000).default(100),
    offset: z.coerce.number().min(0).default(0),
  });

  app.get("/api/prospectos", async (req, res) => {
    try {
      const query = getProspectosQuerySchema.parse(req.query);
      
      const [prospectosData, totalCount] = await Promise.all([
        storage.getProspectos({
          asesorId: query.asesorId,
          estadoProspecto: query.estadoProspecto,
          canal: query.canal,
          prospecto: query.prospecto,
          startDate: query.startDate,
          endDate: query.endDate,
          limit: query.limit,
          offset: query.offset,
        }),
        storage.getTotalProspectosCount({
          asesorId: query.asesorId,
          estadoProspecto: query.estadoProspecto,
          canal: query.canal,
          prospecto: query.prospecto,
          startDate: query.startDate,
          endDate: query.endDate,
        }),
      ]);

      res.json({
        data: prospectosData,
        total: totalCount,
        limit: query.limit,
        offset: query.offset,
      });
    } catch (error) {
      console.error("Error fetching prospectos:", error);
      res.status(500).json({ error: "Failed to fetch prospectos" });
    }
  });

  // Export prospectos data to Excel
  app.get("/api/prospectos/export", async (req, res) => {
    try {
      const query = getProspectosQuerySchema.parse(req.query);
      
      const prospectosData = await storage.getProspectos({
        asesorId: query.asesorId,
        estadoProspecto: query.estadoProspecto,
        canal: query.canal,
        prospecto: query.prospecto,
        startDate: query.startDate,
        endDate: query.endDate,
        limit: 10000, // Get all for export
        offset: 0,
      });
      
      // Map to Excel columns
      const excelData = prospectosData.map(prospecto => {
        // Parse products JSON
        let productsText = '';
        if (prospecto.products) {
          try {
            const products = JSON.parse(prospecto.products);
            productsText = products.map((p: any) => 
              `${p.product} (SKU: ${p.sku}, Cant: ${p.cantidad}, Total: $${p.totalUsd})`
            ).join('; ');
          } catch (e) {
            productsText = '';
          }
        }
        
        return {
          'Prospecto': prospecto.prospecto,
          'Nombre': prospecto.nombre,
          'Cédula': prospecto.cedula || '',
          'Teléfono': prospecto.telefono,
          'Email': prospecto.email || '',
          'Canal': prospecto.canal || '',
          'Asesor': prospecto.asesorId || '',
          'Fecha de Entrega': prospecto.fechaEntrega ? new Date(prospecto.fechaEntrega).toLocaleDateString('es-ES') : '',
          'Total USD': prospecto.totalUsd || '',
          'Productos': productsText,
          'Notas': prospecto.notas || '',
          
          // Shipping Address
          'País (Despacho)': prospecto.direccionDespachoPais || '',
          'Estado (Despacho)': prospecto.direccionDespachoEstado || '',
          'Ciudad (Despacho)': prospecto.direccionDespachoCiudad || '',
          'Dirección (Despacho)': prospecto.direccionDespachoDireccion || '',
          'Urbanización (Despacho)': prospecto.direccionDespachoUrbanizacion || '',
          'Referencia (Despacho)': prospecto.direccionDespachoReferencia || '',
          
          // Billing Address
          'Despacho Igual a Facturación': prospecto.direccionDespachoIgualFacturacion === "true" ? 'Sí' : 'No',
          'País (Facturación)': prospecto.direccionFacturacionPais || '',
          'Estado (Facturación)': prospecto.direccionFacturacionEstado || '',
          'Ciudad (Facturación)': prospecto.direccionFacturacionCiudad || '',
          'Dirección (Facturación)': prospecto.direccionFacturacionDireccion || '',
          'Urbanización (Facturación)': prospecto.direccionFacturacionUrbanizacion || '',
          'Referencia (Facturación)': prospecto.direccionFacturacionReferencia || '',
          
          'Fecha de Creación': new Date(prospecto.fechaCreacion).toLocaleDateString('es-ES'),
        };
      });

      // Convert to Excel format
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Prospectos');

      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="prospectos_boxisleep_${new Date().toISOString().split('T')[0]}.xlsx"`);
      res.send(buffer);

    } catch (error) {
      console.error("Error exporting prospectos:", error);
      res.status(500).json({ error: "Failed to export prospectos data" });
    }
  });

  app.post("/api/prospectos", async (req, res) => {
    try {
      const validatedData = insertProspectoSchema.parse(req.body);
      const prospecto = await storage.createProspecto(validatedData);
      res.status(201).json(prospecto);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Create prospecto error:", error);
      res.status(500).json({ error: "Failed to create prospecto" });
    }
  });

  app.patch("/api/prospectos/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertProspectoSchema.partial().parse(req.body);
      const prospecto = await storage.updateProspecto(id, validatedData);
      if (!prospecto) {
        return res.status(404).json({ error: "Prospecto not found" });
      }
      res.json(prospecto);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Update prospecto error:", error);
      res.status(500).json({ error: "Failed to update prospecto" });
    }
  });

  app.delete("/api/prospectos/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteProspecto(id);
      if (!deleted) {
        return res.status(404).json({ error: "Prospecto not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Delete prospecto error:", error);
      res.status(500).json({ error: "Failed to delete prospecto" });
    }
  });

  app.put("/api/prospectos/:id/seguimiento", async (req, res) => {
    try {
      const { id } = req.params;
      const seguimientoData = req.body;

      // Validate that prospecto exists
      const existingProspecto = await storage.getProspectoById(id);
      if (!existingProspecto) {
        return res.status(404).json({ error: "Prospecto not found" });
      }

      // Convert ISO string dates to Date objects for Drizzle
      const processedData: any = { ...seguimientoData };
      if (processedData.fechaSeguimiento1) {
        processedData.fechaSeguimiento1 = new Date(processedData.fechaSeguimiento1);
      }
      if (processedData.fechaSeguimiento2) {
        processedData.fechaSeguimiento2 = new Date(processedData.fechaSeguimiento2);
      }
      if (processedData.fechaSeguimiento3) {
        processedData.fechaSeguimiento3 = new Date(processedData.fechaSeguimiento3);
      }

      const updatedProspecto = await storage.updateProspecto(id, processedData);
      
      if (!updatedProspecto) {
        return res.status(500).json({ error: "Failed to update seguimiento" });
      }

      res.json({ success: true, prospecto: updatedProspecto });
    } catch (error) {
      console.error("Update prospecto seguimiento error:", error);
      res.status(500).json({ error: "Failed to update seguimiento" });
    }
  });

  app.post("/api/prospectos/convert", async (req, res) => {
    try {
      const { tipo, prospectoId } = req.body;
      
      if (!tipo || !prospectoId) {
        return res.status(400).json({ error: "Missing required fields: tipo and prospectoId" });
      }

      if (tipo !== "inmediata" && tipo !== "reserva") {
        return res.status(400).json({ error: "Invalid tipo. Must be 'inmediata' or 'reserva'" });
      }

      // Get the prospecto
      const prospecto = await storage.getProspectoById(prospectoId);
      if (!prospecto) {
        return res.status(404).json({ error: "Prospecto not found" });
      }

      // Parse products
      let products = [];
      try {
        products = prospecto.products ? JSON.parse(prospecto.products) : [];
      } catch (e) {
        console.error("Error parsing prospecto products:", e);
        return res.status(400).json({ error: "Invalid products data in prospecto" });
      }

      // Validate that products exist
      if (!products || products.length === 0) {
        return res.status(400).json({ error: "Cannot convert prospecto without products. Please add products to the prospecto first." });
      }

      // Convert tipo to proper capitalization to match sales system
      const salesTipo = tipo === "inmediata" ? "Inmediato" : "Reserva";

      // Prepare sales data - one sale per product
      const salesData = products.map((product: any) => ({
        nombre: prospecto.nombre,
        cedula: prospecto.cedula || null,
        telefono: prospecto.telefono,
        email: prospecto.email || null,
        totalOrdenUsd: parseFloat(prospecto.totalUsd || "0"),
        totalOrdenBs: null,
        producto: product.producto,
        sku: product.sku || null,
        cantidad: product.cantidad,
        montoProductoUsd: product.totalUsd,
        montoProductoBs: null,
        esObsequio: product.esObsequio || false,
        medidaEspecial: product.medidaEspecial || null,
        fechaEntrega: prospecto.fechaEntrega || null,
        direccionDespachoIgualFacturacion: prospecto.direccionDespachoIgualFacturacion === "true" ? "true" : "false",
        direccionDespachoPais: prospecto.direccionDespachoPais || null,
        direccionDespachoEstado: prospecto.direccionDespachoEstado || null,
        direccionDespachoCiudad: prospecto.direccionDespachoCiudad || null,
        direccionDespachoDireccion: prospecto.direccionDespachoDireccion || null,
        direccionDespachoUrbanizacion: prospecto.direccionDespachoUrbanizacion || null,
        direccionDespachoReferencia: prospecto.direccionDespachoReferencia || null,
        direccionFacturacionPais: prospecto.direccionFacturacionPais || null,
        direccionFacturacionEstado: prospecto.direccionFacturacionEstado || null,
        direccionFacturacionCiudad: prospecto.direccionFacturacionCiudad || null,
        direccionFacturacionDireccion: prospecto.direccionFacturacionDireccion || null,
        direccionFacturacionUrbanizacion: prospecto.direccionFacturacionUrbanizacion || null,
        direccionFacturacionReferencia: prospecto.direccionFacturacionReferencia || null,
        canal: prospecto.canal || "Tienda",
        asesorId: prospecto.asesorId || null,
        tipo: salesTipo,
        notas: prospecto.notas || null,
        estadoEntrega: "Pendiente",
      }));

      // Create sales
      const createdSales = [];
      for (const saleData of salesData) {
        const sale = await storage.createSale(saleData as any);
        createdSales.push(sale);
      }

      // Mark prospecto as Convertido instead of deleting
      await storage.updateProspecto(prospectoId, { estadoProspecto: "Convertido" });

      res.json({ success: true, sales: createdSales });
    } catch (error) {
      console.error("Convert prospecto error:", error);
      res.status(500).json({ error: "Failed to convert prospecto" });
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
        startDate: query.startDate ? (() => {
          const [year, month, day] = query.startDate.split('-');
          return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        })() : undefined,
        endDate: query.endDate ? (() => {
          const [year, month, day] = query.endDate.split('-');
          return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        })() : undefined,
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
        startDate: query.startDate ? (() => {
          const [year, month, day] = query.startDate.split('-');
          return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        })() : undefined,
        endDate: query.endDate ? (() => {
          const [year, month, day] = query.endDate.split('-');
          return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        })() : undefined,
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
        referenciaInicial: body.referenciaInicial !== undefined ? body.referenciaInicial : existingSale.referenciaInicial,
        montoInicialBs: handleNumericField(body.montoInicialBs, existingSale.montoInicialBs),
        montoInicialUsd: handleNumericField(body.montoInicialUsd, existingSale.montoInicialUsd),
        pagoInicialUsd: handleNumericField(body.pagoInicialUsd, existingSale.pagoInicialUsd),
        metodoPagoId: body.metodoPagoId !== undefined ? body.metodoPagoId : existingSale.metodoPagoId,
        bancoReceptorInicial: body.bancoReceptorInicial !== undefined ? body.bancoReceptorInicial : existingSale.bancoReceptorInicial,
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
      
      // Manual sales stay "Pendiente" until balance = 0, then auto-update to "A despachar"
      // Only Cashea orders use "En Proceso" status
      res.json(updatedSale);
    } catch (error) {
      console.error("Error updating sale:", error);
      res.status(500).json({ error: "Failed to update sale" });
    }
  });

  // Removed: verify-payment endpoint no longer needed
  // Manual sales stay "Pendiente" until balance = 0, then auto-update to "A despachar"

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

  // Create manual sale (supports multiple products)
  app.post("/api/sales/manual", async (req, res) => {
    try {
      // Parse and validate the request body
      const body = req.body;
      
      // Validate required fields
      if (!body.canal || typeof body.canal !== 'string' || body.canal.trim() === '') {
        return res.status(400).json({ error: "Canal es requerido" });
      }
      
      // Normalize canal for consistent comparison
      const normalizedCanal = body.canal.trim().toLowerCase();
      
      // Generate order number with separate sequences for Manual and Tienda
      // Manual: 20000+ (20000, 20001, 20002...)
      // Tienda: 30000+ (30000, 30001, 30002...)
      // This prevents collisions and makes canal identification easy from order number
      const startingOrderNumber = normalizedCanal === 'tienda' ? 30000 : 20000;
      const maxOrderNumber = await storage.getMaxOrderNumberInRange(startingOrderNumber);
      const newOrderNumber = (maxOrderNumber + 1).toString();

      // Check if products array is provided for multi-product support
      const products = body.products && Array.isArray(body.products) && body.products.length > 0
        ? body.products
        : null;

      // Default asesor to Héctor if not provided (business rule for manual sales and conversions)
      let asesorId = body.asesorId || null;
      if (!asesorId) {
        const asesores = await storage.getAsesores();
        const hectorAsesor = asesores.find((a: any) => a.nombre === "Héctor");
        if (hectorAsesor) {
          asesorId = hectorAsesor.id;
        }
      }

      // Prepare base sale data shared by all products
      const baseSaleData = {
        // Customer information
        nombre: body.nombre,
        cedula: body.cedula || null,
        telefono: body.telefono || null,
        email: body.email || null,
        
        // Order information - totalUsd will be set per product, totalOrderUsd is the overall order total
        totalOrderUsd: body.totalUsd ? body.totalUsd.toString() : null, // Store the total order amount from main form
        fecha: body.fecha ? new Date(body.fecha) : new Date(),
        canal: body.canal,
        estadoEntrega: body.estadoEntrega || "Pendiente", // Manual sales start as Pendiente
        orden: newOrderNumber,
        
        // Payment fields
        estadoPagoInicial: body.estadoPagoInicial || "pendiente",
        pagoInicialUsd: (body.pagoInicialUsd !== undefined && body.pagoInicialUsd !== null) ? String(body.pagoInicialUsd) : null,
        factura: null,
        referenciaInicial: body.referenciaInicial || null,
        montoInicialBs: body.montoInicialBs || null,
        montoInicialUsd: body.montoInicialUsd || null,
        metodoPagoId: body.metodoPagoId || null,
        bancoReceptorInicial: body.bancoReceptorInicial || null,
        
        // Asesor field (defaults to Héctor if not provided)
        asesorId: asesorId,
        
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
        
        // Tipo and fecha de entrega
        tipo: body.tipo || 'Inmediato',
        fechaEntrega: body.fechaEntrega ? new Date(body.fechaEntrega) : undefined,
      };

      if (products) {
        // Multi-product mode: create one sale record per product with same order number
        const createdSales = [];
        for (const product of products) {
          const saleData = {
            ...baseSaleData,
            product: product.producto,
            sku: product.sku || null,
            cantidad: parseInt(product.cantidad) || 1,
            // Override totalUsd with product-specific amount
            totalUsd: String(product.totalUsd),
            // Product-specific obsequio flag
            esObsequio: product.esObsequio || false,
            // Product-specific medida especial
            medidaEspecial: product.hasMedidaEspecial && product.medidaEspecial && product.medidaEspecial.trim()
              ? product.medidaEspecial.trim()
              : null,
          };
          const newSale = await storage.createSale(saleData);
          createdSales.push(newSale);
        }
        res.status(201).json({ 
          success: true, 
          orden: newOrderNumber,
          salesCreated: createdSales.length,
          sales: createdSales 
        });
      } else {
        // Legacy single-product mode (backwards compatibility)
        const saleData = {
          ...baseSaleData,
          product: body.product,
          sku: body.sku || null,
          cantidad: parseInt(body.cantidad) || 1,
          totalUsd: body.totalUsd ? body.totalUsd.toString() : "0",
        };
        const newSale = await storage.createSale(saleData);
        res.status(201).json(newSale);
      }
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

  // Verify Cashea payments - only updates payment status to Verificado
  app.post('/api/admin/verify-cashea-payments', async (req, res) => {
    try {
      const { matches } = req.body;
      
      if (!Array.isArray(matches)) {
        return res.status(400).json({ error: 'Invalid matches data' });
      }

      let verifiedCount = 0;
      const ordersToCheck = new Set<string>();
      
      for (const match of matches) {
        if (match.confidence >= 80) {
          try {
            console.log(`🔄 Verifying payment:`, {
              paymentId: match.payment.paymentId,
              paymentType: match.payment.paymentType,
              orden: match.payment.orden,
              confidence: match.confidence
            });
            
            // Only update payment verification status to "Verificado"
            const updated = await storage.updatePaymentVerification({
              paymentId: match.payment.paymentId,
              paymentType: match.payment.paymentType,
              estadoVerificacion: 'Verificado'
            });
            
            if (updated) {
              console.log(`✅ Payment verification SUCCESS - database updated`);
              verifiedCount++;
              
              // Track order for Pendiente check
              if (match.payment?.orden) {
                ordersToCheck.add(match.payment.orden);
              }
            } else {
              console.log(`❌ Payment verification FAILED - 0 rows affected (paymentId doesn't exist or is composite)`);
            }
          } catch (error) {
            console.error(`❌ Error updating payment ${match.payment?.paymentId}:`, error);
          }
        }
      }
      
      // Check each order if Pendiente = 0 and auto-update Estado Entrega to "A despachar"
      for (const orden of Array.from(ordersToCheck)) {
        try {
          const salesInOrder = await storage.getSalesByOrderNumber(orden);
          
          if (salesInOrder.length > 0) {
            const firstSale = salesInOrder[0];
            const totalOrderUsd = Number(firstSale.totalOrderUsd || 0);
            const pagoFleteUsd = Number(firstSale.pagoFleteUsd || 0);
            const fleteGratis = firstSale.fleteGratis || false;
            const ordenPlusFlete = totalOrderUsd + (fleteGratis ? 0 : pagoFleteUsd);

            // Calculate total verified payments
            const pagoInicialVerificado = firstSale.estadoVerificacionInicial === 'Verificado' ? Number(firstSale.pagoInicialUsd || 0) : 0;
            const hasFletePayment = pagoFleteUsd > 0 && !fleteGratis;
            const fleteVerificado = hasFletePayment && firstSale.estadoVerificacionFlete === 'Verificado' ? Number(firstSale.pagoFleteUsd || 0) : 0;
            
            const installments = await storage.getInstallmentsByOrder(orden);
            const cuotasVerificadas = installments
              .filter(inst => inst.estadoVerificacion === 'Verificado')
              .reduce((sum, inst) => sum + Number(inst.montoCuotaUsd || inst.cuotaAmount || 0), 0);
            
            const totalPagado = pagoInicialVerificado + fleteVerificado + cuotasVerificadas;
            const saldoPendiente = ordenPlusFlete - totalPagado;

            // Only auto-update if Pendiente = 0 and current status is "Pendiente" or "En proceso"
            // Use case-insensitive comparison to handle "En proceso" vs "En Proceso" data inconsistencies
            const currentStatus = firstSale.estadoEntrega?.toLowerCase() || '';
            if (Math.abs(saldoPendiente) < 0.01 && (currentStatus === 'pendiente' || currentStatus === 'en proceso')) {
              const updatePromises = salesInOrder.map(sale => 
                storage.updateSaleDeliveryStatus(sale.id, 'A despachar')
              );
              await Promise.all(updatePromises);
              console.log(`✅ Auto-updated order ${orden} to "A despachar" (Pendiente = $${saldoPendiente.toFixed(2)})`);
            }
          }
        } catch (error) {
          console.error(`Error checking Pendiente for order ${orden}:`, error);
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
        message: `Successfully updated ${updatedCount} Cashea orders from A despachar to En proceso`
      });
    } catch (error) {
      console.error('Cashea status update error:', error);
      res.status(500).json({ 
        error: 'Failed to update Cashea orders',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Fix incorrect casing in estadoEntrega field
  app.post('/api/admin/fix-estado-casing', async (req, res) => {
    try {
      const result = await withRetry(async () => {
        const allSales = await db.select().from(sales);
        
        // Map of incorrect casing -> correct casing
        const casingMap: Record<string, string> = {
          'pendiente': 'Pendiente',
          'PENDIENTE': 'Pendiente',
          'perdida': 'Perdida',
          'PERDIDA': 'Perdida',
          'en proceso': 'En proceso',
          'En Proceso': 'En proceso',
          'EN PROCESO': 'En proceso',
          'a despachar': 'A despachar',
          'A Despachar': 'A despachar',
          'A DESPACHAR': 'A despachar',
          'en tránsito': 'En tránsito',
          'En Tránsito': 'En tránsito',
          'EN TRÁNSITO': 'En tránsito',
          'entregado': 'Entregado',
          'ENTREGADO': 'Entregado',
          'a devolver': 'A devolver',
          'A Devolver': 'A devolver',
          'A DEVOLVER': 'A devolver',
          'devuelto': 'Devuelto',
          'DEVUELTO': 'Devuelto',
          'cancelada': 'Cancelada',
          'CANCELADA': 'Cancelada'
        };
        
        const updates: Array<{ id: string; orden: string; oldValue: string; newValue: string }> = [];
        
        for (const sale of allSales) {
          const currentStatus = sale.estadoEntrega || '';
          const correctStatus = casingMap[currentStatus];
          
          if (correctStatus && correctStatus !== currentStatus) {
            await db.update(sales)
              .set({ estadoEntrega: correctStatus })
              .where(eq(sales.id, sale.id));
            
            updates.push({
              id: sale.id,
              orden: sale.orden || 'N/A',
              oldValue: currentStatus,
              newValue: correctStatus
            });
          }
        }
        
        return updates;
      });
      
      console.log(`✅ Fixed ${result.length} records with incorrect estadoEntrega casing`);
      result.forEach(update => {
        console.log(`  - Order ${update.orden}: "${update.oldValue}" → "${update.newValue}"`);
      });
      
      res.json({
        fixed: result.length,
        updates: result,
        message: `Successfully fixed ${result.length} records with incorrect casing`
      });
    } catch (error) {
      console.error('Fix casing error:', error);
      res.status(500).json({ 
        error: 'Failed to fix status casing',
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

      // Get installments by orden (not saleId) to show all installments for the entire order
      const [installments, summary] = await Promise.all([
        sale.orden ? storage.getInstallmentsByOrder(sale.orden) : [],
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

      // Check for overpayment only if amount is provided and greater than 0
      const summary = await storage.getInstallmentSummary(saleId);
      const newAmount = parseFloat(validatedData.cuotaAmount || '0');

      if (newAmount > 0 && validatedData.verificado && (summary.totalPagado + newAmount > summary.totalOrderUsd)) {
        return res.status(400).json({ 
          error: "Payment would exceed total amount",
          details: {
            totalOrderUsd: summary.totalOrderUsd,
            currentPaid: summary.totalPagado,
            attemptedPayment: newAmount,
            wouldExceedBy: (summary.totalPagado + newAmount) - summary.totalOrderUsd
          }
        });
      }

      const installment = await storage.createInstallment(saleId, validatedData);
      
      // Manual sales stay "Pendiente" until balance = 0 (auto-update to "A despachar")
      // Only Cashea orders use "En Proceso" status
      
      // Check if Reserva order is now fully paid and verified - move to Lista de Ventas
      if (sale.tipo === "Reserva" && await storage.isPaymentFullyVerified(saleId)) {
        // Use proper delivery status update to handle freight initialization and business logic
        await storage.updateSaleDeliveryStatus(saleId, "A despachar");
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
      if (totalPaidWithUpdate > summary.totalOrderUsd) {
        return res.status(400).json({ 
          error: "Update would exceed total sale amount",
          details: {
            totalOrderUsd: summary.totalOrderUsd,
            currentTotalPaid: summary.totalPagado,
            currentInstallmentPaid: currentVerifiedAmount,
            newInstallmentAmount: newVerifiedAmount,
            wouldResultInTotalPaid: totalPaidWithUpdate,
            wouldExceedBy: totalPaidWithUpdate - summary.totalOrderUsd
          }
        });
      }

      const installment = await storage.updateInstallment(id, validatedData);
      if (!installment) {
        return res.status(404).json({ error: "Installment not found" });
      }
      
      // Manual sales stay "Pendiente" until balance = 0 (auto-update to "A despachar")
      // Only Cashea orders use "En Proceso" status
      
      // Check if Reserva order is now fully paid and verified - move to Lista de Ventas
      const sale = await storage.getSaleById(currentInstallment.saleId);
      if (sale && sale.tipo === "Reserva" && await storage.isPaymentFullyVerified(currentInstallment.saleId)) {
        // Use proper delivery status update to handle freight initialization and business logic
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

      if (!sale.orden) {
        return res.status(400).json({ error: "Sale must have an order number" });
      }

      // Get all sales in the order
      const orderSales = await storage.getSalesByOrderNumber(sale.orden);
      if (!orderSales || orderSales.length === 0) {
        return res.status(404).json({ error: "Order not found" });
      }

      // Check if email was already sent for any sale in this order
      const emailAlreadySent = orderSales.some(s => s.emailSentAt);
      if (emailAlreadySent) {
        return res.status(200).json({ 
          success: true, 
          message: "Email was already sent for this order",
          emailData: {
            to: sale.email,
            orderNumber: sale.orden,
            sentAt: orderSales.find(s => s.emailSentAt)?.emailSentAt?.toISOString(),
            alreadySent: true
          }
        });
      }

      // Build products array from all sales in the order
      const products = orderSales.map(s => ({
        name: s.product || 'Producto BoxiSleep',
        quantity: s.cantidad || 1
      }));

      // Build shipping address string if available
      let shippingAddress = undefined;
      if (sale.direccionDespachoDireccion) {
        const addressParts = [
          sale.direccionDespachoDireccion,
          sale.direccionDespachoUrbanizacion,
          sale.direccionDespachoCiudad,
          sale.direccionDespachoEstado,
          sale.direccionDespachoPais
        ].filter(Boolean);
        shippingAddress = addressParts.join(', ');
      }

      // Prepare email data
      const emailData: OrderEmailData = {
        customerName: sale.nombre,
        customerEmail: sale.email,
        orderNumber: sale.orden,
        products,
        totalOrderUsd: parseFloat(sale.totalOrderUsd?.toString() || '0'),
        fecha: sale.fecha.toISOString(),
        shippingAddress,
        montoInicialBs: sale.montoInicialBs?.toString(),
        montoInicialUsd: sale.montoInicialUsd?.toString(),
        referenciaInicial: sale.referenciaInicial || undefined
      };

      // Send the email
      await sendOrderConfirmationEmail(emailData);

      // Update all sales in the order with email sent timestamp
      const emailSentTimestamp = new Date();
      await storage.updateSalesByOrderNumber(sale.orden, {
        emailSentAt: emailSentTimestamp
      });

      res.json({ 
        success: true, 
        message: `Order confirmation email sent successfully to ${sale.email}`,
        emailData: {
          to: emailData.customerEmail,
          orderNumber: emailData.orderNumber,
          sentAt: emailSentTimestamp.toISOString()
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

  // POST /api/test-email - Send test email (TEMPORARY - for testing email structure)
  app.post("/api/test-email", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: "Email address is required" });
      }

      // Sample email data with multiple products
      const emailData: OrderEmailData = {
        customerName: "María Eugenia Labrador",
        customerEmail: email,
        orderNumber: "TEST-20001",
        products: [
          { name: "Colchón Matrimonial Premium", quantity: 1 },
          { name: "Almohada Viscoelástica", quantity: 2 },
          { name: "Base para Colchón", quantity: 1 }
        ],
        totalOrderUsd: 850.00,
        fecha: new Date().toISOString(),
        shippingAddress: "Av. Principal #123, Urbanización Los Pinos, Caracas, Miranda, Venezuela",
        montoInicialBs: "1800.00",
        montoInicialUsd: "50.00",
        referenciaInicial: "0123456789"
      };

      // Send the test email
      await sendOrderConfirmationEmail(emailData);

      res.json({ 
        success: true, 
        message: `Test email sent successfully to ${email}`,
        emailData: {
          to: email,
          orderNumber: emailData.orderNumber
        }
      });

    } catch (error) {
      console.error("Test email error:", error);
      res.status(500).json({ 
        error: "Failed to send test email", 
        details: error instanceof Error ? error.message : "Unknown error occurred" 
      });
    }
  });

  // ==================== REPORTS ====================
  
  // GET /api/reports/ordenes - Get Reporte de Ordenes data
  app.get("/api/reports/ordenes", async (req, res) => {
    try {
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;

      const reportData = await storage.getReporteOrdenes({ startDate, endDate });

      console.log(`📊 Report data count: ${reportData.length}`);

      // Transform data for frontend
      const transformedData = reportData.map(row => {
        const sale = row.sale;
        const installments = row.installments;

        // Use centralized Pendiente calculation from Pagos tab (saldoPendiente)
        // This ensures consistency between Pagos and Reporte de Ordenes
        const totalUsd = parseFloat(sale.totalUsd?.toString() || '0');
        const pagoInicialUsd = parseFloat(sale.pagoInicialUsd?.toString() || '0');
        const pagoFleteUsd = parseFloat(sale.pagoFleteUsd?.toString() || '0');

        return {
          orden: sale.orden,
          fecha: sale.fecha?.toISOString() || '',
          notas: sale.notas,
          fechaEntrega: sale.fechaEntrega?.toISOString() || null,
          estadoEntrega: sale.estadoEntrega,
          nombre: sale.nombre,
          telefono: sale.telefono,
          cedula: sale.cedula,
          email: sale.email,
          estado: sale.direccionDespachoEstado,
          ciudad: sale.direccionDespachoCiudad,
          direccion: sale.direccionDespachoDireccion,
          urbanizacion: sale.direccionDespachoUrbanizacion,
          referencia: sale.direccionDespachoReferencia,
          categoria: row.categoria,
          producto: sale.product,
          sku: sale.sku,
          cantidad: sale.cantidad,
          banco: row.bancoNombre,
          pagoInicialUsd: pagoInicialUsd,
          totalUsd: totalUsd,
          installments: installments.map(inst => ({
            installmentNumber: inst.installmentNumber,
            pagoCuotaUsd: parseFloat(inst.pagoCuotaUsd?.toString() || '0'),
          })),
          pendiente: row.saldoPendiente,
          canal: sale.canal,
          asesor: row.asesorNombre,
          flete: pagoFleteUsd,
          tipo: sale.tipo,
        };
      });

      res.json(transformedData);
    } catch (error) {
      console.error("Error fetching reporte de ordenes:", error);
      res.status(500).json({ error: "Failed to fetch report" });
    }
  });

  // GET /api/reports/ordenes/download - Download Reporte de Ordenes as Excel
  app.get("/api/reports/ordenes/download", async (req, res) => {
    try {
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;

      const reportData = await storage.getReporteOrdenes({ startDate, endDate });

      // Find max number of installments to create dynamic columns
      const maxInstallments = Math.max(
        ...reportData.map(row => row.installments.length),
        0
      );

      // Build headers array (allowing duplicate "Pago Cuota USD" columns)
      const headers = [
        'Orden', 'Fecha', 'Notas', 'Fecha Entrega', 'Estado Entrega', 'Nombre', 
        'Telefono', 'Cedula', 'Email', 'Estado', 'Ciudad', 'Dirección', 
        'Urbanización', 'Referencia', 'Categoria', 'Producto', 'SKU', 'Cantidad', 
        'Banco', 'Pago Inicial/Total USD', 'Total USD'
      ];
      
      // Add duplicate "Pago Cuota USD" headers for each installment
      for (let i = 0; i < maxInstallments; i++) {
        headers.push('Pago Cuota USD');
      }
      
      headers.push('Pendiente', 'Canal', 'Asesor', 'Flete', 'Tipo');

      // Build data rows
      const dataRows = reportData.map(row => {
        const sale = row.sale;
        const installments = row.installments;

        // Use centralized Pendiente calculation from Pagos tab (saldoPendiente)
        // This ensures consistency between Pagos and Reporte de Ordenes
        const totalUsd = parseFloat(sale.totalUsd?.toString() || '0');
        const pagoInicialUsd = parseFloat(sale.pagoInicialUsd?.toString() || '0');
        const pagoFleteUsd = parseFloat(sale.pagoFleteUsd?.toString() || '0');

        const rowData = [
          sale.orden || '',
          sale.fecha ? sale.fecha.toISOString().match(/(\d{4}-\d{2}-\d{2})/)?.[1] || '' : '',
          sale.notas || '',
          sale.fechaEntrega ? sale.fechaEntrega.toISOString().match(/(\d{4}-\d{2}-\d{2})/)?.[1] || '' : '',
          sale.estadoEntrega || '',
          sale.nombre || '',
          sale.telefono || '',
          sale.cedula || '',
          sale.email || '',
          sale.direccionDespachoEstado || '',
          sale.direccionDespachoCiudad || '',
          sale.direccionDespachoDireccion || '',
          sale.direccionDespachoUrbanizacion || '',
          sale.direccionDespachoReferencia || '',
          row.categoria || '',
          sale.product || '',
          sale.sku || '',
          sale.cantidad || '',
          row.bancoNombre || '',
          pagoInicialUsd || '',
          totalUsd || '',
        ];

        // Add installment values
        for (let i = 0; i < maxInstallments; i++) {
          const installment = installments.find(inst => inst.installmentNumber === i + 1);
          rowData.push(installment ? parseFloat(installment.pagoCuotaUsd?.toString() || '0') : '');
        }

        rowData.push(
          row.saldoPendiente,
          sale.canal || '',
          row.asesorNombre || '',
          pagoFleteUsd || '',
          sale.tipo || ''
        );

        return rowData;
      });

      // Combine headers and data rows
      const sheetData = [headers, ...dataRows];

      // Create workbook and worksheet using array-of-arrays to support duplicate headers
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(sheetData);

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, "Reporte de Ordenes");

      // Generate Excel file buffer
      const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      // Set response headers for file download
      const filename = `Reporte_Ordenes_${new Date().toISOString().split('T')[0]}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(excelBuffer);
    } catch (error) {
      console.error("Error downloading reporte de ordenes:", error);
      res.status(500).json({ error: "Failed to download report" });
    }
  });

  // GET /api/reports/perdidas - Get Reporte de Perdidas data
  app.get("/api/reports/perdidas", async (req, res) => {
    try {
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;

      const reportData = await storage.getReportePerdidas({ startDate, endDate });

      console.log(`📊 Perdidas report data count: ${reportData.length}`);

      // Transform data for frontend (same structure as ordenes report)
      const transformedData = reportData.map(row => {
        const sale = row.sale;
        const installments = row.installments;

        const totalUsd = parseFloat(sale.totalUsd?.toString() || '0');
        const pagoInicialUsd = parseFloat(sale.pagoInicialUsd?.toString() || '0');
        const pagoFleteUsd = parseFloat(sale.pagoFleteUsd?.toString() || '0');

        return {
          orden: sale.orden,
          fecha: sale.fecha?.toISOString() || '',
          notas: sale.notas,
          fechaEntrega: sale.fechaEntrega?.toISOString() || null,
          estadoEntrega: sale.estadoEntrega,
          nombre: sale.nombre,
          telefono: sale.telefono,
          cedula: sale.cedula,
          email: sale.email,
          estado: sale.direccionDespachoEstado,
          ciudad: sale.direccionDespachoCiudad,
          direccion: sale.direccionDespachoDireccion,
          urbanizacion: sale.direccionDespachoUrbanizacion,
          referencia: sale.direccionDespachoReferencia,
          categoria: row.categoria,
          producto: sale.product,
          sku: sale.sku,
          cantidad: sale.cantidad,
          banco: row.bancoNombre,
          pagoInicialUsd: pagoInicialUsd,
          totalUsd: totalUsd,
          installments: installments.map(inst => ({
            installmentNumber: inst.installmentNumber,
            pagoCuotaUsd: parseFloat(inst.pagoCuotaUsd?.toString() || '0'),
          })),
          pendiente: row.saldoPendiente,
          canal: sale.canal,
          asesor: row.asesorNombre,
          flete: pagoFleteUsd,
          tipo: sale.tipo,
        };
      });

      res.json(transformedData);
    } catch (error) {
      console.error("Error fetching reporte de perdidas:", error);
      res.status(500).json({ error: "Failed to fetch perdidas report" });
    }
  });

  // GET /api/reports/perdidas/download - Download Reporte de Perdidas as Excel
  app.get("/api/reports/perdidas/download", async (req, res) => {
    try {
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;

      const reportData = await storage.getReportePerdidas({ startDate, endDate });

      // Find max number of installments to create dynamic columns
      const maxInstallments = Math.max(
        ...reportData.map(row => row.installments.length),
        0
      );

      // Build headers array
      const headers = [
        'Orden', 'Fecha', 'Notas', 'Fecha Entrega', 'Estado Entrega', 'Nombre', 
        'Telefono', 'Cedula', 'Email', 'Estado', 'Ciudad', 'Dirección', 
        'Urbanización', 'Referencia', 'Categoria', 'Producto', 'SKU', 'Cantidad', 
        'Banco', 'Pago Inicial/Total USD', 'Total USD'
      ];
      
      for (let i = 0; i < maxInstallments; i++) {
        headers.push('Pago Cuota USD');
      }
      
      headers.push('Pendiente', 'Canal', 'Asesor', 'Flete', 'Tipo');

      // Build data rows
      const dataRows = reportData.map(row => {
        const sale = row.sale;
        const installments = row.installments;

        const totalUsd = parseFloat(sale.totalUsd?.toString() || '0');
        const pagoInicialUsd = parseFloat(sale.pagoInicialUsd?.toString() || '0');
        const pagoFleteUsd = parseFloat(sale.pagoFleteUsd?.toString() || '0');

        const rowData = [
          sale.orden || '',
          sale.fecha ? sale.fecha.toISOString().split('T')[0] : '',
          sale.notas || '',
          sale.fechaEntrega ? sale.fechaEntrega.toISOString().split('T')[0] : '',
          sale.estadoEntrega || '',
          sale.nombre || '',
          sale.telefono || '',
          sale.cedula || '',
          sale.email || '',
          sale.direccionDespachoEstado || '',
          sale.direccionDespachoCiudad || '',
          sale.direccionDespachoDireccion || '',
          sale.direccionDespachoUrbanizacion || '',
          sale.direccionDespachoReferencia || '',
          row.categoria || '',
          sale.product || '',
          sale.sku || '',
          sale.cantidad || '',
          row.bancoNombre || '',
          pagoInicialUsd || '',
          totalUsd || ''
        ];

        for (let i = 0; i < maxInstallments; i++) {
          const installment = installments.find(inst => inst.installmentNumber === i + 1);
          rowData.push(installment ? parseFloat(installment.pagoCuotaUsd?.toString() || '0') : '');
        }

        rowData.push(
          row.saldoPendiente,
          sale.canal || '',
          row.asesorNombre || '',
          pagoFleteUsd || '',
          sale.tipo || ''
        );

        return rowData;
      });

      // Combine headers and data rows
      const sheetData = [headers, ...dataRows];

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(sheetData);
      XLSX.utils.book_append_sheet(wb, ws, "Ordenes Perdidas");

      // Generate Excel file buffer
      const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      // Set response headers for file download
      const filename = `Ordenes_Perdidas_${new Date().toISOString().split('T')[0]}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(excelBuffer);
    } catch (error) {
      console.error("Error downloading reporte de perdidas:", error);
      res.status(500).json({ error: "Failed to download perdidas report" });
    }
  });

  // GET /api/reports/prospectos-perdidos - Get Reporte de Prospectos Perdidos data
  app.get("/api/reports/prospectos-perdidos", async (req, res) => {
    try {
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;

      const reportData = await storage.getReporteProspectosPerdidos({ startDate, endDate });

      console.log(`📊 Prospectos Perdidos report data count: ${reportData.length}`);

      // Helper function to format dates as YYYY-MM-DD without timezone shifting
      const formatDateOnly = (date: Date | null | undefined): string => {
        if (!date) return '';
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      // Transform data for frontend
      const transformedData = reportData.map(row => {
        const prospecto = row.prospecto;

        return {
          prospecto: prospecto.prospecto,
          nombre: prospecto.nombre,
          telefono: prospecto.telefono,
          email: prospecto.email,
          cedula: prospecto.cedula,
          canal: prospecto.canal,
          asesor: row.asesorNombre,
          fechaCreacion: formatDateOnly(prospecto.fechaCreacion),
          totalUsd: prospecto.totalUsd,
          notas: prospecto.notas,
          fechaSeguimiento1: prospecto.fechaSeguimiento1 || null,
          respuestaSeguimiento1: prospecto.respuestaSeguimiento1,
          fechaSeguimiento2: prospecto.fechaSeguimiento2 || null,
          respuestaSeguimiento2: prospecto.respuestaSeguimiento2,
          fechaSeguimiento3: prospecto.fechaSeguimiento3 || null,
          respuestaSeguimiento3: prospecto.respuestaSeguimiento3,
        };
      });

      res.json(transformedData);
    } catch (error) {
      console.error("Error fetching reporte de prospectos perdidos:", error);
      res.status(500).json({ error: "Failed to fetch prospectos perdidos report" });
    }
  });

  // GET /api/reports/prospectos-perdidos/download - Download Reporte de Prospectos Perdidos as Excel
  app.get("/api/reports/prospectos-perdidos/download", async (req, res) => {
    try {
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;

      const reportData = await storage.getReporteProspectosPerdidos({ startDate, endDate });

      // Helper function to format dates as YYYY-MM-DD without timezone shifting
      const formatDateOnly = (date: Date | null | undefined): string => {
        if (!date) return '';
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      // Build headers array
      const headers = [
        'Prospecto', 'Nombre', 'Teléfono', 'Email', 'Cédula', 'Canal', 'Asesor',
        'Fecha Creación', 'Total USD', 'Notas',
        'Fecha Seguimiento 1', 'Respuesta Seguimiento 1',
        'Fecha Seguimiento 2', 'Respuesta Seguimiento 2',
        'Fecha Seguimiento 3', 'Respuesta Seguimiento 3'
      ];

      // Build data rows
      const dataRows = reportData.map(row => {
        const prospecto = row.prospecto;

        return [
          prospecto.prospecto || '',
          prospecto.nombre || '',
          prospecto.telefono || '',
          prospecto.email || '',
          prospecto.cedula || '',
          prospecto.canal || '',
          row.asesorNombre || '',
          formatDateOnly(prospecto.fechaCreacion),
          prospecto.totalUsd || '',
          prospecto.notas || '',
          prospecto.fechaSeguimiento1 || '',
          prospecto.respuestaSeguimiento1 || '',
          prospecto.fechaSeguimiento2 || '',
          prospecto.respuestaSeguimiento2 || '',
          prospecto.fechaSeguimiento3 || '',
          prospecto.respuestaSeguimiento3 || ''
        ];
      });

      // Combine headers and data rows
      const sheetData = [headers, ...dataRows];

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(sheetData);
      XLSX.utils.book_append_sheet(wb, ws, "Prospectos Perdidos");

      // Generate Excel file buffer
      const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      // Set response headers for file download
      const filename = `Prospectos_Perdidos_${new Date().toISOString().split('T')[0]}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(excelBuffer);
    } catch (error) {
      console.error("Error downloading reporte de prospectos perdidos:", error);
      res.status(500).json({ error: "Failed to download prospectos perdidos report" });
    }
  });

  // GET /api/uat-protocol/download - Download UAT Protocol Excel with test cases
  app.get("/api/uat-protocol/download", async (req, res) => {
    try {
      // Define UAT test cases organized by module
      const testCases = [
        // SALES MANAGEMENT - Lista de Ventas
        { id: 'V-001', module: 'Ventas - Lista de Ventas', testCase: 'Verify all sales records display correctly with complete information', steps: '1. Navigate to Lista de Ventas\n2. Review displayed records', expectedResult: 'All sales show: Order #, Customer info, Products, Delivery status, Payment info', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
        { id: 'V-002', module: 'Ventas - Lista de Ventas', testCase: 'Test date range filtering', steps: '1. Select start and end dates\n2. Apply filter', expectedResult: 'Only sales within selected date range appear', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
        { id: 'V-003', module: 'Ventas - Lista de Ventas', testCase: 'Test search functionality by order number', steps: '1. Enter order number in search\n2. Press Enter', expectedResult: 'Only matching order(s) display', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
        { id: 'V-004', module: 'Ventas - Lista de Ventas', testCase: 'Test channel filter (Cashea, Shopify, Treble, Manual)', steps: '1. Select channel from dropdown\n2. Apply filter', expectedResult: 'Only sales from selected channel appear', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
        { id: 'V-005', module: 'Ventas - Lista de Ventas', testCase: 'Test export to Excel', steps: '1. Apply filters as needed\n2. Click Export Excel button', expectedResult: 'Excel file downloads with filtered data', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
        { id: 'V-006', module: 'Ventas - Lista de Ventas', testCase: 'Test "Cancelar" action on individual sale', steps: '1. Click actions menu on a sale\n2. Select Cancelar\n3. Confirm action', expectedResult: 'Sale marked as Cancelada, removed from active lists', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
        { id: 'V-007', module: 'Ventas - Lista de Ventas', testCase: 'Test "A devolver" action on individual sale', steps: '1. Click actions menu on a sale\n2. Select A devolver\n3. Confirm action', expectedResult: 'Sale moved to Devoluciones tab', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
        
        // SALES MANAGEMENT - Ventas por Completar
        { id: 'V-010', module: 'Ventas - Ventas por Completar', testCase: 'Verify only incomplete sales display', steps: '1. Navigate to Ventas por Completar tab', expectedResult: 'Only sales with pending payments or incomplete delivery appear', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
        { id: 'V-011', module: 'Ventas - Ventas por Completar', testCase: 'Test asesor filter', steps: '1. Select asesor from dropdown\n2. Apply filter', expectedResult: 'Only sales assigned to selected asesor appear', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
        { id: 'V-012', module: 'Ventas - Ventas por Completar', testCase: 'Test delivery status filter', steps: '1. Select Estado Entrega from dropdown\n2. Apply filter', expectedResult: 'Only sales with selected delivery status appear', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
        
        // SALES MANAGEMENT - Reservas
        { id: 'V-020', module: 'Ventas - Reservas', testCase: 'Verify only reservations display', steps: '1. Navigate to Reservas tab', expectedResult: 'Only sales marked as Tipo: Reserva appear', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
        { id: 'V-021', module: 'Ventas - Reservas', testCase: 'Test conversion of reservation to regular sale', steps: '1. Edit reservation\n2. Change Tipo to Venta\n3. Save', expectedResult: 'Sale moves to appropriate tab based on payment/delivery status', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
        
        // SALES MANAGEMENT - Pagos
        { id: 'V-030', module: 'Ventas - Pagos', testCase: 'Verify payment summary displays correctly', steps: '1. Navigate to Pagos tab', expectedResult: 'All orders show: Orden, Total Pagado, Total Verificado, Pendiente columns', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
        { id: 'V-031', module: 'Ventas - Pagos', testCase: 'Test "Orden" column calculation (totalOrderUsd)', steps: '1. Review Orden column values', expectedResult: 'Values match sum of product totals per order', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
        { id: 'V-032', module: 'Ventas - Pagos', testCase: 'Test "Flete" column calculation (pagoFleteUsd)', steps: '1. Review Flete column values', expectedResult: 'Values match freight payment amounts', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
        { id: 'V-033', module: 'Ventas - Pagos', testCase: 'Test "Total Pagado" calculation', steps: '1. Review Total Pagado values', expectedResult: 'Equals sum of pagoInicialUsd + pagoFleteUsd + all pagoCuotaUsd', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
        { id: 'V-034', module: 'Ventas - Pagos', testCase: 'Test "Total Verificado" calculation', steps: '1. Review Total Verificado values', expectedResult: 'Equals sum of all verified payment amounts', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
        { id: 'V-035', module: 'Ventas - Pagos', testCase: 'Test "Pendiente" calculation', steps: '1. Review Pendiente values', expectedResult: 'Equals Total Pagado - Total Verificado', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
        { id: 'V-036', module: 'Ventas - Pagos', testCase: 'Test "Perdida" action on order', steps: '1. Click actions menu on order\n2. Select Perdida\n3. Confirm', expectedResult: 'All sales in order marked as Perdida, removed from active tabs', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
        { id: 'V-037', module: 'Ventas - Pagos', testCase: 'Test automatic estado entrega change when balance = 0', steps: '1. Add payments until Pendiente = 0\n2. Verify status change', expectedResult: 'Estado Entrega automatically changes to "A despachar"', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
        
        // DATA UPLOAD - Cashea
        { id: 'U-001', module: 'Data Upload - Cashea', testCase: 'Upload Cashea Excel file', steps: '1. Click settings icon\n2. Select Cashea\n3. Upload Excel file\n4. Click Upload', expectedResult: 'File processes successfully, records added/updated, backup created', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
        { id: 'U-002', module: 'Data Upload - Cashea', testCase: 'Test duplicate handling (same order number)', steps: '1. Upload file with existing orders\n2. Review results', expectedResult: 'Duplicates ignored, summary shows duplicatesIgnored count', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
        { id: 'U-003', module: 'Data Upload - Cashea', testCase: 'Test Cashea-specific defaults', steps: '1. Upload Cashea file\n2. Check new records', expectedResult: 'Banco Receptor = "Cashea (BNC compartido Bs)", Fecha Pago Inicial set', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
        { id: 'U-004', module: 'Data Upload - Cashea', testCase: 'Test backup creation', steps: '1. Upload file\n2. Check backup in upload history', expectedResult: 'Pre-upload backup created with timestamp', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
        { id: 'U-005', module: 'Data Upload - Cashea', testCase: 'Test undo functionality', steps: '1. Upload file\n2. Click Undo button\n3. Confirm', expectedResult: 'Database restored to pre-upload state', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
        
        // DATA UPLOAD - Shopify
        { id: 'U-010', module: 'Data Upload - Shopify', testCase: 'Upload Shopify CSV file', steps: '1. Click settings icon\n2. Select Shopify\n3. Upload CSV file\n4. Click Upload', expectedResult: 'File processes successfully, multi-product orders handled correctly', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
        { id: 'U-011', module: 'Data Upload - Shopify', testCase: 'Test multi-product order grouping', steps: '1. Upload Shopify file with multi-product orders\n2. Review results', expectedResult: 'Products grouped under same order number, asesor propagated', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
        
        // DATA UPLOAD - Treble  
        { id: 'U-020', module: 'Data Upload - Treble', testCase: 'Upload Treble Excel file', steps: '1. Click settings icon\n2. Select Treble\n3. Upload Excel file\n4. Click Upload', expectedResult: 'File processes successfully, records created', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
        
        // DATA UPLOAD - Manual
        { id: 'U-030', module: 'Data Upload - Manual', testCase: 'Create manual sale with single product', steps: '1. Click Nueva Venta Manual\n2. Fill all required fields\n3. Submit', expectedResult: 'Manual sale created successfully', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
        { id: 'U-031', module: 'Data Upload - Manual', testCase: 'Create manual sale with multiple products', steps: '1. Click Nueva Venta Manual\n2. Add multiple products\n3. Submit', expectedResult: 'All products created under same order, asesor propagated', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
        
        // AUTOMATION - Cashea
        { id: 'A-001', module: 'Automation - Cashea', testCase: 'Enable Cashea automation', steps: '1. Navigate to Administración\n2. Go to Automatización section\n3. Toggle Cashea automation ON\n4. Set frequency', expectedResult: 'Automation enabled, schedule set', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
        { id: 'A-002', module: 'Automation - Cashea', testCase: 'Test scheduled Cashea download', steps: '1. Wait for scheduled time\n2. Check download history', expectedResult: 'Automatic download executes, records updated, history logged', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
        { id: 'A-003', module: 'Automation - Cashea', testCase: 'Test webhook trigger', steps: '1. Configure CASHEA_WEBHOOK_URL\n2. Trigger external webhook\n3. Check results', expectedResult: 'Webhook triggers download, new orders processed', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
        { id: 'A-004', module: 'Automation - Cashea', testCase: 'Disable Cashea automation', steps: '1. Toggle Cashea automation OFF', expectedResult: 'Scheduled downloads stop', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
        
        // VERIFICATION - Ingresos
        { id: 'VF-001', module: 'Verificación - Ingresos', testCase: 'View all pending income verifications', steps: '1. Navigate to Verificación > Ingresos', expectedResult: 'All unverified income payments display', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
        { id: 'VF-002', module: 'Verificación - Ingresos', testCase: 'Match payment with bank statement', steps: '1. Enter Monto USD/Bs matching bank statement\n2. Mark as Verificado\n3. Save', expectedResult: 'Payment verified, moves to verified list', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
        { id: 'VF-003', module: 'Verificación - Ingresos', testCase: 'Filter by verification status', steps: '1. Select status filter (Pendiente/Verificado/Rechazado)\n2. Apply', expectedResult: 'Only payments with selected status appear', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
        { id: 'VF-004', module: 'Verificación - Ingresos', testCase: 'Test payment rejection', steps: '1. Select payment\n2. Mark as Rechazado\n3. Add note\n4. Save', expectedResult: 'Payment marked rejected with note', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
        
        // VERIFICATION - Egresos
        { id: 'VF-010', module: 'Verificación - Egresos', testCase: 'View pending expense verifications', steps: '1. Navigate to Verificación > Egresos', expectedResult: 'All unverified expenses display', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
        { id: 'VF-011', module: 'Verificación - Egresos', testCase: 'Verify expense against bank statement', steps: '1. Enter Monto USD/Bs\n2. Mark as Verificado\n3. Save', expectedResult: 'Expense verified successfully', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
        
        // VERIFICATION - Cashea Pago Inicial
        { id: 'VF-020', module: 'Verificación - Cashea Pago Inicial', testCase: 'View Cashea initial payments', steps: '1. Navigate to Verificación > Cashea Pago Inicial', expectedResult: 'All Cashea initial payments display', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
        { id: 'VF-021', module: 'Verificación - Cashea Pago Inicial', testCase: 'Verify Cashea initial payment', steps: '1. Enter Monto USD/Bs\n2. Mark as Verificado\n3. Save', expectedResult: 'Cashea payment verified', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
        
        // DESPACHOS
        { id: 'D-001', module: 'Despachos', testCase: 'View all orders ready for dispatch', steps: '1. Navigate to Despachos', expectedResult: 'All orders with Estado Entrega = "A despachar" appear', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
        { id: 'D-002', module: 'Despachos', testCase: 'Update delivery status', steps: '1. Select order\n2. Change Estado Entrega\n3. Save', expectedResult: 'Status updated successfully', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
        { id: 'D-003', module: 'Despachos', testCase: 'Assign transportista', steps: '1. Select order\n2. Choose transportista\n3. Save', expectedResult: 'Transportista assigned to order', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
        { id: 'D-004', module: 'Despachos', testCase: 'Test estado entrega progression (Manual/Shopify)', steps: '1. Check initial status = "Pendiente"\n2. Change to "A despachar"', expectedResult: 'Status changes correctly through workflow', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
        { id: 'D-005', module: 'Despachos', testCase: 'Test estado entrega progression (Cashea)', steps: '1. Check initial status = "En proceso"\n2. Change to "A despachar"', expectedResult: 'Cashea orders follow correct workflow', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
        
        // DEVOLUCIONES
        { id: 'DV-001', module: 'Devoluciones', testCase: 'View all returns', steps: '1. Navigate to Devoluciones', expectedResult: 'All sales marked "A devolver" or "Devuelto" appear', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
        { id: 'DV-002', module: 'Devoluciones', testCase: 'Process return (mark as Devuelto)', steps: '1. Select return\n2. Click Estado Entrega dropdown\n3. Select "Devuelto"\n4. Confirm in dialog', expectedResult: 'Confirmation dialog appears, status changes to Devuelto', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
        { id: 'DV-003', module: 'Devoluciones', testCase: 'Test return confirmation dialog', steps: '1. Change status to Devuelto\n2. Review dialog message', expectedResult: 'Dialog confirms return process was completed successfully', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
        
        // REPORTES
        { id: 'R-001', module: 'Reportes - Reporte de Ordenes', testCase: 'View report without filters', steps: '1. Navigate to Reportes\n2. View Reporte de Ordenes', expectedResult: 'All sales display with complete information', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
        { id: 'R-002', module: 'Reportes - Reporte de Ordenes', testCase: 'Test date range filter', steps: '1. Select start date\n2. Select end date\n3. View results', expectedResult: 'Only sales within date range appear', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
        { id: 'R-003', module: 'Reportes - Reporte de Ordenes', testCase: 'Test sticky table headers', steps: '1. Scroll down through report\n2. Observe headers', expectedResult: 'Column headers remain visible while scrolling', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
        { id: 'R-004', module: 'Reportes - Reporte de Ordenes', testCase: 'Test horizontal scrolling', steps: '1. Scroll right to view all columns', expectedResult: 'Horizontal scrollbar appears, all columns accessible', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
        { id: 'R-005', module: 'Reportes - Reporte de Ordenes', testCase: 'Test vertical scrolling', steps: '1. Scroll down through records', expectedResult: 'Vertical scrollbar appears, all records accessible', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
        { id: 'R-006', module: 'Reportes - Reporte de Ordenes', testCase: 'Download Excel report', steps: '1. Apply filters as needed\n2. Click Descargar Excel', expectedResult: 'Excel file downloads with all columns including dynamic installments', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
        { id: 'R-007', module: 'Reportes - Reporte de Ordenes', testCase: 'Verify Pendiente calculation in report', steps: '1. View report\n2. Check Pendiente values', expectedResult: 'Pendiente = Total USD - Pago Inicial USD - Pago Flete USD - Sum(Pago Cuota USD)', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
        
        // ADMINISTRACION - Asesores
        { id: 'AD-001', module: 'Administración - Asesores', testCase: 'Create new asesor', steps: '1. Navigate to Administración\n2. Click Nuevo Asesor\n3. Fill form\n4. Submit', expectedResult: 'Asesor created successfully', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
        { id: 'AD-002', module: 'Administración - Asesores', testCase: 'Edit existing asesor', steps: '1. Select asesor\n2. Click edit\n3. Update info\n4. Save', expectedResult: 'Asesor updated successfully', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
        { id: 'AD-003', module: 'Administración - Asesores', testCase: 'Delete asesor', steps: '1. Select asesor\n2. Click delete\n3. Confirm', expectedResult: 'Asesor deleted successfully', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
        
        // ADMINISTRACION - Transportistas
        { id: 'AD-010', module: 'Administración - Transportistas', testCase: 'Create new transportista', steps: '1. Navigate to Administración\n2. Click Nuevo Transportista\n3. Fill form\n4. Submit', expectedResult: 'Transportista created successfully', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
        { id: 'AD-011', module: 'Administración - Transportistas', testCase: 'Edit transportista', steps: '1. Select transportista\n2. Edit details\n3. Save', expectedResult: 'Transportista updated successfully', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
        { id: 'AD-012', module: 'Administración - Transportistas', testCase: 'Delete transportista', steps: '1. Select transportista\n2. Delete\n3. Confirm', expectedResult: 'Transportista deleted successfully', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
        
        // EDGE CASES & ERROR HANDLING
        { id: 'E-001', module: 'Edge Cases', testCase: 'Test upload with invalid file format', steps: '1. Try to upload .txt or .pdf file', expectedResult: 'Error message: Only Excel/CSV files allowed', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
        { id: 'E-002', module: 'Edge Cases', testCase: 'Test upload with empty file', steps: '1. Upload empty Excel file', expectedResult: 'Error message or handles gracefully', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
        { id: 'E-003', module: 'Edge Cases', testCase: 'Test upload with missing required columns', steps: '1. Upload file missing required fields', expectedResult: 'Clear error message indicating missing columns', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
        { id: 'E-004', module: 'Edge Cases', testCase: 'Test form submission with missing required fields', steps: '1. Try to submit form without required data', expectedResult: 'Validation errors display, form does not submit', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
        { id: 'E-005', module: 'Edge Cases', testCase: 'Test concurrent uploads', steps: '1. Upload two files simultaneously', expectedResult: 'Both process correctly or queue properly', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
        { id: 'E-006', module: 'Edge Cases', testCase: 'Test very large file upload (500+ records)', steps: '1. Upload large Excel file', expectedResult: 'Processes successfully or shows progress indicator', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
        { id: 'E-007', module: 'Edge Cases', testCase: 'Test browser refresh during operation', steps: '1. Start upload/operation\n2. Refresh browser', expectedResult: 'No data corruption, clear state recovery', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
        { id: 'E-008', module: 'Edge Cases', testCase: 'Test special characters in text fields', steps: '1. Enter special characters (é, ñ, ü, etc.)\n2. Save', expectedResult: 'Characters display and save correctly', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
        { id: 'E-009', module: 'Edge Cases', testCase: 'Test negative numbers in payment fields', steps: '1. Try to enter negative payment amount', expectedResult: 'Validation prevents or handles appropriately', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
        { id: 'E-010', module: 'Edge Cases', testCase: 'Test session timeout', steps: '1. Leave app idle for extended period\n2. Try to perform action', expectedResult: 'Redirects to login or shows session expired message', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
      ];

      // Create workbook
      const wb = XLSX.utils.book_new();

      // Create main test cases sheet
      const headers = [
        'Test ID',
        'Module/Feature', 
        'Test Case Description',
        'Steps to Execute',
        'Expected Result',
        'Status (☐=Not Done, ☑=Pass, ☒=Fail)',
        'Actual Result',
        'Tester Name',
        'Date Completed'
      ];

      const rows = testCases.map(tc => [
        tc.id,
        tc.module,
        tc.testCase,
        tc.steps,
        tc.expectedResult,
        tc.status,
        tc.actualResult,
        tc.testerName,
        tc.dateCompleted
      ]);

      const sheetData = [headers, ...rows];
      const ws = XLSX.utils.aoa_to_sheet(sheetData);

      // Set column widths
      ws['!cols'] = [
        { wch: 10 },  // Test ID
        { wch: 35 },  // Module
        { wch: 50 },  // Test Case
        { wch: 60 },  // Steps
        { wch: 50 },  // Expected Result
        { wch: 35 },  // Status
        { wch: 40 },  // Actual Result
        { wch: 20 },  // Tester Name
        { wch: 15 },  // Date
      ];

      XLSX.utils.book_append_sheet(wb, ws, "UAT Test Cases");

      // Create summary/instructions sheet
      const instructionsData = [
        ['BoxiSleep - User Acceptance Testing (UAT) Protocol'],
        [''],
        ['INSTRUCTIONS:'],
        ['1. Review each test case in the "UAT Test Cases" sheet'],
        ['2. Follow the "Steps to Execute" column exactly as written'],
        ['3. Compare actual results with "Expected Result" column'],
        ['4. Update "Status" column:'],
        ['   - ☐ = Not yet tested'],
        ['   - ☑ = Test passed'],
        ['   - ☒ = Test failed'],
        ['5. Record any differences in "Actual Result" column'],
        ['6. Enter your name in "Tester Name" column'],
        ['7. Enter completion date in "Date Completed" column'],
        [''],
        ['TEST ENVIRONMENT:'],
        ['- URL: [Your test environment URL]'],
        ['- Test User Credentials: [To be provided]'],
        ['- Test Data: Use provided sample files'],
        [''],
        ['MODULES COVERED:'],
        ['✓ Sales Management (Lista de Ventas, Ventas por Completar, Reservas, Pagos)'],
        ['✓ Data Upload (Cashea, Shopify, Treble, Manual)'],
        ['✓ Automation (Cashea scheduled downloads, webhooks)'],
        ['✓ Verification (Ingresos, Egresos, Cashea Pago Inicial)'],
        ['✓ Despachos (Delivery management)'],
        ['✓ Devoluciones (Returns management)'],
        ['✓ Reportes (Reporte de Ordenes)'],
        ['✓ Administración (Asesores, Transportistas)'],
        ['✓ Edge Cases & Error Handling'],
        [''],
        ['SIGN-OFF:'],
        [''],
        ['Test Lead: __________________ Date: __________'],
        [''],
        ['Product Owner: __________________ Date: __________'],
        [''],
        ['Notes:'],
        [''],
      ];

      const wsInstructions = XLSX.utils.aoa_to_sheet(instructionsData);
      wsInstructions['!cols'] = [{ wch: 80 }];
      XLSX.utils.book_append_sheet(wb, wsInstructions, "Instructions");

      // Create summary tracker sheet
      const summaryData = [
        ['UAT SUMMARY TRACKER'],
        [''],
        ['Module', 'Total Tests', 'Passed', 'Failed', 'Not Tested', '% Complete'],
        ['Ventas - Lista de Ventas', '7', '', '', '', ''],
        ['Ventas - Ventas por Completar', '3', '', '', '', ''],
        ['Ventas - Reservas', '2', '', '', '', ''],
        ['Ventas - Pagos', '8', '', '', '', ''],
        ['Data Upload - Cashea', '5', '', '', '', ''],
        ['Data Upload - Shopify', '2', '', '', '', ''],
        ['Data Upload - Treble', '1', '', '', '', ''],
        ['Data Upload - Manual', '2', '', '', '', ''],
        ['Automation - Cashea', '4', '', '', '', ''],
        ['Verificación - Ingresos', '4', '', '', '', ''],
        ['Verificación - Egresos', '2', '', '', '', ''],
        ['Verificación - Cashea Pago Inicial', '2', '', '', '', ''],
        ['Despachos', '5', '', '', '', ''],
        ['Devoluciones', '3', '', '', '', ''],
        ['Reportes - Reporte de Ordenes', '7', '', '', '', ''],
        ['Administración - Asesores', '3', '', '', '', ''],
        ['Administración - Transportistas', '3', '', '', '', ''],
        ['Edge Cases', '10', '', '', '', ''],
        [''],
        ['TOTAL', '73', '', '', '', ''],
      ];

      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
      wsSummary['!cols'] = [
        { wch: 40 },
        { wch: 12 },
        { wch: 10 },
        { wch: 10 },
        { wch: 12 },
        { wch: 12 }
      ];
      XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

      // Generate Excel file
      const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      // Send file
      const filename = `BoxiSleep_UAT_Protocol_${new Date().toISOString().split('T')[0]}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(excelBuffer);
    } catch (error) {
      console.error("Error generating UAT protocol:", error);
      res.status(500).json({ error: "Failed to generate UAT protocol" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
