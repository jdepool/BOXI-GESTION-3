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
        <img src="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAkACQAAD/4QA6RXhpZgAATU0AKgAAAAgAA1EQAAEAAAABAQAAAFERAAQAAAABAAAAAFESAAQAAAABAAAAAAAAAAD/2wBDAAIBAQIBAQICAgICAgICAwUDAwMDAwYEBAMFBwYHBwcGBwcICQsJCAgKCAcHCg0KCgsMDAwMBwkODw0MDgsMDAz/2wBDAQICAgMDAwYDAwYMCAcIDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAz/wAARCAH0AfQDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD9/KKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAoooo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/wDCZu//AJcUf8QlHxR/6Pm8ff8AhM3f/wAuKBn7ZV+F3/BtB/ymV/ba/wCwrqH/AKfLiv22+GnhKXwB8OPD+gz30mqTaLpttYSXsilWu2iiWMykEsQWK7sFjjPU9a/HT4l/8GjniTxV+0J4+8feG/2r9b8FzeO9cvtZmttN8GyxtCtzcyTiFpY9UQyBC+MlRnGcDOKQj9pqK/E3/iEo+KP/AEfN4+/8Jm7/APlxR/xCUfFH/o+bx9/4TN3/APLimM/bKivxb8M/8Gn/AMTtA8R6ffyftwePLqOxuY7hoW8NXYEwRgxUn+1z1xjoevSv2kpAfib8Hv8AldR+K3/YrQf+o3pVftlX5P8A/BRD/g2T1r9uD9v7xt8edB/aN1T4Y6h4wSyjFhYeFHuJrJbfT7ayI+1JqEJcP9n3kbFxv284yfLf+ISj4o/9HzePv/CZu/8A5cUxH7ZUV+Jv/EJR8Uf+j5vH3/hM3f8A8uK6j4Hf8GtvxK+EHxq8H+LLr9tHxxr1r4X1uy1ebTJfDt1HHqKW86StAzHVXCq4QqSVYAN909Chn7FV/Lp8Sf8Albtt/wDss+nf+jIK/qLr8ufEn/Btj/wkP/BXaP8Aaq/4XR5Pl+NLbxf/AMIv/wAIjuz5LI32f7X9tHXZ9/yeM/dNOIH6jUUUUgCiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigD/9k=" 
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
