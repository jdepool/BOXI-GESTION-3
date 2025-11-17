import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { AutoExpandingTextarea } from "@/components/ui/auto-expanding-textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DateRangePicker } from "@/components/shared/date-range-picker";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Download, Package, ChevronLeft, ChevronRight, Filter, ChevronDown, ChevronUp, RotateCcw, CalendarIcon, Truck, Banknote } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { getChannelBadgeClass } from "@/lib/channelBadges";
import type { Sale } from "@shared/schema";
import type { QuickMessage } from "@/components/ui/auto-expanding-textarea";
import { NotesDisplay } from "@/components/shared/notes-display";

// Quick select messages for notes
const QUICK_NOTES_MESSAGES: QuickMessage[] = [
  {
    text: "ENTREGADO EN TIENDA",
    icon: <Package className="h-4 w-4 text-green-600" />,
    tooltipText: "ENTREGADO EN TIENDA"
  },
  {
    text: "EFECTIVO CONTRA ENTREGA",
    icon: <Banknote className="h-4 w-4 text-red-600" />,
    tooltipText: "EFECTIVO CONTRA ENTREGA"
  }
];

interface DispatchTableProps {
  data: Sale[];
  total?: number;
  limit?: number;
  offset?: number;
  isLoading: boolean;
  filters?: {
    canal?: string;
    estadoEntrega?: string;
    transportistaId?: string;
    sku?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
  };
  onFilterChange?: (key: string, value: any) => void;
  onClearFilters?: () => void;
  onPageChange?: (offset: number) => void;
}

export default function DispatchTable({ 
  data, 
  total = 0, 
  limit = 20, 
  offset = 0, 
  isLoading,
  filters: parentFilters,
  onFilterChange,
  onClearFilters,
  onPageChange 
}: DispatchTableProps) {

  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [notesValue, setNotesValue] = useState("");
  const [originalNotesValue, setOriginalNotesValue] = useState("");
  const [editingNroGuiaId, setEditingNroGuiaId] = useState<string | null>(null);
  const [nroGuiaValue, setNroGuiaValue] = useState("");
  const [originalNroGuiaValue, setOriginalNroGuiaValue] = useState("");
  const [openFechaDespachoId, setOpenFechaDespachoId] = useState<string | null>(null);
  const [openFechaClienteId, setOpenFechaClienteId] = useState<string | null>(null);
  const [filtersVisible, setFiltersVisible] = useState(false);
  
  // Debounced search - local state for immediate UI updates
  const [searchInputValue, setSearchInputValue] = useState(parentFilters?.search || "");

  const filters = {
    canal: parentFilters?.canal || "",
    tipo: parentFilters?.tipo || "",
    estadoEntrega: parentFilters?.estadoEntrega || "",
    transportistaId: parentFilters?.transportistaId || "",
    sku: parentFilters?.sku || "",
    search: parentFilters?.search || "",
    startDate: parentFilters?.startDate || "",
    endDate: parentFilters?.endDate || ""
  };

  // Check if any filters are active
  const hasActiveFilters = !!(
    parentFilters?.canal || 
    parentFilters?.tipo ||
    parentFilters?.estadoEntrega || 
    parentFilters?.transportistaId || 
    parentFilters?.sku ||
    parentFilters?.search || 
    parentFilters?.startDate || 
    parentFilters?.endDate
  );

  // Count active filters for badge
  const activeFilterCount = [
    parentFilters?.canal,
    parentFilters?.tipo,
    parentFilters?.estadoEntrega,
    parentFilters?.transportistaId,
    parentFilters?.sku,
    parentFilters?.search,
    parentFilters?.startDate,
    parentFilters?.endDate
  ].filter(Boolean).length;

  // Debounce search filter - trigger API call 500ms after user stops typing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchInputValue !== parentFilters?.search) {
        handleFilterChange('search', searchInputValue);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchInputValue]);

  // Sync input value when parent filter changes (e.g., on clear filters)
  useEffect(() => {
    setSearchInputValue(parentFilters?.search || "");
  }, [parentFilters?.search]);

  // Fetch asesores data for displaying names
  const { data: asesores = [] } = useQuery<Array<{ id: string; nombre: string; activo?: boolean }>>({
    queryKey: ["/api/admin/asesores"],
  });

  // Create asesorMap for quick lookup
  const asesorMap = asesores.reduce((acc, asesor) => {
    acc[asesor.id] = asesor.nombre;
    return acc;
  }, {} as Record<string, string>);

  // Fetch transportistas data
  const { data: transportistas = [] } = useQuery<Array<{ id: string; nombre: string; telefono?: string; email?: string }>>({
    queryKey: ["/api/admin/transportistas"],
  });

  // Fetch canales data for the dropdown
  const { data: canales = [] } = useQuery<Array<{ id: string; nombre: string; activo: boolean }>>({
    queryKey: ["/api/admin/canales"],
  });

  // Fetch productos data to extract unique SKUs
  const { data: productos = [] } = useQuery<Array<{ id: string; nombre: string; sku: string | null }>>({
    queryKey: ["/api/admin/productos"],
  });

  // Extract unique SKUs, filter out nulls/empty strings, and sort alphabetically
  const uniqueSkus = Array.from(new Set(
    productos
      .map(p => p.sku)
      .filter((sku): sku is string => !!sku && sku.trim() !== "")
  )).sort();

  const handleFilterChange = (key: string, value: string) => {
    onFilterChange?.(key, value === "all" ? "" : value);
  };

  const handleExportExcel = async () => {
    try {
      const response = await fetch('/api/sales/dispatch/export');
      if (!response.ok) {
        throw new Error('Failed to export');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `despachos_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const updateDeliveryStatusMutation = useMutation({
    mutationFn: async ({ saleId, status }: { saleId: string; status: string }) => {
      return apiRequest("PUT", `/api/sales/${saleId}/delivery-status`, { status });
    },
    onSuccess: () => {
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

  const handleStatusChange = (saleId: string, newStatus: string) => {
    updateDeliveryStatusMutation.mutate({ saleId, status: newStatus });
  };

  const updateTransportistaMutation = useMutation({
    mutationFn: async ({ saleId, transportistaId }: { saleId: string; transportistaId: string | null }) => {
      return apiRequest("PUT", `/api/sales/${saleId}/transportista`, { transportistaId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => Array.isArray(query.queryKey) && typeof query.queryKey[0] === 'string' && query.queryKey[0].startsWith('/api/sales')
      });
      toast({
        title: "Transportista actualizado",
        description: "El transportista ha sido asignado correctamente.",
      });
    },
    onError: (error) => {
      console.error('Failed to update transportista:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el transportista.",
        variant: "destructive",
      });
    },
  });

  const handleTransportistaChange = (saleId: string, transportistaId: string | null) => {
    updateTransportistaMutation.mutate({ saleId, transportistaId });
  };

  const updateNotesMutation = useMutation({
    mutationFn: async ({ saleId, notas }: { saleId: string; notas: string }) => {
      return apiRequest("PATCH", `/api/sales/${saleId}`, { notas });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => Array.isArray(query.queryKey) && typeof query.queryKey[0] === 'string' && query.queryKey[0].startsWith('/api/sales')
      });
      setEditingNotesId(null);
      toast({
        title: "Nota actualizada",
        description: "La nota ha sido guardada correctamente.",
      });
    },
    onError: (error) => {
      console.error('Failed to update notes:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar la nota.",
        variant: "destructive",
      });
    },
  });

  const handleNotesClick = (sale: Sale) => {
    setEditingNotesId(sale.id);
    const currentNotes = sale.notas || "";
    setNotesValue(currentNotes);
    setOriginalNotesValue(currentNotes);
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotesValue(e.target.value);
  };

  const handleNotesBlur = () => {
    if (editingNotesId && notesValue.trim() !== originalNotesValue) {
      updateNotesMutation.mutate({ 
        saleId: editingNotesId, 
        notas: notesValue.trim() 
      });
    } else {
      setEditingNotesId(null);
    }
  };

  const updateNroGuiaMutation = useMutation({
    mutationFn: async ({ saleId, nroGuia }: { saleId: string; nroGuia: string }) => {
      return apiRequest("PUT", `/api/sales/${saleId}/nro-guia`, { nroGuia });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => Array.isArray(query.queryKey) && typeof query.queryKey[0] === 'string' && query.queryKey[0].startsWith('/api/sales')
      });
      setEditingNroGuiaId(null);
      toast({
        title: "Nro Guía actualizado",
        description: "El número de guía ha sido guardado correctamente.",
      });
    },
    onError: (error) => {
      console.error('Failed to update nro guia:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar el número de guía.",
        variant: "destructive",
      });
    },
  });

  const updateFechaDespachoMutation = useMutation({
    mutationFn: async ({ saleId, fechaDespacho }: { saleId: string; fechaDespacho: string | null }) => {
      return apiRequest("PUT", `/api/sales/${saleId}/fecha-despacho`, { fechaDespacho });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => Array.isArray(query.queryKey) && typeof query.queryKey[0] === 'string' && query.queryKey[0].startsWith('/api/sales')
      });
      toast({
        title: "Fecha Despacho actualizada",
        description: "La fecha de despacho ha sido actualizada correctamente.",
      });
    },
    onError: (error) => {
      console.error('Failed to update fecha despacho:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la fecha de despacho.",
        variant: "destructive",
      });
    },
  });

  const updateFechaClienteMutation = useMutation({
    mutationFn: async ({ saleId, fechaCliente }: { saleId: string; fechaCliente: string | null }) => {
      return apiRequest("PUT", `/api/sales/${saleId}/fecha-cliente`, { fechaCliente });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => Array.isArray(query.queryKey) && typeof query.queryKey[0] === 'string' && query.queryKey[0].startsWith('/api/sales')
      });
      toast({
        title: "Fecha Cliente actualizada",
        description: "La fecha de cliente ha sido actualizada correctamente.",
      });
    },
    onError: (error) => {
      console.error('Failed to update fecha cliente:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la fecha de cliente.",
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

  const handleNroGuiaClick = (sale: Sale) => {
    setEditingNroGuiaId(sale.id);
    const currentNroGuia = sale.nroGuia || "";
    setNroGuiaValue(currentNroGuia);
    setOriginalNroGuiaValue(currentNroGuia);
  };

  const handleNroGuiaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNroGuiaValue(e.target.value);
  };

  const handleNroGuiaBlur = () => {
    if (editingNroGuiaId && nroGuiaValue.trim() !== originalNroGuiaValue) {
      updateNroGuiaMutation.mutate({ 
        saleId: editingNroGuiaId, 
        nroGuia: nroGuiaValue.trim() 
      });
    } else {
      setEditingNroGuiaId(null);
    }
  };

  const handleNroGuiaKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (editingNroGuiaId && nroGuiaValue.trim() !== originalNroGuiaValue) {
        updateNroGuiaMutation.mutate({ 
          saleId: editingNroGuiaId, 
          nroGuia: nroGuiaValue.trim() 
        });
      } else {
        setEditingNroGuiaId(null);
      }
    } else if (e.key === 'Escape') {
      setEditingNroGuiaId(null);
    }
  };

  const handleFechaDespachoChange = (saleId: string, date: Date | undefined) => {
    if (date) {
      // Format date as YYYY-MM-DD
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const fechaDespacho = `${year}-${month}-${day}`;
      
      updateFechaDespachoMutation.mutate({ saleId, fechaDespacho });
    } else {
      updateFechaDespachoMutation.mutate({ saleId, fechaDespacho: null });
    }
    // Close the popover after selection
    setOpenFechaDespachoId(null);
  };

  const handleFechaClienteChange = (saleId: string, date: Date | undefined) => {
    if (date) {
      // Format date as YYYY-MM-DD
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const fechaCliente = `${year}-${month}-${day}`;
      
      updateFechaClienteMutation.mutate({ saleId, fechaCliente });
    } else {
      updateFechaClienteMutation.mutate({ saleId, fechaCliente: null });
    }
    // Close the popover after selection
    setOpenFechaClienteId(null);
  };

  // Helper to parse date string to Date object
  const parseFechaDespacho = (dateStr: string | null): Date | undefined => {
    if (!dateStr) return undefined;
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  // Helper to format date for display
  const formatFechaDespacho = (dateStr: string | null): string => {
    if (!dateStr) return '-';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const handleNotesKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      setEditingNotesId(null);
      setNotesValue(originalNotesValue);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Entregado': return 'default';
      case 'Cancelada': return 'destructive';
      case 'Perdida': return 'destructive';
      case 'En tránsito': return 'secondary';
      case 'A despachar': return 'outline';
      case 'En proceso': return 'outline';
      case 'Pendiente': return 'outline';
      case 'A devolver': return 'secondary';
      case 'Devuelto': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <>
      {/* Top toolbar */}
      <div className="p-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-foreground">
            Despachos
          </h2>
          {isLoading && (
            <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
          )}
        </div>
        
        {/* Right side - filter toggle and export buttons */}
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setFiltersVisible(!filtersVisible)}
            data-testid="toggle-filters-button"
            className="text-muted-foreground relative"
          >
            <Filter className="h-4 w-4 mr-2" />
            {activeFilterCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              >
                {activeFilterCount}
              </Badge>
            )}
            {filtersVisible ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          
          {hasActiveFilters && onClearFilters && (
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
          )}
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                onClick={handleExportExcel}
                variant="ghost"
                size="sm"
                data-testid="export-dispatch-excel"
                className="text-muted-foreground"
              >
                <Download className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Descargar Excel</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
      {/* Filter section - collapsible */}
      {filtersVisible && (
        <div className="p-6 border-b border-border">
          <div className="flex flex-wrap gap-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Canal:</label>
              <Select 
                value={filters.canal || "all"} 
                onValueChange={(value) => handleFilterChange('canal', value)}
              >
                <SelectTrigger className="w-40" data-testid="filter-canal">
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
              <label className="text-sm font-medium mb-1 block">Tipo:</label>
              <Select 
                value={filters.tipo || "all"} 
                onValueChange={(value) => handleFilterChange('tipo', value)}
              >
                <SelectTrigger className="w-40" data-testid="filter-tipo">
                  <SelectValue placeholder="Todos los tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  <SelectItem value="Inmediata">Inmediata</SelectItem>
                  <SelectItem value="Reserva">Reserva</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Estado Venta/Entrega:</label>
              <Select 
                value={filters.estadoEntrega || "all"} 
                onValueChange={(value) => handleFilterChange('estadoEntrega', value)}
              >
                <SelectTrigger className="w-40" data-testid="filter-estado-entrega">
                  <SelectValue placeholder="Todos los estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="En proceso">En proceso</SelectItem>
                  <SelectItem value="A despachar">A despachar</SelectItem>
                  <SelectItem value="En tránsito">En tránsito</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Transportista:</label>
              <Select 
                value={filters.transportistaId || "all"} 
                onValueChange={(value) => handleFilterChange('transportistaId', value)}
              >
                <SelectTrigger className="w-40" data-testid="filter-transportista">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="none">Sin asignar</SelectItem>
                  {transportistas.map((transportista) => (
                    <SelectItem key={transportista.id} value={transportista.id}>
                      {transportista.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">SKU:</label>
              <Select 
                value={filters.sku || "all"} 
                onValueChange={(value) => handleFilterChange('sku', value)}
              >
                <SelectTrigger className="w-40" data-testid="filter-sku">
                  <SelectValue placeholder="Todos los SKUs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los SKUs</SelectItem>
                  {uniqueSkus.map((sku) => (
                    <SelectItem key={sku} value={sku}>
                      {sku}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Buscar:</label>
              <Input 
                type="text"
                placeholder="Buscar por orden o nombre"
                value={searchInputValue}
                onChange={(e) => setSearchInputValue(e.target.value)}
                className="w-60"
                data-testid="filter-search"
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
      <div className="p-6">
        {data.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              No hay órdenes para despacho
            </h3>
            <p className="text-muted-foreground">
              Las órdenes aparecerán aquí una vez que se agreguen direcciones desde la tabla de Ventas
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-280px)] bg-background">
            <div className={cn("min-w-max transition-opacity duration-200", isLoading && "opacity-50")}>
              <table className="w-full min-w-[3100px] relative">
                <thead className="bg-muted sticky top-0 z-10">
                  <tr>
                    <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[100px] sticky left-0 bg-muted z-20 border-r border-border shadow-[2px_0_5px_rgba(0,0,0,0.1)]">Orden</th>
                    <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[150px] sticky left-[100px] bg-muted z-20 border-r border-border shadow-[2px_0_5px_rgba(0,0,0,0.1)]">Estado Venta/Entrega</th>
                    <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[150px] sticky left-[250px] bg-muted z-20 border-r border-border shadow-[2px_0_5px_rgba(0,0,0,0.1)]">Fecha Compromiso Entrega</th>
                    <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[100px]">Canal</th>
                    <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[100px]">Tipo</th>
                    <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[200px]">Nombre</th>
                    <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[150px]">Teléfono</th>
                    <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[120px]">Cédula</th>
                    <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[120px]">Estado</th>
                    <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[120px]">Ciudad</th>
                    <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[300px]">Dirección de Despacho</th>
                    <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[200px]">Producto</th>
                    <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[120px]">SKU</th>
                    <th className="text-center p-2 text-xs font-medium text-muted-foreground min-w-[80px]">Cant.</th>
                    <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[200px]">Email</th>
                    <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[100px]">Especial</th>
                    <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[120px]">Fecha</th>
                    <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[150px]">Asesor</th>
                    <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[180px]">Notas</th>
                    <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[180px]">Transportista</th>
                    <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[150px]">Nro Guía</th>
                    <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[150px]">Fecha Despacho</th>
                    <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[150px]">Recepción de Cliente</th>
                    <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[150px]">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((sale) => (
                    <tr 
                      key={sale.id} 
                      className="border-b border-border hover:bg-muted/50 transition-colors text-xs"
                      data-testid={`dispatch-row-${sale.id}`}
                    >
                      <td className="p-2 min-w-[100px] text-xs font-mono text-muted-foreground sticky left-0 bg-background z-10 border-r border-border shadow-[2px_0_5px_rgba(0,0,0,0.1)]">
                        #{sale.orden}
                      </td>
                      
                      <td className="p-2 min-w-[150px] text-xs sticky left-[100px] bg-background z-10 border-r border-border shadow-[2px_0_5px_rgba(0,0,0,0.1)]">
                        <Select
                          value={sale.estadoEntrega || "Pendiente"}
                          onValueChange={(newStatus) => handleStatusChange(sale.id, newStatus)}
                          disabled={updateDeliveryStatusMutation.isPending}
                        >
                          <SelectTrigger className="w-32 h-8 text-xs" data-testid={`estado-select-${sale.id}`}>
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
                      
                      <td className="p-2 min-w-[150px] text-xs sticky left-[250px] bg-background z-10 border-r border-border shadow-[2px_0_5px_rgba(0,0,0,0.1)]">
                        {sale.fechaEntrega ? (
                          <div className="text-xs" data-testid={`fecha-entrega-${sale.id}`}>
                            {new Date(sale.fechaEntrega).toLocaleDateString('es-ES')}
                          </div>
                        ) : (
                          <div className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/20 p-2 rounded border border-amber-200 dark:border-amber-800 font-medium" data-testid={`warning-fecha-entrega-${sale.id}`}>
                            ⚠️ SIN FECHA
                          </div>
                        )}
                      </td>
                      
                      <td className="p-2 min-w-[100px] text-xs">
                        <Badge className={`${getChannelBadgeClass(sale.canal)} text-white text-xs`}>
                          {sale.canal.charAt(0).toUpperCase() + sale.canal.slice(1)}
                        </Badge>
                      </td>
                      
                      <td className="p-2 min-w-[100px] text-xs">
                        {sale.tipo === "Inmediata" ? (
                          <Badge className="bg-blue-500 hover:bg-blue-600 text-white text-xs">
                            Inmediata
                          </Badge>
                        ) : sale.tipo === "Reserva" ? (
                          <Badge className="bg-purple-500 hover:bg-purple-600 text-white text-xs">
                            Reserva
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      
                      <td className="p-2 min-w-[200px] text-xs">
                        <div className="font-medium">{sale.nombre}</div>
                      </td>
                      
                      <td className="p-2 min-w-[150px] text-xs">{sale.telefono}</td>
                      
                      <td className="p-2 min-w-[120px] text-xs">{sale.cedula}</td>
                      
                      <td className="p-2 min-w-[120px] text-xs">
                        {sale.direccionFacturacionPais ? (
                          sale.direccionDespachoIgualFacturacion === "true" ? 
                            sale.direccionFacturacionEstado : sale.direccionDespachoEstado
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      
                      <td className="p-2 min-w-[120px] text-xs">
                        {sale.direccionFacturacionPais ? (
                          sale.direccionDespachoIgualFacturacion === "true" ? 
                            sale.direccionFacturacionCiudad : sale.direccionDespachoCiudad
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      
                      <td className="p-2 min-w-[300px] text-xs">
                        {sale.direccionFacturacionPais ? (
                          sale.direccionDespachoIgualFacturacion === "true" ? (
                            <div className="text-xs space-y-1 max-w-72">
                              <div className="font-medium">{sale.direccionFacturacionDireccion}</div>
                              <div>{sale.direccionFacturacionPais}</div>
                              {sale.direccionFacturacionUrbanizacion && (
                                <div className="text-muted-foreground">Urb. {sale.direccionFacturacionUrbanizacion}</div>
                              )}
                              {sale.direccionFacturacionReferencia && (
                                <div className="text-muted-foreground">Ref: {sale.direccionFacturacionReferencia}</div>
                              )}
                            </div>
                          ) : (
                            <div className="text-xs space-y-1 max-w-72">
                              <div className="font-medium">{sale.direccionDespachoDireccion}</div>
                              <div>{sale.direccionDespachoPais}</div>
                              {sale.direccionDespachoUrbanizacion && (
                                <div className="text-muted-foreground">Urb. {sale.direccionDespachoUrbanizacion}</div>
                              )}
                              {sale.direccionDespachoReferencia && (
                                <div className="text-muted-foreground">Ref: {sale.direccionDespachoReferencia}</div>
                              )}
                            </div>
                          )
                        ) : (
                          <div className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/20 p-2 rounded border border-amber-200 dark:border-amber-800 font-medium">
                            ⚠️ Sin dirección
                          </div>
                        )}
                      </td>
                      
                      <td className="p-2 min-w-[200px] text-xs">
                        <div className="font-medium">{sale.product}</div>
                      </td>
                      
                      <td className="p-2 min-w-[120px] text-xs">
                        {sale.sku || <span className="text-muted-foreground">—</span>}
                      </td>
                      
                      <td className="p-2 min-w-[80px] text-center text-xs">{sale.cantidad}</td>
                      
                      <td className="p-2 min-w-[200px] text-xs">{sale.email}</td>
                      
                      <td className="p-2 min-w-[100px]">
                        {sale.medidaEspecial && (
                          <Badge className="bg-blue-500 hover:bg-blue-600 text-white text-xs">
                            {sale.medidaEspecial}
                          </Badge>
                        )}
                      </td>
                      
                      <td className="p-2 min-w-[120px] text-xs">
                        {new Date(sale.fecha).toLocaleDateString('es-ES')}
                      </td>
                      
                      <td className="p-2 min-w-[150px] text-xs">
                        {sale.asesorId ? (asesorMap[sale.asesorId] || '...') : <span className="text-muted-foreground">Sin asesor</span>}
                      </td>
                      
                      <td className="p-2 min-w-[180px]">
                        {editingNotesId === sale.id ? (
                          <AutoExpandingTextarea
                            value={notesValue}
                            onChange={handleNotesChange}
                            onBlur={handleNotesBlur}
                            onKeyDown={handleNotesKeyDown}
                            placeholder="Agregar nota..."
                            className="text-xs"
                            minRows={5}
                            maxRows={10}
                            maxLength={500}
                            autoFocus
                            label="Notas"
                            quickMessages={QUICK_NOTES_MESSAGES}
                            data-testid={`notes-input-${sale.id}`}
                          />
                        ) : (
                          <div 
                            className="text-xs cursor-pointer hover:bg-muted/50 rounded px-2 py-1 min-h-[28px]"
                            title={sale.notas || "Click para agregar nota"}
                            onClick={() => handleNotesClick(sale)}
                            data-testid={`notes-display-${sale.id}`}
                          >
                            <NotesDisplay notes={sale.notas} />
                          </div>
                        )}
                      </td>
                      
                      <td className="p-2 min-w-[180px] text-xs">
                        <Select
                          value={sale.transportistaId || "unassigned"}
                          onValueChange={(value) => handleTransportistaChange(sale.id, value === "unassigned" ? null : value)}
                          disabled={updateTransportistaMutation.isPending}
                        >
                          <SelectTrigger className={cn("w-full h-8 text-xs", !sale.transportistaId && "text-amber-500")} data-testid={`transportista-select-${sale.id}`}>
                            <SelectValue placeholder="Seleccionar..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unassigned">Sin asignar</SelectItem>
                            {transportistas.map((transportista) => (
                              <SelectItem key={transportista.id} value={transportista.id}>
                                {transportista.nombre}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      
                      <td className="p-2 min-w-[150px] text-xs">
                        {editingNroGuiaId === sale.id ? (
                          <Input
                            value={nroGuiaValue}
                            onChange={handleNroGuiaChange}
                            onBlur={handleNroGuiaBlur}
                            onKeyDown={handleNroGuiaKeyDown}
                            maxLength={100}
                            placeholder="Agregar nro guía..."
                            className="h-7 text-xs"
                            autoFocus
                            data-testid={`nro-guia-input-${sale.id}`}
                          />
                        ) : (
                          <div 
                            className="text-xs text-muted-foreground truncate cursor-pointer hover:bg-muted/50 rounded px-2 py-1 min-h-[28px] flex items-center"
                            title={sale.nroGuia || "Click para agregar nro guía"}
                            onClick={() => handleNroGuiaClick(sale)}
                            data-testid={`nro-guia-display-${sale.id}`}
                          >
                            {sale.nroGuia || 'Click para agregar'}
                          </div>
                        )}
                      </td>
                      
                      <td className="p-2 min-w-[150px] text-xs">
                        <Popover 
                          open={openFechaDespachoId === sale.id}
                          onOpenChange={(open) => setOpenFechaDespachoId(open ? sale.id : null)}
                        >
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full h-8 justify-start text-left font-normal text-xs",
                                !sale.fechaDespacho && "text-muted-foreground"
                              )}
                              data-testid={`fecha-despacho-button-${sale.id}`}
                            >
                              <CalendarIcon className={cn("mr-2 h-3 w-3", !sale.fechaDespacho && "text-amber-500")} />
                              {sale.fechaDespacho ? formatFechaDespacho(sale.fechaDespacho) : "Seleccionar"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={parseFechaDespacho(sale.fechaDespacho)}
                              onSelect={(date) => handleFechaDespachoChange(sale.id, date)}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </td>
                      
                      <td className="p-2 pr-6 min-w-[150px] text-xs">
                        <Popover
                          open={openFechaClienteId === sale.id}
                          onOpenChange={(open) => setOpenFechaClienteId(open ? sale.id : null)}
                        >
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full h-8 justify-start text-left font-normal text-xs",
                                !sale.fechaCliente && "text-muted-foreground"
                              )}
                              data-testid={`fecha-cliente-button-${sale.id}`}
                            >
                              <CalendarIcon className={cn("mr-2 h-3 w-3", !sale.fechaCliente && "text-amber-500")} />
                              {sale.fechaCliente ? formatFechaDespacho(sale.fechaCliente) : "Seleccionar"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={parseFechaDespacho(sale.fechaCliente)}
                              onSelect={(date) => handleFechaClienteChange(sale.id, date)}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </td>
                      
                      <td className="p-2 min-w-[150px] text-xs">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={sale.estadoEntrega === "Entregado" || markDeliveredMutation.isPending || !sale.fechaCliente}
                              data-testid={`delivered-sale-${sale.id}`}
                              className={cn(
                                "h-7 text-xs bg-green-600 text-white border-green-600 hover:bg-green-700 hover:border-green-700 dark:bg-green-600 dark:text-white dark:border-green-600 dark:hover:bg-green-700",
                                (sale.estadoEntrega === "Entregado" || !sale.fechaCliente) && "bg-green-800 text-white hover:bg-green-800 opacity-70 cursor-not-allowed border-green-700"
                              )}
                              title={
                                sale.estadoEntrega === "Entregado" 
                                  ? "Venta ya entregada" 
                                  : !sale.fechaCliente 
                                  ? "Debe llenar la fecha de Recepción del Cliente primero" 
                                  : "Marcar como entregado"
                              }
                            >
                              <Truck className={cn("h-3 w-3 mr-1", sale.estadoEntrega === "Entregado" && "text-green-400")} />
                              Entregado
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar entrega</AlertDialogTitle>
                              <AlertDialogDescription className="space-y-2">
                                <p>
                                  ¿Está seguro que desea marcar esta orden como entregada?
                                </p>
                                <p className="font-medium text-foreground">
                                  Esta acción marcará la venta <span className="font-mono">#{sale.orden}</span> de {sale.nombre} ({sale.sku || <span className="text-muted-foreground">Sin SKU</span>}) como "Entregado" y la removerá de esta vista.
                                </p>
                              </AlertDialogDescription>
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      {total > 0 && (
        <div className="p-6 border-t border-border flex justify-between items-center">
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
    </>
  );
}
