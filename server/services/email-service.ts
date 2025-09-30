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
  product: string;
  quantity: number;
  totalUsd: number;
  fecha: string;
  sku?: string;
  asesorName?: string;
}

export function generateOrderConfirmationHTML(data: OrderEmailData): string {
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
            background-color: #1DB5A6;
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
        .order-details {
            background-color: white;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid #1DB5A6;
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
        .total {
            background-color: #1DB5A6;
            color: white;
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
        <h1 style="color: white; margin: 10px 0 5px 0;">BoxiSleep</h1>
        <h2 style="color: white; margin: 5px 0;">Confirmación de Pedido</h2>
    </div>
    
    <div style="text-align: center; padding: 20px 0; background-color: white;">
        <img src="cid:boxisleeplogo" 
             alt="BoxiSleep Logo" 
             style="display: block; width: 200px; max-width: 100%; height: auto; margin: 0 auto;" />
    </div>
    
    <div class="content">
        <p>Estimado/a <strong>${data.customerName}</strong>,</p>
        
        <p>¡Gracias por tu pedido! Hemos recibido correctamente tu solicitud y queremos confirmar los detalles de tu compra:</p>
        
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
            
            <div class="detail-row">
                <span class="detail-label">Producto:</span>
                <span>${data.product}</span>
            </div>
            
            ${data.sku ? `
            <div class="detail-row">
                <span class="detail-label">SKU:</span>
                <span>${data.sku}</span>
            </div>
            ` : ''}
            
            <div class="detail-row">
                <span class="detail-label">Cantidad:</span>
                <span>${data.quantity} unidad${data.quantity > 1 ? 'es' : ''}</span>
            </div>
            
            ${data.asesorName ? `
            <div class="detail-row">
                <span class="detail-label">Asesor Asignado:</span>
                <span>${data.asesorName}</span>
            </div>
            ` : ''}
        </div>
        
        <div class="total">
            💰 Total: $${data.totalUsd.toLocaleString()} USD
        </div>
        
        <p>Nuestro equipo procesará tu pedido y te mantendremos informado sobre el estado de tu compra. Si tienes alguna pregunta o necesitas modificar algo de tu pedido, no dudes en contactarnos.</p>
        
        <p>¡Gracias por confiar en BoxiSleep para tu descanso perfecto! 😴</p>
    </div>
    
    <div class="footer">
        <p>Este es un email automático, por favor no respondas a este mensaje.</p>
        <p><strong>BoxiSleep</strong> - Tu tranquilidad es nuestro compromiso</p>
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
    
    // Read logo file and convert to base64
    const logoPath = path.join(process.cwd(), 'attached_assets', 'BOXILOGO_1759265713831.jpg');
    const logoBuffer = fs.readFileSync(logoPath);
    const logoBase64 = logoBuffer.toString('base64');
    
    const message = {
      subject: `Confirmación de Pedido #${orderData.orderNumber} - BoxiSleep`,
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

    console.log(`Order confirmation email sent successfully to ${orderData.customerEmail} for order ${orderData.orderNumber}`);
    return true;
  } catch (error) {
    console.error('Error sending order confirmation email:', error);
    throw error;
  }
}
