import { Client } from '@microsoft/microsoft-graph-client';
import nodemailer from 'nodemailer';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=outlook',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Outlook not connected');
  }
  return accessToken;
}

// WARNING: Never cache this client.
// Access tokens expire, so a new client must be created each time.
// Always call this function again to get a fresh client.
export async function getUncachableOutlookClient() {
  const accessToken = await getAccessToken();

  return Client.initWithMiddleware({
    authProvider: {
      getAccessToken: async () => accessToken
    }
  });
}

export interface OrderEmailData {
  customerName: string;
  customerEmail: string;
  orderNumber: string;
  products: Array<{ name: string; quantity: number }>;
  totalOrderUsd: number;
  fecha: string;
  canal: string;
  shippingAddress?: string;
  montoInicialBs?: string;
  montoInicialUsd?: string;
  referenciaInicial?: string;
}

export interface InternalAlertData {
  sku: string | null;
  productName: string;
  quantity: number;
  customerName: string;
  orderNumber: string | null;
  fechaCompromisoEntrega: string | null;
  medidaEspecial?: string | null;
  alertType: 'medida_especial' | 'base_cama' | 'bed';
}

export function generateOrderConfirmationHTML(data: OrderEmailData): string {
  const mompoxChannels = ['Cashea MP', 'ShopMom', 'Manual MP', 'Tienda MP'];
  const isMompox = mompoxChannels.includes(data.canal);
  
  // Brand colors: Mompox uses beige, BoxiSleep uses turquoise
  const brandColor = isMompox ? '#ece6d0' : '#1DB5A6';
  const textColor = isMompox ? '#333' : 'white';
  
  // Footer contact email based on brand
  const footerEmail = isMompox ? 'hola@sofamompox.com' : 'hola.vzla@boxisleep.com.co';
  
  return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Confirmación de Pedido</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background-color: ${brandColor};
            color: ${textColor};
            padding: ${isMompox ? '18px 20px 12px 20px' : '20px'};
            text-align: center;
            border-radius: 8px 8px 0 0;
        }
        .content {
            background-color: #f9f9f9;
            padding: 30px;
            border-radius: 0 0 8px 8px;
        }
        .order-details {
            background-color: white;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid ${brandColor};
        }
        .payment-details {
            background-color: white;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid ${brandColor};
        }
        .detail-row {
            display: flex;
            justify-content: space-between;
            margin: 10px 0;
            padding: 8px 0;
            border-bottom: 1px solid #eee;
        }
        .detail-label {
            font-weight: bold;
            color: #555;
        }
        .product-list {
            margin: 15px 0;
            padding-left: 0;
            list-style: none;
        }
        .product-item {
            padding: 8px 0;
            border-bottom: 1px solid #eee;
        }
        .total {
            background-color: ${brandColor};
            color: ${textColor};
            padding: 15px;
            border-radius: 8px;
            text-align: center;
            font-size: 18px;
            font-weight: bold;
            margin: 20px 0;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            color: #666;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1 style="color: ${textColor}; margin: ${isMompox ? '0' : '10px 0'};">Recepción de Información de Pago</h1>
    </div>
    
    ${isMompox ? `
    <div style="text-align: center; padding: 8px 0 12px 0; background-color: ${brandColor};">
        <img src="cid:boxisleeplogo" 
             alt="Mompox Logo" 
             style="display: block; width: 280px; max-width: 100%; height: auto; margin: 0 auto;" />
    </div>
    ` : `
    <div style="text-align: center; padding: 20px 0; background-color: white;">
        <img src="cid:boxisleeplogo" 
             alt="BoxiSleep Logo" 
             style="display: block; width: 280px; max-width: 100%; height: auto; margin: 0 auto;" />
    </div>
    `}
    
    <div class="content">
        <p>Estimado/a <strong>${data.customerName}</strong>,</p>
        
        <p>¡Gracias por tu pago! Hemos recibido la información enviada. Te mantendremos informado sobre el estado de tu compra.</p>
        
        <div class="order-details">
            <h3>📋 Detalles del Pedido</h3>
            
            <div class="detail-row">
                <span class="detail-label">Número de Orden:</span>
                <span>${data.orderNumber}</span>
            </div>
            
            <div class="detail-row">
                <span class="detail-label">Fecha:</span>
                <span>${new Date(data.fecha).toLocaleDateString('es-ES', { 
                    day: '2-digit', 
                    month: 'long', 
                    year: 'numeric' 
                })}</span>
            </div>
            
            <div style="margin: 15px 0;">
                <span class="detail-label" style="display: block; margin-bottom: 10px;">Productos:</span>
                <ul class="product-list">
                    ${data.products.map(p => `
                    <li class="product-item">• ${p.name} - Cantidad: ${p.quantity} unidad${p.quantity > 1 ? 'es' : ''}</li>
                    `).join('')}
                </ul>
            </div>
            
            ${data.shippingAddress ? `
            <div class="detail-row">
                <span class="detail-label">Dirección de Despacho:</span>
                <span>${data.shippingAddress}</span>
            </div>
            ` : ''}
        </div>
        
        ${(data.montoInicialBs || data.montoInicialUsd || data.referenciaInicial) ? `
        <div class="payment-details">
            <h3>💳 Información de Pago</h3>
            
            ${data.montoInicialBs ? `
            <div class="detail-row">
                <span class="detail-label">Monto Bs:</span>
                <span>${parseFloat(data.montoInicialBs).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs</span>
            </div>
            ` : ''}
            
            ${data.montoInicialUsd ? `
            <div class="detail-row">
                <span class="detail-label">Monto USD:</span>
                <span>$${parseFloat(data.montoInicialUsd).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</span>
            </div>
            ` : ''}
            
            ${data.referenciaInicial ? `
            <div class="detail-row">
                <span class="detail-label">Referencia:</span>
                <span>${data.referenciaInicial}</span>
            </div>
            ` : ''}
        </div>
        ` : ''}
        
        <div class="total">
            💰 Total del Pedido: $${data.totalOrderUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
        </div>
    </div>
    
    <div class="footer">
        <p>Si tienes alguna pregunta, responde este correo electrónico o contáctanos a través de ${footerEmail}</p>
    </div>
</body>
</html>
  `.trim();
}

// Send email via GoDaddy SMTP using nodemailer
async function sendEmailViaGodaddySMTP(orderData: OrderEmailData, emailContent: string, logoPath: string): Promise<boolean> {
  const godaddyEmail = process.env.GODADDY_EMAIL;
  const godaddyPassword = process.env.GODADDY_PASSWORD;
  
  if (!godaddyEmail || !godaddyPassword) {
    throw new Error('GoDaddy credentials not found in environment variables');
  }

  // Create transporter using GoDaddy SMTP settings
  const transporter = nodemailer.createTransport({
    host: 'smtpout.secureserver.net',
    port: 465,
    secure: true, // use SSL
    auth: {
      user: godaddyEmail,
      pass: godaddyPassword
    }
  });

  const fs = await import('fs');
  const logoBuffer = fs.readFileSync(logoPath);

  const mailOptions = {
    from: `"Mompox" <${godaddyEmail}>`,
    to: `"${orderData.customerName}" <${orderData.customerEmail}>`,
    subject: `Recepción de Información de Pago Orden #${orderData.orderNumber} - Mompox`,
    html: emailContent,
    attachments: [
      {
        filename: 'boxisleeplogo.jpg',
        content: logoBuffer,
        cid: 'boxisleeplogo' // same cid value as in the HTML img src
      }
    ]
  };

  await transporter.sendMail(mailOptions);
  console.log(`📧 Mompox order confirmation email sent via GoDaddy to ${orderData.customerEmail} for order ${orderData.orderNumber}`);
  return true;
}

// Send email via Outlook using Microsoft Graph API
async function sendEmailViaOutlook(orderData: OrderEmailData, emailContent: string, logoPath: string): Promise<boolean> {
  const client = await getUncachableOutlookClient();
  const fs = await import('fs');
  
  const logoBuffer = fs.readFileSync(logoPath);
  const logoBase64 = logoBuffer.toString('base64');
  
  const message = {
    subject: `Recepción de Información de Pago Orden #${orderData.orderNumber} - BoxiSleep`,
    body: {
      contentType: 'HTML',
      content: emailContent
    },
    toRecipients: [
      {
        emailAddress: {
          address: orderData.customerEmail,
          name: orderData.customerName
        }
      }
    ],
    attachments: [
      {
        '@odata.type': '#microsoft.graph.fileAttachment',
        name: 'boxisleeplogo.jpg',
        contentType: 'image/jpeg',
        contentBytes: logoBase64,
        contentId: 'boxisleeplogo',
        isInline: true
      }
    ]
  };

  await client.api('/me/sendMail').post({
    message: message
  });

  console.log(`📧 Boxi order confirmation email sent via Outlook to ${orderData.customerEmail} for order ${orderData.orderNumber}`);
  return true;
}

export async function sendOrderConfirmationEmail(orderData: OrderEmailData): Promise<boolean> {
  try {
    const path = await import('path');
    
    const emailContent = generateOrderConfirmationHTML(orderData);
    
    // Determine which logo to use and email service based on canal
    const mompoxChannels = ['Cashea MP', 'ShopMom', 'Manual MP', 'Tienda MP'];
    const isMompoxChannel = mompoxChannels.includes(orderData.canal);
    
    // Read appropriate logo file
    const logoFileName = isMompoxChannel 
      ? 'images_1761506222071.jpeg' 
      : 'BOXILOGO_1759265713831.jpg';
    const logoPath = path.join(process.cwd(), 'attached_assets', logoFileName);
    
    // Route to appropriate email service
    if (isMompoxChannel) {
      // Send via GoDaddy SMTP for Mompox orders
      await sendEmailViaGodaddySMTP(orderData, emailContent, logoPath);
    } else {
      // Send via Outlook for Boxi orders
      await sendEmailViaOutlook(orderData, emailContent, logoPath);
    }

    return true;
  } catch (error) {
    console.error('Error sending order confirmation email:', error);
    throw error;
  }
}

export function generateInternalAlertHTML(data: InternalAlertData): string {
  const brandColor = '#1DB5A6';
  
  return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Alerta Interna - Venta Especial</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background-color: ${brandColor};
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 8px 8px 0 0;
        }
        .content {
            background-color: #f9f9f9;
            padding: 30px;
            border-radius: 0 0 8px 8px;
        }
        .alert-details {
            background-color: white;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid ${brandColor};
        }
        .detail-row {
            display: flex;
            justify-content: space-between;
            margin: 10px 0;
            padding: 8px 0;
            border-bottom: 1px solid #eee;
        }
        .detail-label {
            font-weight: bold;
            color: #555;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            color: #666;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1 style="color: white; margin: 10px 0;">🔔 Alerta de Venta</h1>
    </div>
    
    <div class="content">
        <p>Se ha registrado una venta que requiere atención especial:</p>
        
        <div class="alert-details">
            <h3>📋 Detalles de la Venta</h3>
            
            <div class="detail-row">
                <span class="detail-label">Número de Orden:</span>
                <span>${data.orderNumber || 'N/A'}</span>
            </div>
            
            <div class="detail-row">
                <span class="detail-label">Cliente:</span>
                <span>${data.customerName}</span>
            </div>
            
            <div class="detail-row">
                <span class="detail-label">Producto:</span>
                <span>${data.productName}</span>
            </div>
            
            <div class="detail-row">
                <span class="detail-label">SKU:</span>
                <span>${data.sku || 'N/A'}</span>
            </div>
            
            ${data.alertType === 'medida_especial' && data.medidaEspecial ? `
            <div class="detail-row">
                <span class="detail-label">Medida Especial:</span>
                <span style="font-weight: bold; color: #e74c3c;">${data.medidaEspecial}</span>
            </div>
            ` : ''}
            
            <div class="detail-row">
                <span class="detail-label">Cantidad:</span>
                <span>${data.quantity}</span>
            </div>
            
            <div class="detail-row">
                <span class="detail-label">Fecha Compromiso Entrega:</span>
                <span>${data.fechaCompromisoEntrega ? new Date(data.fechaCompromisoEntrega).toLocaleDateString('es-ES', { 
                    day: '2-digit', 
                    month: 'long', 
                    year: 'numeric' 
                }) : 'N/A'}</span>
            </div>
        </div>
    </div>
    
    <div class="footer">
        <p>Este es un mensaje automático del sistema de gestión de ventas BoxiSleep.</p>
    </div>
</body>
</html>
  `.trim();
}

export async function sendInternalAlert(data: InternalAlertData, recipientEmail?: string): Promise<boolean> {
  try {
    const client = await getUncachableOutlookClient();
    const emailContent = generateInternalAlertHTML(data);
    
    // Use test email or production emails
    const productionEmails = ['santiago@boxisleep.com.co', 'jose.gracia@boxisleep.com.co'];
    const targetEmails = recipientEmail ? [recipientEmail] : productionEmails;
    
    // Determine subject based on alert type
    let subject = '';
    switch (data.alertType) {
      case 'medida_especial':
        subject = 'Se ha vendido una medida especial';
        break;
      case 'base_cama':
        subject = 'Se ha vendido una Base Cama';
        break;
      case 'bed':
        subject = 'Se ha vendido una Bed';
        break;
    }
    
    const message = {
      subject: subject,
      body: {
        contentType: 'HTML',
        content: emailContent
      },
      toRecipients: targetEmails.map(email => ({
        emailAddress: {
          address: email
        }
      }))
    };

    await client.api('/me/sendMail').post({
      message: message
    });

    console.log(`📧 Internal alert sent to ${targetEmails.join(', ')} for ${data.alertType}: Order ${data.orderNumber || 'N/A'}`);
    return true;
  } catch (error) {
    console.error('Error sending internal alert email:', error);
    throw error;
  }
}

export interface PaymentNotificationData {
  montoUsd: number | null;
  bancoReceptor: string;
  referencia: string | null;
  orden: string;
  nombreCliente: string | null;
  fechaPago: Date | null;
  canal: string;
  tipoPago: 'Inicial/Total' | 'Flete' | 'Cuota';
}

export function generatePaymentNotificationHTML(data: PaymentNotificationData): string {
  const brandColor = '#1DB5A6';
  
  return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Notificación de Pago</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background-color: ${brandColor};
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 8px 8px 0 0;
        }
        .content {
            background-color: #f9f9f9;
            padding: 30px;
            border-radius: 0 0 8px 8px;
        }
        .payment-details {
            background-color: white;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid ${brandColor};
        }
        .detail-row {
            display: flex;
            justify-content: space-between;
            margin: 10px 0;
            padding: 8px 0;
            border-bottom: 1px solid #eee;
        }
        .detail-label {
            font-weight: bold;
            color: #555;
        }
        .highlight {
            background-color: #fff3cd;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #ffc107;
            margin: 20px 0;
            font-weight: bold;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            color: #666;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1 style="color: white; margin: 10px 0;">💳 Notificación de Pago</h1>
    </div>
    
    <div class="content">
        <div class="highlight">
            ⚠️ Se ha registrado un pago con ${data.bancoReceptor}
        </div>
        
        <div class="payment-details">
            <h3>📋 Detalles del Pago</h3>
            
            <div class="detail-row">
                <span class="detail-label">Tipo de Pago:</span>
                <span>${data.tipoPago}</span>
            </div>
            
            <div class="detail-row">
                <span class="detail-label">Monto USD:</span>
                <span style="font-weight: bold; color: #28a745;">$${data.montoUsd ? data.montoUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 'N/A'}</span>
            </div>
            
            <div class="detail-row">
                <span class="detail-label">Banco Receptor:</span>
                <span style="font-weight: bold;">${data.bancoReceptor}</span>
            </div>
            
            <div class="detail-row">
                <span class="detail-label">Referencia:</span>
                <span>${data.referencia || 'N/A'}</span>
            </div>
            
            <div class="detail-row">
                <span class="detail-label">Número de Orden:</span>
                <span>${data.orden}</span>
            </div>
            
            <div class="detail-row">
                <span class="detail-label">Nombre del Cliente:</span>
                <span>${data.nombreCliente || 'N/A'}</span>
            </div>
            
            <div class="detail-row">
                <span class="detail-label">Fecha de Pago:</span>
                <span>${data.fechaPago ? new Date(data.fechaPago).toLocaleDateString('es-ES', { 
                    day: '2-digit', 
                    month: 'long', 
                    year: 'numeric' 
                }) : 'N/A'}</span>
            </div>
        </div>
    </div>
    
    <div class="footer">
        <p>Este es un mensaje automático del sistema de gestión de ventas BoxiSleep.</p>
    </div>
</body>
</html>
  `.trim();
}

async function sendPaymentNotificationViaOutlook(data: PaymentNotificationData): Promise<boolean> {
  const client = await getUncachableOutlookClient();
  const emailContent = generatePaymentNotificationHTML(data);
  
  // Production emails for internal notifications
  const productionEmails = ['jose.gracia@boxisleep.com.co', 'santiago@boxisleep.com.co'];
  
  const message = {
    subject: `Se ha registrado un pago con ${data.bancoReceptor}`,
    body: {
      contentType: 'HTML',
      content: emailContent
    },
    toRecipients: productionEmails.map(email => ({
      emailAddress: {
        address: email
      }
    }))
  };

  await client.api('/me/sendMail').post({
    message: message
  });

  console.log(`📧 Payment notification sent via Outlook to ${productionEmails.join(', ')} for order ${data.orden} (${data.bancoReceptor})`);
  return true;
}

async function sendPaymentNotificationViaGodaddy(data: PaymentNotificationData): Promise<boolean> {
  const godaddyEmail = process.env.GODADDY_EMAIL;
  const godaddyPassword = process.env.GODADDY_PASSWORD;
  
  if (!godaddyEmail || !godaddyPassword) {
    throw new Error('GoDaddy credentials not found in environment variables');
  }

  const transporter = nodemailer.createTransport({
    host: 'smtpout.secureserver.net',
    port: 465,
    secure: true,
    auth: {
      user: godaddyEmail,
      pass: godaddyPassword
    }
  });

  const emailContent = generatePaymentNotificationHTML(data);
  
  // Production emails for internal notifications
  const productionEmails = ['jose.gracia@boxisleep.com.co', 'santiago@boxisleep.com.co'];

  const mailOptions = {
    from: `"Mompox Notificaciones" <${godaddyEmail}>`,
    to: productionEmails.join(', '),
    subject: `Se ha registrado un pago con ${data.bancoReceptor}`,
    html: emailContent
  };

  await transporter.sendMail(mailOptions);
  console.log(`📧 Payment notification sent via GoDaddy to ${productionEmails.join(', ')} for order ${data.orden} (${data.bancoReceptor})`);
  return true;
}

export async function sendPaymentNotification(data: PaymentNotificationData): Promise<boolean> {
  try {
    // Determine which email service to use based on canal
    const mompoxChannels = ['Cashea MP', 'ShopMom', 'Manual MP', 'Tienda MP'];
    const isMompoxChannel = mompoxChannels.includes(data.canal);
    
    if (isMompoxChannel) {
      await sendPaymentNotificationViaGodaddy(data);
    } else {
      await sendPaymentNotificationViaOutlook(data);
    }

    return true;
  } catch (error) {
    console.error('Error sending payment notification:', error);
    // Don't throw - we don't want payment registration to fail if email fails
    return false;
  }
}

// Helper function to check if a bank name requires notification
export function shouldNotifyPayment(bancoNombre: string | null): boolean {
  if (!bancoNombre) return false;
  
  const bancoLower = bancoNombre.toLowerCase();
  return bancoLower.includes('zelle') || 
         bancoLower.includes('binance') || 
         bancoLower.includes('paypal');
}
