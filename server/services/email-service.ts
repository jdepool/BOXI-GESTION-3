import { Client } from '@microsoft/microsoft-graph-client';

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

export function generateOrderConfirmationHTML(data: OrderEmailData): string {
  const mompoxChannels = ['Cashea MP', 'ShopMom', 'Manual MP', 'Tienda MP'];
  const isMompox = mompoxChannels.includes(data.canal);
  
  // Brand colors: Mompox uses beige, BoxiSleep uses turquoise
  const brandColor = isMompox ? '#ece6d0' : '#1DB5A6';
  const textColor = isMompox ? '#333' : 'white';
  
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
            padding: ${isMompox ? '12px 20px' : '20px'};
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
        <p>Si tienes alguna pregunta, responde este correo electrónico o contáctanos a través de hola.vzla@boxisleep.com.co</p>
    </div>
</body>
</html>
  `.trim();
}

export async function sendOrderConfirmationEmail(orderData: OrderEmailData): Promise<boolean> {
  try {
    const client = await getUncachableOutlookClient();
    const fs = await import('fs');
    const path = await import('path');
    
    const emailContent = generateOrderConfirmationHTML(orderData);
    
    // Determine which logo to use based on canal
    const mompoxChannels = ['Cashea MP', 'ShopMom', 'Manual MP', 'Tienda MP'];
    const isMompoxChannel = mompoxChannels.includes(orderData.canal);
    
    // Read appropriate logo file and convert to base64
    const logoFileName = isMompoxChannel 
      ? 'images_1761506222071.jpeg' 
      : 'BOXILOGO_1759265713831.jpg';
    const logoContentType = 'image/jpeg';
    const logoPath = path.join(process.cwd(), 'attached_assets', logoFileName);
    const logoBuffer = fs.readFileSync(logoPath);
    const logoBase64 = logoBuffer.toString('base64');
    
    const brandSuffix = isMompoxChannel ? 'Mompox' : 'BoxiSleep';
    
    const message = {
      subject: `Recepción de Información de Pago Orden #${orderData.orderNumber} - ${brandSuffix}`,
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
          contentType: logoContentType,
          contentBytes: logoBase64,
          contentId: 'boxisleeplogo',
          isInline: true
        }
      ]
    };

    await client.api('/me/sendMail').post({
      message: message
    });

    console.log(`Order confirmation email sent successfully to ${orderData.customerEmail} for order ${orderData.orderNumber}`);
    return true;
  } catch (error) {
    console.error('Error sending order confirmation email:', error);
    throw error;
  }
}
