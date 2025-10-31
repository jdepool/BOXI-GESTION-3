import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Edit, Plus, RotateCcw, Filter, ChevronDown, ChevronUp, Download, DollarSign, ClipboardCheck } from "lucide-react";
import { format, startOfDay, addDays } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { DateRangePicker } from "@/components/shared/date-range-picker";
import { filterCanalesByProductLine, type ProductLine } from "@/lib/canalFilters";
import { useDebouncedSearch } from "@/hooks/use-debounced-search";
import ProspectoDialog from "./prospecto-dialog";
import ConvertProspectoDialog from "./convert-prospecto-dialog";
import SeguimientoDialog from "./seguimiento-dialog";
import type { Prospecto, SeguimientoConfig } from "@shared/schema";

interface ProspectosTableProps {
  data: Prospecto[];
  total: number;
  limit: number;
  offset: number;
  isLoading: boolean;
  filters?: {
    asesorId?: string;
    estadoProspecto?: string;
    canal?: string;
    prospecto?: string;
    startDate?: string;
    endDate?: string;
    limit: number;
    offset: number;
  };
  onFilterChange?: (filters: any) => void;
  onPageChange?: (newOffset: number) => void;
  onClearFilters?: () => void;
  onConvertProspecto?: (tipo: "inmediata" | "reserva", prospecto: Prospecto) => void;
  productLine?: ProductLine;
}

// Helper function to determine seguimiento status
function getSeguimientoStatus(
  prospecto: Prospecto, 
  diasFase1: number = 2, 
  diasFase2: number = 4, 
  diasFase3: number = 7
): {
  phase: number | null;
  status: "overdue" | "today" | "future" | null;
  date: Date | null;
  dateStr: string | null;
} {
  // Extract date-only string from ISO timestamp, PostgreSQL timestamp, or YYYY-MM-DD string
  const extractDate = (dateValue: string | Date | null | undefined): string | null => {
    if (!dateValue) return null;
    
    const dateStr = typeof dateValue === 'string' ? dateValue : dateValue.toISOString();
    
    // If already in YYYY-MM-DD format (10 chars, matches pattern)
    if (dateStr.length === 10 && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }
    
    // Extract from ISO timestamp (has 'T')
    if (dateStr.includes('T')) {
      return dateStr.split('T')[0];
    }
    
    // Extract from PostgreSQL timestamp format "YYYY-MM-DD HH:MM:SS"
    if (dateStr.includes(' ')) {
      return dateStr.split(' ')[0];
    }
    
    // Fallback: just return the string
    return dateStr;
  };

  // Add days to a YYYY-MM-DD string without using date-fns
  const addDaysToDateStr = (dateStr: string, days: number): string => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() + days);
    const newYear = date.getFullYear();
    const newMonth = String(date.getMonth() + 1).padStart(2, '0');
    const newDay = String(date.getDate()).padStart(2, '0');
    return `${newYear}-${newMonth}-${newDay}`;
  };

  // Parse date string to local Date object without timezone conversion
  const parseLocalDate = (dateStr: string): Date => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const todayStr = format(new Date(), "yyyy-MM-dd");
  
  // Determine which phase we're in and the next follow-up date
  const registrationDateStr = extractDate(prospecto.fechaCreacion);
  if (!registrationDateStr) {
    return { phase: null, status: null, date: null, dateStr: null };
  }
  
  // Calculate fase 1 date
  const fase1Extracted = extractDate(prospecto.fechaSeguimiento1);
  const fase1Str = fase1Extracted || addDaysToDateStr(registrationDateStr, diasFase1);
  
  // Calculate fase 2 date
  const fase2Extracted = extractDate(prospecto.fechaSeguimiento2);
  let fase2Str: string;
  if (fase2Extracted) {
    fase2Str = fase2Extracted;
  } else if (fase1Extracted) {
    // If fase1 was manually set, add diasFase2 to it
    fase2Str = addDaysToDateStr(fase1Extracted, diasFase2);
  } else {
    // If fase1 was not set, calculate from registration date
    fase2Str = addDaysToDateStr(registrationDateStr, diasFase1 + diasFase2);
  }
  
  // Calculate fase 3 date
  const fase3Extracted = extractDate(prospecto.fechaSeguimiento3);
  let fase3Str: string;
  if (fase3Extracted) {
    fase3Str = fase3Extracted;
  } else if (fase2Extracted) {
    // If fase2 was manually set, add diasFase3 to it
    fase3Str = addDaysToDateStr(fase2Extracted, diasFase3);
  } else {
    // If fase2 was not set, calculate from registration date
    fase3Str = addDaysToDateStr(registrationDateStr, diasFase1 + diasFase2 + diasFase3);
  }

  // Determine current phase based on completed phases
  let currentPhase = 1;
  let nextDateStr = fase1Str;

  if (prospecto.respuestaSeguimiento1) {
    currentPhase = 2;
    nextDateStr = fase2Str;
  }
  if (prospecto.respuestaSeguimiento2) {
    currentPhase = 3;
    nextDateStr = fase3Str;
  }
  if (prospecto.respuestaSeguimiento3) {
    // All phases completed
    return { phase: null, status: null, date: null, dateStr: null };
  }

  // Ensure nextDateStr is not null
  if (!nextDateStr) {
    return { phase: null, status: null, date: null, dateStr: null };
  }

  // Determine status by string comparison (YYYY-MM-DD format)
  let status: "overdue" | "today" | "future";
  if (nextDateStr < todayStr) {
    status = "overdue";
  } else if (nextDateStr === todayStr) {
    status = "today";
  } else {
    status = "future";
  }

  return { 
    phase: currentPhase, 
    status, 
    date: parseLocalDate(nextDateStr),
    dateStr: nextDateStr
  };
}

// Helper function to get channel badge color
function getChannelColor(channel: string | null) {
  switch (channel?.toLowerCase()) {
    case "cashea": return "channel-badge-cashea";
    case "shopify": return "channel-badge-shopify";
    case "treble": return "channel-badge-treble";
    case "tienda": return "channel-badge-tienda";
    case "manual": return "bg-orange-100 text-orange-800";
    default: return "bg-gray-100 text-gray-800";
  }
}

export default function ProspectosTable({
  data,
  total,
  limit,
  offset,
  isLoading,
  filters,
  onFilterChange,
  onPageChange,
  onClearFilters,
  onConvertProspecto,
  productLine = 'boxi',
}: ProspectosTableProps) {
  const { toast } = useToast();
  const [prospectoDialogOpen, setProspectoDialogOpen] = useState(false);
  const [selectedProspecto, setSelectedProspecto] = useState<Prospecto | null>(null);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [prospectoToConvert, setProspectoToConvert] = useState<Prospecto | null>(null);
  const [seguimientoDialogOpen, setSeguimientoDialogOpen] = useState(false);
  const [prospectoForSeguimiento, setProspectoForSeguimiento] = useState<Prospecto | null>(null);
  
  // Debounced search for prospecto number and nombre
  const { inputValue: searchInput, debouncedValue: debouncedSearch, setInputValue: setSearchInput } = useDebouncedSearch(filters?.prospecto || "", 500);
  
  // Sync search input when filters are cleared externally
  useEffect(() => {
    if (filters?.prospecto === "" && searchInput !== "") {
      setSearchInput("");
    }
  }, [filters?.prospecto]);
  
  // Update filter when debounced value changes
  useEffect(() => {
    if (onFilterChange && debouncedSearch !== (filters?.prospecto || "")) {
      handleFilterChange("prospecto", debouncedSearch);
    }
  }, [debouncedSearch]);

  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit);

  const hasActiveFilters = !!(filters?.asesorId || filters?.canal || filters?.prospecto || filters?.startDate || filters?.endDate);

  const { data: asesores = [] } = useQuery<Array<{ id: string; nombre: string; activo: boolean }>>({
    queryKey: ["/api/admin/asesores"],
  });

  const { data: canales = [] } = useQuery<Array<{ id: string; nombre: string; activo: boolean | string }>>({
    queryKey: ["/api/admin/canales"],
  });

  const { data: seguimientoConfig } = useQuery<SeguimientoConfig>({
    queryKey: ["/api/admin/seguimiento-config"],
  });

  const activeAsesores = asesores.filter((a) => a.activo);
  const asesorMap = new Map(asesores.map((a) => [a.id, a.nombre]));

  const handleFilterChange = (key: string, value: string) => {
    if (onFilterChange) {
      let normalizedValue = value;
      if (key === "asesorId" && value === "all") {
        normalizedValue = "";
      }
      onFilterChange({ [key]: normalizedValue });
    }
  };

  const handleNewProspecto = () => {
    setSelectedProspecto(null);
    setProspectoDialogOpen(true);
  };

  const handleEditProspecto = (prospecto: Prospecto) => {
    setSelectedProspecto(prospecto);
    setProspectoDialogOpen(true);
  };

  const handleConvertProspecto = (prospecto: Prospecto) => {
    setProspectoToConvert(prospecto);
    setConvertDialogOpen(true);
  };

  const handlePrevPage = () => {
    if (onPageChange && offset > 0) {
      onPageChange(Math.max(0, offset - limit));
    }
  };

  const handleNextPage = () => {
    if (onPageChange && offset + limit < total) {
      onPageChange(offset + limit);
    }
  };

  const handleExport = async () => {
    try {
      const queryParams = new URLSearchParams();
      
      if (filters?.asesorId) {
        queryParams.append('asesorId', filters.asesorId);
      }

      if (filters?.canal) {
        queryParams.append('canal', filters.canal);
      }

      if (filters?.prospecto) {
        queryParams.append('prospecto', filters.prospecto);
      }

      if (filters?.startDate) {
        queryParams.append('startDate', filters.startDate);
      }

      if (filters?.endDate) {
        queryParams.append('endDate', filters.endDate);
      }

      const response = await fetch(`/api/prospectos/export?${queryParams}`);
      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `prospectos_boxisleep_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  const handleSeguimientoClick = (prospecto: Prospecto) => {
    setProspectoForSeguimiento(prospecto);
    setSeguimientoDialogOpen(true);
  };

  const saveSeguimientoMutation = useMutation({
    mutationFn: async ({ prospectoId, data }: { prospectoId: string; data: any }) => {
      const response = await apiRequest("PUT", `/api/prospectos/${prospectoId}/seguimiento`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/prospectos"] });
      setSeguimientoDialogOpen(false);
      toast({ title: "Seguimiento guardado exitosamente" });
    },
    onError: (error) => {
      console.error("Error saving seguimiento:", error);
      toast({
        title: "Error",
        description: "No se pudo guardar el seguimiento. Por favor intente de nuevo.",
        variant: "destructive",
      });
    },
  });

  const markAsPerdidoMutation = useMutation({
    mutationFn: async ({ prospectoId, seguimientoData }: { prospectoId: string; seguimientoData: any }) => {
      try {
        // First save seguimiento data - apiRequest throws on error
        const seguimientoResponse = await apiRequest("PUT", `/api/prospectos/${prospectoId}/seguimiento`, seguimientoData);
        await seguimientoResponse.json();
      } catch (error) {
        // Tag the error so we can identify it in onError
        const wrappedError: any = new Error("SEGUIMIENTO_SAVE_FAILED");
        wrappedError.originalError = error;
        throw wrappedError;
      }
      
      try {
        // Only proceed to mark as Perdido if seguimiento was saved successfully
        const perdidoResponse = await apiRequest("PATCH", `/api/prospectos/${prospectoId}`, { estadoProspecto: "Perdido" });
        return perdidoResponse.json();
      } catch (error) {
        // Tag the error so we can identify it in onError
        const wrappedError: any = new Error("PERDIDO_UPDATE_FAILED");
        wrappedError.originalError = error;
        throw wrappedError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/prospectos"] });
      setSeguimientoDialogOpen(false);
      toast({ title: "Prospecto marcado como Perdido" });
    },
    onError: (error: any) => {
      console.error("Error marking as perdido:", error);
      
      // Provide specific error messages based on which step failed
      if (error?.message === "SEGUIMIENTO_SAVE_FAILED") {
        toast({
          title: "Error al guardar seguimiento",
          description: "No se pudieron guardar los cambios de seguimiento. Por favor intente de nuevo.",
          variant: "destructive",
        });
      } else if (error?.message === "PERDIDO_UPDATE_FAILED") {
        toast({
          title: "Error al actualizar estado",
          description: "El seguimiento se guardó pero no se pudo marcar como Perdido. Por favor intente de nuevo.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "No se pudo completar la operación. Por favor intente de nuevo.",
          variant: "destructive",
        });
      }
    },
  });

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Top toolbar - consistent with Sales tab layout */}
        <div className="p-3 border-b border-border flex items-center justify-between">
          {/* Left side - Nuevo Prospecto button */}
          <div>
            <Button onClick={handleNewProspecto} data-testid="button-new-prospecto">
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Prospecto
            </Button>
          </div>
          
          {/* Right side - filter toggle and clear buttons */}
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setFiltersVisible(!filtersVisible)}
              data-testid="button-toggle-filters"
              className="text-muted-foreground"
            >
              <Filter className="h-4 w-4 mr-2" />
              {filtersVisible ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
            
            {hasActiveFilters && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={onClearFilters}
                      data-testid="button-clear-filters"
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
              data-testid="button-export-prospectos"
              className="text-muted-foreground"
              title="Exportar"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Filter section - collapsible */}
        {filtersVisible && (
          <div className="p-6 border-b border-border">
            <div className="flex flex-wrap gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Canal:</label>
                <Select
                  value={filters?.canal || "all"}
                  onValueChange={(value) => handleFilterChange("canal", value === "all" ? "" : value)}
                  data-testid="select-filter-canal"
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Todos los canales" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" data-testid="option-canal-all">Todos los canales</SelectItem>
                    {filterCanalesByProductLine(
                      canales.filter(canal => canal.activo !== false),
                      productLine
                    ).map(canal => (
                      <SelectItem key={canal.id} value={canal.nombre} data-testid={`option-canal-${canal.nombre.toLowerCase()}`}>
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
                  onValueChange={(value) => handleFilterChange("asesorId", value)}
                  data-testid="select-filter-asesor"
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filtrar por asesor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" data-testid="option-asesor-all">Todos los asesores</SelectItem>
                    {activeAsesores.map((asesor) => (
                      <SelectItem key={asesor.id} value={asesor.id} data-testid={`option-asesor-${asesor.id}`}>
                        {asesor.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Buscar:</label>
                <Input
                  type="text"
                  placeholder="Buscar por prospecto o nombre"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  data-testid="input-filter-buscar"
                  className="w-60"
                />
              </div>
              <DateRangePicker
                startDate={filters?.startDate || ""}
                endDate={filters?.endDate || ""}
                onStartDateChange={(date) => handleFilterChange("startDate", date)}
                onEndDateChange={(date) => handleFilterChange("endDate", date)}
              />
            </div>
          </div>
        )}

        <div className="flex-1 overflow-auto">
          <table className="w-full">
            <thead className="bg-muted/50 sticky top-0 z-10">
              <tr className="border-b border-border">
                <th className="text-left p-3 font-medium text-sm text-muted-foreground">Prospecto</th>
                <th className="text-left p-3 font-medium text-sm text-muted-foreground">Nombre</th>
                <th className="text-left p-3 font-medium text-sm text-muted-foreground">Fecha</th>
                <th className="text-left p-3 font-medium text-sm text-muted-foreground">Canal</th>
                <th className="text-left p-3 font-medium text-sm text-muted-foreground">Teléfono</th>
                <th className="text-left p-3 font-medium text-sm text-muted-foreground">Asesor</th>
                <th className="text-left p-3 font-medium text-sm text-muted-foreground">Notas</th>
                <th className="text-left p-3 font-medium text-sm text-muted-foreground">Próximo</th>
                <th className="text-left p-3 font-medium text-sm text-muted-foreground">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    <td className="p-3" colSpan={10}>
                      <Skeleton className="h-8 w-full" />
                    </td>
                  </tr>
                ))
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-muted-foreground" data-testid="text-no-prospectos">
                    No se encontraron prospectos
                  </td>
                </tr>
              ) : (
                data.map((prospecto) => {
                  const seguimientoStatus = getSeguimientoStatus(
                    prospecto,
                    seguimientoConfig?.diasFase1 ?? 2,
                    seguimientoConfig?.diasFase2 ?? 4,
                    seguimientoConfig?.diasFase3 ?? 7
                  );
                  return (
                  <tr key={prospecto.id} className="border-b border-border hover:bg-muted/30 text-xs" data-testid={`row-prospecto-${prospecto.id}`}>
                    <td className="p-3 text-xs text-muted-foreground" data-testid={`text-prospecto-${prospecto.id}`}>
                      {prospecto.prospecto}
                    </td>
                    <td className="p-3 text-xs" data-testid={`text-nombre-${prospecto.id}`}>
                      {prospecto.nombre}
                    </td>
                    <td className="p-3 text-xs text-muted-foreground" data-testid={`text-fecha-${prospecto.id}`}>
                      {format(new Date(prospecto.fechaCreacion), "dd/MM/yy")}
                    </td>
                    <td className="p-3 text-xs" data-testid={`text-canal-${prospecto.id}`}>
                      {prospecto.canal ? (
                        <Badge className={`${getChannelColor(prospecto.canal)} text-xs`}>
                          {prospecto.canal}
                        </Badge>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="p-3 text-xs" data-testid={`text-telefono-${prospecto.id}`}>
                      {prospecto.telefono}
                    </td>
                    <td className="p-3 text-xs" data-testid={`text-asesor-${prospecto.id}`}>
                      {prospecto.asesorId ? asesorMap.get(prospecto.asesorId) || "-" : "-"}
                    </td>
                    <td className="p-3 text-xs text-muted-foreground" data-testid={`text-notas-${prospecto.id}`} title={prospecto.notas || undefined}>
                      {prospecto.notas ? (prospecto.notas.length > 20 ? prospecto.notas.substring(0, 20) + '...' : prospecto.notas) : "-"}
                    </td>
                    <td className="p-3 text-xs" data-testid={`text-seguimiento-status-${prospecto.id}`}>
                      {prospecto.estadoProspecto === "Activo" && seguimientoStatus.phase !== null ? (
                        <div className="flex items-center gap-2">
                          <Badge
                            className={`text-xs font-semibold px-2 py-1 ${
                              seguimientoStatus.status === "overdue"
                                ? "bg-red-500 hover:bg-red-600 text-white"
                                : seguimientoStatus.status === "today"
                                ? "bg-yellow-500 hover:bg-yellow-600 text-white"
                                : "bg-green-500 hover:bg-green-600 text-white"
                            }`}
                          >
                            {seguimientoStatus.phase}
                          </Badge>
                          {seguimientoStatus.status === "future" && seguimientoStatus.dateStr && (
                            <span className="text-xs text-muted-foreground">
                              {(() => {
                                const [year, month, day] = seguimientoStatus.dateStr.split('-');
                                return `${day}/${month}`;
                              })()}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="p-3 text-xs">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSeguimientoClick(prospecto)}
                          data-testid={`button-seguimiento-prospecto-${prospecto.id}`}
                          className="text-xs"
                        >
                          <ClipboardCheck className="h-3 w-3 mr-1" />
                          Seguimiento
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditProspecto(prospecto)}
                          data-testid={`button-edit-prospecto-${prospecto.id}`}
                          className="text-xs"
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
                          onClick={() => handleConvertProspecto(prospecto)}
                          data-testid={`button-convert-prospecto-${prospecto.id}`}
                        >
                          <DollarSign className="h-3 w-3 mr-1" />
                          Convertir
                        </Button>
                      </div>
                    </td>
                  </tr>
                  );
                }))
              }
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-border flex items-center justify-between">
          <div className="text-sm text-muted-foreground" data-testid="text-pagination-info">
            Mostrando {Math.min(offset + 1, total)} - {Math.min(offset + limit, total)} de {total} prospectos
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevPage}
              disabled={offset === 0}
              data-testid="button-prev-page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground" data-testid="text-current-page">
              Página {currentPage} de {totalPages || 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={offset + limit >= total}
              data-testid="button-next-page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <ProspectoDialog
        open={prospectoDialogOpen}
        onOpenChange={setProspectoDialogOpen}
        prospecto={selectedProspecto}
        productLine={productLine}
      />

      <ConvertProspectoDialog
        open={convertDialogOpen}
        onOpenChange={setConvertDialogOpen}
        prospecto={prospectoToConvert}
        onConvert={(tipo, prospecto) => {
          if (onConvertProspecto) {
            onConvertProspecto(tipo, prospecto);
          }
        }}
      />

      <SeguimientoDialog
        open={seguimientoDialogOpen}
        onOpenChange={setSeguimientoDialogOpen}
        prospecto={prospectoForSeguimiento}
        onSave={(data) => {
          if (prospectoForSeguimiento) {
            saveSeguimientoMutation.mutate({
              prospectoId: prospectoForSeguimiento.id,
              data,
            });
          }
        }}
        onMarkAsPerdido={(prospectoId, seguimientoData) => {
          markAsPerdidoMutation.mutate({ prospectoId, seguimientoData });
        }}
        isSaving={saveSeguimientoMutation.isPending || markAsPerdidoMutation.isPending}
      />
    </>
  );
}
