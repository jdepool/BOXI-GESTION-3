import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { CreditCard, Truck, Banknote, Filter, ChevronUp, ChevronDown, Download } from "lucide-react";
import PagoInicialModal from "./pago-inicial-modal";
import FleteModal from "./flete-modal";
import PaymentInstallmentsModal from "./payment-installments-modal";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Order {
  orden: string;
  nombre: string;
  fecha: Date;
  canal: string | null;
  tipo: string | null;
  estadoEntrega: string | null;
  totalOrderUsd: number | null;
  productCount: number;
  hasPagoInicial: boolean;
  hasFlete: boolean;
  installmentCount: number;
  pagoInicialUsd: number | null;
  pagoFleteUsd: number | null;
  ordenPlusFlete: number;
  totalCuotas: number;
  totalPagado: number;
  saldoPendiente: number;
}

interface PagosTableProps {
  data: Order[];
  total: number;
  limit: number;
  offset: number;
  isLoading: boolean;
  filters?: {
    canal?: string;
    orden?: string;
    startDate?: string;
    endDate?: string;
    limit: number;
    offset: number;
  };
  onFilterChange?: (filters: any) => void;
  onPageChange?: (newOffset: number) => void;
}

export default function PagosTable({
  data,
  total,
  limit,
  offset,
  isLoading,
  filters,
  onFilterChange,
  onPageChange,
}: PagosTableProps) {
  const currentPage = Math.floor(offset / limit) + 1;
  const { toast } = useToast();
  
  const [filtersVisible, setFiltersVisible] = useState(true);
  const [pagoInicialModalOpen, setPagoInicialModalOpen] = useState(false);
  const [fleteModalOpen, setFleteModalOpen] = useState(false);
  const [cuotasModalOpen, setCuotasModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedSale, setSelectedSale] = useState<any | null>(null);

  const handleFilterChange = (key: string, value: string) => {
    if (onFilterChange) {
      // Normalize "all" to empty string for canal filter
      const normalizedValue = (key === 'canal' && value === 'all') ? '' : value;
      onFilterChange({ [key]: normalizedValue });
    }
  };

  const handleExport = () => {
    const queryParams = new URLSearchParams();
    if (filters?.canal) queryParams.append('canal', filters.canal);
    if (filters?.orden) queryParams.append('orden', filters.orden);
    if (filters?.startDate) queryParams.append('startDate', filters.startDate);
    if (filters?.endDate) queryParams.append('endDate', filters.endDate);
    
    window.location.href = `/api/sales/orders/export?${queryParams.toString()}`;
  };

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return "$0";
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getChannelBadgeClass = (canal: string | null) => {
    switch (canal?.toLowerCase()) {
      case 'cashea': return 'channel-badge-cashea';
      case 'shopify': return 'channel-badge-shopify';
      case 'treble': return 'channel-badge-treble';
      default: return 'bg-gray-500';
    }
  };

  // Mutation to update estado de entrega for an order
  const updateEstadoEntregaMutation = useMutation({
    mutationFn: async ({ orden, estadoEntrega }: { orden: string; estadoEntrega: string }) => {
      const response = await fetch(`/api/sales/orders/${encodeURIComponent(orden)}/estado-entrega`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estadoEntrega }),
      });
      if (!response.ok) throw new Error('Failed to update estado entrega');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          return Array.isArray(query.queryKey) && 
                 typeof query.queryKey[0] === 'string' && 
                 query.queryKey[0].startsWith('/api/sales');
        }
      });
      toast({ title: "Estado de entrega actualizado" });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado de entrega",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="h-full flex flex-col">
      {/* Top toolbar with filters */}
      <div className="p-3 border-b border-border flex items-center justify-end gap-2">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => setFiltersVisible(!filtersVisible)}
          data-testid="toggle-filters-button"
          className="text-muted-foreground"
        >
          <Filter className="h-4 w-4 mr-2" />
          {filtersVisible ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
        
        <Button 
          variant="ghost" 
          size="sm"
          onClick={handleExport} 
          data-testid="export-button"
          className="text-muted-foreground"
          title="Exportar"
        >
          <Download className="h-4 w-4" />
        </Button>
      </div>

      {/* Filter section - collapsible */}
      {filtersVisible && (
        <div className="p-6 border-b border-border">
          <div className="flex flex-wrap gap-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Canal:</label>
              <Select 
                value={filters?.canal || "all"} 
                onValueChange={(value) => handleFilterChange('canal', value)}
              >
                <SelectTrigger className="w-40" data-testid="filter-channel">
                  <SelectValue placeholder="Todos los canales" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los canales</SelectItem>
                  <SelectItem value="cashea">Cashea</SelectItem>
                  <SelectItem value="shopify">Shopify</SelectItem>
                  <SelectItem value="treble">Treble</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Orden:</label>
              <Input 
                type="text"
                placeholder="Buscar por # orden"
                value={filters?.orden || ""}
                onChange={(e) => handleFilterChange('orden', e.target.value)}
                className="w-40"
                data-testid="filter-order-number"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Fecha Inicio:</label>
              <Input 
                type="date" 
                value={filters?.startDate || ""}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="w-40"
                data-testid="filter-start-date"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Fecha Fin:</label>
              <Input 
                type="date" 
                value={filters?.endDate || ""}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="w-40"
                data-testid="filter-end-date"
              />
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto relative">
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 z-10 bg-muted">
              <tr className="border-b border-border">
                <th className="p-3 text-left font-semibold text-foreground min-w-[120px] sticky left-0 z-20 bg-muted">
                  Orden
                </th>
                <th className="p-3 text-left font-semibold text-foreground min-w-[180px] sticky left-[120px] z-20 bg-muted">
                  Nombre
                </th>
                <th className="p-3 text-left font-semibold text-foreground min-w-[100px]">
                  Fecha
                </th>
                <th className="p-3 text-left font-semibold text-foreground min-w-[100px]">
                  Canal
                </th>
                <th className="p-3 text-left font-semibold text-foreground min-w-[100px]">
                  Tipo
                </th>
                <th className="p-3 text-left font-semibold text-foreground min-w-[140px]">
                  Estado Entrega
                </th>
                <th className="p-3 text-left font-semibold text-foreground min-w-[140px]">
                  Total Orden USD
                </th>
                <th className="p-3 text-center font-semibold text-foreground min-w-[150px]">
                  Pago Inicial/Total
                </th>
                <th className="p-3 text-center font-semibold text-foreground min-w-[100px]">
                  Flete
                </th>
                <th className="p-3 text-center font-semibold text-foreground min-w-[100px]">
                  Cuotas
                </th>
                <th className="p-3 text-center font-semibold text-foreground min-w-[140px] bg-blue-50 dark:bg-blue-950">
                  Orden + Flete
                </th>
                <th className="p-3 text-center font-semibold text-foreground min-w-[120px] bg-teal-50 dark:bg-teal-950">
                  Total Pagado
                </th>
                <th className="p-3 text-center font-semibold text-foreground min-w-[120px] bg-orange-50 dark:bg-orange-950">
                  Pendiente
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={13} className="p-4 text-center text-muted-foreground">
                    Cargando...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={13} className="p-4 text-center text-muted-foreground">
                    No hay órdenes pendientes o en proceso
                  </td>
                </tr>
              ) : (
                data.map((order) => (
                  <tr 
                    key={order.orden} 
                    className="border-b border-border hover:bg-muted/50"
                  >
                    <td className="p-2 min-w-[120px] sticky left-0 z-10 bg-background">
                      <span className="text-xs font-mono" data-testid={`order-${order.orden}`}>
                        {order.orden}
                      </span>
                    </td>
                    <td className="p-2 min-w-[180px] sticky left-[120px] z-10 bg-background">
                      <span className="text-xs" data-testid={`nombre-${order.orden}`}>
                        {order.nombre}
                      </span>
                    </td>
                    <td className="p-2 min-w-[100px]">
                      <span className="text-xs" data-testid={`fecha-${order.orden}`}>
                        {format(new Date(order.fecha), "dd/MM/yyyy")}
                      </span>
                    </td>
                    <td className="p-2 min-w-[100px]">
                      <Badge className={`${getChannelBadgeClass(order.canal)} text-white text-xs`} data-testid={`canal-${order.orden}`}>
                        {order.canal ? order.canal.charAt(0).toUpperCase() + order.canal.slice(1) : "N/A"}
                      </Badge>
                    </td>
                    <td className="p-2 min-w-[100px]">
                      <Badge 
                        variant={order.tipo === "Venta" ? "default" : "secondary"}
                        className="text-xs"
                        data-testid={`tipo-${order.orden}`}
                      >
                        {order.tipo || "N/A"}
                      </Badge>
                    </td>
                    <td className="p-2 min-w-[140px]">
                      <Select
                        value={order.estadoEntrega || ""}
                        onValueChange={(value) => {
                          updateEstadoEntregaMutation.mutate({
                            orden: order.orden,
                            estadoEntrega: value,
                          });
                        }}
                      >
                        <SelectTrigger 
                          className="h-7 text-xs w-full"
                          data-testid={`select-estado-entrega-${order.orden}`}
                        >
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pendiente">Pendiente</SelectItem>
                          <SelectItem value="En proceso">En proceso</SelectItem>
                          <SelectItem value="A despachar">A despachar</SelectItem>
                          <SelectItem value="En tránsito">En tránsito</SelectItem>
                          <SelectItem value="Entregado">Entregado</SelectItem>
                          <SelectItem value="A devolver">A devolver</SelectItem>
                          <SelectItem value="Devuelto">Devuelto</SelectItem>
                          <SelectItem value="Cancelada">Cancelada</SelectItem>
                          <SelectItem value="Perdida">Perdida</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-2 min-w-[140px]">
                      <span className="text-xs font-semibold" data-testid={`total-${order.orden}`}>
                        {formatCurrency(order.totalOrderUsd)}
                      </span>
                      {order.productCount > 1 && (
                        <span className="text-xs text-muted-foreground ml-2">
                          ({order.productCount} productos)
                        </span>
                      )}
                    </td>
                    <td className="p-2 min-w-[150px] text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          // Fetch first sale from this order to get details
                          const response = await fetch(`/api/sales?orden=${encodeURIComponent(order.orden)}&limit=1`);
                          const salesData = await response.json();
                          if (salesData.data && salesData.data.length > 0) {
                            setSelectedSale({
                              ...salesData.data[0],
                              orden: order.orden,
                              totalOrderUsd: order.totalOrderUsd // Use order's total, not product's total
                            });
                            setPagoInicialModalOpen(true);
                          }
                        }}
                        className="h-7 text-xs"
                        data-testid={`button-pago-inicial-${order.orden}`}
                      >
                        <Banknote className="h-3 w-3 mr-1" />
                        {order.hasPagoInicial ? 'Editar' : 'Agregar'}
                      </Button>
                    </td>
                    <td className="p-2 min-w-[100px] text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          // Fetch first sale from this order
                          const response = await fetch(`/api/sales?orden=${encodeURIComponent(order.orden)}&limit=1`);
                          const salesData = await response.json();
                          if (salesData.data && salesData.data.length > 0) {
                            setSelectedSale({
                              ...salesData.data[0],
                              orden: order.orden
                            });
                            setFleteModalOpen(true);
                          }
                        }}
                        className="h-7 text-xs"
                        data-testid={`button-flete-${order.orden}`}
                      >
                        <Truck className="h-3 w-3 mr-1" />
                        {order.hasFlete ? 'Editar' : 'Agregar'}
                      </Button>
                    </td>
                    <td className="p-2 min-w-[100px] text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          // Fetch first sale from this order
                          const response = await fetch(`/api/sales?orden=${encodeURIComponent(order.orden)}&limit=1`);
                          const salesData = await response.json();
                          if (salesData.data && salesData.data.length > 0) {
                            setSelectedSale({
                              ...salesData.data[0],
                              orden: order.orden
                            });
                            setCuotasModalOpen(true);
                          }
                        }}
                        className="h-7 text-xs"
                        data-testid={`button-cuotas-${order.orden}`}
                      >
                        <CreditCard className="h-3 w-3 mr-1" />
                        {order.installmentCount > 0 ? 'Editar' : 'Agregar'}
                      </Button>
                    </td>
                    <td className="p-2 min-w-[140px] bg-blue-50 dark:bg-blue-950">
                      <div className="flex justify-center">
                        <div className="bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100 px-3 py-1 rounded-md text-xs font-semibold" data-testid={`metric-orden-flete-${order.orden}`}>
                          {formatCurrency(order.ordenPlusFlete)}
                        </div>
                      </div>
                    </td>
                    <td className="p-2 min-w-[120px] bg-teal-50 dark:bg-teal-950">
                      <div className="flex justify-center">
                        <div className="bg-teal-100 dark:bg-teal-900 text-teal-900 dark:text-teal-100 px-3 py-1 rounded-md text-xs font-semibold" data-testid={`metric-total-pagado-${order.orden}`}>
                          {formatCurrency(order.totalPagado)}
                        </div>
                      </div>
                    </td>
                    <td className={`p-2 min-w-[120px] ${
                      Math.abs(order.saldoPendiente) < 0.01 && (order.estadoEntrega === 'Pendiente' || order.estadoEntrega === 'En proceso')
                        ? 'bg-gray-100 dark:bg-gray-800'
                        : 'bg-orange-50 dark:bg-orange-950'
                    }`}>
                      <div className="flex justify-center">
                        <div className={`${
                          Math.abs(order.saldoPendiente) < 0.01 && (order.estadoEntrega === 'Pendiente' || order.estadoEntrega === 'En proceso')
                            ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                            : 'bg-orange-100 dark:bg-orange-900 text-orange-900 dark:text-orange-100'
                        } px-3 py-1 rounded-md text-xs font-semibold`} data-testid={`metric-pendiente-${order.orden}`}>
                          {formatCurrency(order.saldoPendiente)}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
      </div>

      {total > 0 && (
        <div className="p-4 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-sm text-muted-foreground">
            <p>Mostrando {offset + 1}-{Math.min(offset + limit, total)} de {total} órdenes</p>
          </div>
          
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(Math.max(0, offset - limit))}
              disabled={offset === 0}
              data-testid="pagination-previous"
            >
              <i className="fas fa-chevron-left mr-1"></i>
              Anterior
            </Button>
            
            <span className="flex items-center px-3 py-2 text-sm bg-primary text-primary-foreground rounded-lg">
              {currentPage}
            </span>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(offset + limit)}
              disabled={offset + limit >= total}
              data-testid="pagination-next"
            >
              Siguiente
              <i className="fas fa-chevron-right ml-1"></i>
            </Button>
          </div>
        </div>
      )}

      {/* Payment Modals */}
      <PagoInicialModal
        sale={selectedSale}
        open={pagoInicialModalOpen}
        onOpenChange={setPagoInicialModalOpen}
      />
      <FleteModal
        sale={selectedSale}
        open={fleteModalOpen}
        onOpenChange={setFleteModalOpen}
      />
      <PaymentInstallmentsModal
        sale={selectedSale}
        open={cuotasModalOpen}
        onOpenChange={setCuotasModalOpen}
      />
    </div>
  );
}
