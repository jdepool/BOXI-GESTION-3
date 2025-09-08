import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-64 w-full" />
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {salesWithFlete.map((sale: Sale) => {
                const fleteStatus = getFleteStatus(sale);
                
                return (
                  <Card key={sale.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Truck className="h-5 w-5" />
                          Orden #{sale.orden || 'N/A'}
                        </CardTitle>
                        <Badge 
                          className={`${fleteStatus.color} text-white text-xs`}
                          data-testid={`status-${sale.id}`}
                        >
                          {fleteStatus.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Customer Info */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{sale.nombre}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {sale.product} • Canal: {sale.canal}
                        </div>
                      </div>

                      {/* Freight Information */}
                      <div className="space-y-3 pt-3 border-t">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-medium">Monto USD</span>
                          </div>
                          <span className="text-sm font-bold text-green-600">
                            ${sale.montoFleteUsd}
                          </span>
                        </div>

                        {sale.fechaFlete && (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <CalendarIcon className="h-4 w-4 text-blue-600" />
                              <span className="text-sm">Fecha</span>
                            </div>
                            <span className="text-sm">
                              {format(new Date(sale.fechaFlete), 'dd/MM/yyyy')}
                            </span>
                          </div>
                        )}

                        {sale.referenciaFlete && (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-purple-600" />
                              <span className="text-sm">Referencia</span>
                            </div>
                            <span className="text-sm font-mono">
                              {sale.referenciaFlete}
                            </span>
                          </div>
                        )}

                        {sale.montoFleteVes && (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-orange-600">Bs</span>
                              <span className="text-sm">Monto VES</span>
                            </div>
                            <span className="text-sm font-bold text-orange-600">
                              Bs {Number(sale.montoFleteVes).toLocaleString()}
                            </span>
                          </div>
                        )}

                        {sale.bancoReceptorFlete && (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-indigo-600" />
                              <span className="text-sm">Banco</span>
                            </div>
                            <span className="text-sm">
                              {sale.bancoReceptorFlete}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Status Description */}
                      <div className="pt-3 border-t">
                        <p className="text-xs text-muted-foreground">
                          {fleteStatus.description}
                        </p>
                      </div>

                      {/* Action Button */}
                      <div className="pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => {
                            // TODO: Implement action based on status
                            // Could open a modal or navigate to details
                          }}
                          data-testid={`action-${sale.id}`}
                        >
                          {fleteStatus.status === 'Pendiente' && 'Completar Info'}
                          {fleteStatus.status === 'En Proceso' && 'Ver Detalles'}
                          {fleteStatus.status === 'A Despacho' && 'Procesar'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}