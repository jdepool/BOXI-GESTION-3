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
            background-color: #4F46E5;
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
            border-left: 4px solid #4F46E5;
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
            background-color: #4F46E5;
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
        <img src="data:image/png;base64,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TDXh/frrr9fV1Sl+0GJWDz744J1tz/Tp0998803AU7XqXV1dDYOSrCpp92ZKM2bMYKB29PDDD5eVlamG8+bNY2ntGMh++OGHQE6HP//8M3MO9zNz5kzSDz300IIFC6qqqlQnsHWduocZg0USkkUgYHDDDTfcddddYXmFh0exWPaNN9540003gdNjjz329NNP8wabf7Q9LFi1crlcJJ566inVPz0/+uijDRH/mw9FZJGInip4EMoPP/yg6/oXX3xBVtFbb71Vb/3bRWt8xoWnvLy8oKBg4MCBlD/55JPPPPPM1q1breq235YtW2bPnr2TLf/GG28Ac1ZnDxNu60PAwzI7siQlJWl8CxKCzQdCqHuYJy0tjf3HcpDJmjVrugtb9zBDcO0IC8Cqli5dyrSeffZZtQz1RkxActttt82fP595YxDCk6MVJaz29ttvB0XWExcXd+aZZ5500knAwBBoLW3RKtKqt6+//vrxxx9HZVFNCgsLCydNmgQe9ElWUVj6mzdvRu1GjRp13XXXXX755ZdeeinMI0aM+Oijj3788ccwGz3TkPdvEZ0fddRRF3d4zj333JycHE70NASYo48+ugPLxYceeqjH44GBTljUyJEjwzzMZ/z48eeddx4LRwXBD7auU/cw20m/IMS+RlcUD7bulVdewWgoKatCt9udm5sbHx+vskgf8/jAAw8AKmYEKWA5DzzwQGpZJ54PzXj//ffJbtq0CQv81VdfYfHIJiYmYtP2228/0p3SokWLGAuh9OvXD4VwOByMy57IzMwEMzZEp606LQQSmnckBZhqAiQdGWioatWbbJjH6XSiaqz0mmuuYT7vvfee4tnJO7IqSswGDBgAHqgCVjE/P1/1WFpaunjxYtJIHJVHrJSQpqSoqOj+++9funQp0uQNun379qWcWhwD7uGbb74hCxutFKhoAOtBt7799tvnnnsOpQRXeCB0l62NCEh3SjgqDBHWKbIW2K699trRo0er7R9ZtUvSoLjPPvscccQR7777brcmECVmbBMGO/3006+44oq99tpLDQkAygOh7J9++umKFStU+aBBg/A3GASmiGuB/7LLLkNvAB4GWuGZPv74YzSV7NChQzGzaAlptIp+aIjVVbUUjh079pJLLmGrkv4tYhSQBvVIBmRE51TtBOxI/h5Io6BIQ9mSrg8XJWYEuNgufBKyxnCp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" 
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