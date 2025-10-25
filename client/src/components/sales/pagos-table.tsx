import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AutoExpandingTextarea } from "@/components/ui/auto-expanding-textarea";
import { format } from "date-fns";
import { CreditCard, Truck, Banknote, Filter, ChevronUp, ChevronDown, Download, ChevronLeft, ChevronRight, XCircle, RotateCcw, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import PagoInicialModal from "./pago-inicial-modal";
import FleteModal from "./flete-modal";
import PaymentInstallmentsModal from "./payment-installments-modal";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { DateRangePicker } from "@/components/shared/date-range-picker";
import { getChannelBadgeClass } from "@/lib/channelBadges";
import { useDebouncedSearch } from "@/hooks/use-debounced-search";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface Order {
  orden: string;
  nombre: string;
  fecha: Date;
  canal: string | null;
  tipo: string | null;
  estadoEntrega: string | null;
  asesorId: string | null;
  totalOrderUsd: number | null;
  productCount: number;
  hasPagoInicial: boolean;
  hasFlete: boolean;
  installmentCount: number;
  pagoInicialUsd: number;
  pagoFleteUsd: number;
  fleteAPagar: number;
  fleteGratis: boolean;
  ordenPlusFlete: number;
  totalCuotas: number;
  totalPagado: number;
  totalVerificado: number;
  saldoPendiente: number;
  notas: string | null;
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
    asesorId?: string;
    estadoEntrega?: string;
    limit: number;
    offset: number;
  };
  onFilterChange?: (filters: any) => void;
  onPageChange?: (newOffset: number) => void;
  onClearFilters?: () => void;
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
  onClearFilters,
}: PagosTableProps) {
  const currentPage = Math.floor(offset / limit) + 1;
  const { toast } = useToast();
  
  // Check if any filters are active
  const hasActiveFilters = !!(
    filters?.canal || 
    filters?.orden || 
    filters?.startDate || 
    filters?.endDate || 
    filters?.asesorId || 
    filters?.estadoEntrega
  );
  
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [pagoInicialModalOpen, setPagoInicialModalOpen] = useState(false);
  const [fleteModalOpen, setFleteModalOpen] = useState(false);
  const [cuotasModalOpen, setCuotasModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedSale, setSelectedSale] = useState<any | null>(null);
  const [fletePopoverOpen, setFletePopoverOpen] = useState<string | null>(null);
  const [fleteAPagarValue, setFleteAPagarValue] = useState<string>("");
  const [fleteGratisValue, setFleteGratisValue] = useState<boolean>(false);
  const [currentFleteOrder, setCurrentFleteOrder] = useState<string | null>(null);
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [notesValue, setNotesValue] = useState<string>("");
  
  // Debounced search for orden and nombre
  const { inputValue: searchInput, debouncedValue: debouncedSearch, setInputValue: setSearchInput } = useDebouncedSearch(filters?.orden || "", 500);
  
  // Update filter when debounced value changes
  useEffect(() => {
    if (onFilterChange && debouncedSearch !== (filters?.orden || "")) {
      handleFilterChange("orden", debouncedSearch);
    }
  }, [debouncedSearch]);

  // Fetch asesores for displaying asesor names
  const { data: asesores = [] } = useQuery<Array<{ id: string; nombre: string; activo?: boolean }>>({
    queryKey: ["/api/admin/asesores"],
  });

  // Fetch canales data for the dropdown
  const { data: canales = [] } = useQuery<Array<{ id: string; nombre: string; activo: boolean }>>({
    queryKey: ["/api/admin/canales"],
  });

  // Create a map of asesor IDs to names for quick lookup
  const asesorMap = new Map(asesores.map((a) => [a.id, a.nombre]));

  const handleFilterChange = (key: string, value: string) => {
    if (onFilterChange) {
      // Normalize "all" to empty string for canal, asesorId, and estadoEntrega filters
      const normalizedValue = ((key === 'canal' || key === 'asesorId' || key === 'estadoEntrega') && value === 'all') ? '' : value;
      onFilterChange({ [key]: normalizedValue });
    }
  };

  const handleExport = () => {
    const queryParams = new URLSearchParams();
    if (filters?.canal) queryParams.append('canal', filters.canal);
    if (filters?.orden) queryParams.append('orden', filters.orden);
    if (filters?.startDate) queryParams.append('startDate', filters.startDate);
    if (filters?.endDate) queryParams.append('endDate', filters.endDate);
    if (filters?.asesorId) queryParams.append('asesorId', filters.asesorId);
    if (filters?.estadoEntrega) {
      queryParams.append('estadoEntrega', filters.estadoEntrega);
    } else {
      // When no specific estadoEntrega is selected, exclude Perdida by default
      queryParams.append('excludePerdida', 'true');
    }
    
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

  // Notes editing handlers
  const handleNotesClick = (order: Order) => {
    setEditingNotesId(order.orden);
    setNotesValue(order.notas || "");
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotesValue(e.target.value);
  };

  const handleNotesBlur = () => {
    if (editingNotesId) {
      updateNotesMutation.mutate({ 
        orden: editingNotesId, 
        notas: notesValue.trim() 
      });
    }
  };

  const handleNotesKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      setEditingNotesId(null);
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

  // Mutation to update notes
  const updateNotesMutation = useMutation({
    mutationFn: async ({ orden, notas }: { orden: string; notas: string }) => {
      return apiRequest("PUT", `/api/sales/orders/${encodeURIComponent(orden)}/notes`, { notas });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          return Array.isArray(query.queryKey) && 
                 typeof query.queryKey[0] === 'string' && 
                 query.queryKey[0].startsWith('/api/sales');
        }
      });
      setEditingNotesId(null);
      toast({
        title: "Notas actualizadas",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudieron actualizar las notas",
        variant: "destructive",
      });
    },
  });

  // Mutation to update flete data (fleteAPagar and fleteGratis)
  const updateFleteMutation = useMutation({
    mutationFn: async ({ orden, fleteAPagar, fleteGratis }: { orden: string; fleteAPagar: string; fleteGratis: boolean }) => {
      return apiRequest("PATCH", `/api/sales/${encodeURIComponent(orden)}/flete`, { 
        fleteAPagar, 
        fleteGratis 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => Array.isArray(query.queryKey) && typeof query.queryKey[0] === 'string' && query.queryKey[0].startsWith('/api/sales')
      });
      toast({ title: "Flete actualizado" });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo actualizar el flete",
        variant: "destructive",
      });
    },
  });

  const handleFletePopoverOpen = (order: Order) => {
    setFletePopoverOpen(order.orden);
    setCurrentFleteOrder(order.orden);
    // Use nullish coalescing to handle zero values correctly
    setFleteAPagarValue(order.fleteAPagar != null ? order.fleteAPagar.toString() : "");
    // Fetch the sale to get fleteGratis value
    fetch(`/api/sales?orden=${encodeURIComponent(order.orden)}&limit=1`)
      .then(res => res.json())
      .then(data => {
        if (data.data && data.data.length > 0) {
          const fleteGratis = data.data[0].fleteGratis || false;
          setFleteGratisValue(fleteGratis);
          // If fleteGratis is true, ensure the field shows "0"
          if (fleteGratis) {
            setFleteAPagarValue("0");
          }
        }
      });
  };

  const handleFleteCheckboxChange = (checked: boolean) => {
    setFleteGratisValue(checked);
    if (checked) {
      setFleteAPagarValue("0");
    }
  };

  const handleFleteAPagarChange = (value: string) => {
    // Allow empty, numbers, and decimal point
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setFleteAPagarValue(value);
    }
  };

  const handleFleteSave = (orden: string) => {
    // Validation: fleteAPagar is required when fleteGratis is false
    if (!fleteGratisValue && fleteAPagarValue.trim() === "") {
      toast({
        title: "Campo obligatorio",
        description: "Debes ingresar el Flete A Pagar o marcar Flete Gratis",
        variant: "destructive",
      });
      return;
    }

    updateFleteMutation.mutate({
      orden,
      fleteAPagar: fleteAPagarValue,
      fleteGratis: fleteGratisValue
    });
    setFletePopoverOpen(null);
  };

  return (
    <>
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

            <div>
              <label className="text-sm font-medium mb-1 block">Asesor:</label>
              <Select 
                value={filters?.asesorId || "all"} 
                onValueChange={(value) => handleFilterChange('asesorId', value)}
              >
                <SelectTrigger className="w-40" data-testid="filter-asesor">
                  <SelectValue placeholder="Todos los asesores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los asesores</SelectItem>
                  <SelectItem value="none">Sin asesor</SelectItem>
                  {asesores
                    .filter(asesor => asesor.activo !== false)
                    .map(asesor => (
                      <SelectItem key={asesor.id} value={asesor.id}>
                        {asesor.nombre}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Estado Entrega:</label>
              <Select 
                value={filters?.estadoEntrega || "all"} 
                onValueChange={(value) => handleFilterChange('estadoEntrega', value)}
              >
                <SelectTrigger className="w-40" data-testid="filter-estado-entrega">
                  <SelectValue placeholder="Todos los estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="Pendiente">Pendiente</SelectItem>
                  <SelectItem value="En proceso">En proceso</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Buscar:</label>
              <Input 
                type="text"
                placeholder="Buscar por orden o nombre"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-60"
                data-testid="input-filter-buscar"
              />
            </div>

            <DateRangePicker
              startDate={filters?.startDate}
              endDate={filters?.endDate}
              onStartDateChange={(date) => handleFilterChange('startDate', date)}
              onEndDateChange={(date) => handleFilterChange('endDate', date)}
            />
          </div>
        </div>
      )}
      <div className="overflow-auto max-h-[calc(100vh-280px)] relative">
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 z-10 bg-muted">
              <tr className="border-b border-border">
                <th className="p-2 text-left text-xs font-medium text-muted-foreground min-w-[120px] sticky left-0 z-20 bg-muted">
                  Orden
                </th>
                <th className="p-2 text-left text-xs font-medium text-muted-foreground min-w-[180px] sticky left-[120px] z-20 bg-muted">
                  Nombre
                </th>
                <th className="p-2 text-left text-xs font-medium text-muted-foreground min-w-[100px]">
                  Fecha
                </th>
                <th className="p-2 text-left text-xs font-medium text-muted-foreground min-w-[100px]">
                  Canal
                </th>
                <th className="p-2 text-left text-xs font-medium text-muted-foreground min-w-[100px]">
                  Tipo
                </th>
                <th className="p-2 text-left text-xs font-medium text-muted-foreground min-w-[140px]">
                  Estado Entrega
                </th>
                <th className="p-2 text-left text-xs font-medium text-muted-foreground min-w-[120px]">
                  Asesor
                </th>
                <th className="p-2 text-left text-xs font-medium text-muted-foreground min-w-[140px]">
                  Total Orden USD
                </th>
                <th className="p-2 text-center text-xs font-medium text-muted-foreground min-w-[100px]">
                  Flete
                </th>
                <th className="p-2 text-center text-xs font-medium text-muted-foreground min-w-[150px]">
                  Pago Inicial/Total
                </th>
                <th className="p-2 text-center text-xs font-medium text-muted-foreground min-w-[100px]">Pago Flete</th>
                <th className="p-2 text-center text-xs font-medium text-muted-foreground min-w-[100px]">Pago Cuotas</th>
                <th className="p-2 text-center text-xs font-medium text-muted-foreground min-w-[120px] bg-blue-50 dark:bg-blue-950">Orden a Pagar</th>
                <th className="p-2 text-center text-xs font-medium text-muted-foreground min-w-[120px] bg-purple-50 dark:bg-purple-950">Flete a Pagar</th>
                <th className="p-2 text-center text-xs font-medium text-muted-foreground min-w-[120px] bg-gray-100 dark:bg-gray-800">Total Pagado</th>
                <th className="p-2 text-center text-xs font-medium text-muted-foreground min-w-[120px] bg-teal-50 dark:bg-teal-950">Total Verificado</th>
                <th className="p-2 text-center text-xs font-medium text-muted-foreground min-w-[120px] bg-orange-50 dark:bg-orange-950">Saldo Pendiente</th>
                <th className="p-2 text-left text-xs font-medium text-muted-foreground w-[250px] max-w-[250px]">Notas</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={19} className="p-4 text-center text-muted-foreground">
                    Cargando...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={19} className="p-4 text-center text-muted-foreground">
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
                      <span className="text-xs text-muted-foreground" data-testid={`order-${order.orden}`}>
                        {order.orden}
                      </span>
                    </td>
                    <td className="p-2 min-w-[180px] sticky left-[120px] z-10 bg-background">
                      <span className="text-xs" data-testid={`nombre-${order.orden}`}>
                        {order.nombre}
                      </span>
                    </td>
                    <td className="p-2 min-w-[100px]">
                      <span className="text-xs text-muted-foreground" data-testid={`fecha-${order.orden}`}>
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
                    <td className="p-2 min-w-[120px]">
                      <span className="text-xs text-muted-foreground" data-testid={`asesor-${order.orden}`}>
                        {order.asesorId ? (asesorMap.get(order.asesorId) || order.asesorId) : "-"}
                      </span>
                    </td>
                    <td className="p-2 min-w-[140px]">
                      <span className="text-xs" data-testid={`total-${order.orden}`}>
                        {formatCurrency(order.totalOrderUsd)}
                      </span>
                      {order.productCount > 1 && (
                        <span className="text-xs text-muted-foreground ml-2">
                          ({order.productCount} productos)
                        </span>
                      )}
                    </td>
                    <td className="p-2 min-w-[100px] text-center">
                      <Popover 
                        open={fletePopoverOpen === order.orden} 
                        onOpenChange={(open) => {
                          if (open) {
                            handleFletePopoverOpen(order);
                          } else {
                            setFletePopoverOpen(null);
                          }
                        }}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            data-testid={`button-flete-inline-${order.orden}`}
                          >
                            <Package className={cn(
                              "h-3 w-3 mr-1",
                              (order.fleteAPagar == null || order.fleteAPagar === 0) && !order.fleteGratis && "text-amber-500"
                            )} />
                            Flete
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80" align="start">
                          <div className="space-y-4">
                            <h4 className="font-semibold text-sm">Flete A Pagar</h4>
                            
                            <div className="space-y-2">
                              <Label htmlFor={`flete-a-pagar-${order.orden}`} className="text-sm">
                                Flete A Pagar (USD) {!fleteGratisValue && <span className="text-red-500">*</span>}
                              </Label>
                              <Input
                                id={`flete-a-pagar-${order.orden}`}
                                type="text"
                                inputMode="decimal"
                                placeholder="0.00"
                                value={fleteAPagarValue}
                                onChange={(e) => handleFleteAPagarChange(e.target.value)}
                                disabled={fleteGratisValue}
                                className={cn("text-sm", fleteGratisValue && "opacity-50 cursor-not-allowed")}
                                data-testid={`input-flete-a-pagar-inline-${order.orden}`}
                              />
                            </div>

                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id={`flete-gratis-${order.orden}`}
                                checked={fleteGratisValue}
                                onCheckedChange={handleFleteCheckboxChange}
                                data-testid={`checkbox-flete-gratis-inline-${order.orden}`}
                              />
                              <Label htmlFor={`flete-gratis-${order.orden}`} className="text-sm font-semibold text-green-600 cursor-pointer">
                                FLETE GRATIS
                              </Label>
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setFletePopoverOpen(null)}
                                data-testid={`button-cancel-flete-inline-${order.orden}`}
                              >
                                Cancelar
                              </Button>
                              <Button 
                                size="sm" 
                                onClick={() => handleFleteSave(order.orden)}
                                disabled={updateFleteMutation.isPending}
                                data-testid={`button-save-flete-inline-${order.orden}`}
                              >
                                {updateFleteMutation.isPending ? "Guardando..." : "Guardar"}
                              </Button>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
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
                        <Banknote className={cn(
                          "h-3 w-3 mr-1",
                          !order.hasPagoInicial && "text-amber-500"
                        )} />
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
                        <Truck className={cn(
                          "h-3 w-3 mr-1",
                          !order.hasFlete && "text-amber-500"
                        )} />
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
                    <td className="p-2 min-w-[120px] bg-blue-50 dark:bg-blue-950">
                      <div className="flex justify-center">
                        <div className="bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100 px-3 py-1 rounded-md text-xs" data-testid={`metric-orden-${order.orden}`}>
                          {order.canal?.toLowerCase() === 'cashea' 
                            ? formatCurrency(0) 
                            : formatCurrency(order.totalOrderUsd)}
                        </div>
                      </div>
                    </td>
                    <td className="p-2 min-w-[120px] bg-purple-50 dark:bg-purple-950">
                      <div className="flex justify-center">
                        <div className="bg-purple-100 dark:bg-purple-900 text-purple-900 dark:text-purple-100 px-3 py-1 rounded-md text-xs" data-testid={`metric-flete-${order.orden}`}>
                          {formatCurrency(order.fleteAPagar)}
                        </div>
                      </div>
                    </td>
                    <td className="p-2 min-w-[120px] bg-gray-100 dark:bg-gray-800">
                      <div className="flex justify-center">
                        <div className="bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-1 rounded-md text-xs" data-testid={`metric-total-pagado-${order.orden}`}>
                          {formatCurrency(order.totalPagado)}
                        </div>
                      </div>
                    </td>
                    <td className="p-2 min-w-[120px] bg-teal-50 dark:bg-teal-950">
                      <div className="flex justify-center">
                        <div className="bg-teal-100 dark:bg-teal-900 text-teal-900 dark:text-teal-100 px-3 py-1 rounded-md text-xs" data-testid={`metric-total-verificado-${order.orden}`}>
                          {formatCurrency(order.totalVerificado)}
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
                        } px-3 py-1 rounded-md text-xs`} data-testid={`metric-pendiente-${order.orden}`}>
                          {formatCurrency(order.saldoPendiente)}
                        </div>
                      </div>
                    </td>
                    <td className="p-2 w-[250px] max-w-[250px]">
                      {editingNotesId === order.orden ? (
                        <AutoExpandingTextarea
                          value={notesValue}
                          onChange={handleNotesChange}
                          onBlur={handleNotesBlur}
                          onKeyDown={handleNotesKeyDown}
                          placeholder="Agregar nota..."
                          className="text-xs w-full"
                          minRows={5}
                          maxRows={10}
                          autoFocus
                          data-testid={`notes-input-${order.orden}`}
                        />
                      ) : (
                        <div 
                          className="text-xs cursor-pointer hover:bg-muted/50 rounded px-2 py-1 min-h-[28px] overflow-hidden whitespace-nowrap text-ellipsis"
                          title={order.notas || "Click para agregar nota"}
                          onClick={() => handleNotesClick(order)}
                          data-testid={`notes-display-${order.orden}`}
                        >
                          {order.notas || <span className="text-muted-foreground italic">Click para agregar nota</span>}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
      </div>
      {total > 0 && (
        <div className="p-4 border-t border-border flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            {offset + 1}-{Math.min(offset + limit, total)} de {total} órdenes
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
    </>
  );
}
