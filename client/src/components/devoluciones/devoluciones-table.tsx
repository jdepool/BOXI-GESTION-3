import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { AutoExpandingTextarea } from "@/components/ui/auto-expanding-textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CheckCircle, Package, ChevronLeft, ChevronRight, AlertTriangle, Calendar as CalendarIcon, Banknote } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Sale } from "@shared/schema";
import type { QuickMessage } from "@/components/ui/auto-expanding-textarea";
import { NotesDisplay } from "@/components/shared/notes-display";

// Quick select messages for notes
const QUICK_NOTES_MESSAGES: QuickMessage[] = [
  {
    text: "ENTREGADO EN TIENDA",
    icon: <Package className="h-4 w-4 text-amber-600" />,
    tooltipText: "ENTREGADO EN TIENDA"
  },
  {
    text: "EFECTIVO CONTRA ENTREGA",
    icon: <Banknote className="h-4 w-4 text-green-600" />,
    tooltipText: "EFECTIVO CONTRA ENTREGA"
  }
];

interface DevolucionesTableProps {
  data: Sale[];
  total?: number;
  limit?: number;
  offset?: number;
  isLoading: boolean;
  onPageChange?: (offset: number) => void;
}

export default function DevolucionesTable({ 
  data, 
  total = 0, 
  limit = 20, 
  offset = 0, 
  isLoading, 
  onPageChange 
}: DevolucionesTableProps) {

  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [notesValue, setNotesValue] = useState("");
  const [originalNotesValue, setOriginalNotesValue] = useState("");
  const [openFechaDevolucionId, setOpenFechaDevolucionId] = useState<string | null>(null);
  const [openFechaClienteId, setOpenFechaClienteId] = useState<string | null>(null);

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

  const handleMarkAsDevuelto = (saleId: string) => {
    updateDeliveryStatusMutation.mutate({ saleId, status: "Devuelto" });
  };

  const handleStatusChange = (saleId: string, newStatus: string) => {
    updateDeliveryStatusMutation.mutate({ saleId, status: newStatus });
  };

  const updateFechaDevolucionMutation = useMutation({
    mutationFn: async ({ saleId, fechaDevolucion }: { saleId: string; fechaDevolucion: string | null }) => {
      return apiRequest("PUT", `/api/sales/${saleId}/fecha-devolucion`, { fechaDevolucion });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => Array.isArray(query.queryKey) && typeof query.queryKey[0] === 'string' && query.queryKey[0].startsWith('/api/sales')
      });
      toast({
        title: "Fecha Devolución actualizada",
        description: "La fecha de devolución ha sido actualizada correctamente.",
      });
    },
    onError: (error) => {
      console.error('Failed to update fecha devolucion:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la fecha de devolución.",
        variant: "destructive",
      });
    },
  });

  const handleFechaDevolucionChange = (saleId: string, date: Date | undefined) => {
    if (date) {
      // Format date as YYYY-MM-DD
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const fechaDevolucion = `${year}-${month}-${day}`;
      
      updateFechaDevolucionMutation.mutate({ saleId, fechaDevolucion });
    } else {
      updateFechaDevolucionMutation.mutate({ saleId, fechaDevolucion: null });
    }
    // Close the popover after selection
    setOpenFechaDevolucionId(null);
  };

  const updateFechaClienteMutation = useMutation({
    mutationFn: async ({ saleId, fechaCliente }: { saleId: string; fechaCliente: string | null }) => {
      return apiRequest("PUT", `/api/sales/${saleId}/fecha-cliente`, { fechaCliente });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => Array.isArray(query.queryKey) && typeof query.queryKey[0] === 'string' && query.queryKey[0].startsWith('/api/sales')
      });
      toast({
        title: "Recepción de Cliente actualizada",
        description: "La fecha de recepción de cliente ha sido actualizada correctamente.",
      });
    },
    onError: (error) => {
      console.error('Failed to update fecha cliente:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la fecha de recepción de cliente.",
        variant: "destructive",
      });
    },
  });

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
  const parseFechaDevolucion = (dateStr: string | null): Date | undefined => {
    if (!dateStr) return undefined;
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  // Helper to format date for display
  const formatFechaDevolucion = (dateStr: string | null): string => {
    if (!dateStr) return '-';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
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

  const handleNotesKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      setEditingNotesId(null);
      setNotesValue(originalNotesValue);
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
          <h2 className="text-lg font-semibold text-foreground">
            Devoluciones
          </h2>
        </div>
      </div>

      <div className="p-6">
        {data.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              No hay devoluciones pendientes
            </h3>
            <p className="text-muted-foreground">
              Las ventas marcadas como "A devolver" aparecerán aquí hasta que se completen
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-280px)] bg-background">
            <div className="min-w-max">
              <table className="w-full min-w-[2350px] relative">
                <thead className="bg-muted sticky top-0 z-10">
                  <tr>
                    <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[100px] sticky left-0 bg-muted z-20 border-r border-border shadow-[2px_0_5px_rgba(0,0,0,0.1)]">Orden</th>
                    <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[120px] sticky left-[100px] bg-muted z-20 border-r border-border shadow-[2px_0_5px_rgba(0,0,0,0.1)]">Estado Entrega</th>
                    <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[200px]">Nombre</th>
                    <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[150px]">Teléfono</th>
                    <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[120px]">Cédula</th>
                    <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[300px]">Dirección de Despacho</th>
                    <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[200px]">Producto</th>
                    <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[120px]">SKU</th>
                    <th className="text-center p-2 text-xs font-medium text-muted-foreground min-w-[80px]">Cantidad</th>
                    <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[150px]">Recepción de Cliente</th>
                    <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[200px]">Email</th>
                    <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[200px]">Notas</th>
                    <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[150px]">Fecha Devolución</th>
                    <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[120px]">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((sale) => (
                    <tr 
                      key={sale.id} 
                      className="border-b border-border hover:bg-muted/50 transition-colors text-xs"
                      data-testid={`devolucion-row-${sale.id}`}
                    >
                      <td className="p-2 min-w-[100px] text-xs font-mono text-muted-foreground sticky left-0 bg-background z-10 border-r border-border shadow-[2px_0_5px_rgba(0,0,0,0.1)]">
                        #{sale.orden}
                      </td>
                      
                      <td className="p-2 min-w-[120px] text-xs sticky left-[100px] bg-background z-10 border-r border-border shadow-[2px_0_5px_rgba(0,0,0,0.1)]">
                        <Select
                          value={sale.estadoEntrega || "A devolver"}
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
                          <div className="text-xs text-muted-foreground">—</div>
                        )}
                      </td>
                      
                      <td className="p-2 min-w-[200px] text-xs">
                        <div className="font-medium">{sale.product}</div>
                      </td>
                      
                      <td className="p-2 min-w-[120px] text-xs">
                        {sale.sku || <span className="text-muted-foreground">—</span>}
                      </td>
                      
                      <td className="p-2 min-w-[80px] text-center text-xs">{sale.cantidad}</td>
                      
                      <td className="p-2 min-w-[150px] text-xs">
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
                              {sale.fechaCliente ? formatFechaDevolucion(sale.fechaCliente) : "Seleccionar"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={parseFechaDevolucion(sale.fechaCliente)}
                              onSelect={(date) => handleFechaClienteChange(sale.id, date)}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </td>
                      
                      <td className="p-2 min-w-[200px] text-xs">{sale.email}</td>
                      
                      <td className="p-2 min-w-[250px]">
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
                      
                      <td className="p-2 pr-6 min-w-[150px] text-xs">
                        <Popover
                          open={openFechaDevolucionId === sale.id}
                          onOpenChange={(open) => setOpenFechaDevolucionId(open ? sale.id : null)}
                        >
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full h-8 justify-start text-left font-normal text-xs",
                                !sale.fechaDevolucion && "text-muted-foreground"
                              )}
                              data-testid={`fecha-devolucion-button-${sale.id}`}
                            >
                              <CalendarIcon className={cn("mr-2 h-3 w-3", !sale.fechaDevolucion && "text-amber-500")} />
                              {sale.fechaDevolucion ? formatFechaDevolucion(sale.fechaDevolucion) : "Seleccionar"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={parseFechaDevolucion(sale.fechaDevolucion)}
                              onSelect={(date) => handleFechaDevolucionChange(sale.id, date)}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </td>
                      
                      <td className="p-2 min-w-[120px] text-xs">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              disabled={updateDeliveryStatusMutation.isPending || sale.estadoEntrega === "Devuelto" || !sale.fechaDevolucion}
                              size="sm"
                              variant="outline"
                              className={cn(
                                "w-full h-8 text-xs",
                                (sale.estadoEntrega === "Devuelto" || !sale.fechaDevolucion) && "bg-green-800 text-white hover:bg-green-800 opacity-70 cursor-not-allowed border-green-700"
                              )}
                              title={
                                sale.estadoEntrega === "Devuelto" 
                                  ? "Ya marcada como devuelta" 
                                  : !sale.fechaDevolucion 
                                  ? "Debe llenar la Fecha de Devolución primero" 
                                  : "Marcar como devuelta"
                              }
                              data-testid={`button-devuelto-${sale.id}`}
                            >
                              <CheckCircle className={cn("h-3 w-3 mr-1", sale.estadoEntrega === "Devuelto" && "text-green-400")} />
                              Devuelto
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                                Confirmar Devolución
                              </AlertDialogTitle>
                              <AlertDialogDescription className="space-y-2">
                                <p>
                                  ¿Confirma que el proceso de devolución fue completado exitosamente?
                                </p>
                                <p className="font-medium text-foreground">
                                  Esta acción marcará la venta <span className="font-mono">#{sale.orden}</span> como "Devuelto" y la removerá de esta lista.
                                </p>
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel data-testid="dialog-cancel-devuelto">Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleMarkAsDevuelto(sale.id)}
                                data-testid="dialog-confirm-devuelto"
                                className="bg-green-600 hover:bg-green-700"
                              >
                                Sí, confirmar devolución
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
            {offset + 1}-{Math.min(offset + limit, total)} de {total} devoluciones
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
