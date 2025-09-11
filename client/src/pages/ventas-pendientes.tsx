import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import SalesTable from "@/components/sales/sales-table";
import type { Sale } from "@shared/schema";

interface SalesResponse {
  data: Sale[];
  total: number;
  limit: number;
  offset: number;
}

interface SalesFilters {
  canal: string;
  estadoEntrega: string;
  estado: string;
  orden: string;
  startDate: string;
  endDate: string;
  limit: number;
  offset: number;
}

export default function VentasPendientes() {
  const [filters, setFilters] = useState<SalesFilters>({
    canal: "",
    estadoEntrega: "Pendiente", // Filter specifically for pending orders
    estado: "",
    orden: "",
    startDate: "",
    endDate: "",
    limit: 20,
    offset: 0,
  });

  const { data: salesData, isLoading } = useQuery<SalesResponse>({
    queryKey: ["/api/sales", filters],
  });

  const handleFilterChange = (newFilters: Partial<SalesFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handlePageChange = (newOffset: number) => {
    setFilters(prev => ({ ...prev, offset: newOffset }));
  };

  return (
    <div className="h-screen flex bg-background">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Ventas Pendientes"
          description="Gestión de ventas que requieren procesamiento o seguimiento"
        />
        
        <div className="flex-1 overflow-hidden p-6">
          <div className="bg-card rounded-lg border border-border h-full">
            <SalesTable 
              data={salesData?.data || []} 
              total={salesData?.total || 0}
              limit={filters.limit}
              offset={filters.offset}
              isLoading={isLoading}
              filters={filters}
              onFilterChange={handleFilterChange}
              onPageChange={handlePageChange}
            />
          </div>
        </div>
      </main>
    </div>
  );
}