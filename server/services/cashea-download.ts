import { z } from "zod";
import { insertSaleSchema } from "@shared/schema";
import type { IStorage } from "../storage";
import fetch from "node-fetch";

export interface CasheaDownloadResult {
  success: boolean;
  newSales: any[];
  duplicatesIgnored: number;
  errors: Array<{ row: number; error: any }>;
  recordsProcessed: number;
  message: string;
}

async function callCasheaApi(startDate: string, endDate: string): Promise<any[]> {
  const casheaEmail = process.env.CASHEA_EMAIL;
  const casheaPassword = process.env.CASHEA_PASSWORD;

  if (!casheaEmail || !casheaPassword) {
    throw new Error("CASHEA credentials not configured");
  }

  console.log(`🔍 CASHEA API Investigation for date range: ${startDate} to ${endDate}`);
  console.log(`📧 Using credentials: ${casheaEmail}`);

  // Handle both ISO timestamps and YYYY-MM-DD dates
  let startDateISO: string;
  let endDateISO: string;
  
  if (startDate.includes('T')) {
    // Already an ISO timestamp from scheduler
    startDateISO = startDate;
    endDateISO = endDate;
  } else {
    // Legacy YYYY-MM-DD format (manual downloads)
    // Start date: beginning of the day (4 AM UTC = midnight Venezuela time UTC-4)
    startDateISO = new Date(startDate + "T04:00:00.000Z").toISOString();
    // End date: add 24 hours to capture the full day
    const endDateObj = new Date(endDate + "T04:00:00.000Z");
    endDateObj.setDate(endDateObj.getDate() + 1);
    endDateISO = endDateObj.toISOString();
  }

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
  
  // Log the actual field names from the API to debug missing payment data
  if (data && typeof data === 'object' && 'queryData' in data && data.queryData && typeof data.queryData === 'object') {
    console.log(`🔍 Available fields in API response:`, Object.keys(data.queryData as Record<string, unknown>));
  }

  return [data];
}

function transformCasheaData(rawData: any[]): any[] {
  if (!Array.isArray(rawData) || rawData.length === 0) {
    return [];
  }
  
  const casheaEntry = rawData[0];
  
  if (!casheaEntry || !casheaEntry.__retoolWrappedQuery__ || !casheaEntry.queryData) {
    return rawData;
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
  const pagosIniciales = queryData['Pago inicial usd'] || queryData['Pago Inicial (USD)'] || [];
  const referencias = queryData['Referencia'] || queryData['# Referencia'] || [];
  const montosBs = queryData['Monto en bs'] || queryData['Monto en Bs'] || [];
  const estadosEntrega = queryData['Estado de Entrega'] || [];
  const productos = queryData.Product || [];
  const cantidades = queryData.Cantidad || [];
  
  const records: any[] = [];
  const maxLength = Math.max(
    ordenes.length, nombres.length, cedulas.length, telefonos.length,
    emails.length, totalesUSD.length, fechas.length, canales.length,
    pagosIniciales.length, referencias.length, montosBs.length,
    estadosEntrega.length, productos.length, cantidades.length
  );
  
  for (let i = 0; i < maxLength; i++) {
    let fecha = new Date();
    if (fechas[i]) {
      const fechaStr = String(fechas[i]);
      const dateOnly = fechaStr.includes('T') ? fechaStr.split('T')[0] : fechaStr;
      fecha = new Date(dateOnly + 'T00:00:00');
    }
    const totalUsdValue = String(totalesUSD[i] || '0');
    
    records.push({
      nombre: String(nombres[i] || 'Unknown Customer'),
      cedula: String(cedulas[i] || ''),
      telefono: telefonos[i] ? String(telefonos[i]) : null,
      email: emails[i] ? String(emails[i]) : null,
      totalUsd: totalUsdValue,
      totalOrderUsd: totalUsdValue,
      sucursal: null,
      tienda: null,
      fecha,
      canal: 'cashea',
      estadoEntrega: 'En proceso',
      orden: ordenes[i] ? String(ordenes[i]) : null,
      pagoInicialUsd: pagosIniciales[i] ? String(pagosIniciales[i]) : null,
      fechaPagoInicial: fecha,
      bancoReceptorInicial: 'd7bf28fc-a3f4-4e6d-ae09-c9cf6b67c1b8',
      montoInicialBs: montosBs[i] ? String(montosBs[i]) : null,
      montoInicialUsd: pagosIniciales[i] ? String(pagosIniciales[i]) : null,
      referenciaInicial: referencias[i] ? String(referencias[i]) : null,
      estadoPagoInicial: 'Por verificar',
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

async function sendCasheaOrderWebhook(newSales: any[]): Promise<void> {
  const webhookUrl = process.env.CASHEA_WEBHOOK_URL;
  
  if (!webhookUrl) {
    console.log('No Cashea webhook URL configured, skipping webhook notification');
    return;
  }

  // Filter to ensure only Cashea orders are sent
  const casheaOrders = newSales.filter(sale => sale.canal === 'cashea');
  
  if (casheaOrders.length === 0) {
    console.log('No Cashea orders to send to webhook');
    return;
  }

  console.log(`📤 Sending ${casheaOrders.length} Cashea orders to webhook via GET...`);

  try {
    // Send each order individually to the webhook with GET method
    for (let i = 0; i < casheaOrders.length; i++) {
      const sale = casheaOrders[i];
      
      // Build URL with query parameters
      const params = new URLSearchParams({
        Orden: sale.orden || '',
        nombre_cliente: sale.nombre || '',
        telefono: sale.telefono || '',
        producto: sale.product || ''
      });
      
      const fullUrl = `${webhookUrl}?${params.toString()}`;

      try {
        const response = await fetch(fullUrl, {
          method: 'GET'
        });

        if (!response.ok) {
          console.error(`Webhook failed for order ${sale.orden}: ${response.status} ${response.statusText}`);
        } else {
          console.log(`✅ Webhook sent for order ${sale.orden}`);
        }
      } catch (error) {
        console.error(`Error sending webhook for order ${sale.orden}:`, error);
        // Continue processing remaining orders even if one fails
      }

      // Add 500ms delay between calls (except after the last one)
      if (i < casheaOrders.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    console.log(`✅ All ${casheaOrders.length} Cashea order webhooks sent successfully`);
  } catch (error) {
    console.error('Error sending Cashea order webhook:', error);
    throw error;
  }
}

export async function performCasheaDownload(
  startDate: string, 
  endDate: string,
  storage: IStorage
): Promise<CasheaDownloadResult> {
  console.log(`📊 CASHEA download request: ${startDate} to ${endDate}`);

  try {
    const casheaData = await callCasheaApi(startDate, endDate);
    const transformedData = transformCasheaData(casheaData);
    
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

      return {
        success: false,
        newSales: [],
        duplicatesIgnored: 0,
        errors,
        recordsProcessed: 0,
        message: `Validation errors found in ${errors.length} rows`
      };
    }

    const orderNumbers = validatedSales.map(sale => sale.orden).filter(Boolean) as string[];
    const existingOrders = await storage.getExistingOrderNumbers(orderNumbers);
    
    const newSales = validatedSales.filter(sale => 
      !sale.orden || !existingOrders.includes(sale.orden)
    );
    
    const duplicatesCount = validatedSales.length - newSales.length;

    if (newSales.length > 0) {
      await storage.createSales(newSales);
    }

    await storage.createUploadHistory({
      filename: `cashea_download_${startDate}_to_${endDate}`,
      canal: 'cashea',
      recordsCount: newSales.length,
      status: 'success',
      errorMessage: duplicatesCount > 0 ? `${duplicatesCount} duplicate order(s) ignored` : undefined,
    });

    if (newSales.length > 0) {
      try {
        await sendCasheaOrderWebhook(newSales);
      } catch (webhookError) {
        console.error('Cashea webhook notification failed, but download was successful:', webhookError);
      }
    }

    console.log(`✅ Transformed ${transformedData.length} CASHEA records`);

    return {
      success: true,
      newSales,
      duplicatesIgnored: duplicatesCount,
      errors: [],
      recordsProcessed: newSales.length,
      message: duplicatesCount > 0 
        ? `Downloaded ${newSales.length} CASHEA records. ${duplicatesCount} duplicate order(s) were ignored.`
        : `Downloaded ${newSales.length} CASHEA records successfully`
    };

  } catch (error) {
    await storage.createUploadHistory({
      filename: `cashea_download_${startDate}_to_${endDate}`,
      canal: 'cashea',
      recordsCount: 0,
      status: 'error',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });

    throw error;
  }
}
