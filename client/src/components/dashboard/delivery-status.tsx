import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface DeliveryStatusProps {
  metrics?: {
    salesByDeliveryStatus: { status: string; count: number }[];
  };
  isLoading: boolean;
}

export default function DeliveryStatus({ metrics, isLoading }: DeliveryStatusProps) {
  if (isLoading) {
    return (
      <div className="bg-card p-6 rounded-lg border border-border">
        <Skeleton className="h-6 w-32 mb-4" />
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="text-center p-4 bg-secondary rounded-lg">
              <Skeleton className="h-4 w-16 mx-auto mb-2" />
              <Skeleton className="h-6 w-12 mx-auto" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const statusLabels = {
    entregado: "Entregado",
    pendiente: "Pendiente", 
    reservado: "Reservado"
  };

  const statusColors = {
    entregado: "status-badge-completed",
    pendiente: "status-badge-pending",
    reservado: "status-badge-reserved"
  };

  const deliveryStats = metrics?.salesByDeliveryStatus || [];

  return (
    <div className="bg-card p-6 rounded-lg border border-border" data-testid="delivery-status">
      <h3 className="text-lg font-semibold mb-4 text-foreground">Estados de Entrega</h3>
      
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {deliveryStats.map((stat) => (
          <div key={stat.status} className="text-center p-4 bg-secondary rounded-lg">
            <Badge 
              className={`${statusColors[stat.status as keyof typeof statusColors] || 'bg-gray-500'} text-white text-xs px-2 py-1 mb-2`}
            >
              {statusLabels[stat.status as keyof typeof statusLabels] || stat.status}
            </Badge>
            <p className="text-xl font-bold text-foreground" data-testid={`delivery-count-${stat.status}`}>
              {stat.count}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
