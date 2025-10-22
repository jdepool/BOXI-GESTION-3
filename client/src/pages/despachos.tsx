import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import DispatchTable from "@/components/dispatch/dispatch-table";
import type { Sale } from "@shared/schema";

export default function Despachos() {
  const [filters, setFilters] = useState({
    limit: 20,
    offset: 0,
    canal: "",
    estadoEntrega: "",
    transportistaId: "",
    startDate: "",
    endDate: "",
    search: "",
  });

  const { data: dispatchData, isLoading } = useQuery<{
    data: Sale[];
    total: number;
    limit: number;
    offset: number;
  }>({
    queryKey: ["/api/sales/dispatch", filters],
  });

  const handlePageChange = (newOffset: number) => {
    setFilters(prev => ({ ...prev, offset: newOffset }));
  };

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value, offset: 0 }));
  };

  const handleClearFilters = () => {
    setFilters({
      limit: 20,
      offset: 0,
      canal: "",
      estadoEntrega: "",
      transportistaId: "",
      startDate: "",
      endDate: "",
      search: "",
    });
  };

  return (
    <div className="h-screen flex bg-background">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Despachos"
        />
        
        <div className="flex-1 overflow-auto p-6">
          <div className="bg-card rounded-lg border border-border">
            <DispatchTable 
              data={dispatchData?.data || []} 
              total={dispatchData?.total || 0}
              limit={filters.limit}
              offset={filters.offset}
              isLoading={isLoading}
              filters={filters}
              onFilterChange={handleFilterChange}
              onPageChange={handlePageChange}
              onClearFilters={handleClearFilters}
            />
          </div>
        </div>
      </main>
    </div>
  );
}