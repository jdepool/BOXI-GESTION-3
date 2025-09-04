import { Skeleton } from "@/components/ui/skeleton";

interface MetricsCardsProps {
  metrics?: {
    totalSales: number;
    completedOrders: number;
    pendingOrders: number;
    activeReservations: number;
  };
  isLoading: boolean;
}

export default function MetricsCards({ metrics, isLoading }: MetricsCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-card p-6 rounded-lg border border-border">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-8 w-16 mb-1" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: "Ventas Totales",
      value: `$${metrics?.totalSales.toLocaleString() || '0'}`,
      change: "+12.5% vs mes anterior",
      icon: "fas fa-dollar-sign",
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
      testId: "metric-total-sales"
    },
    {
      title: "Órdenes Completadas", 
      value: metrics?.completedOrders.toLocaleString() || '0',
      change: "+8.2% vs mes anterior",
      icon: "fas fa-check-circle",
      iconBg: "bg-green-500/10", 
      iconColor: "text-green-500",
      testId: "metric-completed-orders"
    },
    {
      title: "Pedidos Pendientes",
      value: metrics?.pendingOrders.toLocaleString() || '0',
      change: "Requieren atención",
      icon: "fas fa-clock",
      iconBg: "bg-amber-500/10",
      iconColor: "text-amber-500", 
      testId: "metric-pending-orders"
    },
    {
      title: "Reservas Activas",
      value: metrics?.activeReservations.toLocaleString() || '0', 
      change: "Para entrega posterior",
      icon: "fas fa-calendar-alt",
      iconBg: "bg-blue-500/10",
      iconColor: "text-blue-500",
      testId: "metric-active-reservations"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, index) => (
        <div key={index} className="bg-card p-6 rounded-lg border border-border" data-testid={card.testId}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm">{card.title}</p>
              <p className="text-2xl font-bold text-foreground">{card.value}</p>
              <p className="text-xs text-green-600 mt-1">{card.change}</p>
            </div>
            <div className={`w-12 h-12 ${card.iconBg} rounded-lg flex items-center justify-center`}>
              <i className={`${card.icon} ${card.iconColor}`}></i>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
