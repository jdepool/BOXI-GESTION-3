import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Download, Package, User, Phone, Mail, ChevronLeft, ChevronRight } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
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
  
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [notesValue, setNotesValue] = useState("");
  const [originalNotesValue, setOriginalNotesValue] = useState("");

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
                  <TableHead className="w-36">Estado de Entrega</TableHead>
                  <TableHead className="w-36">Fecha de Entrega</TableHead>
                  <TableHead className="min-w-48">Producto</TableHead>
                  <TableHead className="w-20">Cant.</TableHead>
                  <TableHead className="min-w-72">Dirección de Despacho</TableHead>
                  <TableHead className="min-w-48">Nombre</TableHead>
                  <TableHead className="w-36">Teléfono</TableHead>
                  <TableHead className="min-w-48">Email</TableHead>
                  <TableHead className="w-32">Cédula</TableHead>
                  <TableHead className="min-w-72">Dirección de Facturación</TableHead>
                  <TableHead className="w-28">Fecha</TableHead>
                  <TableHead className="w-24">Canal</TableHead>
                  <TableHead className="min-w-48">Notas</TableHead>
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
                      <Badge 
                        variant={getStatusBadgeVariant(sale.estadoEntrega)}
                        className="text-xs"
                      >
                        {sale.estadoEntrega}
                      </Badge>
                    </TableCell>
                    
                    <TableCell>
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
                    </TableCell>
                    
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
                    </TableCell>
                    
                    <TableCell>
                      <div className="font-medium">{sale.nombre}</div>
                    </TableCell>
                    
                    <TableCell>{sale.telefono}</TableCell>
                    
                    <TableCell className="text-sm">{sale.email}</TableCell>
                    
                    <TableCell>{sale.cedula}</TableCell>
                    
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
                        <div className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/20 p-2 rounded border border-amber-200 dark:border-amber-800 font-medium">
                          ⚠️ Sin dirección
                        </div>
                      )}
                    </TableCell>
                    
                    <TableCell className="text-xs">
                      {new Date(sale.fecha).toLocaleDateString('es-ES')}
                    </TableCell>
                    
                    <TableCell>
                      <Badge className={`${getChannelBadgeClass(sale.canal)} text-white text-xs`}>
                        {sale.canal.charAt(0).toUpperCase() + sale.canal.slice(1)}
                      </Badge>
                    </TableCell>
                    
                    <TableCell>
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