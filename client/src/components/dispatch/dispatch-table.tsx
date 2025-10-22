import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DateRangePicker } from "@/components/shared/date-range-picker";
import { Download, Package, ChevronLeft, ChevronRight, Filter, ChevronDown, ChevronUp, RotateCcw } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Sale } from "@shared/schema";

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
  const [filtersVisible, setFiltersVisible] = useState(false);
  
  // Debounced search - local state for immediate UI updates
  const [searchInputValue, setSearchInputValue] = useState(parentFilters?.search || "");

  const filters = {
    canal: parentFilters?.canal || "",
    estadoEntrega: parentFilters?.estadoEntrega || "",
    transportistaId: parentFilters?.transportistaId || "",
    search: parentFilters?.search || "",
    startDate: parentFilters?.startDate || "",
    endDate: parentFilters?.endDate || ""
  };

  // Check if any filters are active
  const hasActiveFilters = !!(
    parentFilters?.canal || 
    parentFilters?.estadoEntrega || 
    parentFilters?.transportistaId || 
    parentFilters?.search || 
    parentFilters?.startDate || 
    parentFilters?.endDate
  );

  // Count active filters for badge
  const activeFilterCount = [
    parentFilters?.canal,
    parentFilters?.estadoEntrega,
    parentFilters?.transportistaId,
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

  const handleFilterChange = (key: string, value: string) => {
    onFilterChange?.(key, value === "all" ? "" : value);
  };

  const getChannelBadgeClass = (canal: string) => {
    switch (canal?.toLowerCase()) {
      case 'cashea': return 'bg-blue-600';
      case 'shopify': return 'bg-green-600';
      case 'treble': return 'bg-purple-600';
      default: return 'bg-gray-600';
    }
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

  const handleNotesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const handleNotesKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (editingNotesId && notesValue.trim() !== originalNotesValue) {
        updateNotesMutation.mutate({ 
          saleId: editingNotesId, 
          notas: notesValue.trim() 
        });
      } else {
        setEditingNotesId(null);
      }
    } else if (e.key === 'Escape') {
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

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4 p-4 border border-border rounded-lg">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Top toolbar */}
      <div className="p-3 border-b border-border flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">
          Despachos
        </h2>
        
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
              <label className="text-sm font-medium mb-1 block">Estado de Entrega:</label>
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

            <DateRangePicker
              startDate={filters.startDate}
              endDate={filters.endDate}
              onStartDateChange={(date) => handleFilterChange('startDate', date)}
              onEndDateChange={(date) => handleFilterChange('endDate', date)}
            />

            <div>
              <label className="text-sm font-medium mb-1 block">Buscar:</label>
              <Input 
                type="text"
                placeholder="Buscar por orden, nombre, cédula o teléfono..."
                value={searchInputValue}
                onChange={(e) => setSearchInputValue(e.target.value)}
                className="w-80"
                data-testid="filter-search"
              />
            </div>
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
            <div className="min-w-max">
              <table className="w-full min-w-[2860px] relative">
                <thead className="bg-muted sticky top-0 z-10">
                  <tr>
                    <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[100px] sticky left-0 bg-muted z-20 border-r border-border shadow-[2px_0_5px_rgba(0,0,0,0.1)]">Orden</th>
                    <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[150px] sticky left-[100px] bg-muted z-20 border-r border-border shadow-[2px_0_5px_rgba(0,0,0,0.1)]">Estado de Entrega</th>
                    <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[150px] sticky left-[250px] bg-muted z-20 border-r border-border shadow-[2px_0_5px_rgba(0,0,0,0.1)]">Fecha de Entrega</th>
                    <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[200px]">Nombre</th>
                    <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[150px]">Teléfono</th>
                    <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[120px]">Cédula</th>
                    <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[300px]">Dirección de Despacho</th>
                    <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[200px]">Producto</th>
                    <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[120px]">SKU</th>
                    <th className="text-center p-2 text-xs font-medium text-muted-foreground min-w-[80px]">Cant.</th>
                    <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[200px]">Email</th>
                    <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[120px]">Fecha</th>
                    <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[100px]">Canal</th>
                    <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[150px]">Asesor</th>
                    <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[200px]">Notas</th>
                    <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[180px]">Transportista</th>
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
                        ) : sale.estadoEntrega === "A despachar" ? (
                          <div className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/20 p-2 rounded border border-amber-200 dark:border-amber-800 font-medium" data-testid={`warning-fecha-entrega-${sale.id}`}>
                            ⚠️ Sin fecha
                          </div>
                        ) : (
                          <div className="text-xs text-muted-foreground" data-testid={`fecha-entrega-empty-${sale.id}`}>
                            —
                          </div>
                        )}
                      </td>
                      
                      <td className="p-2 min-w-[200px] text-xs">
                        <div className="font-medium">{sale.nombre}</div>
                      </td>
                      
                      <td className="p-2 min-w-[150px] text-xs">{sale.telefono}</td>
                      
                      <td className="p-2 min-w-[120px] text-xs">{sale.cedula}</td>
                      
                      <td className="p-2 min-w-[300px] text-xs">
                        {sale.direccionFacturacionPais ? (
                          sale.direccionDespachoIgualFacturacion === "true" ? (
                            <div className="text-xs space-y-1 max-w-72">
                              <div className="font-medium">{sale.direccionFacturacionDireccion}</div>
                              <div>
                                {sale.direccionFacturacionCiudad}, {sale.direccionFacturacionEstado}
                              </div>
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
                              <div>
                                {sale.direccionDespachoCiudad}, {sale.direccionDespachoEstado}
                              </div>
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
                      
                      <td className="p-2 min-w-[120px] text-xs">
                        {new Date(sale.fecha).toLocaleDateString('es-ES')}
                      </td>
                      
                      <td className="p-2 min-w-[100px] text-xs">
                        <Badge className={`${getChannelBadgeClass(sale.canal)} text-white text-xs`}>
                          {sale.canal.charAt(0).toUpperCase() + sale.canal.slice(1)}
                        </Badge>
                      </td>
                      
                      <td className="p-2 min-w-[150px] text-xs">
                        {sale.asesorId ? (asesorMap[sale.asesorId] || '...') : <span className="text-muted-foreground">Sin asesor</span>}
                      </td>
                      
                      <td className="p-2 min-w-[200px] text-xs">
                        {editingNotesId === sale.id ? (
                          <Input
                            value={notesValue}
                            onChange={handleNotesChange}
                            onBlur={handleNotesBlur}
                            onKeyDown={handleNotesKeyDown}
                            maxLength={300}
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
                      
                      <td className="p-2 min-w-[180px] text-xs">
                        <Select
                          value={sale.transportistaId || "unassigned"}
                          onValueChange={(value) => handleTransportistaChange(sale.id, value === "unassigned" ? null : value)}
                          disabled={updateTransportistaMutation.isPending}
                        >
                          <SelectTrigger className="w-full h-8 text-xs" data-testid={`transportista-select-${sale.id}`}>
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
                        {/* Empty for future actions */}
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
