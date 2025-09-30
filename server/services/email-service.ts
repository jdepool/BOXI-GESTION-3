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
        <img src="data:image/png;base64,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" 
             alt="BoxiSleep Logo" 
             style="height: 60px; margin-bottom: 10px; object-fit: contain;" />
        <h1 style="color: white; margin: 10px 0 5px 0;">BoxiSleep</h1>
        <h2 style="color: white; margin: 5px 0;">Confirmación de Pedido</h2>
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
    
    const emailContent = generateOrderConfirmationHTML(orderData);
    
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
