import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import type { Sale } from "@shared/schema";

interface SaleDetailModalProps {
  sale: Sale | null;
  onClose: () => void;
}

interface PaymentInstallment {
  id: string;
  installmentNumber: number;
  fecha: string | null;
  pagoCuotaUsd: string | null;
  montoCuotaUsd: string | null;
  montoCuotaBs: string | null;
  referencia: string | null;
  bancoReceptorCuota: string | null;
  estadoVerificacion: string;
}

interface Banco {
  id: string;
  banco: string;
}

interface PaymentDisplay {
  tipo: string;
  pagoUsd: string | null;
  montoUsd: string | null;
  montoBs: string | null;
  referencia: string | null;
  bancoId: string | null;
  estadoVerificacion: string;
}

export default function SaleDetailModal({ sale, onClose }: SaleDetailModalProps) {
  if (!sale) return null;

  // Fetch installments for this order
  const { data: installmentsData = [] } = useQuery<PaymentInstallment[]>({
    queryKey: ['/api/sales/installments', sale.orden],
    queryFn: async () => {
      const res = await fetch(`/api/sales/installments?orden=${encodeURIComponent(sale.orden || '')}`);
      const data = await res.json();
      // Ensure we always return an array, even if API returns error object
      return Array.isArray(data) ? data : [];
    },
    enabled: !!sale.orden,
  });

  // Ensure installments is always an array
  const installments = Array.isArray(installmentsData) ? installmentsData : [];

  // Fetch banks to map IDs to names
  const { data: banks = [] } = useQuery<Banco[]>({
    queryKey: ['/api/admin/bancos'],
  });

  const getBancoName = (bancoId: string | null): string => {
    if (!bancoId) return 'N/A';
    const banco = banks.find(b => b.id === bancoId);
    return banco ? banco.banco : 'N/A';
  };

  const getChannelBadgeClass = (canal: string) => {
    switch (canal?.toLowerCase()) {
      case 'cashea': return 'channel-badge-cashea';
      case 'shopify': return 'channel-badge-shopify';
      case 'treble': return 'channel-badge-treble';
      case 'tienda': return 'channel-badge-tienda';
      default: return 'bg-gray-500';
    }
  };

  const getEstadoEntregaBadgeClass = (estado: string) => {
    switch (estado?.toLowerCase()) {
      case 'entregado': return 'bg-green-600 text-white';
      case 'pendiente': return 'bg-yellow-600 text-white';
      case 'en proceso': return 'bg-blue-600 text-white';
      case 'a despachar': return 'bg-purple-600 text-white';
      case 'en tránsito': return 'bg-indigo-600 text-white';
      case 'a devolver': return 'bg-orange-600 text-white';
      case 'devuelto': return 'bg-gray-600 text-white';
      case 'cancelada': return 'bg-red-600 text-white';
      case 'perdida': return 'bg-red-800 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getVerificationBadgeClass = (estado: string) => {
    if (estado === 'Verificado') {
      return 'bg-green-600 text-white';
    } else if (estado === 'Rechazado') {
      return 'bg-red-600 text-white';
    } else {
      return 'bg-yellow-600 text-white';
    }
  };

  // Consolidate all payments into a single array
  const allPayments: PaymentDisplay[] = [];

  // Add initial payment if it exists
  if (sale.pagoInicialUsd || sale.montoInicialBs || sale.montoInicialUsd) {
    allPayments.push({
      tipo: 'Pago Inicial/Total',
      pagoUsd: sale.pagoInicialUsd,
      montoUsd: sale.montoInicialUsd,
      montoBs: sale.montoInicialBs,
      referencia: sale.referenciaInicial,
      bancoId: sale.bancoReceptorInicial,
      estadoVerificacion: sale.estadoVerificacionInicial || 'Por verificar',
    });
  }

  // Add freight payment if it exists
  if (sale.pagoFleteUsd || sale.montoFleteUsd || sale.montoFleteBs) {
    allPayments.push({
      tipo: 'Pago Flete',
      pagoUsd: sale.pagoFleteUsd,
      montoUsd: sale.montoFleteUsd,
      montoBs: sale.montoFleteBs,
      referencia: sale.referenciaFlete,
      bancoId: sale.bancoReceptorFlete,
      estadoVerificacion: sale.estadoVerificacionFlete || 'Por verificar',
    });
  }

  // Add installment payments
  installments.forEach((installment) => {
    allPayments.push({
      tipo: `Pago Cuota ${installment.installmentNumber}`,
      pagoUsd: installment.pagoCuotaUsd,
      montoUsd: installment.montoCuotaUsd,
      montoBs: installment.montoCuotaBs,
      referencia: installment.referencia,
      bancoId: installment.bancoReceptorCuota,
      estadoVerificacion: installment.estadoVerificacion || 'Por verificar',
    });
  });

  return (
    <Dialog open={!!sale} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="sale-detail-modal">
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
              <p><span className="text-muted-foreground">Orden:</span> <span className="text-foreground font-mono font-medium">{sale.orden || 'N/A'}</span></p>
              <p>
                <span className="text-muted-foreground">Canal:</span> 
                <Badge className={`${getChannelBadgeClass(sale.canal)} text-white ml-2`}>
                  {sale.canal.charAt(0).toUpperCase() + sale.canal.slice(1)}
                </Badge>
              </p>
              <p>
                <span className="text-muted-foreground">Tipo:</span> 
                <Badge variant="secondary" className="ml-2">
                  {sale.tipo || 'Inmediato'}
                </Badge>
              </p>
              <p>
                <span className="text-muted-foreground">Estado Entrega:</span> 
                <Badge className={`${getEstadoEntregaBadgeClass(sale.estadoEntrega)} ml-2`}>
                  {sale.estadoEntrega}
                </Badge>
              </p>
              <p><span className="text-muted-foreground">Total Order USD:</span> <span className="text-foreground font-medium">${sale.totalOrderUsd != null ? Number(sale.totalOrderUsd).toLocaleString() : 'N/A'}</span></p>
              <p><span className="text-muted-foreground">Fecha:</span> <span className="text-foreground">{format(new Date(sale.fecha), 'dd/MM/yy')}</span></p>
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
            <h3 className="font-semibold text-foreground mb-3">Información de Pagos</h3>
            {allPayments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay pagos registrados</p>
            ) : (
              <div className="space-y-3">
                {allPayments.map((payment, index) => (
                  <div key={index} className="bg-secondary rounded-lg p-4">
                    <h4 className="font-medium text-foreground mb-3">{payment.tipo}</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-sm">
                      {payment.pagoUsd && (
                        <div>
                          <p className="text-muted-foreground text-xs mb-1">Pago USD</p>
                          <p className="text-foreground font-mono">${Number(payment.pagoUsd).toLocaleString()}</p>
                        </div>
                      )}
                      {payment.montoUsd && (
                        <div>
                          <p className="text-muted-foreground text-xs mb-1">Monto USD</p>
                          <p className="text-foreground font-mono">${Number(payment.montoUsd).toLocaleString()}</p>
                        </div>
                      )}
                      {payment.montoBs && (
                        <div>
                          <p className="text-muted-foreground text-xs mb-1">Monto Bs</p>
                          <p className="text-foreground font-mono">Bs {Number(payment.montoBs).toLocaleString()}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-muted-foreground text-xs mb-1">Referencia</p>
                        <p className="text-foreground font-mono">{payment.referencia || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs mb-1">Banco Receptor</p>
                        <p className="text-foreground">{getBancoName(payment.bancoId)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs mb-1">Estado</p>
                        <Badge className={getVerificationBadgeClass(payment.estadoVerificacion)}>
                          {payment.estadoVerificacion}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
