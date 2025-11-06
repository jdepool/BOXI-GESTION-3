import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { CheckCircle, Package, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Banknote } from "lucide-react";
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
    icon: <Package className="h-4 w-4 text-green-600" />,
    tooltipText: "ENTREGADO EN TIENDA"
  },
  {
    text: "EFECTIVO CONTRA ENTREGA",
    icon: <Banknote className="h-4 w-4 text-red-600" />,
    tooltipText: "EFECTIVO CONTRA ENTREGA"
  }
];

interface CancellationsTableProps {
  data: Sale[];
  total?: number;
  limit?: number;
  offset?: number;
  isLoading: boolean;
  onPageChange?: (offset: number) => void;
}

export default function CancellationsTable({ 
  data, 
  total = 0, 
  limit = 20, 
  offset = 0, 
  isLoading, 
  onPageChange 
}: CancellationsTableProps) {

  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [notesValue, setNotesValue] = useState("");
  const [originalNotesValue, setOriginalNotesValue] = useState("");
  const [editingDatosCancelacionId, setEditingDatosCancelacionId] = useState<string | null>(null);
  const [datosCancelacionValue, setDatosCancelacionValue] = useState("");
  const [originalDatosCancelacionValue, setOriginalDatosCancelacionValue] = useState("");
  const [openFinalizacionCancelacionId, setOpenFinalizacionCancelacionId] = useState<string | null>(null);
  const [openFechaCancelacionId, setOpenFechaCancelacionId] = useState<string | null>(null);

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Entregado': return 'default';
      case 'Cancelada': return 'destructive';
      case 'Perdida': return 'destructive';
      case 'En tránsito': return 'secondary';
      case 'A despachar': return 'outline';
      case 'En proceso': return 'outline';
      case 'Pendiente': return 'outline';
      case 'A cancelar': return 'secondary';
      default: return 'outline';
    }
  };

  const getChannelBadgeVariant = (canal: string) => {
    switch (canal?.toLowerCase()) {
      case 'cashea': return 'default';
      case 'shopify': return 'secondary';
      case 'treble': return 'outline';
      default: return 'outline';
    }
  };

  const completeCancellationMutation = useMutation({
    mutationFn: async (saleId: string) => {
      return apiRequest("PUT", `/api/sales/${saleId}/complete-cancellation`, {});
    },
    onSuccess: () => {
      // Invalidate all sales queries to refresh data across all pages
      queryClient.invalidateQueries({ 
        predicate: (query) => Array.isArray(query.queryKey) && typeof query.queryKey[0] === 'string' && query.queryKey[0].startsWith('/api/sales')
      });
      toast({
        title: "Cancelación completada",
        description: "La venta ha sido marcada como cancelada correctamente.",
      });
    },
    onError: (error) => {
      console.error('Failed to complete cancellation:', error);
      toast({
        title: "Error",
        description: "No se pudo completar la cancelación.",
        variant: "destructive",
      });
    },
  });

  const handleMarkAsCancelado = (saleId: string) => {
    completeCancellationMutation.mutate(saleId);
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

  const updateFinalizacionCancelacionMutation = useMutation({
    mutationFn: async ({ saleId, finalizacionCancelacion }: { saleId: string; finalizacionCancelacion: string | null }) => {
      return apiRequest("PATCH", `/api/sales/${saleId}`, { finalizacionCancelacion });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => Array.isArray(query.queryKey) && typeof query.queryKey[0] === 'string' && query.queryKey[0].startsWith('/api/sales')
      });
      toast({
        title: "Finalización de Cancelación actualizada",
        description: "La fecha de finalización de cancelación ha sido actualizada correctamente.",
      });
    },
    onError: (error) => {
      console.error('Failed to update finalizacion cancelacion:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la finalización de cancelación.",
        variant: "destructive",
      });
    },
  });

  const handleFinalizacionCancelacionChange = (saleId: string, date: Date | undefined) => {
    if (date) {
      // Format date as YYYY-MM-DD
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const finalizacionCancelacion = `${year}-${month}-${day}`;
      
      updateFinalizacionCancelacionMutation.mutate({ saleId, finalizacionCancelacion });
    } else {
      updateFinalizacionCancelacionMutation.mutate({ saleId, finalizacionCancelacion: null });
    }
    // Close the popover after selection
    setOpenFinalizacionCancelacionId(null);
  };

  const updateFechaCancelacionMutation = useMutation({
    mutationFn: async ({ saleId, fechaCancelacion }: { saleId: string; fechaCancelacion: string | null }) => {
      return apiRequest("PATCH", `/api/sales/${saleId}`, { fechaCancelacion });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => Array.isArray(query.queryKey) && typeof query.queryKey[0] === 'string' && query.queryKey[0].startsWith('/api/sales')
      });
      toast({
        title: "Fecha de Cancelación actualizada",
        description: "La fecha de cancelación ha sido actualizada correctamente.",
      });
    },
    onError: (error) => {
      console.error('Failed to update fecha cancelacion:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la fecha de cancelación.",
        variant: "destructive",
      });
    },
  });

  const handleFechaCancelacionChange = (saleId: string, date: Date | undefined) => {
    if (date) {
      // Format date as YYYY-MM-DD
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const fechaCancelacion = `${year}-${month}-${day}`;
      
      updateFechaCancelacionMutation.mutate({ saleId, fechaCancelacion });
    } else {
      updateFechaCancelacionMutation.mutate({ saleId, fechaCancelacion: null });
    }
    // Close the popover after selection
    setOpenFechaCancelacionId(null);
  };

  // Helper to parse date string to Date object
  const parseDate = (dateStr: string | null): Date | undefined => {
    if (!dateStr) return undefined;
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  // Helper to format date for display
  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return '-';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const updateNotesMutation = useMutation({
    mutationFn: async ({ saleId, notas }: { saleId: string; notas: string }) => {
      return apiRequest("PUT", `/api/sales/${saleId}/notes`, { notas });
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

  const updateDatosCancelacionMutation = useMutation({
    mutationFn: async ({ saleId, datosCancelacion }: { saleId: string; datosCancelacion: string }) => {
      return apiRequest("PATCH", `/api/sales/${saleId}`, { datosCancelacion });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => Array.isArray(query.queryKey) && typeof query.queryKey[0] === 'string' && query.queryKey[0].startsWith('/api/sales')
      });
      setEditingDatosCancelacionId(null);
      toast({
        title: "Datos Cancelación actualizados",
        description: "Los datos de cancelación han sido guardados correctamente.",
      });
    },
    onError: (error) => {
      console.error('Failed to update datos cancelacion:', error);
      toast({
        title: "Error",
        description: "No se pudieron guardar los datos de cancelación.",
        variant: "destructive",
      });
    },
  });

  const handleDatosCancelacionClick = (sale: Sale) => {
    setEditingDatosCancelacionId(sale.id);
    const currentDatosCancelacion = sale.datosCancelacion || "";
    setDatosCancelacionValue(currentDatosCancelacion);
    setOriginalDatosCancelacionValue(currentDatosCancelacion);
  };

  const handleDatosCancelacionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDatosCancelacionValue(e.target.value);
  };

  const handleDatosCancelacionBlur = () => {
    if (editingDatosCancelacionId && datosCancelacionValue.trim() !== originalDatosCancelacionValue) {
      updateDatosCancelacionMutation.mutate({ 
        saleId: editingDatosCancelacionId, 
        datosCancelacion: datosCancelacionValue.trim() 
      });
    } else {
      setEditingDatosCancelacionId(null);
    }
  };

  const handleDatosCancelacionKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      setEditingDatosCancelacionId(null);
      setDatosCancelacionValue(originalDatosCancelacionValue);
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
            Cancelaciones
          </h2>
        </div>
      </div>

      <div className="p-6">
        {data.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              No hay cancelaciones pendientes
            </h3>
            <p className="text-muted-foreground">
              Las ventas marcadas como "A cancelar" aparecerán aquí hasta que se completen
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-280px)] bg-background">
            <div className="min-w-max">
              <table className="w-full min-w-[3200px] relative">
                <thead className="bg-muted sticky top-0 z-10">
                  <tr>
                    <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[100px] sticky left-0 bg-muted z-20 border-r border-border shadow-[2px_0_5px_rgba(0,0,0,0.1)]">Orden</th>
                    <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[120px] sticky left-[100px] bg-muted z-20 border-r border-border shadow-[2px_0_5px_rgba(0,0,0,0.1)]">Estado</th>
                    <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[100px]">Canal</th>
                    <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[100px]">Fecha</th>
                    <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[200px]">Nombre</th>
                    <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[150px]">Teléfono</th>
                    <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[120px]">Cédula</th>
                    <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[300px]">Dirección de Despacho</th>
                    <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[300px]">Dirección de Facturación</th>
                    <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[200px]">Email</th>
                    <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[200px]">Producto</th>
                    <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[120px]">SKU</th>
                    <th className="text-center p-2 text-xs font-medium text-muted-foreground min-w-[80px]">Cantidad</th>
                    <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[200px]">Notas</th>
                    <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[200px]">Datos Cancelación</th>
                    <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[150px]">Fecha de Cancelación</th>
                    <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[150px]">Finalización de Cancelación</th>
                    <th className="text-left p-2 text-xs font-medium text-muted-foreground min-w-[120px]">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((sale) => (
                    <tr 
                      key={sale.id} 
                      className="border-b border-border hover:bg-muted/50 transition-colors text-xs"
                      data-testid={`cancelacion-row-${sale.id}`}
                    >
                      <td className="p-2 min-w-[100px] text-xs font-mono text-muted-foreground sticky left-0 bg-background z-10 border-r border-border shadow-[2px_0_5px_rgba(0,0,0,0.1)]">
                        #{sale.orden}
                      </td>
                      
                      <td className="p-2 min-w-[120px] text-xs sticky left-[100px] bg-background z-10 border-r border-border shadow-[2px_0_5px_rgba(0,0,0,0.1)]">
                        <Select
                          value={sale.estadoEntrega || "A cancelar"}
                          onValueChange={(newStatus) => handleStatusChange(sale.id, newStatus)}
                          disabled={updateDeliveryStatusMutation.isPending}
                        >
                          <SelectTrigger className="w-32 h-8 text-xs" data-testid={`estado-select-${sale.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Pendiente">Pendiente</SelectItem>
                            <SelectItem value="En proceso">En proceso</SelectItem>
                            <SelectItem value="A despachar">A despachar</SelectItem>
                            <SelectItem value="En tránsito">En tránsito</SelectItem>
                            <SelectItem value="Entregado">Entregado</SelectItem>
                            <SelectItem value="A devolver">A devolver</SelectItem>
                            <SelectItem value="Devuelto">Devuelto</SelectItem>
                            <SelectItem value="A cancelar">A cancelar</SelectItem>
                            <SelectItem value="Cancelada">Cancelada</SelectItem>
                            <SelectItem value="Perdida">Perdida</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>

                      <td className="p-2 min-w-[100px] text-xs">
                        <Badge variant={getChannelBadgeVariant(sale.canal)} className="text-xs" data-testid={`canal-badge-${sale.id}`}>
                          {sale.canal}
                        </Badge>
                      </td>

                      <td className="p-2 min-w-[100px] text-xs text-foreground" data-testid={`fecha-${sale.id}`}>
                        {new Date(sale.fecha).toLocaleDateString('es-ES', { 
                          day: '2-digit', 
                          month: '2-digit', 
                          year: 'numeric' 
                        })}
                      </td>

                      <td className="p-2 min-w-[200px] text-xs text-foreground" data-testid={`nombre-${sale.id}`}>
                        {sale.nombre}
                      </td>

                      <td className="p-2 min-w-[150px] text-xs text-foreground" data-testid={`telefono-${sale.id}`}>
                        {sale.telefono || '-'}
                      </td>

                      <td className="p-2 min-w-[120px] text-xs text-foreground" data-testid={`cedula-${sale.id}`}>
                        {sale.cedula || '-'}
                      </td>

                      <td className="p-2 min-w-[300px] text-xs text-foreground" data-testid={`direccion-despacho-${sale.id}`}>
                        {sale.direccionDespachoDireccion || '-'}
                      </td>

                      <td className="p-2 min-w-[300px] text-xs text-foreground" data-testid={`direccion-facturacion-${sale.id}`}>
                        {sale.direccionFacturacionDireccion || '-'}
                      </td>

                      <td className="p-2 min-w-[200px] text-xs text-foreground" data-testid={`email-${sale.id}`}>
                        {sale.email || '-'}
                      </td>

                      <td className="p-2 min-w-[200px] text-xs text-foreground" data-testid={`producto-${sale.id}`}>
                        {sale.product}
                      </td>

                      <td className="p-2 min-w-[120px] text-xs font-mono text-muted-foreground" data-testid={`sku-${sale.id}`}>
                        {sale.sku || '-'}
                      </td>

                      <td className="p-2 min-w-[80px] text-center text-xs text-foreground" data-testid={`cantidad-${sale.id}`}>
                        {sale.cantidad}
                      </td>

                      <td className="p-2 min-w-[200px] text-xs">
                        {editingNotesId === sale.id ? (
                          <AutoExpandingTextarea
                            value={notesValue}
                            onChange={handleNotesChange}
                            onBlur={handleNotesBlur}
                            onKeyDown={handleNotesKeyDown}
                            placeholder="Agregar notas..."
                            className="min-h-[60px] text-xs"
                            quickMessages={QUICK_NOTES_MESSAGES}
                            autoFocus
                            data-testid={`notas-textarea-${sale.id}`}
                          />
                        ) : (
                          <div 
                            onClick={() => handleNotesClick(sale)}
                            className="cursor-pointer hover:bg-muted/50 p-2 rounded min-h-[60px] whitespace-pre-wrap"
                            data-testid={`notas-display-${sale.id}`}
                          >
                            {sale.notas ? (
                              <NotesDisplay notes={sale.notas} />
                            ) : (
                              <span className="text-muted-foreground italic">Agregar notas...</span>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="p-2 min-w-[200px] text-xs">
                        {editingDatosCancelacionId === sale.id ? (
                          <AutoExpandingTextarea
                            value={datosCancelacionValue}
                            onChange={handleDatosCancelacionChange}
                            onBlur={handleDatosCancelacionBlur}
                            onKeyDown={handleDatosCancelacionKeyDown}
                            placeholder="Agregar datos de cancelación..."
                            className="min-h-[60px] text-xs"
                            autoFocus
                            data-testid={`datos-cancelacion-textarea-${sale.id}`}
                          />
                        ) : (
                          <div 
                            onClick={() => handleDatosCancelacionClick(sale)}
                            className="cursor-pointer hover:bg-muted/50 p-2 rounded min-h-[60px] whitespace-pre-wrap"
                            data-testid={`datos-cancelacion-display-${sale.id}`}
                          >
                            {sale.datosCancelacion ? (
                              <span className="text-foreground">{sale.datosCancelacion}</span>
                            ) : (
                              <span className="text-muted-foreground italic">Agregar datos...</span>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="p-2 min-w-[150px] text-xs">
                        <Popover 
                          open={openFechaCancelacionId === sale.id} 
                          onOpenChange={(open) => setOpenFechaCancelacionId(open ? sale.id : null)}
                        >
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal h-8 text-xs",
                                !sale.fechaCancelacion && "text-muted-foreground"
                              )}
                              data-testid={`fecha-cancelacion-button-${sale.id}`}
                            >
                              <CalendarIcon className="mr-2 h-3 w-3" />
                              {formatDate(sale.fechaCancelacion)}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={parseDate(sale.fechaCancelacion)}
                              onSelect={(date) => handleFechaCancelacionChange(sale.id, date)}
                              initialFocus
                              data-testid={`fecha-cancelacion-calendar-${sale.id}`}
                            />
                          </PopoverContent>
                        </Popover>
                      </td>

                      <td className="p-2 min-w-[150px] text-xs">
                        <Popover 
                          open={openFinalizacionCancelacionId === sale.id} 
                          onOpenChange={(open) => setOpenFinalizacionCancelacionId(open ? sale.id : null)}
                        >
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal h-8 text-xs",
                                !sale.finalizacionCancelacion && "text-muted-foreground"
                              )}
                              data-testid={`finalizacion-cancelacion-button-${sale.id}`}
                            >
                              <CalendarIcon className="mr-2 h-3 w-3" />
                              {formatDate(sale.finalizacionCancelacion)}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={parseDate(sale.finalizacionCancelacion)}
                              onSelect={(date) => handleFinalizacionCancelacionChange(sale.id, date)}
                              initialFocus
                              data-testid={`finalizacion-cancelacion-calendar-${sale.id}`}
                            />
                          </PopoverContent>
                        </Popover>
                      </td>

                      <td className="p-2 min-w-[120px] text-xs">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="default"
                              className="w-full h-8 text-xs"
                              disabled={completeCancellationMutation.isPending}
                              data-testid={`cancelado-button-${sale.id}`}
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Cancelado
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Confirmar cancelación?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta acción marcará la venta #{sale.orden} como "Cancelada". 
                                ¿Está seguro de que desea continuar?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel data-testid={`cancelado-cancel-${sale.id}`}>
                                No, volver
                              </AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleMarkAsCancelado(sale.id)}
                                data-testid={`cancelado-confirm-${sale.id}`}
                              >
                                Sí, marcar como cancelado
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              Página {currentPage} de {totalPages} ({total} cancelaciones)
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange?.(Math.max(0, offset - limit))}
                disabled={currentPage === 1}
                data-testid="pagination-prev"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange?.(offset + limit)}
                disabled={currentPage === totalPages}
                data-testid="pagination-next"
              >
                Siguiente
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
