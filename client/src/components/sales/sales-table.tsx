import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import SaleDetailModal from "./sale-detail-modal";
import AddressModal from "@/components/addresses/address-modal";
import FleteModal from "./flete-modal";
import EditSaleModal from "./edit-sale-modal";
import { MapPin, Truck, Edit } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Sale } from "@shared/schema";

interface SalesTableProps {
  data: Sale[];
  total?: number;
  limit?: number;
  offset?: number;
  isLoading: boolean;
  hideFilters?: boolean;
  hidePagination?: boolean;
  showEditActions?: boolean;
  filters?: any;
  onFilterChange?: (filters: any) => void;
  onPageChange?: (offset: number) => void;
  onEditSale?: (sale: Sale) => void;
  onVerifyPayment?: (sale: Sale) => void;
}

export default function SalesTable({ 
  data, 
  total = 0, 
  limit = 20, 
  offset = 0, 
  isLoading, 
  hideFilters = false,
  hidePagination = false,
  showEditActions = false,
  filters: parentFilters,
  onFilterChange,
  onPageChange,
  onEditSale,
  onVerifyPayment
}: SalesTableProps) {
  const { toast } = useToast();
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [selectedSaleForAddress, setSelectedSaleForAddress] = useState<Sale | null>(null);
  const [fleteModalOpen, setFleteModalOpen] = useState(false);
  const [selectedSaleForFlete, setSelectedSaleForFlete] = useState<Sale | null>(null);
  const [editSaleModalOpen, setEditSaleModalOpen] = useState(false);
  const [selectedSaleForEdit, setSelectedSaleForEdit] = useState<Sale | null>(null);
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [notesValue, setNotesValue] = useState<string>("");
  const filters = {
    canal: parentFilters?.canal ? (parentFilters.canal === "" ? "all" : parentFilters.canal) : "all",
    estadoEntrega: parentFilters?.estadoEntrega ? (parentFilters.estadoEntrega === "" ? "all" : parentFilters.estadoEntrega) : "all",
    orden: parentFilters?.orden || "",
    startDate: parentFilters?.startDate || "",
    endDate: parentFilters?.endDate || ""
  };

  // Fetch banks data to display bank names
  const { data: banks = [] } = useQuery({
    queryKey: ["/api/admin/bancos"],
  });

  const updateDeliveryStatusMutation = useMutation({
    mutationFn: async ({ saleId, status }: { saleId: string; status: string }) => {
      return apiRequest("PUT", `/api/sales/${saleId}/delivery-status`, { status });
    },
    onSuccess: () => {
      // Invalidate the sales query to refresh the data
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      toast({
        title: "Estado actualizado",
        description: "El estado de entrega ha sido actualizado correctamente.",
      });
    },
    onError: (error) => {
      console.error('Failed to update delivery status:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado de entrega.",
        variant: "destructive",
      });
    },
  });

  const updateNotesMutation = useMutation({
    mutationFn: async ({ saleId, notas }: { saleId: string; notas: string }) => {
      return apiRequest("PUT", `/api/sales/${saleId}/notes`, { notas });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      setEditingNotesId(null);
      toast({
        title: "Notas actualizadas",
        description: "Las notas han sido guardadas correctamente.",
      });
    },
    onError: (error) => {
      console.error('Failed to update notes:', error);
      toast({
        title: "Error",
        description: "No se pudieron actualizar las notas.",
        variant: "destructive",
      });
    },
  });

  const handleStatusChange = (saleId: string, newStatus: string) => {
    updateDeliveryStatusMutation.mutate({ saleId, status: newStatus });
  };

  const handleNotesClick = (sale: Sale) => {
    setEditingNotesId(sale.id);
    setNotesValue(sale.notas || "");
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length <= 150) {
      setNotesValue(value);
    }
  };

  const handleNotesBlur = () => {
    if (editingNotesId) {
      updateNotesMutation.mutate({ 
        saleId: editingNotesId, 
        notas: notesValue.trim() 
      });
    }
  };

  const handleNotesKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    } else if (e.key === 'Escape') {
      setEditingNotesId(null);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    // Convert "all" back to empty string for API
    const apiValue = value === "all" ? "" : value;
    const newFilters = { 
      ...parentFilters, 
      [key]: apiValue,
      offset: 0 // Reset to first page when filtering
    };
    onFilterChange?.(newFilters);
  };

  const handleExport = async () => {
    try {
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });

      const response = await fetch(`/api/sales/export?${queryParams}`);
      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ventas_boxisleep_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  const getChannelBadgeClass = (canal: string) => {
    switch (canal) {
      case 'cashea': return 'channel-badge-cashea';
      case 'shopify': return 'channel-badge-shopify';
      case 'treble': return 'channel-badge-treble';
      default: return 'bg-gray-500';
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'entregado': return 'status-badge-completed';
      case 'pendiente': return 'status-badge-pending';
      case 'reservado': return 'status-badge-reserved';
      default: return 'bg-gray-500';
    }
  };

  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center space-x-4 p-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-8" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      {!hideFilters && (
        <div className="p-6 border-b border-border">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h3 className="text-lg font-semibold text-foreground">Datos de Ventas</h3>
            
            <div className="flex flex-wrap gap-3">
              <Select 
                value={filters.canal} 
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

              <Select 
                value={filters.estadoEntrega} 
                onValueChange={(value) => handleFilterChange('estadoEntrega', value)}
              >
                <SelectTrigger className="w-40" data-testid="filter-status">
                  <SelectValue placeholder="Todos los estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="Pendiente">Pendiente</SelectItem>
                  <SelectItem value="En Proceso">En Proceso</SelectItem>
                  <SelectItem value="A Despachar">A Despachar</SelectItem>
                  <SelectItem value="Despachado">Despachado</SelectItem>
                  <SelectItem value="Cancelado">Cancelado</SelectItem>
                  <SelectItem value="Pospuesto">Pospuesto</SelectItem>
                </SelectContent>
              </Select>

              <Input 
                type="text"
                placeholder="Buscar por # orden"
                value={filters.orden}
                onChange={(e) => handleFilterChange('orden', e.target.value)}
                className="w-40"
                data-testid="filter-order-number"
              />

              <Input 
                type="date" 
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="w-40"
                data-testid="filter-start-date"
              />

              <Input 
                type="date" 
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="w-40"
                data-testid="filter-end-date"
              />

              <Button variant="outline" onClick={handleExport} data-testid="export-button">
                <i className="fas fa-download mr-2"></i>
                Exportar
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto bg-background">
        <div className="min-w-max">
          <table className="w-full min-w-[2460px] relative">
            <thead className="bg-muted sticky top-0 z-10">
              <tr>
                <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[100px] sticky left-0 bg-muted z-20 border-r border-border shadow-[2px_0_5px_rgba(0,0,0,0.1)]">Orden</th>
                <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[180px] sticky left-[100px] bg-muted z-20 border-r border-border shadow-[2px_0_5px_rgba(0,0,0,0.1)]">Nombre</th>
                <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[100px]">Cedula</th>
                <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[120px]">Telefono</th>
                <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[160px]">Email</th>
                <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[100px]">Total USD</th>
                <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[90px]">Fecha</th>
                <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[80px]">Canal</th>
                <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[110px]">Pago Inicial USD</th>
                <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[120px]">Referencia</th>
                <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[100px]">Banco</th>
                <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[110px]">Monto Bs</th>
                <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[120px]">Estado Entrega</th>
                <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[140px]">Producto</th>
                <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[80px]">Cantidad</th>
                <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[120px]">Direcciones</th>
                <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[120px]">Flete</th>
                <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[150px]">Notas</th>
                <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[200px]">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan={19} className="text-center p-8 text-muted-foreground">
                    No hay datos disponibles
                  </td>
                </tr>
              ) : (
                data.map((sale) => (
                  <tr 
                    key={sale.id} 
                    className="border-b border-border hover:bg-muted/50 transition-colors text-xs"
                    data-testid={`sale-row-${sale.id}`}
                  >
                    <td className="p-2 min-w-[100px] text-xs font-mono text-muted-foreground truncate sticky left-0 bg-background z-10 border-r border-border shadow-[2px_0_5px_rgba(0,0,0,0.1)]" title={sale.orden || undefined}>
                      {sale.orden || 'N/A'}
                    </td>
                    <td className="p-2 min-w-[180px] text-xs font-medium text-foreground truncate sticky left-[100px] bg-background z-10 border-r border-border shadow-[2px_0_5px_rgba(0,0,0,0.1)]" title={sale.nombre}>
                      {sale.nombre}
                    </td>
                    <td className="p-2 min-w-[100px] text-xs text-muted-foreground truncate">
                      {sale.cedula || 'N/A'}
                    </td>
                    <td className="p-2 min-w-[120px] text-xs text-muted-foreground truncate">
                      {sale.telefono || 'N/A'}
                    </td>
                    <td className="p-2 min-w-[160px] text-xs text-muted-foreground truncate" title={sale.email || undefined}>
                      {sale.email || 'N/A'}
                    </td>
                    <td className="p-2 min-w-[100px] text-xs font-medium text-foreground">
                      ${Number(sale.totalUsd).toLocaleString()}
                    </td>
                    <td className="p-2 min-w-[90px] text-xs text-muted-foreground">
                      {new Date(sale.fecha).toLocaleDateString('es-ES', { 
                        day: '2-digit', 
                        month: '2-digit', 
                        year: '2-digit' 
                      })}
                    </td>
                    <td className="p-2 min-w-[80px]">
                      <Badge className={`${getChannelBadgeClass(sale.canal)} text-white text-xs`}>
                        {sale.canal.charAt(0).toUpperCase() + sale.canal.slice(1)}
                      </Badge>
                    </td>
                    <td className="p-2 min-w-[110px] text-xs text-muted-foreground">
                      {sale.pagoInicialUsd ? `$${Number(sale.pagoInicialUsd).toLocaleString()}` : 'N/A'}
                    </td>
                    <td className="p-2 min-w-[120px] text-xs font-mono text-muted-foreground truncate" title={sale.referencia || undefined}>
                      {sale.referencia || 'N/A'}
                    </td>
                    <td className="p-2 min-w-[100px] text-xs text-muted-foreground truncate">
                      {(() => {
                        if (!sale.bancoId) return 'N/A';
                        if (sale.bancoId === 'otro') return 'Otro($)';
                        const bank = (banks as any[]).find((b: any) => b.id === sale.bancoId);
                        return bank ? bank.banco : 'N/A';
                      })()}
                    </td>
                    <td className="p-2 min-w-[110px] text-xs text-muted-foreground">
                      {sale.montoBs ? `Bs ${Number(sale.montoBs).toLocaleString()}` : 'N/A'}
                    </td>
                    <td className="p-2 min-w-[140px]">
                      <Select
                        value={sale.estadoEntrega}
                        onValueChange={(newStatus) => handleStatusChange(sale.id, newStatus)}
                        disabled={updateDeliveryStatusMutation.isPending}
                      >
                        <SelectTrigger className="w-32 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pendiente">Pendiente</SelectItem>
                          <SelectItem value="En Proceso">En Proceso</SelectItem>
                          <SelectItem value="A Despachar">A despachar</SelectItem>
                          <SelectItem value="Despachado">Despachado</SelectItem>
                          <SelectItem value="Cancelado">Cancelado</SelectItem>
                          <SelectItem value="Pospuesto">Pospuesto</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-2 min-w-[140px] text-xs font-medium text-foreground truncate" title={sale.product}>
                      {sale.product}
                    </td>
                    <td className="p-2 min-w-[80px] text-xs text-center font-medium text-foreground">
                      {sale.cantidad}
                    </td>
                    <td className="p-2 min-w-[120px]">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedSaleForAddress(sale);
                          setAddressModalOpen(true);
                        }}
                        data-testid={`add-address-${sale.id}`}
                        className="h-7 text-xs"
                      >
                        <MapPin className="h-3 w-3 mr-1" />
                        {sale.direccionFacturacionPais ? 'Editar' : 'Agregar'}
                      </Button>
                    </td>
                    <td className="p-2 min-w-[120px]">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedSaleForFlete(sale);
                          setFleteModalOpen(true);
                        }}
                        data-testid={`add-flete-${sale.id}`}
                        className={`h-7 text-xs ${
                          (() => {
                            // Helper to safely convert values to numbers
                            const toNum = (v: any): number => {
                              if (typeof v === 'number') return v;
                              if (typeof v === 'string') {
                                const cleaned = v.replace(/[^0-9.-]/g, '');
                                return parseFloat(cleaned) || 0;
                              }
                              return 0;
                            };
                            
                            // Helper to check if freight is complete
                            const hasPrice = toNum(sale.montoFleteUsd) > 0;
                            const isComplete = Boolean(sale.fechaFlete) && 
                                             !!(sale.referenciaFlete?.trim()) && 
                                             toNum(sale.montoFleteVes) > 0 && 
                                             !!String(sale.bancoReceptorFlete ?? '').trim();
                            
                            if (hasPrice && !isComplete) {
                              return 'bg-orange-500 hover:bg-orange-600 text-white border-orange-500';
                            }
                            // Si está vacío o completo: blanco (outline default)
                            return '';
                          })()
                        }`}
                      >
                        <Truck className={`h-3 w-3 mr-1 ${
                          (() => {
                            // Si tiene status manual, usar ese status
                            if (sale.statusFlete) {
                              return sale.statusFlete === 'Pendiente' ? 'text-orange-500' : '';
                            }
                            // Lógica automática: solo naranja si tiene USD pero no está completo
                            return sale.montoFleteUsd && (!sale.fechaFlete || !sale.referenciaFlete || !sale.montoFleteVes || !sale.bancoReceptorFlete) 
                              ? 'text-orange-500' 
                              : '';
                          })()
                        }`} />
                        {sale.montoFleteUsd || sale.fechaFlete || sale.referenciaFlete || sale.montoFleteVes || sale.bancoReceptorFlete || sale.fleteGratis ? 'Editar' : 'Agregar'}
                      </Button>
                    </td>
                    <td className="p-2 min-w-[150px]">
                      {editingNotesId === sale.id ? (
                        <Input
                          value={notesValue}
                          onChange={handleNotesChange}
                          onBlur={handleNotesBlur}
                          onKeyDown={handleNotesKeyDown}
                          maxLength={150}
                          placeholder="Agregar nota..."
                          className="h-7 text-xs"
                          autoFocus
                          data-testid={`notes-input-${sale.id}`}
                        />
                      ) : (
                        <div 
                          className="text-xs text-muted-foreground truncate cursor-pointer hover:bg-muted/50 rounded px-2 py-1 min-h-[28px] flex items-center"
                          title={sale.notas || "Click para agregar nota"}
                          onClick={() => handleNotesClick(sale)}
                          data-testid={`notes-display-${sale.id}`}
                        >
                          {sale.notas || 'Click para agregar nota'}
                        </div>
                      )}
                    </td>
                    <td className="p-2 min-w-[200px]">
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedSaleForEdit(sale);
                            setEditSaleModalOpen(true);
                          }}
                          data-testid={`edit-sale-${sale.id}`}
                          className="h-7 text-xs"
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Editar
                        </Button>
                        {showEditActions && (
                          <>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => onEditSale?.(sale)}
                              data-testid={`manual-edit-sale-${sale.id}`}
                              className="h-7 px-2 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                              title="Editar venta manual"
                            >
                              <i className="fas fa-edit text-xs mr-1"></i>
                              Manual
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => onVerifyPayment?.(sale)}
                              data-testid={`verify-payment-${sale.id}`}
                              className="h-7 px-2 text-xs bg-green-600 hover:bg-green-700 text-white"
                              title="Verificar pago"
                            >
                              <i className="fas fa-check text-xs mr-1"></i>
                              Verificado
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedSale(sale)}
                          data-testid={`view-sale-${sale.id}`}
                          className="h-6 w-6 p-0"
                          title="Ver detalles"
                        >
                          <i className="fas fa-eye text-xs"></i>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {!hidePagination && total > 0 && (
        <div className="p-4 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-sm text-muted-foreground">
            <p>Mostrando {offset + 1}-{Math.min(offset + limit, total)} de {total} registros</p>
            <p className="text-xs">💡 Desliza horizontalmente para ver todas las columnas de la tabla</p>
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

      <SaleDetailModal 
        sale={selectedSale} 
        onClose={() => setSelectedSale(null)} 
      />

      <AddressModal
        open={addressModalOpen}
        onOpenChange={(open) => {
          setAddressModalOpen(open);
          if (!open) {
            setSelectedSaleForAddress(null);
          }
        }}
        sale={selectedSaleForAddress}
      />

      <FleteModal
        open={fleteModalOpen}
        onOpenChange={(open) => {
          setFleteModalOpen(open);
          if (!open) {
            setSelectedSaleForFlete(null);
          }
        }}
        sale={selectedSaleForFlete}
      />

      <EditSaleModal
        open={editSaleModalOpen}
        onOpenChange={(open) => {
          setEditSaleModalOpen(open);
          if (!open) {
            setSelectedSaleForEdit(null);
          }
        }}
        sale={selectedSaleForEdit}
      />
    </>
  );
}
