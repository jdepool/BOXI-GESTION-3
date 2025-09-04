import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Phone, Mail, Package, User } from "lucide-react";
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

  const getChannelBadgeClass = (canal: string) => {
    switch (canal?.toLowerCase()) {
      case 'cashea': return 'bg-blue-600';
      case 'shopify': return 'bg-green-600';
      case 'treble': return 'bg-purple-600';
      default: return 'bg-gray-600';
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
          <div className="space-y-4">
            {data.map((sale) => (
              <div
                key={sale.id}
                className="border border-border rounded-lg p-6 hover:bg-muted/50 transition-colors"
                data-testid={`dispatch-order-${sale.id}`}
              >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Order Info */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <Package className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">
                            Orden #{sale.orden}
                          </h3>
                          <Badge className={`${getChannelBadgeClass(sale.canal)} text-white text-xs`}>
                            {sale.canal.charAt(0).toUpperCase() + sale.canal.slice(1)}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">
                          {new Date(sale.fecha).toLocaleDateString('es-ES')}
                        </p>
                        <Badge variant="outline" className="mt-1">
                          {sale.estadoEntrega}
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{sale.nombre}</span>
                        <span className="text-muted-foreground">• CI: {sale.cedula}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        {sale.telefono}
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        {sale.email}
                      </div>
                    </div>
                  </div>

                  {/* Product & Address Info */}
                  <div className="space-y-4">
                    {/* Product */}
                    <div className="bg-muted/30 rounded-lg p-4">
                      <h4 className="font-medium text-foreground mb-2">Producto</h4>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-foreground font-medium">
                          {sale.product}
                        </span>
                        <div className="text-right">
                          <p className="text-sm font-medium">Cantidad: {sale.cantidad}</p>
                          <p className="text-sm text-muted-foreground">
                            ${Number(sale.totalUsd).toLocaleString()} USD
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Addresses */}
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-medium text-foreground mb-2 text-sm">
                          Dirección de Facturación
                        </h4>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <p>{sale.direccionFacturacionDireccion}</p>
                          <p>
                            {sale.direccionFacturacionCiudad}, {sale.direccionFacturacionEstado}
                          </p>
                          <p>{sale.direccionFacturacionPais}</p>
                          {sale.direccionFacturacionUrbanizacion && (
                            <p>Urb. {sale.direccionFacturacionUrbanizacion}</p>
                          )}
                          {sale.direccionFacturacionReferencia && (
                            <p>Ref: {sale.direccionFacturacionReferencia}</p>
                          )}
                        </div>
                      </div>

                      {sale.direccionDespachoIgualFacturacion !== "true" && (
                        <div>
                          <h4 className="font-medium text-foreground mb-2 text-sm">
                            Dirección de Despacho
                          </h4>
                          <div className="text-xs text-muted-foreground space-y-1">
                            <p>{sale.direccionDespachoDireccion}</p>
                            <p>
                              {sale.direccionDespachoCiudad}, {sale.direccionDespachoEstado}
                            </p>
                            <p>{sale.direccionDespachoPais}</p>
                            {sale.direccionDespachoUrbanizacion && (
                              <p>Urb. {sale.direccionDespachoUrbanizacion}</p>
                            )}
                            {sale.direccionDespachoReferencia && (
                              <p>Ref: {sale.direccionDespachoReferencia}</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
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