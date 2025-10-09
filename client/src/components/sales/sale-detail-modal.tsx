import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Sale } from "@shared/schema";

interface SaleDetailModalProps {
  sale: Sale | null;
  onClose: () => void;
}

export default function SaleDetailModal({ sale, onClose }: SaleDetailModalProps) {
  if (!sale) return null;

  const getChannelBadgeClass = (canal: string) => {
    switch (canal) {
      case 'cashea': return 'channel-badge-cashea';
      case 'shopify': return 'channel-badge-shopify';
      case 'treble': return 'channel-badge-treble';
      default: return 'bg-gray-500';
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'entregado': return 'status-badge-completed';
      case 'pendiente': return 'status-badge-pending';
      case 'reservado': return 'status-badge-reserved';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Dialog open={!!sale} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="sale-detail-modal">
        <DialogHeader>
          <DialogTitle>Detalles de Venta</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold text-foreground mb-3">Información del Cliente</h3>
            <div className="space-y-2 text-sm">
              <p><span className="text-muted-foreground">Nombre:</span> <span className="text-foreground">{sale.nombre}</span></p>
              <p><span className="text-muted-foreground">Cédula:</span> <span className="text-foreground">{sale.cedula || 'N/A'}</span></p>
              <p><span className="text-muted-foreground">Teléfono:</span> <span className="text-foreground">{sale.telefono || 'N/A'}</span></p>
              <p><span className="text-muted-foreground">Email:</span> <span className="text-foreground">{sale.email || 'N/A'}</span></p>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-foreground mb-3">Información de Venta</h3>
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">Canal:</span> 
                <Badge className={`${getChannelBadgeClass(sale.canal)} text-white ml-2`}>
                  {sale.canal.charAt(0).toUpperCase() + sale.canal.slice(1)}
                </Badge>
              </p>
              <p><span className="text-muted-foreground">Total USD:</span> <span className="text-foreground font-medium">${Number(sale.totalUsd).toLocaleString()}</span></p>
              <p><span className="text-muted-foreground">Monto Bs:</span> <span className="text-foreground">{sale.montoBs ? `Bs ${Number(sale.montoBs).toLocaleString()}` : 'N/A'}</span></p>
              <p><span className="text-muted-foreground">Fecha:</span> <span className="text-foreground">{new Date(sale.fecha).toLocaleDateString()}</span></p>
              <p><span className="text-muted-foreground">Sucursal:</span> <span className="text-foreground">{sale.sucursal || 'N/A'}</span></p>
              <p><span className="text-muted-foreground">Tienda:</span> <span className="text-foreground">{sale.tienda || 'N/A'}</span></p>
            </div>
          </div>

          <div className="md:col-span-2">
            <h3 className="font-semibold text-foreground mb-3">Productos</h3>
            <div className="bg-secondary rounded-lg p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium text-foreground">{sale.product}</p>
                  <p className="text-sm text-muted-foreground">Cantidad: {sale.cantidad}</p>
                </div>
                <p className="font-bold text-foreground">${Number(sale.totalUsd).toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="md:col-span-2">
            <h3 className="font-semibold text-foreground mb-3">Estado y Entrega</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-muted-foreground text-sm mb-1">Estado de Entrega</p>
                <Badge className={`${getStatusBadgeClass(sale.estadoEntrega)} text-white`}>
                  {sale.estadoEntrega}
                </Badge>
              </div>
              {sale.estadoPagoInicial && (
                <div>
                  <p className="text-muted-foreground text-sm mb-1">Estado de Pago Inicial</p>
                  <Badge variant="outline">{sale.estadoPagoInicial}</Badge>
                </div>
              )}
              {sale.pagoInicialUsd && (
                <div>
                  <p className="text-muted-foreground text-sm mb-1">Pago Inicial/Total</p>
                  <p className="text-foreground">${Number(sale.pagoInicialUsd).toLocaleString()}</p>
                </div>
              )}
            </div>
          </div>

          <div className="md:col-span-2">
            <h3 className="font-semibold text-foreground mb-3">Referencias</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Orden</p>
                <p className="text-foreground font-mono">{sale.orden || 'N/A'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Factura</p>
                <p className="text-foreground font-mono">{sale.factura || 'N/A'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Referencia</p>
                <p className="text-foreground font-mono">{sale.referencia || 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-8">
          <Button variant="outline" onClick={onClose} data-testid="close-modal">
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
