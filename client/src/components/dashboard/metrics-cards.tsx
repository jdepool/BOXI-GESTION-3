import { Skeleton } from "@/components/ui/skeleton";

interface MetricsCardsProps {
  metrics?: {
    totalOrderUsd: number;
    pagoInicialVerificado: number;
    totalCuotas: number;
    totalPagado: number;
    pendiente: number;
  };
  isLoading: boolean;
}

export default function MetricsCards({ metrics, isLoading }: MetricsCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {[...Array(5)].map((_, i) => (
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
      title: "Total USD",
      value: `$${(metrics?.totalOrderUsd ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      change: "Total de órdenes",
      icon: "fas fa-shopping-cart",
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
      testId: "metric-total-order-usd"
    },
    {
      title: "Pago Inicial/Total", 
      value: `$${(metrics?.pagoInicialVerificado ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      change: "Pagos iniciales verificados",
      icon: "fas fa-money-check-alt",
      iconBg: "bg-green-500/10", 
      iconColor: "text-green-500",
      testId: "metric-pago-inicial-verificado"
    },
    {
      title: "Total Cuotas",
      value: `$${(metrics?.totalCuotas ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      change: "Cuotas verificadas",
      icon: "fas fa-receipt",
      iconBg: "bg-blue-500/10",
      iconColor: "text-blue-500", 
      testId: "metric-total-cuotas"
    },
    {
      title: "Total Pagado",
      value: `$${(metrics?.totalPagado ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 
      change: "Inicial + Cuotas",
      icon: "fas fa-check-circle",
      iconBg: "bg-purple-500/10",
      iconColor: "text-purple-500",
      testId: "metric-total-pagado"
    },
    {
      title: "Pendiente",
      value: `$${(metrics?.pendiente ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 
      change: "Saldo por cobrar",
      icon: "fas fa-hourglass-half",
      iconBg: "bg-amber-500/10",
      iconColor: "text-amber-500",
      testId: "metric-pendiente"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
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
