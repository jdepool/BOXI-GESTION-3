import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Package, User, Phone, Mail } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Sale } from "@shared/schema";

interface DispatchTableProps {
  data: Sale[];
  total?: number;
  limit?: number;
  offset?: number;
  isLoading: boolean;
  onPageChange?: (offset: number) => void;
}

export default function DispatchTable({ 
  data, 
  total = 0, 
  limit = 20, 
  offset = 0, 
  isLoading, 
  onPageChange 
}: DispatchTableProps) {

  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit);
  const queryClient = useQueryClient();
  const { toast } = useToast();

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

  const handleStatusChange = (saleId: string, newStatus: string) => {
    updateDeliveryStatusMutation.mutate({ saleId, status: newStatus });
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Despachado': return 'default';
      case 'Cancelado': return 'destructive';
      case 'Pospuesto': return 'secondary';
      case 'A Despachar': return 'outline';
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
      <div className="p-6 border-b border-border">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Órdenes para Despacho
            </h2>
            <p className="text-sm text-muted-foreground">
              {total} órdenes con direcciones listas para despacho
            </p>
          </div>
          <Button 
            onClick={handleExportExcel}
            className="flex items-center gap-2"
            data-testid="export-dispatch-excel"
          >
            <Download className="h-4 w-4" />
            Descargar Excel
          </Button>
        </div>
      </div>

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
          <div className="border border-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-32">Orden</TableHead>
                  <TableHead className="min-w-48">Cliente</TableHead>
                  <TableHead className="w-32">Cédula</TableHead>
                  <TableHead className="w-36">Teléfono</TableHead>
                  <TableHead className="min-w-48">Email</TableHead>
                  <TableHead className="min-w-48">Producto</TableHead>
                  <TableHead className="w-20">Cant.</TableHead>
                  <TableHead className="w-24">Canal</TableHead>
                  <TableHead className="min-w-72">Dirección de Facturación</TableHead>
                  <TableHead className="min-w-72">Dirección de Despacho</TableHead>
                  <TableHead className="w-36">Estado</TableHead>
                  <TableHead className="w-28">Fecha</TableHead>
                  <TableHead className="w-36">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((sale) => (
                  <TableRow key={sale.id} data-testid={`dispatch-row-${sale.id}`}>
                    <TableCell className="font-medium">
                      #{sale.orden}
                    </TableCell>
                    
                    <TableCell>
                      <div className="font-medium">{sale.nombre}</div>
                    </TableCell>
                    
                    <TableCell>{sale.cedula}</TableCell>
                    
                    <TableCell>{sale.telefono}</TableCell>
                    
                    <TableCell className="text-sm">{sale.email}</TableCell>
                    
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">{sale.product}</div>
                        <div className="text-muted-foreground">
                          ${Number(sale.totalUsd).toLocaleString()} USD
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell className="text-center">{sale.cantidad}</TableCell>
                    
                    <TableCell>
                      <Badge className={`${getChannelBadgeClass(sale.canal)} text-white text-xs`}>
                        {sale.canal.charAt(0).toUpperCase() + sale.canal.slice(1)}
                      </Badge>
                    </TableCell>
                    
                    <TableCell>
                      {sale.direccionFacturacionPais ? (
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
                        <div className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/20 p-2 rounded border border-amber-200 dark:border-amber-800">
                          <div className="font-medium flex items-center gap-1">
                            ⚠️ Sin dirección
                          </div>
                          <div className="text-amber-700 dark:text-amber-300">
                            Pendiente de agregar
                          </div>
                        </div>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      {sale.direccionFacturacionPais ? (
                        sale.direccionDespachoIgualFacturacion === "true" ? (
                          <div className="text-xs text-muted-foreground italic">
                            Igual a facturación
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
                        <div className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/20 p-2 rounded border border-amber-200 dark:border-amber-800">
                          <div className="font-medium flex items-center gap-1">
                            ⚠️ Sin dirección
                          </div>
                          <div className="text-amber-700 dark:text-amber-300">
                            Pendiente de agregar
                          </div>
                        </div>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      <Badge 
                        variant={getStatusBadgeVariant(sale.estadoEntrega)}
                        className="text-xs"
                      >
                        {sale.estadoEntrega}
                      </Badge>
                    </TableCell>
                    
                    <TableCell className="text-xs">
                      {new Date(sale.fecha).toLocaleDateString('es-ES')}
                    </TableCell>
                    
                    <TableCell>
                      <Select
                        value={sale.estadoEntrega}
                        onValueChange={(newStatus) => handleStatusChange(sale.id, newStatus)}
                        disabled={updateDeliveryStatusMutation.isPending}
                      >
                        <SelectTrigger className="w-32 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="A Despachar">A despachar</SelectItem>
                          <SelectItem value="Despachado">Despachado</SelectItem>
                          <SelectItem value="Cancelado">Cancelado</SelectItem>
                          <SelectItem value="Pospuesto">Pospuesto</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {total > 0 && (
        <div className="p-6 border-t border-border flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            Mostrando {offset + 1}-{Math.min(offset + limit, total)} de {total} órdenes
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
              {currentPage} de {totalPages}
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
    </>
  );
}