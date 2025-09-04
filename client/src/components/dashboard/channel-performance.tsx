import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface ChannelPerformanceProps {
  metrics?: {
    salesByChannel: { canal: string; total: number; orders: number }[];
  };
  isLoading: boolean;
}

export default function ChannelPerformance({ metrics, isLoading }: ChannelPerformanceProps) {
  if (isLoading) {
    return (
      <div className="bg-card p-6 rounded-lg border border-border">
        <Skeleton className="h-6 w-48 mb-4" />
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="text-center p-4 bg-secondary rounded-lg">
              <Skeleton className="h-4 w-16 mx-auto mb-2" />
              <Skeleton className="h-8 w-20 mx-auto mb-1" />
              <Skeleton className="h-4 w-24 mx-auto" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const channelColors = {
    cashea: "channel-badge-cashea",
    shopify: "channel-badge-shopify", 
    treble: "channel-badge-treble"
  };

  const channels = metrics?.salesByChannel || [];

  return (
    <div className="bg-card p-6 rounded-lg border border-border" data-testid="channel-performance">
      <h3 className="text-lg font-semibold mb-4 text-foreground">Rendimiento por Canal</h3>
      
      <div className="grid grid-cols-3 gap-4 mb-6">
        {channels.map((channel) => (
          <div key={channel.canal} className="text-center p-4 bg-secondary rounded-lg">
            <Badge 
              className={`${channelColors[channel.canal as keyof typeof channelColors] || 'bg-gray-500'} text-white text-xs px-2 py-1 mb-2`}
            >
              {channel.canal.charAt(0).toUpperCase() + channel.canal.slice(1)}
            </Badge>
            <p className="text-2xl font-bold text-foreground" data-testid={`channel-total-${channel.canal}`}>
              ${channel.total.toLocaleString()}
            </p>
            <p className="text-sm text-muted-foreground" data-testid={`channel-orders-${channel.canal}`}>
              {channel.orders} órdenes
            </p>
          </div>
        ))}
      </div>

      <div className="bg-muted rounded-lg h-64 flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <i className="fas fa-chart-bar text-4xl mb-2"></i>
          <p>Gráfico de Ventas por Canal</p>
          <p className="text-sm">(Implementar con Recharts)</p>
        </div>
      </div>
    </div>
  );
}
