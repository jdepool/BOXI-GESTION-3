import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

interface Order {
  orden: string;
  nombre: string;
  fecha: Date;
  canal: string | null;
  tipo: string | null;
  estadoEntrega: string | null;
  totalOrderUsd: number | null;
  productCount: number;
}

interface PagosTableProps {
  data: Order[];
  total: number;
  limit: number;
  offset: number;
  isLoading: boolean;
  onPageChange?: (newOffset: number) => void;
}

export default function PagosTable({
  data,
  total,
  limit,
  offset,
  isLoading,
  onPageChange,
}: PagosTableProps) {
  const currentPage = Math.floor(offset / limit) + 1;

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return "$0.00";
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-auto">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 z-10 bg-muted">
              <tr className="border-b border-border">
                <th className="p-3 text-left font-semibold text-foreground min-w-[120px] sticky left-0 z-20 bg-muted">
                  Orden
                </th>
                <th className="p-3 text-left font-semibold text-foreground min-w-[180px] sticky left-[120px] z-20 bg-muted">
                  Nombre
                </th>
                <th className="p-3 text-left font-semibold text-foreground min-w-[100px]">
                  Fecha
                </th>
                <th className="p-3 text-left font-semibold text-foreground min-w-[100px]">
                  Canal
                </th>
                <th className="p-3 text-left font-semibold text-foreground min-w-[100px]">
                  Tipo
                </th>
                <th className="p-3 text-left font-semibold text-foreground min-w-[140px]">
                  Estado Entrega
                </th>
                <th className="p-3 text-left font-semibold text-foreground min-w-[140px]">
                  Total Orden USD
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-4 text-center text-muted-foreground">
                    Cargando...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-4 text-center text-muted-foreground">
                    No hay órdenes pendientes o en proceso
                  </td>
                </tr>
              ) : (
                data.map((order) => (
                  <tr 
                    key={order.orden} 
                    className="border-b border-border hover:bg-muted/50"
                  >
                    <td className="p-2 min-w-[120px] sticky left-0 z-10 bg-background">
                      <span className="text-xs font-mono" data-testid={`order-${order.orden}`}>
                        {order.orden}
                      </span>
                    </td>
                    <td className="p-2 min-w-[180px] sticky left-[120px] z-10 bg-background">
                      <span className="text-xs" data-testid={`nombre-${order.orden}`}>
                        {order.nombre}
                      </span>
                    </td>
                    <td className="p-2 min-w-[100px]">
                      <span className="text-xs" data-testid={`fecha-${order.orden}`}>
                        {format(new Date(order.fecha), "dd/MM/yyyy")}
                      </span>
                    </td>
                    <td className="p-2 min-w-[100px]">
                      <Badge variant="outline" className="text-xs" data-testid={`canal-${order.orden}`}>
                        {order.canal || "N/A"}
                      </Badge>
                    </td>
                    <td className="p-2 min-w-[100px]">
                      <Badge 
                        variant={order.tipo === "Venta" ? "default" : "secondary"}
                        className="text-xs"
                        data-testid={`tipo-${order.orden}`}
                      >
                        {order.tipo || "N/A"}
                      </Badge>
                    </td>
                    <td className="p-2 min-w-[140px]">
                      <Badge 
                        variant="outline"
                        className="text-xs"
                        data-testid={`estado-entrega-${order.orden}`}
                      >
                        {order.estadoEntrega || "N/A"}
                      </Badge>
                    </td>
                    <td className="p-2 min-w-[140px]">
                      <span className="text-xs font-semibold" data-testid={`total-${order.orden}`}>
                        {formatCurrency(order.totalOrderUsd)}
                      </span>
                      {order.productCount > 1 && (
                        <span className="text-xs text-muted-foreground ml-2">
                          ({order.productCount} productos)
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {total > 0 && (
        <div className="p-4 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-sm text-muted-foreground">
            <p>Mostrando {offset + 1}-{Math.min(offset + limit, total)} de {total} órdenes</p>
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
    </div>
  );
}
