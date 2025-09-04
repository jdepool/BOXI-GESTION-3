import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import SaleDetailModal from "./sale-detail-modal";
import type { Sale } from "@shared/schema";

interface SalesTableProps {
  data: Sale[];
  total?: number;
  limit?: number;
  offset?: number;
  isLoading: boolean;
  hideFilters?: boolean;
  hidePagination?: boolean;
  onFilterChange?: (filters: any) => void;
  onPageChange?: (offset: number) => void;
}

export default function SalesTable({ 
  data, 
  total = 0, 
  limit = 20, 
  offset = 0, 
  isLoading, 
  hideFilters = false,
  hidePagination = false,
  onFilterChange,
  onPageChange 
}: SalesTableProps) {
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [filters, setFilters] = useState({
    canal: "",
    estadoEntrega: "",
    startDate: "",
    endDate: ""
  });

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
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
                  <SelectItem value="">Todos los canales</SelectItem>
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
                  <SelectItem value="">Todos los estados</SelectItem>
                  <SelectItem value="entregado">Entregado</SelectItem>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                  <SelectItem value="reservado">Reservado</SelectItem>
                </SelectContent>
              </Select>

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

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Cliente</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Canal</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Producto</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Total USD</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Estado</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Fecha</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center p-8 text-muted-foreground">
                  No hay datos disponibles
                </td>
              </tr>
            ) : (
              data.map((sale) => (
                <tr 
                  key={sale.id} 
                  className="border-b border-border hover:bg-muted/50 transition-colors"
                  data-testid={`sale-row-${sale.id}`}
                >
                  <td className="p-4">
                    <div>
                      <p className="text-sm font-medium text-foreground">{sale.nombre}</p>
                      <p className="text-xs text-muted-foreground">{sale.email}</p>
                    </div>
                  </td>
                  <td className="p-4">
                    <Badge className={`${getChannelBadgeClass(sale.canal)} text-white`}>
                      {sale.canal.charAt(0).toUpperCase() + sale.canal.slice(1)}
                    </Badge>
                  </td>
                  <td className="p-4">
                    <div>
                      <p className="text-sm font-medium text-foreground">{sale.product}</p>
                      <p className="text-xs text-muted-foreground">Cantidad: {sale.cantidad}</p>
                    </div>
                  </td>
                  <td className="p-4 text-sm font-medium text-foreground">
                    ${Number(sale.totalUsd).toLocaleString()}
                  </td>
                  <td className="p-4">
                    <Badge className={`${getStatusBadgeClass(sale.estadoEntrega)} text-white`}>
                      {sale.estadoEntrega.charAt(0).toUpperCase() + sale.estadoEntrega.slice(1)}
                    </Badge>
                  </td>
                  <td className="p-4 text-sm text-muted-foreground">
                    {new Date(sale.fecha).toLocaleDateString()}
                  </td>
                  <td className="p-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedSale(sale)}
                      data-testid={`view-sale-${sale.id}`}
                    >
                      <i className="fas fa-eye"></i>
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!hidePagination && total > 0 && (
        <div className="p-4 border-t border-border flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            Mostrando {offset + 1}-{Math.min(offset + limit, total)} de {total} registros
          </p>
          
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
    </>
  );
}
