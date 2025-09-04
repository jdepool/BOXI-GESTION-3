import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import SalesTable from "@/components/sales/sales-table";

export default function Sales() {
  const [filters, setFilters] = useState({
    canal: "",
    estadoEntrega: "",
    startDate: "",
    endDate: "",
    limit: 20,
    offset: 0,
  });

  const { data: salesData, isLoading } = useQuery({
    queryKey: ["/api/sales", filters],
  });

  const handleFilterChange = (newFilters: Partial<typeof filters>) => {
    setFilters(prev => ({ ...prev, ...newFilters, offset: 0 }));
  };

  const handlePageChange = (newOffset: number) => {
    setFilters(prev => ({ ...prev, offset: newOffset }));
  };

  return (
    <div className="h-screen flex bg-background">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Datos de Ventas"
          description="Gestión y visualización de todas las ventas"
        />
        
        <div className="flex-1 overflow-auto p-6">
          <div className="bg-card rounded-lg border border-border">
            <SalesTable 
              data={salesData?.data || []} 
              total={salesData?.total || 0}
              limit={filters.limit}
              offset={filters.offset}
              isLoading={isLoading}
              onFilterChange={handleFilterChange}
              onPageChange={handlePageChange}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
