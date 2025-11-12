import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';

let wss: WebSocketServer | null = null;

export function initializeWebSocket(server: Server): WebSocketServer {
  wss = new WebSocketServer({ noServer: true });

  wss.on('connection', (ws: WebSocket, request) => {
    console.log('✅ New WebSocket connection established');

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    ws.on('close', () => {
      console.log('❌ WebSocket connection closed');
    });

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connected',
      message: 'Connected to BoxiSleep real-time notifications'
    }));
  });

  server.on('upgrade', (request, socket, head) => {
    socket.on('error', (err) => {
      console.error('Socket error during upgrade:', err);
    });

    // Handle WebSocket upgrade for /ws path
    if (request.url === '/ws') {
      wss?.handleUpgrade(request, socket, head, (ws) => {
        wss?.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  console.log('🔌 WebSocket server initialized on /ws endpoint');
  return wss;
}

// Broadcast message to all connected clients
export function broadcastWebSocketMessage(data: any) {
  if (!wss) {
    console.warn('WebSocket server not initialized, cannot broadcast message');
    return;
  }

  const message = JSON.stringify(data);
  let clientCount = 0;

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
      clientCount++;
    }
  });

  console.log(`📡 Broadcasted message to ${clientCount} connected client(s)`);
}

export function getWebSocketServer(): WebSocketServer | null {
  return wss;
}
