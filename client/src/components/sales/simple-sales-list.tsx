import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Eye, MapPin, Edit, Trash2, Filter } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Sale } from "@shared/schema";

interface SimpleSalesListProps {
  data: Sale[];
  total?: number;
  limit?: number;
  offset?: number;
  isLoading: boolean;
  onFilterChange?: (filters: any) => void;
  onPageChange?: (offset: number) => void;
}

export default function SimpleSalesList({ 
  data, 
  total = 0, 
  limit = 20, 
  offset = 0, 
  isLoading,
  onFilterChange,
  onPageChange 
}: SimpleSalesListProps) {
  const [filters, setFilters] = useState({
    canal: "all",
    estadoEntrega: "all",
    startDate: "",
    endDate: ""
  });
  const [showFilters, setShowFilters] = useState(false);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleFilterChange = (key: string, value: string) => {
    const apiValue = value === "all" ? "" : value;
    const newFilters = { ...filters, [key]: apiValue };
    setFilters(newFilters);
    onFilterChange?.(newFilters);
  };

  const updateStatusMutation = useMutation({
    mutationFn: ({ saleId, newStatus }: { saleId: string; newStatus: string }) => 
      apiRequest("PATCH", `/api/sales/${saleId}/delivery-status`, { estadoEntrega: newStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      toast({
        title: "Estado actualizado",
        description: "El estado de entrega ha sido actualizado exitosamente.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado de entrega.",
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "entregado": return "bg-green-100 text-green-800";
      case "pendiente": return "bg-yellow-100 text-yellow-800";
      case "reservado": return "bg-blue-100 text-blue-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getChannelColor = (channel: string) => {
    switch (channel) {
      case "cashea": return "bg-purple-100 text-purple-800";
      case "shopify": return "bg-green-100 text-green-800";
      case "treble": return "bg-blue-100 text-blue-800";
      case "manual": return "bg-orange-100 text-orange-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="space-y-2">
              <div className="h-4 bg-muted rounded w-1/3"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="h-3 bg-muted rounded"></div>
              <div className="h-3 bg-muted rounded w-3/4"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Lista de Ventas ({total})</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          data-testid="toggle-filters"
        >
          <Filter className="h-4 w-4 mr-2" />
          Filtros
        </Button>
      </div>

      {showFilters && (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Select 
                value={filters.canal} 
                onValueChange={(value) => handleFilterChange('canal', value)}
              >
                <SelectTrigger data-testid="filter-channel">
                  <SelectValue placeholder="Canal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los canales</SelectItem>
                  <SelectItem value="cashea">Cashea</SelectItem>
                  <SelectItem value="shopify">Shopify</SelectItem>
                  <SelectItem value="treble">Treble</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>

              <Select 
                value={filters.estadoEntrega} 
                onValueChange={(value) => handleFilterChange('estadoEntrega', value)}
              >
                <SelectTrigger data-testid="filter-status">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="entregado">Entregado</SelectItem>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                  <SelectItem value="reservado">Reservado</SelectItem>
                </SelectContent>
              </Select>

              <Input 
                type="date" 
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                placeholder="Fecha desde"
                data-testid="filter-start-date"
              />

              <Input 
                type="date" 
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                placeholder="Fecha hasta"
                data-testid="filter-end-date"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sales List */}
      {data.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">No se encontraron ventas</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((sale) => (
            <Card key={sale.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-base font-medium">
                      {sale.nombre}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Orden #{sale.orden}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Badge className={getChannelColor(sale.canal)} variant="secondary">
                      {sale.canal}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Email:</span>
                    <p className="truncate">{sale.email || "N/A"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Teléfono:</span>
                    <p>{sale.telefono || "N/A"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Producto:</span>
                    <p className="truncate" title={sale.product}>{sale.product}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Cantidad:</span>
                    <p>{sale.cantidad}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total:</span>
                    <p className="font-medium">${Number(sale.totalUsd).toLocaleString()} USD</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Fecha:</span>
                    <p>{new Date(sale.fecha).toLocaleDateString('es-ES')}</p>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <Select
                    value={sale.estadoEntrega}
                    onValueChange={(value) => updateStatusMutation.mutate({
                      saleId: sale.id,
                      newStatus: value
                    })}
                    disabled={updateStatusMutation.isPending}
                  >
                    <SelectTrigger className="w-32 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pendiente">Pendiente</SelectItem>
                      <SelectItem value="reservado">Reservado</SelectItem>
                      <SelectItem value="entregado">Entregado</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="flex gap-1">
                    {(sale.direccionFacturacionDireccion || sale.direccionDespachoDireccion) && (
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                        <MapPin className="h-4 w-4" />
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > limit && (
        <div className="flex justify-center items-center gap-4 mt-6">
          <Button
            variant="outline"
            onClick={() => onPageChange?.(Math.max(0, offset - limit))}
            disabled={offset === 0}
          >
            Anterior
          </Button>
          
          <span className="text-sm text-muted-foreground">
            Página {Math.floor(offset / limit) + 1} de {Math.ceil(total / limit)}
          </span>
          
          <Button
            variant="outline"
            onClick={() => onPageChange?.(offset + limit)}
            disabled={offset + limit >= total}
          >
            Siguiente
          </Button>
        </div>
      )}
    </div>
  );
}