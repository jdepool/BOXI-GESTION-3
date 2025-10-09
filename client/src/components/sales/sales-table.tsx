import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import SaleDetailModal from "./sale-detail-modal";
import AddressModal from "@/components/addresses/address-modal";
import FleteModal from "./flete-modal";
import EditSaleModal from "./edit-sale-modal";
import PaymentInstallmentsModal from "./payment-installments-modal";
import { MapPin, Truck, Edit, CalendarIcon, CreditCard, Mail } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
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
  showDeliveryDateColumn?: boolean;
  showCuotasButton?: boolean;
  filters?: any;
  extraExportParams?: Record<string, any>;
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
  showDeliveryDateColumn = false,
  showCuotasButton = false,
  filters: parentFilters,
  extraExportParams = {},
  onFilterChange,
  onPageChange,
  onEditSale,
  onVerifyPayment
}: SalesTableProps) {
  const { toast } = useToast();
  
  // Email sending mutation
  const sendEmailMutation = useMutation({
    mutationFn: async (saleId: string) => {
      const response = await apiRequest('POST', `/api/sales/${saleId}/send-email`);
      return await response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "¡Email enviado!",
        description: `Confirmación de pedido enviada a ${data.emailData.to}`,
        className: "bg-green-50 border-green-200 text-green-800",
      });
      // Refresh sales data to show green icon
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
    },
    onError: (error: any) => {
      console.error("Error sending email:", error);
      toast({
        title: "Error al enviar email",
        description: error.details || error.message || "Error desconocido al enviar el email",
        variant: "destructive",
      });
    },
  });

  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [selectedSaleForAddress, setSelectedSaleForAddress] = useState<Sale | null>(null);
  const [fleteModalOpen, setFleteModalOpen] = useState(false);
  const [selectedSaleForFlete, setSelectedSaleForFlete] = useState<Sale | null>(null);
  const [editSaleModalOpen, setEditSaleModalOpen] = useState(false);
  const [selectedSaleForEdit, setSelectedSaleForEdit] = useState<Sale | null>(null);
  const [installmentsModalOpen, setInstallmentsModalOpen] = useState(false);
  const [selectedSaleForInstallments, setSelectedSaleForInstallments] = useState<Sale | null>(null);
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [notesValue, setNotesValue] = useState<string>("");
  const filters = {
    canal: parentFilters?.canal ? (parentFilters.canal === "" ? "all" : parentFilters.canal) : "all",
    estadoEntrega: parentFilters?.estadoEntrega ? (parentFilters.estadoEntrega === "" ? "all" : parentFilters.estadoEntrega) : "all",
    asesorId: parentFilters?.asesorId ? (parentFilters.asesorId === "" ? "all" : parentFilters.asesorId) : "all",
    orden: parentFilters?.orden || "",
    startDate: parentFilters?.startDate || "",
    endDate: parentFilters?.endDate || ""
  };

  // Fetch banks data to display bank names
  const { data: banks = [] } = useQuery({
    queryKey: ["/api/admin/bancos"],
  });

  // Fetch asesores data for the dropdown
  const { data: asesores = [] } = useQuery({
    queryKey: ["/api/admin/asesores"],
  });

  const updateDeliveryStatusMutation = useMutation({
    mutationFn: async ({ saleId, status }: { saleId: string; status: string }) => {
      return apiRequest("PUT", `/api/sales/${saleId}/delivery-status`, { status });
    },
    onSuccess: () => {
      // Invalidate all sales queries to refresh data across all pages
      queryClient.invalidateQueries({ 
        predicate: (query) => Array.isArray(query.queryKey) && typeof query.queryKey[0] === 'string' && query.queryKey[0].startsWith('/api/sales')
      });
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

  const updateAsesorMutation = useMutation({
    mutationFn: async ({ saleId, asesorId }: { saleId: string; asesorId: string | null }) => {
      return apiRequest("PUT", `/api/sales/${saleId}/asesor`, { asesorId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      toast({
        title: "Asesor actualizado",
        description: "El asesor ha sido asignado correctamente.",
      });
    },
    onError: (error) => {
      console.error('Failed to update asesor:', error);
      toast({
        title: "Error",
        description: "No se pudo asignar el asesor.",
        variant: "destructive",
      });
    },
  });

  const updateTipoMutation = useMutation({
    mutationFn: async ({ saleId, tipo }: { saleId: string; tipo: string }) => {
      return apiRequest("PUT", `/api/sales/${saleId}/tipo`, { tipo });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => Array.isArray(query.queryKey) && typeof query.queryKey[0] === 'string' && query.queryKey[0].startsWith('/api/sales')
      });
      toast({
        title: "Tipo actualizado",
        description: "El tipo de venta ha sido actualizado correctamente.",
      });
    },
    onError: (error) => {
      console.error('Failed to update tipo:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el tipo de venta.",
        variant: "destructive",
      });
    },
  });

  const updateFechaEntregaMutation = useMutation({
    mutationFn: async ({ saleId, fechaEntrega }: { saleId: string; fechaEntrega: Date | null }) => {
      return apiRequest("PUT", `/api/sales/${saleId}/fecha-entrega`, { fechaEntrega: fechaEntrega?.toISOString() || null });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => Array.isArray(query.queryKey) && typeof query.queryKey[0] === 'string' && query.queryKey[0].startsWith('/api/sales')
      });
      toast({
        title: "Fecha de entrega actualizada",
        description: "La fecha de entrega ha sido actualizada correctamente.",
      });
    },
    onError: (error) => {
      console.error('Failed to update fecha entrega:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la fecha de entrega.",
        variant: "destructive",
      });
    },
  });

  const handleStatusChange = (saleId: string, newStatus: string) => {
    updateDeliveryStatusMutation.mutate({ saleId, status: newStatus });
  };

  const handleTipoChange = (saleId: string, newTipo: string) => {
    updateTipoMutation.mutate({ saleId, tipo: newTipo });
  };

  const handleFechaEntregaChange = (saleId: string, fechaEntrega: Date | null) => {
    updateFechaEntregaMutation.mutate({ saleId, fechaEntrega });
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
      
      // Use parentFilters (API-ready) instead of UI-mapped filters
      if (parentFilters && typeof parentFilters === 'object') {
        Object.entries(parentFilters).forEach(([key, value]) => {
          // Skip pagination and empty values
          if (value && typeof value === 'string' && key !== 'limit' && key !== 'offset') {
            queryParams.append(key, value);
          }
        });
      }
      
      // Add extra export parameters (for specific tab constraints)
      Object.entries(extraExportParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, value);
        }
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

              <Select 
                value={filters.asesorId} 
                onValueChange={(value) => handleFilterChange('asesorId', value)}
              >
                <SelectTrigger className="w-40" data-testid="filter-asesor">
                  <SelectValue placeholder="Todos los asesores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los asesores</SelectItem>
                  <SelectItem value="none">Sin asesor</SelectItem>
                  {(asesores as any[]).map((asesor: any) => (
                    <SelectItem key={asesor.id} value={asesor.id}>
                      {asesor.nombre}
                    </SelectItem>
                  ))}
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

      <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-280px)] bg-background">
        <div className="min-w-max">
          <table className="w-full min-w-[2560px] relative">
            <thead className="bg-muted sticky top-0 z-10">
              <tr>
                <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[100px] sticky left-0 bg-muted z-20 border-r border-border shadow-[2px_0_5px_rgba(0,0,0,0.1)]">Orden</th>
                <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[180px] sticky left-[100px] bg-muted z-20 border-r border-border shadow-[2px_0_5px_rgba(0,0,0,0.1)]">Nombre</th>
                <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[100px]">Cedula</th>
                <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[120px]">Telefono</th>
                <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[160px]">Email</th>
                <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[100px]">Total USD</th>
                <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[120px]">Total Orden USD</th>
                <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[90px]">Fecha</th>
                <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[80px]">Canal</th>
                <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[90px]">Tipo</th>
                <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[120px]">Asesor</th>
                <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[110px]">Pago Inicial USD</th>
                <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[120px]">Referencia</th>
                <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[100px]">Banco</th>
                <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[110px]">Monto Bs</th>
                <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[120px]">Estado Entrega</th>
                <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[140px]">Producto</th>
                <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[100px]">SKU</th>
                <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[80px]">Cantidad</th>
                {showDeliveryDateColumn && (
                  <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[130px]">Fecha Entrega</th>
                )}
                <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[120px]">Direcciones</th>
                <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[120px]">Flete</th>
                <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[150px]">Notas</th>
                <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[200px]">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan={22} className="text-center p-8 text-muted-foreground">
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
                    <td className="p-2 min-w-[120px] text-xs font-medium text-foreground">
                      {sale.totalOrderUsd ? `$${Number(sale.totalOrderUsd).toLocaleString()}` : 'N/A'}
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
                    <td className="p-2 min-w-[90px]">
                      <Select
                        value={sale.tipo || "Inmediato"}
                        onValueChange={(newTipo) => handleTipoChange(sale.id, newTipo)}
                        disabled={updateTipoMutation.isPending}
                      >
                        <SelectTrigger className="w-20 h-8 text-xs" data-testid={`tipo-select-${sale.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Inmediato">Inmediato</SelectItem>
                          <SelectItem value="Reserva">Reserva</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-2 min-w-[120px]">
                      <Select
                        value={sale.asesorId || "none"}
                        onValueChange={(asesorId) => updateAsesorMutation.mutate({ saleId: sale.id, asesorId: asesorId === "none" ? null : asesorId })}
                        disabled={updateAsesorMutation.isPending}
                      >
                        <SelectTrigger className="w-28 h-8 text-xs" data-testid={`asesor-select-${sale.id}`}>
                          <SelectValue placeholder="Sin asignar" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sin asignar</SelectItem>
                          {(asesores as any[]).map((asesor: any) => (
                            <SelectItem key={asesor.id} value={asesor.id}>
                              {asesor.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                    <td className="p-2 min-w-[100px] text-xs text-muted-foreground truncate" title={sale.sku || undefined} data-testid={`sku-${sale.id}`}>
                      {sale.sku || 'N/A'}
                    </td>
                    <td className="p-2 min-w-[80px] text-xs text-center font-medium text-foreground">
                      {sale.cantidad}
                    </td>
                    {showDeliveryDateColumn && (
                      <td className="p-2 min-w-[130px]">
                        <div className="relative">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className={cn(
                                  "h-8 w-full justify-start text-left font-normal text-xs",
                                  !sale.fechaEntrega && "text-muted-foreground"
                                )}
                                data-testid={`fecha-entrega-picker-${sale.id}`}
                                disabled={updateFechaEntregaMutation.isPending}
                              >
                                <CalendarIcon className="mr-2 h-3 w-3" />
                                {sale.fechaEntrega 
                                  ? format(new Date(sale.fechaEntrega), "dd/MM/yyyy")
                                  : "Seleccionar fecha"
                                }
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={sale.fechaEntrega 
                                  ? new Date(sale.fechaEntrega) 
                                  : undefined
                                }
                                onSelect={(date) => handleFechaEntregaChange(sale.id, date || null)}
                                initialFocus
                                disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                              />
                              {sale.fechaEntrega && (
                                <div className="p-2 border-t">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full text-xs"
                                    onClick={() => handleFechaEntregaChange(sale.id, null)}
                                    data-testid={`clear-fecha-entrega-${sale.id}`}
                                  >
                                    Limpiar fecha
                                  </Button>
                                </div>
                              )}
                            </PopoverContent>
                          </Popover>
                        </div>
                      </td>
                    )}
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
                        {showCuotasButton && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedSaleForInstallments(sale);
                              setInstallmentsModalOpen(true);
                            }}
                            data-testid={`button-cuotas-${sale.id}`}
                            className="h-7 text-xs"
                          >
                            <CreditCard className="h-3 w-3 mr-1" />
                            Cuotas
                          </Button>
                        )}
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
                        {sale.canal?.toLowerCase() === "manual" && sale.email && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => sendEmailMutation.mutate(sale.id)}
                            disabled={sendEmailMutation.isPending || !!sale.emailSentAt}
                            data-testid={`email-sale-${sale.id}`}
                            className="h-7 text-xs"
                            title={sale.emailSentAt ? `Email ya enviado` : `Enviar confirmación a ${sale.email}`}
                          >
                            <Mail className={cn("h-3 w-3 mr-1", sale.emailSentAt && "text-green-600")} />
                            {sendEmailMutation.isPending ? "Enviando..." : "Email"}
                          </Button>
                        )}
                        {showEditActions && (
                          <>
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

      <PaymentInstallmentsModal
        open={installmentsModalOpen}
        onOpenChange={(open) => {
          setInstallmentsModalOpen(open);
          if (!open) {
            setSelectedSaleForInstallments(null);
          }
        }}
        sale={selectedSaleForInstallments}
      />
    </>
  );
}
