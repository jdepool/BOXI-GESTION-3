import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Truck, DollarSign, CalendarIcon, FileText, Building2, Package } from "lucide-react";
import { format } from "date-fns";
import Sidebar from "@/components/layout/sidebar";
import FleteModal from "@/components/sales/flete-modal";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Sale } from "@shared/schema";

function getFleteStatus(sale: Sale): { status: string; color: string; description: string } {
  // Si está marcado como flete gratis, mostrar estado especial
  if (sale.fleteGratis) {
    return { status: "FLETE GRATIS", color: "bg-green-600", description: "Flete marcado como gratuito" };
  }

  // Si ya tiene un status manual, usarlo
  if (sale.statusFlete) {
    const statusMap = {
      "Pendiente": { color: "bg-orange-500", description: "Status manual: Pendiente" },
      "En Proceso": { color: "bg-blue-500", description: "Status manual: En proceso" },
      "A Despacho": { color: "bg-green-500", description: "Status manual: Listo para despacho" }
    };
    const config = statusMap[sale.statusFlete as keyof typeof statusMap];
    if (config) {
      return { status: sale.statusFlete, ...config };
    }
  }

  // Lógica automática si no hay status manual
  // No tiene monto USD - no mostrar
  if (!sale.montoFleteUsd) {
    return { status: "Sin Flete", color: "bg-gray-500", description: "No tiene información de flete" };
  }

  // Solo tiene monto USD
  if (!sale.fechaFlete || !sale.referenciaFlete || !sale.montoFleteVes || !sale.bancoReceptorFlete) {
    return { status: "Pendiente", color: "bg-orange-500", description: "Solo tiene monto en USD" };
  }

  // Tiene toda la información - por defecto está en proceso
  return { status: "En Proceso", color: "bg-blue-500", description: "Información completa, en proceso" };
}

export default function Flete() {
  const { toast } = useToast();
  const [fleteModalOpen, setFleteModalOpen] = useState(false);
  const [selectedSaleForFlete, setSelectedSaleForFlete] = useState<Sale | null>(null);
  
  const { data, isLoading } = useQuery({
    queryKey: ['/api/sales'],
  });

  const updateFleteStatusMutation = useMutation({
    mutationFn: async ({ saleId, status }: { saleId: string; status: string }) => {
      return apiRequest("PUT", `/api/sales/${saleId}/flete-status`, { status });
    },
    onSuccess: () => {
      // Invalidate queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      toast({
        title: "Status de flete actualizado",
        description: "El status del flete ha sido actualizado correctamente.",
      });
    },
    onError: (error) => {
      console.error('Failed to update flete status:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el status del flete.",
        variant: "destructive",
      });
    },
  });

  const handleFleteStatusChange = (saleId: string, newStatus: string) => {
    updateFleteStatusMutation.mutate({ saleId, status: newStatus });
  };

  // Filter sales with complete freight information (universal rule for all canals)
  const salesWithFlete = (data as { data: Sale[] })?.data?.filter((sale: Sale) => {
    // Define complete flete information for ALL orders regardless of canal
    const hasFreightAmount = !!(sale.montoFleteUsd || sale.fleteGratis);
    const hasAllFreightDetails = !!(sale.fechaFlete && sale.referenciaFlete && sale.bancoReceptorFlete);
    const hasCompleteFleteInfo = hasFreightAmount && hasAllFreightDetails;
    
    // Only show orders with complete flete information
    if (!hasCompleteFleteInfo) return false;
    
    // Exclude orders ready for Despachos (universal rule for all canals)
    if (sale.estadoEntrega === 'A despachar' && 
        (sale.statusFlete === 'A Despacho' || sale.fleteGratis)) {
      return false;
    }
    
    return true;
  }) || [];

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <main className="flex-1 p-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold text-foreground">Gestión de Fletes</h1>
            </div>
            <div className="space-y-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 p-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-foreground">Gestión de Fletes</h1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                <span>Pendiente</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span>En Proceso</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span>A Despacho</span>
              </div>
            </div>
          </div>

          {salesWithFlete.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Truck className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No hay fletes registrados</h3>
                <p className="text-muted-foreground text-center">
                  Los fletes aparecerán aquí una vez que agregues información de flete a las ventas.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="bg-background border rounded-lg">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-4 font-medium text-sm">Orden</th>
                      <th className="text-left p-4 font-medium text-sm">Cliente</th>
                      <th className="text-left p-4 font-medium text-sm">Producto</th>
                      <th className="text-left p-4 font-medium text-sm">Canal</th>
                      <th className="text-left p-4 font-medium text-sm">Monto USD</th>
                      <th className="text-left p-4 font-medium text-sm">Fecha</th>
                      <th className="text-left p-4 font-medium text-sm">Referencia</th>
                      <th className="text-left p-4 font-medium text-sm">Monto VES</th>
                      <th className="text-left p-4 font-medium text-sm">Banco</th>
                      <th className="text-left p-4 font-medium text-sm">Status</th>
                      <th className="text-left p-4 font-medium text-sm">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesWithFlete.map((sale: Sale) => {
                      const fleteStatus = getFleteStatus(sale);
                      
                      return (
                        <tr key={sale.id} className="border-b hover:bg-muted/50 transition-colors" data-testid={`flete-row-${sale.id}`}>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <Truck className="h-4 w-4 text-muted-foreground" />
                              <span className="font-mono text-sm">{sale.orden || 'N/A'}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">{sale.nombre}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="text-sm">{sale.product}</span>
                          </td>
                          <td className="p-4">
                            <Badge variant="outline" className="text-xs">{sale.canal}</Badge>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1">
                                <DollarSign className="h-3 w-3 text-green-600" />
                                <span className="text-sm font-bold text-green-600">${sale.montoFleteUsd}</span>
                              </div>
                              {sale.fleteGratis && (
                                <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                  GRATIS
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="p-4">
                            {sale.fechaFlete ? (
                              <div className="flex items-center gap-1">
                                <CalendarIcon className="h-3 w-3 text-blue-600" />
                                <span className="text-sm">{format(new Date(sale.fechaFlete), 'dd/MM/yyyy')}</span>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="p-4">
                            {sale.referenciaFlete ? (
                              <div className="flex items-center gap-1">
                                <FileText className="h-3 w-3 text-purple-600" />
                                <span className="text-sm font-mono">{sale.referenciaFlete}</span>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="p-4">
                            {sale.montoFleteVes ? (
                              <span className="text-sm font-bold text-orange-600">Bs {Number(sale.montoFleteVes).toLocaleString()}</span>
                            ) : (
                              <span className="text-sm text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="p-4">
                            {sale.bancoReceptorFlete ? (
                              <div className="flex items-center gap-1">
                                <Building2 className="h-3 w-3 text-indigo-600" />
                                <span className="text-sm">{sale.bancoReceptorFlete}</span>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="p-4">
                            <Select
                              value={fleteStatus.status}
                              onValueChange={(newStatus) => handleFleteStatusChange(sale.id, newStatus)}
                              disabled={updateFleteStatusMutation.isPending}
                            >
                              <SelectTrigger className="w-28 h-8 text-xs">
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
                          <td className="p-4">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs h-7"
                              onClick={() => {
                                // TODO: Implement action based on status
                              }}
                              data-testid={`action-${sale.id}`}
                            >
                              {fleteStatus.status === 'Pendiente' && 'Completar'}
                              {fleteStatus.status === 'En Proceso' && 'Ver'}
                              {fleteStatus.status === 'A Despacho' && 'Procesar'}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}