import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Truck, DollarSign, CalendarIcon, FileText, Building2, Package } from "lucide-react";
import { format } from "date-fns";
import Sidebar from "@/components/layout/sidebar";
import type { Sale } from "@shared/schema";

function getFleteStatus(sale: Sale): { status: string; color: string; description: string } {
  // No tiene monto USD - no mostrar
  if (!sale.montoFleteUsd) {
    return { status: "Sin Flete", color: "bg-gray-500", description: "No tiene información de flete" };
  }

  // Solo tiene monto USD
  if (!sale.fechaFlete || !sale.referenciaFlete || !sale.montoFleteVes || !sale.bancoReceptorFlete) {
    return { status: "Pendiente", color: "bg-orange-500", description: "Solo tiene monto en USD" };
  }

  // Tiene toda la información pero no conciliado (por ahora asumimos que si tiene todo está en proceso)
  // En el futuro se podría agregar un campo de conciliación
  return { status: "En Proceso", color: "bg-blue-500", description: "Información completa, pendiente conciliación" };
}

export default function Flete() {
  const { data, isLoading } = useQuery({
    queryKey: ['/api/sales'],
  });

  // Filter sales that have freight information
  const salesWithFlete = data?.data?.filter((sale: Sale) => sale.montoFleteUsd) || [];

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
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3 text-green-600" />
                              <span className="text-sm font-bold text-green-600">${sale.montoFleteUsd}</span>
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
                            <Badge 
                              className={`${fleteStatus.color} text-white text-xs`}
                              data-testid={`status-${sale.id}`}
                            >
                              {fleteStatus.status}
                            </Badge>
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