import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import MetricsCards from "@/components/dashboard/metrics-cards";
import ChannelPerformance from "@/components/dashboard/channel-performance";
import DeliveryStatus from "@/components/dashboard/delivery-status";
import UploadZone from "@/components/upload/upload-zone";
import SalesTable from "@/components/sales/sales-table";

export default function Dashboard() {
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["/api/sales/metrics"],
  });

  const { data: recentSales, isLoading: salesLoading } = useQuery({
    queryKey: ["/api/sales", { limit: 5 }],
  });

  const { data: recentUploads } = useQuery({
    queryKey: ["/api/uploads/recent"],
  });

  return (
    <div className="h-screen flex bg-background">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Dashboard de Ventas"
          description="Gestión completa de ventas BoxiSleep"
        />
        
        <div className="flex-1 overflow-auto p-6 space-y-6">
          <MetricsCards metrics={metrics} isLoading={metricsLoading} />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <UploadZone recentUploads={recentUploads} />
            </div>
            
            <div className="lg:col-span-2 space-y-6">
              <ChannelPerformance metrics={metrics} isLoading={metricsLoading} />
              <DeliveryStatus metrics={metrics} isLoading={metricsLoading} />
            </div>
          </div>
          
          <div className="bg-card rounded-lg border border-border">
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">Ventas Recientes</h3>
            </div>
            <SalesTable 
              data={recentSales?.data || []} 
              isLoading={salesLoading}
              hideFilters
              hidePagination
            />
          </div>
        </div>
      </main>
    </div>
  );
}
