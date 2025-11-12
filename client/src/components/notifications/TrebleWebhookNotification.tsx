import { useEffect, useState } from 'react';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { queryClient } from '@/lib/queryClient';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { format } from 'date-fns';

export function TrebleWebhookNotification() {
  const { lastTrebleWebhook, clearLastTrebleWebhook } = useWebSocket();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (lastTrebleWebhook) {
      setIsOpen(true);
    }
  }, [lastTrebleWebhook]);

  const handleClose = () => {
    setIsOpen(false);
    clearLastTrebleWebhook();
    
    // Invalidate sales queries to refresh the data with updated addresses
    queryClient.invalidateQueries({ queryKey: ['/api/sales'] });
    queryClient.invalidateQueries({ queryKey: ['/api/sales/orders'] });
  };

  if (!lastTrebleWebhook) {
    return null;
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogContent data-testid="dialog-treble-webhook-notification">
        <AlertDialogHeader>
          <AlertDialogTitle data-testid="text-webhook-title">
            📬 Actualización de Dirección desde Treble
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-md border border-blue-200 dark:border-blue-800">
                <div className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  Información del Webhook
                </div>
                <div className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
                  <div>
                    <span className="font-medium">Número de Orden:</span>{' '}
                    <span data-testid="text-order-number" className="font-mono">
                      {lastTrebleWebhook.orderNumber}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">Productos Actualizados:</span>{' '}
                    <span data-testid="text-products-updated">
                      {lastTrebleWebhook.productsUpdated}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">Recibido:</span>{' '}
                    {format(new Date(lastTrebleWebhook.timestamp), 'dd/MM/yyyy HH:mm:ss')}
                  </div>
                </div>
              </div>

              <div className="bg-green-50 dark:bg-green-950 p-4 rounded-md border border-green-200 dark:border-green-800">
                <div className="font-semibold text-green-900 dark:text-green-100 mb-2">
                  Campos Actualizados
                </div>
                <div className="flex flex-wrap gap-2">
                  {lastTrebleWebhook.updatedFields.map((field, index) => (
                    <span
                      key={index}
                      data-testid={`badge-field-${index}`}
                      className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100 border border-green-300 dark:border-green-700"
                    >
                      {field}
                    </span>
                  ))}
                </div>
              </div>

              {(lastTrebleWebhook.estado || lastTrebleWebhook.ciudad || lastTrebleWebhook.direccion) && (
                <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md border border-gray-200 dark:border-gray-700">
                  <div className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    Dirección de Despacho
                  </div>
                  <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                    {lastTrebleWebhook.direccion && (
                      <div data-testid="text-direccion">{lastTrebleWebhook.direccion}</div>
                    )}
                    {lastTrebleWebhook.urbanizacion && (
                      <div data-testid="text-urbanizacion">
                        Urbanización: {lastTrebleWebhook.urbanizacion}
                      </div>
                    )}
                    {lastTrebleWebhook.ciudad && lastTrebleWebhook.estado && (
                      <div data-testid="text-location">
                        {lastTrebleWebhook.ciudad}, {lastTrebleWebhook.estado}
                      </div>
                    )}
                    {lastTrebleWebhook.indicaciones && (
                      <div className="mt-2 pt-2 border-t border-gray-300 dark:border-gray-600">
                        <span className="font-medium">Indicaciones:</span>{' '}
                        <span data-testid="text-indicaciones">{lastTrebleWebhook.indicaciones}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="text-xs text-gray-500 dark:text-gray-400">
                {lastTrebleWebhook.addressesAreSame
                  ? '✓ La dirección de facturación es igual a la de despacho'
                  : '⚠️ La dirección de facturación es diferente a la de despacho'}
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={handleClose} data-testid="button-ok">
            OK
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
