import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import DevolucionesTable from "@/components/devoluciones/devoluciones-table";
import type { Sale } from "@shared/schema";

export default function Devoluciones() {
  const [filters, setFilters] = useState({
    limit: 20,
    offset: 0,
  });

  const { data: devolucionesData, isLoading } = useQuery<{
    data: Sale[];
    total: number;
    limit: number;
    offset: number;
  }>({
    queryKey: ["/api/sales/devoluciones", filters],
  });

  const handlePageChange = (newOffset: number) => {
    setFilters(prev => ({ ...prev, offset: newOffset }));
  };

  return (
    <div className="h-screen flex bg-background">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Devoluciones"
        />
        
        <div className="flex-1 overflow-auto p-6">
          <div className="bg-card rounded-lg border border-border">
            <DevolucionesTable 
              data={devolucionesData?.data || []} 
              total={devolucionesData?.total || 0}
              limit={filters.limit}
              offset={filters.offset}
              isLoading={isLoading}
              onPageChange={handlePageChange}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
