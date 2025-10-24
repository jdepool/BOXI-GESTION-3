import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DateRangePicker } from "@/components/shared/date-range-picker";
import SaleDetailModal from "./sale-detail-modal";
import AddressModal from "@/components/addresses/address-modal";
import EditSaleModal from "./edit-sale-modal";
import SeguimientoDialogOrden from "@/components/sales/seguimiento-dialog-orden";
import { MapPin, Edit, CalendarIcon, Filter, ChevronDown, ChevronUp, Download, ChevronLeft, ChevronRight, RotateCcw, XCircle, Gift, Eye, Plus, Truck } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format, parse } from "date-fns";
import { cn } from "@/lib/utils";
import { getSeguimientoStatusOrden } from "@/lib/seguimiento-utils";
import type { Sale, SeguimientoConfig } from "@shared/schema";

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
  showSeguimientoColumns?: boolean;
  hideEstadoEntregaFilter?: boolean;
  filters?: any;
  extraExportParams?: Record<string, any>;
  onFilterChange?: (filters: any) => void;
  onPageChange?: (offset: number) => void;
  onEditSale?: (sale: Sale) => void;
  activeTab?: string;
  onNewManualSale?: () => void;
  onNewReserva?: () => void;
  onClearFilters?: () => void;
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
  showSeguimientoColumns = false,
  hideEstadoEntregaFilter = false,
  filters: parentFilters,
  extraExportParams = {},
  onFilterChange,
  onPageChange,
  onEditSale,
  activeTab,
  onNewManualSale,
  onNewReserva,
  onClearFilters
}: SalesTableProps) {
  const { toast } = useToast();
  
  // Check if any filters are active
  const hasActiveFilters = !!(
    parentFilters?.canal || 
    parentFilters?.estadoEntrega || 
    parentFilters?.asesorId || 
    parentFilters?.orden || 
    parentFilters?.startDate || 
    parentFilters?.endDate
  );
  
  // Cancel sale mutation
  const cancelSaleMutation = useMutation({
    mutationFn: async (saleId: string) => {
      return apiRequest("PUT", `/api/sales/${saleId}/cancel`, {});
    },
    onSuccess: () => {
      // Invalidate all sales queries to refresh data across all pages
      queryClient.invalidateQueries({ 
        predicate: (query) => Array.isArray(query.queryKey) && typeof query.queryKey[0] === 'string' && query.queryKey[0].startsWith('/api/sales')
      });
      toast({
        title: "Venta cancelada",
        description: "La venta ha sido marcada como cancelada",
      });
      setCancelConfirmOpen(false);
      setSelectedSaleForCancel(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo cancelar la venta",
        variant: "destructive",
      });
    },
  });

  // Return sale mutation
  const returnSaleMutation = useMutation({
    mutationFn: async (saleId: string) => {
      return apiRequest("PUT", `/api/sales/${saleId}/return`, {});
    },
    onSuccess: () => {
      // Invalidate all sales queries to refresh data across all pages
      queryClient.invalidateQueries({ 
        predicate: (query) => Array.isArray(query.queryKey) && typeof query.queryKey[0] === 'string' && query.queryKey[0].startsWith('/api/sales')
      });
      toast({
        title: "Venta marcada a devolver",
        description: "La venta ha sido marcada como a devolver",
      });
      setReturnConfirmOpen(false);
      setSelectedSaleForReturn(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo marcar la venta como a devolver",
        variant: "destructive",
      });
    },
  });

  // Mark as delivered mutation
  const markDeliveredMutation = useMutation({
    mutationFn: async (saleId: string) => {
      return apiRequest("PUT", `/api/sales/${saleId}/delivery-status`, { status: "Entregado" });
    },
    onSuccess: () => {
      // Invalidate all sales queries to refresh data across all pages
      queryClient.invalidateQueries({ 
        predicate: (query) => Array.isArray(query.queryKey) && typeof query.queryKey[0] === 'string' && query.queryKey[0].startsWith('/api/sales')
      });
      toast({
        title: "Venta entregada",
        description: "El estado de la venta ha sido actualizado a Entregado",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado de la venta",
        variant: "destructive",
      });
    },
  });

  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [selectedSaleForAddress, setSelectedSaleForAddress] = useState<Sale | null>(null);
  const [editSaleModalOpen, setEditSaleModalOpen] = useState(false);
  const [selectedSaleForEdit, setSelectedSaleForEdit] = useState<Sale | null>(null);
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [notesValue, setNotesValue] = useState<string>("");
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [returnConfirmOpen, setReturnConfirmOpen] = useState(false);
  const [selectedSaleForCancel, setSelectedSaleForCancel] = useState<Sale | null>(null);
  const [selectedSaleForReturn, setSelectedSaleForReturn] = useState<Sale | null>(null);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [seguimientoDialogOpen, setSeguimientoDialogOpen] = useState(false);
  const [selectedSaleForSeguimiento, setSelectedSaleForSeguimiento] = useState<Sale | null>(null);
  
  // Debounced order filter - local state for immediate UI updates
  const [orderInputValue, setOrderInputValue] = useState(parentFilters?.orden || "");
  
  const filters = {
    canal: parentFilters?.canal || "",
    estadoEntrega: parentFilters?.estadoEntrega || "",
    asesorId: parentFilters?.asesorId || "",
    orden: parentFilters?.orden || "",
    startDate: parentFilters?.startDate || "",
    endDate: parentFilters?.endDate || ""
  };

  // Debounce order filter - trigger API call 500ms after user stops typing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (orderInputValue !== parentFilters?.orden) {
        handleFilterChange('orden', orderInputValue);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [orderInputValue]);

  // Sync input value when parent filter changes (e.g., on clear filters)
  useEffect(() => {
    setOrderInputValue(parentFilters?.orden || "");
  }, [parentFilters?.orden]);

  // Fetch banks data to display bank names
  const { data: banks = [] } = useQuery({
    queryKey: ["/api/admin/bancos"],
  });

  // Fetch asesores data for the dropdown
  const { data: asesores = [] } = useQuery({
    queryKey: ["/api/admin/asesores"],
  });

  // Fetch canales data for the dropdown
  const { data: canales = [] } = useQuery<Array<{ id: string; nombre: string; activo: boolean }>>({
    queryKey: ["/api/admin/canales"],
  });

  // Fetch seguimiento config for 'ordenes' (only when showSeguimientoColumns is true)
  const { data: seguimientoConfig } = useQuery<SeguimientoConfig>({
    queryKey: ["/api/admin/seguimiento-config", "ordenes"],
    enabled: showSeguimientoColumns,
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
      queryClient.invalidateQueries({ 
        predicate: (query) => Array.isArray(query.queryKey) && typeof query.queryKey[0] === 'string' && query.queryKey[0].startsWith('/api/sales')
      });
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

  // Seguimiento mutation - updates ALL sales with same order number
  const saveSeguimientoOrdenMutation = useMutation({
    mutationFn: async ({ orden, seguimientoData }: { orden: string; seguimientoData: any }) => {
      if (!orden || orden.trim() === '') {
        throw new Error('Order number is required');
      }
      return apiRequest("PATCH", `/api/sales/seguimiento/${encodeURIComponent(orden)}`, seguimientoData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => Array.isArray(query.queryKey) && typeof query.queryKey[0] === 'string' && query.queryKey[0].startsWith('/api/sales')
      });
      toast({
        title: "Seguimiento actualizado",
        description: "El seguimiento de la orden ha sido actualizado correctamente.",
      });
      setSeguimientoDialogOpen(false);
      setSelectedSaleForSeguimiento(null);
    },
    onError: (error) => {
      console.error('Failed to update seguimiento:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el seguimiento de la orden.",
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
    if (value.length <= 200) {
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
    const newFilters = { 
      ...parentFilters, 
      [key]: value === "all" ? "" : value,
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
    switch (canal?.toLowerCase()) {
      case 'cashea': return 'channel-badge-cashea';
      case 'shopify': return 'channel-badge-shopify';
      case 'treble': return 'channel-badge-treble';
      case 'tienda': return 'channel-badge-tienda';
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
        <>
          {/* Top toolbar - consistent across all tabs */}
          <div className="p-3 border-b border-border flex items-center justify-between">
            {/* Left side - context-specific action buttons */}
            <div>
              {activeTab === "manual" && onNewManualSale && (
                <Button onClick={onNewManualSale} data-testid="button-nueva-venta-manual">
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Venta Manual
                </Button>
              )}
              {activeTab === "reservas" && onNewReserva && (
                <Button onClick={onNewReserva} data-testid="button-nueva-reserva-manual">
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Reserva Manual
                </Button>
              )}
            </div>
            
            {/* Right side - filter toggle and export buttons */}
            <div className="flex items-center gap-2">
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
              
              {hasActiveFilters && onClearFilters && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={onClearFilters}
                        data-testid="clear-filters-button"
                        className="text-muted-foreground"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Limpiar Filtros</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              
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
          </div>
          
          {/* Filter section - collapsible for all tabs */}
          {filtersVisible && (
            <div className="p-6 border-b border-border">
              <div className="flex flex-wrap gap-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">Canal:</label>
                  <Select 
                    value={filters.canal || "all"} 
                    onValueChange={(value) => handleFilterChange('canal', value)}
                  >
                    <SelectTrigger className="w-40" data-testid="filter-channel">
                      <SelectValue placeholder="Todos los canales" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los canales</SelectItem>
                      {canales
                        .filter(canal => canal.activo !== false)
                        .map(canal => (
                          <SelectItem key={canal.id} value={canal.nombre.toLowerCase()}>
                            {canal.nombre}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {!hideEstadoEntregaFilter && (
                  <div>
                    <label className="text-sm font-medium mb-1 block">Estado de Entrega:</label>
                    <Select 
                      value={filters.estadoEntrega || "all"} 
                      onValueChange={(value) => handleFilterChange('estadoEntrega', value)}
                    >
                      <SelectTrigger className="w-40" data-testid="filter-status">
                        <SelectValue placeholder="Todos los estados" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los estados</SelectItem>
                        <SelectItem value="En proceso">En proceso</SelectItem>
                        <SelectItem value="A despachar">A despachar</SelectItem>
                        <SelectItem value="En tránsito">En tránsito</SelectItem>
                        <SelectItem value="Entregado">Entregado</SelectItem>
                        <SelectItem value="A devolver">A devolver</SelectItem>
                        <SelectItem value="Devuelto">Devuelto</SelectItem>
                        <SelectItem value="Cancelada">Cancelada</SelectItem>
                        <SelectItem value="Despachado">Despachado</SelectItem>
                        <SelectItem value="Retirado en tienda">Retirado en tienda</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium mb-1 block">Asesor:</label>
                  <Select 
                    value={filters.asesorId || "all"} 
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
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Orden:</label>
                  <Input 
                    type="text"
                    placeholder="Buscar por # orden"
                    value={orderInputValue}
                    onChange={(e) => setOrderInputValue(e.target.value)}
                    className="w-40"
                    data-testid="filter-order-number"
                  />
                </div>

                <DateRangePicker
                  startDate={filters.startDate}
                  endDate={filters.endDate}
                  onStartDateChange={(date) => handleFilterChange('startDate', date)}
                  onEndDateChange={(date) => handleFilterChange('endDate', date)}
                />
              </div>
            </div>
          )}
        </>
      )}
      <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-280px)] bg-background">
        <div className="min-w-max">
          <table className="w-full min-w-[2560px] relative">
            <thead className="bg-muted sticky top-0 z-10">
              <tr>
                <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[100px] sticky left-0 bg-muted z-20 border-r border-border shadow-[2px_0_5px_rgba(0,0,0,0.1)]">Orden</th>
                <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[180px] sticky left-[100px] bg-muted z-20 border-r border-border shadow-[2px_0_5px_rgba(0,0,0,0.1)]">Nombre</th>
                <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[90px]">Fecha</th>
                <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[80px]">Canal</th>
                <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[90px]">Tipo</th>
                <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[120px]">Estado Entrega</th>
                <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[120px]">Total Orden USD</th>
                <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[100px]">Total USD</th>
                <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[140px]">Producto</th>
                <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[100px]">SKU</th>
                <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[80px]">Cantidad</th>
                {activeTab !== "manual" && activeTab !== "reservas" && (
                  <>
                    <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[110px]">Pago Inicial/Total USD</th>
                    <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[120px]">Referencia</th>
                    <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[100px]">Banco</th>
                    <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[110px]">Monto Bs</th>
                  </>
                )}
                <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[100px]">Cedula</th>
                <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[120px]">Telefono</th>
                <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[160px]">Email</th>
                {showDeliveryDateColumn && (
                  <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[130px]">Fecha Entrega</th>
                )}
                <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[120px]">Direcciones</th>
                <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[120px]">Asesor</th>
                <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[150px]">Notas</th>
                {showSeguimientoColumns && (
                  <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[90px]">Próximo</th>
                )}
                <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[200px]">Acciones</th>
                {activeTab === "lista" && (
                  <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[180px]"></th>
                )}
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan={
                    (showDeliveryDateColumn ? 1 : 0) + 
                    (showSeguimientoColumns ? 1 : 0) + 
                    (activeTab === "lista" ? 24 : 23) -
                    ((activeTab === "manual" || activeTab === "reservas") ? 4 : 0)
                  } className="text-center p-8 text-muted-foreground">
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
                    <td className="p-2 min-w-[90px] text-xs text-muted-foreground">
                      {(() => {
                        // Extract date part from ISO timestamp to avoid timezone shifts
                        const dateStr = sale.fecha.toString();
                        const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
                        if (match) {
                          const [, year, month, day] = match;
                          return `${day}/${month}/${year.slice(2)}`;
                        }
                        return dateStr;
                      })()}
                    </td>
                    <td className="p-2 min-w-[80px]">
                      <Badge className="inline-flex items-center rounded-md border px-2.5 py-0.5 font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent shadow hover:bg-primary/80 text-white text-xs bg-[#51675d]">
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
                        value={sale.estadoEntrega}
                        onValueChange={(newStatus) => handleStatusChange(sale.id, newStatus)}
                        disabled={updateDeliveryStatusMutation.isPending}
                      >
                        <SelectTrigger className="w-32 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pendiente">Pendiente</SelectItem>
                          <SelectItem value="Perdida">Perdida</SelectItem>
                          <SelectItem value="En proceso">En proceso</SelectItem>
                          <SelectItem value="A despachar">A despachar</SelectItem>
                          <SelectItem value="En tránsito">En tránsito</SelectItem>
                          <SelectItem value="Entregado">Entregado</SelectItem>
                          <SelectItem value="A devolver">A devolver</SelectItem>
                          <SelectItem value="Devuelto">Devuelto</SelectItem>
                          <SelectItem value="Cancelada">Cancelada</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-2 min-w-[120px] text-xs font-medium text-foreground">
                      {sale.totalOrderUsd != null ? `$${Number(sale.totalOrderUsd).toLocaleString()}` : 'N/A'}
                    </td>
                    <td className="p-2 min-w-[100px] text-xs font-medium text-foreground">
                      ${Number(sale.totalUsd).toLocaleString()}
                    </td>
                    <td className="p-2 min-w-[140px] text-xs font-medium text-foreground" title={sale.product}>
                      <div className="flex items-center gap-1">
                        {sale.esObsequio && (
                          <Gift className="h-3.5 w-3.5 text-pink-500 flex-shrink-0" />
                        )}
                        <span className="truncate">{sale.product}</span>
                      </div>
                    </td>
                    <td className="p-2 min-w-[100px] text-xs text-muted-foreground truncate" title={sale.sku || undefined} data-testid={`sku-${sale.id}`}>
                      {sale.sku || 'N/A'}
                    </td>
                    <td className="p-2 min-w-[80px] text-xs text-center font-medium text-foreground">
                      {sale.cantidad}
                    </td>
                    {activeTab !== "manual" && activeTab !== "reservas" && (
                      <>
                        <td className="p-2 min-w-[110px] text-xs text-muted-foreground">
                          {sale.pagoInicialUsd ? `$${Number(sale.pagoInicialUsd).toLocaleString()}` : 'N/A'}
                        </td>
                        <td className="p-2 min-w-[120px] text-xs font-mono text-muted-foreground truncate" title={sale.referenciaInicial || undefined}>
                          {sale.referenciaInicial || 'N/A'}
                        </td>
                        <td className="p-2 min-w-[100px] text-xs text-muted-foreground truncate">
                          {(() => {
                            if (!sale.bancoReceptorInicial) return 'N/A';
                            if (sale.bancoReceptorInicial === 'otro') return 'Otro($)';
                            const bank = (banks as any[]).find((b: any) => b.id === sale.bancoReceptorInicial);
                            return bank ? bank.banco : 'N/A';
                          })()}
                        </td>
                        <td className="p-2 min-w-[110px] text-xs text-muted-foreground">
                          {sale.montoInicialBs ? `Bs ${Number(sale.montoInicialBs).toLocaleString()}` : 'N/A'}
                        </td>
                      </>
                    )}
                    <td className="p-2 min-w-[100px] text-xs text-muted-foreground truncate">
                      {sale.cedula || 'N/A'}
                    </td>
                    <td className="p-2 min-w-[120px] text-xs text-muted-foreground truncate">
                      {sale.telefono || 'N/A'}
                    </td>
                    <td className="p-2 min-w-[160px] text-xs text-muted-foreground truncate" title={sale.email || undefined}>
                      {sale.email || 'N/A'}
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
                                <CalendarIcon className={cn(
                                  "mr-2 h-3 w-3",
                                  !sale.fechaEntrega && "text-amber-500"
                                )} />
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
                        <MapPin className={cn(
                          "h-3 w-3 mr-1",
                          !sale.direccionFacturacionPais && "text-amber-500"
                        )} />
                        {sale.direccionFacturacionPais ? 'Editar' : 'Agregar'}
                      </Button>
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
                    <td className="p-2 min-w-[150px]">
                      {editingNotesId === sale.id ? (
                        <Input
                          value={notesValue}
                          onChange={handleNotesChange}
                          onBlur={handleNotesBlur}
                          onKeyDown={handleNotesKeyDown}
                          maxLength={200}
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
                    {showSeguimientoColumns && (
                      <td className="p-2 min-w-[90px]">
                        {(() => {
                          const { phase, status, dateStr } = getSeguimientoStatusOrden(
                            sale,
                            seguimientoConfig?.diasFase1 ?? 2,
                            seguimientoConfig?.diasFase2 ?? 4,
                            seguimientoConfig?.diasFase3 ?? 7
                          );
                          
                          if (!status || !phase) {
                            return <span className="text-xs text-muted-foreground">-</span>;
                          }
                          
                          const badgeClass = status === "overdue" 
                            ? "bg-red-500 hover:bg-red-600" 
                            : status === "today" 
                            ? "bg-yellow-500 hover:bg-yellow-600" 
                            : "bg-green-500 hover:bg-green-600";
                          
                          return (
                            <div className="flex items-center gap-2">
                              <Badge className={`${badgeClass} text-white font-semibold px-2 py-1`}>
                                {phase}
                              </Badge>
                              {status === "future" && dateStr && (
                                <span className="text-xs text-muted-foreground">
                                  {(() => {
                                    const [year, month, day] = dateStr.split('-');
                                    return `${day}/${month}`;
                                  })()}
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                    )}
                    <td className="p-2 min-w-[200px]">
                      <div className="flex gap-1">
                        {showSeguimientoColumns && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedSaleForSeguimiento(sale);
                              setSeguimientoDialogOpen(true);
                            }}
                            disabled={!sale.orden}
                            data-testid={`seguimiento-orden-${sale.id}`}
                            className="h-7 text-xs"
                            title="Seguimiento"
                          >
                            <CalendarIcon className="h-3 w-3 mr-1" />
                            Seguimiento
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
                        {activeTab === "lista" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedSale(sale)}
                            data-testid={`view-sale-${sale.id}`}
                            className="h-7 w-7 p-0"
                            title="Ver detalles"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                    {activeTab === "lista" && (
                      <td className="pl-16 pr-2 py-2 min-w-[240px]">
                        <div className="flex gap-1">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={sale.estadoEntrega === "Entregado" || markDeliveredMutation.isPending}
                                data-testid={`delivered-sale-${sale.id}`}
                                className={cn(
                                  "h-7 text-xs bg-green-600 text-white border-green-600 hover:bg-green-700 hover:border-green-700 dark:bg-green-600 dark:text-white dark:border-green-600 dark:hover:bg-green-700",
                                  sale.estadoEntrega === "Entregado" && "bg-green-800 text-white hover:bg-green-800 opacity-70 cursor-not-allowed border-green-700"
                                )}
                                title={sale.estadoEntrega === "Entregado" ? "Venta ya entregada" : "Marcar como entregado"}
                              >
                                <Truck className={cn("h-3 w-3 mr-1", sale.estadoEntrega === "Entregado" && "text-green-400")} />
                                Entregado
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirmar entrega</AlertDialogTitle>
                                <AlertDialogDescription>¿Está seguro que desea marcar esta orden como entregada? Esta acción cambiará el Estado de Entrega, la eliminará de la vista de Despacho pero permanecerá en Lista de Ventas.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel data-testid={`cancel-delivered-${sale.id}`}>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => markDeliveredMutation.mutate(sale.id)}
                                  data-testid={`confirm-delivered-${sale.id}`}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  Confirmar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedSaleForReturn(sale);
                              setReturnConfirmOpen(true);
                            }}
                            disabled={sale.estadoEntrega === "A devolver" || returnSaleMutation.isPending}
                            data-testid={`return-sale-${sale.id}`}
                            className={cn(
                              "h-7 text-xs bg-slate-500 text-white border-slate-500 hover:bg-slate-600 hover:border-slate-600 dark:bg-slate-500 dark:text-white dark:border-slate-500 dark:hover:bg-slate-600",
                              sale.estadoEntrega === "A devolver" && "opacity-70 cursor-not-allowed hover:bg-slate-500"
                            )}
                            title={sale.estadoEntrega === "A devolver" ? "Venta ya marcada a devolver" : "Marcar como a devolver"}
                          >
                            <RotateCcw className="h-3 w-3 mr-1" />
                            Devolver
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              setSelectedSaleForCancel(sale);
                              setCancelConfirmOpen(true);
                            }}
                            disabled={sale.estadoEntrega === "Cancelada" || cancelSaleMutation.isPending}
                            data-testid={`cancel-sale-${sale.id}`}
                            className={cn(
                              "h-7 text-xs",
                              sale.estadoEntrega === "Cancelada" && "opacity-70 cursor-not-allowed"
                            )}
                            title={sale.estadoEntrega === "Cancelada" ? "Venta ya cancelada" : "Cancelar venta"}
                          >
                            <XCircle className="h-3 w-3 mr-1" />
                            Cancelar
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {!hidePagination && total > 0 && (
        <div className="p-4 border-t border-border flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            {offset + 1}-{Math.min(offset + limit, total)} de {total} registros
          </div>
          
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(Math.max(0, offset - limit))}
              disabled={offset === 0}
              data-testid="pagination-previous"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(offset + limit)}
              disabled={offset + limit >= total}
              data-testid="pagination-next"
            >
              <ChevronRight className="h-4 w-4" />
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
      {showSeguimientoColumns && selectedSaleForSeguimiento && (
        <SeguimientoDialogOrden
          open={seguimientoDialogOpen}
          onOpenChange={setSeguimientoDialogOpen}
          sale={selectedSaleForSeguimiento}
          allOrderItems={data.filter(s => s.orden === selectedSaleForSeguimiento.orden)}
          onSave={(seguimientoData) => {
            if (selectedSaleForSeguimiento?.orden) {
              saveSeguimientoOrdenMutation.mutate({
                orden: selectedSaleForSeguimiento.orden,
                seguimientoData
              });
            } else {
              console.error('[ERROR] No orden found in selectedSaleForSeguimiento!');
              toast({
                title: "Error",
                description: "No se puede guardar el seguimiento: falta el número de orden.",
                variant: "destructive",
              });
            }
          }}
          isSaving={saveSeguimientoOrdenMutation.isPending}
        />
      )}
      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={cancelConfirmOpen} onOpenChange={setCancelConfirmOpen}>
        <AlertDialogContent data-testid="cancel-confirm-dialog" className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive text-xl">⚠️ ADVERTENCIA: Cancelación de Orden</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-base">
                {selectedSaleForCancel && (
                  <div className="p-3 bg-muted rounded-md">
                    <div className="font-semibold text-foreground">
                      Orden: {selectedSaleForCancel.orden} - {selectedSaleForCancel.nombre}
                    </div>
                  </div>
                )}
                <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-md">
                  <div className="text-foreground font-medium mb-2">
                    Esta acción es permanente y cambiará el estado de entrega a "Cancelada" en todos los registros del sistema.
                  </div>
                  <div className="text-foreground font-semibold">
                    Por favor, antes de cancelar la orden asegúrate de explicar en la sección de <span className="underline">Notas</span> las razones por las cuales la orden ha sido cancelada.
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  <strong>Si no has documentado las razones:</strong> Rechaza esta acción, llena las Notas con la explicación correspondiente y luego vuelve a esta pantalla. <strong>Si ya lo hiciste:</strong> Continúa y confirma la cancelación.
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="cancel-cancel">Rechazar</AlertDialogCancel>
            <AlertDialogAction
              data-testid="cancel-confirm"
              onClick={() => {
                if (selectedSaleForCancel) {
                  cancelSaleMutation.mutate(selectedSaleForCancel.id);
                }
                setCancelConfirmOpen(false);
              }}
              className="bg-destructive hover:bg-destructive/90"
            >
              Confirmar Cancelación
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Return Confirmation Dialog */}
      <AlertDialog open={returnConfirmOpen} onOpenChange={setReturnConfirmOpen}>
        <AlertDialogContent data-testid="return-confirm-dialog" className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-orange-600 dark:text-orange-500 text-xl">⚠️ ADVERTENCIA: Devolución de Producto</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-base">
                {selectedSaleForReturn && (
                  <div className="p-3 bg-muted rounded-md">
                    <div className="font-semibold text-foreground">
                      Orden: {selectedSaleForReturn.orden} - {selectedSaleForReturn.nombre}
                    </div>
                  </div>
                )}
                <div className="p-4 bg-orange-50 dark:bg-orange-950/30 border border-orange-300 dark:border-orange-800 rounded-md">
                  <div className="text-foreground font-medium mb-2">
                    Esta acción cambiará el estado de entrega a "A devolver" en todos los registros del sistema.
                  </div>
                  <div className="text-foreground font-semibold">
                    Por favor, antes de marcar la devolución asegúrate de explicar en la sección de <span className="underline">Notas</span> las razones por las cuales el producto será devuelto.
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  <strong>Si no has documentado las razones:</strong> Rechaza esta acción, llena las Notas con la explicación correspondiente y luego vuelve a esta pantalla. <strong>Si ya lo hiciste:</strong> Continúa y confirma la devolución.
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="return-cancel">Rechazar</AlertDialogCancel>
            <AlertDialogAction
              data-testid="return-confirm"
              onClick={() => {
                if (selectedSaleForReturn) {
                  returnSaleMutation.mutate(selectedSaleForReturn.id);
                }
                setReturnConfirmOpen(false);
              }}
              className="bg-orange-600 hover:bg-orange-700 dark:bg-orange-600 dark:hover:bg-orange-700"
            >
              Confirmar Devolución
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
