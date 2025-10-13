import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import SalesTable from "@/components/sales/sales-table";
import ManualSalesEntry from "@/components/sales/manual-sales-entry";
import ManualReservaModal from "@/components/sales/manual-reserva-modal";
import PagosTable from "@/components/sales/pagos-table";

export default function Sales() {
  const [filters, setFilters] = useState({
    canal: "",
    estadoEntrega: "",
    orden: "",
    startDate: "",
    endDate: "",
    limit: 20,
    offset: 0,
  });

  const [pagosFilters, setPagosFilters] = useState({
    limit: 20,
    offset: 0,
  });

  const [isManualReservaModalOpen, setIsManualReservaModalOpen] = useState(false);

  const { data: salesData, isLoading } = useQuery<{
    data: any[];
    total: number;
    limit: number;
    offset: number;
  }>({
    queryKey: ["/api/sales", filters],
  });

  // Query for Reserva orders that are still pending (exclude those ready for dispatch)
  const { data: reservasData, isLoading: reservasLoading } = useQuery<{
    data: any[];
    total: number;
    limit: number;
    offset: number;
  }>({
    queryKey: ["/api/sales", { tipo: "Reserva", excludeADespachar: true }],
  });

  // Query for Pagos tab - orders grouped by order number with estadoEntrega Pendiente or En Proceso
  const { data: pagosData, isLoading: pagosLoading } = useQuery<{
    data: Array<{
      orden: string;
      nombre: string;
      fecha: Date;
      canal: string | null;
      tipo: string | null;
      estadoEntrega: string | null;
      totalOrderUsd: number | null;
      productCount: number;
      hasPagoInicial: boolean;
      hasFlete: boolean;
      installmentCount: number;
    }>;
    total: number;
  }>({
    queryKey: ["/api/sales/orders", pagosFilters],
  });

  const handleFilterChange = (newFilters: Partial<typeof filters>) => {
    setFilters(prev => ({ ...prev, ...newFilters, offset: 0 }));
  };

  const handlePageChange = (newOffset: number) => {
    setFilters(prev => ({ ...prev, offset: newOffset }));
  };

  const handlePagosPageChange = (newOffset: number) => {
    setPagosFilters(prev => ({ ...prev, offset: newOffset }));
  };

  return (
    <div className="h-screen flex bg-background">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Ventas"
        />
        
        <div className="flex-1 overflow-auto p-6">
          <Tabs defaultValue="lista" className="h-full">
            <TabsList className="mb-4">
              <TabsTrigger value="lista" data-testid="tab-sales-list">Lista de Ventas</TabsTrigger>
              <TabsTrigger value="manual" data-testid="tab-manual-entry">Ventas por completar</TabsTrigger>
              <TabsTrigger value="reservas" data-testid="tab-reservas">Reservas</TabsTrigger>
              <TabsTrigger value="pagos" data-testid="tab-pagos">Pagos</TabsTrigger>
            </TabsList>
            
            <TabsContent value="lista" className="h-full">
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
                  showDeliveryDateColumn={true}
                />
              </div>
            </TabsContent>
            
            <TabsContent value="manual" className="h-full">
              <ManualSalesEntry />
            </TabsContent>
            
            <TabsContent value="reservas" className="h-full">
              <div className="bg-card rounded-lg border border-border h-full flex flex-col">
                <div className="p-4 border-b border-border flex justify-end">
                  <Button 
                    onClick={() => setIsManualReservaModalOpen(true)}
                    data-testid="button-nueva-reserva-manual"
                  >
                    <i className="fas fa-plus mr-2"></i>
                    + Nueva Reserva Manual
                  </Button>
                </div>
                <div className="flex-1">
                  <SalesTable 
                    data={reservasData?.data || []} 
                    total={reservasData?.total || 0}
                    limit={20}
                    offset={0}
                    isLoading={reservasLoading}
                    hideFilters={false}
                    hidePagination={false}
                    showDeliveryDateColumn={true}
                  />
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="pagos" className="h-full">
              <div className="bg-card rounded-lg border border-border h-full">
                <PagosTable 
                  data={pagosData?.data || []} 
                  total={pagosData?.total || 0}
                  limit={pagosFilters.limit}
                  offset={pagosFilters.offset}
                  isLoading={pagosLoading}
                  onPageChange={handlePagosPageChange}
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <ManualReservaModal 
        isOpen={isManualReservaModalOpen}
        onClose={() => setIsManualReservaModalOpen(false)}
        onSuccess={() => {
          setIsManualReservaModalOpen(false);
          // The modal will handle cache invalidation internally
        }}
      />
    </div>
  );
}
