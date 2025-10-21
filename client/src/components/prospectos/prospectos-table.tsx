import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronLeft, ChevronRight, Edit, Plus, RotateCcw, Filter, ChevronDown, ChevronUp, Download, DollarSign } from "lucide-react";
import { format } from "date-fns";
import ProspectoDialog from "./prospecto-dialog";
import ConvertProspectoDialog from "./convert-prospecto-dialog";
import type { Prospecto } from "@shared/schema";

interface ProspectosTableProps {
  data: Prospecto[];
  total: number;
  limit: number;
  offset: number;
  isLoading: boolean;
  filters?: {
    asesorId?: string;
    limit: number;
    offset: number;
  };
  onFilterChange?: (filters: any) => void;
  onPageChange?: (newOffset: number) => void;
  onClearFilters?: () => void;
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
}: ProspectosTableProps) {
  const [prospectoDialogOpen, setProspectoDialogOpen] = useState(false);
  const [selectedProspecto, setSelectedProspecto] = useState<Prospecto | null>(null);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [prospectoToConvert, setProspectoToConvert] = useState<Prospecto | null>(null);

  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit);

  const hasActiveFilters = !!(filters?.asesorId);

  const { data: asesores = [] } = useQuery<Array<{ id: string; nombre: string; activo: boolean }>>({
    queryKey: ["/api/admin/asesores"],
  });

  const activeAsesores = asesores.filter((a) => a.activo);
  const asesorMap = new Map(asesores.map((a) => [a.id, a.nombre]));

  const handleFilterChange = (key: string, value: string) => {
    if (onFilterChange) {
      const normalizedValue = (key === "asesorId" && value === "all") ? "" : value;
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
            <div className="flex gap-3">
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
            </div>
          </div>
        )}

        <div className="flex-1 overflow-auto">
          <table className="w-full">
            <thead className="bg-muted/50 sticky top-0 z-10">
              <tr className="border-b border-border">
                <th className="text-left p-3 font-medium text-sm text-muted-foreground">Prospecto</th>
                <th className="text-left p-3 font-medium text-sm text-muted-foreground">Nombre</th>
                <th className="text-left p-3 font-medium text-sm text-muted-foreground">Teléfono</th>
                <th className="text-left p-3 font-medium text-sm text-muted-foreground">Canal</th>
                <th className="text-left p-3 font-medium text-sm text-muted-foreground">Asesor</th>
                <th className="text-left p-3 font-medium text-sm text-muted-foreground">Fecha</th>
                <th className="text-left p-3 font-medium text-sm text-muted-foreground">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    <td className="p-3" colSpan={7}>
                      <Skeleton className="h-8 w-full" />
                    </td>
                  </tr>
                ))
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground" data-testid="text-no-prospectos">
                    No se encontraron prospectos
                  </td>
                </tr>
              ) : (
                data.map((prospecto) => (
                  <tr key={prospecto.id} className="border-b border-border hover:bg-muted/30" data-testid={`row-prospecto-${prospecto.id}`}>
                    <td className="p-3 font-medium" data-testid={`text-prospecto-${prospecto.id}`}>
                      {prospecto.prospecto}
                    </td>
                    <td className="p-3" data-testid={`text-nombre-${prospecto.id}`}>
                      {prospecto.nombre}
                    </td>
                    <td className="p-3" data-testid={`text-telefono-${prospecto.id}`}>
                      {prospecto.telefono}
                    </td>
                    <td className="p-3" data-testid={`text-canal-${prospecto.id}`}>
                      {prospecto.canal || "-"}
                    </td>
                    <td className="p-3" data-testid={`text-asesor-${prospecto.id}`}>
                      {prospecto.asesorId ? asesorMap.get(prospecto.asesorId) || "-" : "-"}
                    </td>
                    <td className="p-3" data-testid={`text-fecha-${prospecto.id}`}>
                      {format(new Date(prospecto.fechaCreacion), "dd/MM/yy")}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                          onClick={() => handleConvertProspecto(prospecto)}
                          data-testid={`button-convert-prospecto-${prospecto.id}`}
                        >
                          <DollarSign className="h-4 w-4 mr-2" />
                          Convertir
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditProspecto(prospecto)}
                          data-testid={`button-edit-prospecto-${prospecto.id}`}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
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
      />

      <ConvertProspectoDialog
        open={convertDialogOpen}
        onOpenChange={setConvertDialogOpen}
        prospecto={prospectoToConvert}
      />
    </>
  );
}
