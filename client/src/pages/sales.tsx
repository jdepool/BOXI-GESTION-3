import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import SalesTable from "@/components/sales/sales-table";
import ManualSalesEntry from "@/components/sales/manual-sales-entry";

export default function Sales() {
  const [filters, setFilters] = useState({
    canal: "",
    estadoEntrega: "",
    startDate: "",
    endDate: "",
    limit: 20,
    offset: 0,
  });

  const { data: salesData, isLoading } = useQuery<{
    data: any[];
    total: number;
    limit: number;
    offset: number;
  }>({
    queryKey: ["/api/sales", { ...filters, excludePendingManual: true }],
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
          <Tabs defaultValue="lista" className="h-full">
            <TabsList className="mb-4">
              <TabsTrigger value="lista" data-testid="tab-sales-list">Lista de Ventas</TabsTrigger>
              <TabsTrigger value="manual" data-testid="tab-manual-entry">Ventas por completar</TabsTrigger>
            </TabsList>
            
            <TabsContent value="lista" className="h-full">
              <div className="bg-card rounded-lg border border-border h-full">
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
            </TabsContent>
            
            <TabsContent value="manual" className="h-full">
              <ManualSalesEntry />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
