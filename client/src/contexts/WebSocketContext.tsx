import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react';

interface TrebleWebhookData {
  orderNumber: string;
  productsUpdated: number;
  updatedFields: string[];
  estado: string | null;
  ciudad: string | null;
  urbanizacion: string | null;
  direccion: string | null;
  indicaciones: string | null;
  addressesAreSame: boolean;
  timestamp: string;
}

interface WebSocketMessage {
  type: string;
  event?: string;
  message?: string;
  data?: any;
}

interface WebSocketContextValue {
  isConnected: boolean;
  lastTrebleWebhook: TrebleWebhookData | null;
  clearLastTrebleWebhook: () => void;
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastTrebleWebhook, setLastTrebleWebhook] = useState<TrebleWebhookData | null>(null);
  
  // Use refs to avoid stale closures
  const wsRef = useRef<WebSocket | null>(null);
  const shouldReconnectRef = useRef(true);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearLastTrebleWebhook = useCallback(() => {
    setLastTrebleWebhook(null);
  }, []);

  useEffect(() => {
    // Function to establish WebSocket connection
    const connect = () => {
      if (!shouldReconnectRef.current) return;

      // Determine WebSocket URL based on environment
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/ws`;

      console.log('📡 Connecting to WebSocket:', wsUrl);
      const websocket = new WebSocket(wsUrl);

      websocket.onopen = () => {
        // Only update state if we should still be connected
        if (shouldReconnectRef.current) {
          console.log('✅ WebSocket connected');
          setIsConnected(true);
        } else {
          // If unmounted during connection, close immediately
          websocket.close();
        }
      };

      websocket.onmessage = (event) => {
        // Only process messages if we should still be connected
        if (!shouldReconnectRef.current) return;
        
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          console.log('📨 WebSocket message received:', message);

          if (message.type === 'treble-webhook' && message.event === 'address-update') {
            setLastTrebleWebhook(message.data as TrebleWebhookData);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      websocket.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
      };

      websocket.onclose = () => {
        console.log('🔌 WebSocket disconnected');
        
        // Only update state if we should still be connected
        if (shouldReconnectRef.current) {
          setIsConnected(false);
        }
        
        wsRef.current = null;
        
        // Attempt reconnection after 5 seconds if still allowed
        if (shouldReconnectRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('🔄 Attempting to reconnect WebSocket...');
            connect();
          }, 5000);
        }
      };

      wsRef.current = websocket;
    };

    // Initial connection
    connect();

    // Cleanup on unmount
    return () => {
      console.log('🧹 Cleaning up WebSocket connection');
      shouldReconnectRef.current = false;
      
      // Cancel any pending reconnection attempts
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      // Close the WebSocket connection unconditionally (works for any state)
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []); // Empty deps - only run once on mount/unmount

  return (
    <WebSocketContext.Provider value={{ isConnected, lastTrebleWebhook, clearLastTrebleWebhook }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}
