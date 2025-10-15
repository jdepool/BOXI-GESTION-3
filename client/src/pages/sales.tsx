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
import UploadZone from "@/components/upload/upload-zone";

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
    canal: "",
    orden: "",
    startDate: "",
    endDate: "",
    asesorId: "",
    estadoEntrega: "",
    limit: 20,
    offset: 0,
  });

  const [isManualReservaModalOpen, setIsManualReservaModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("lista");

  const { data: salesData, isLoading } = useQuery<{
    data: any[];
    total: number;
    limit: number;
    offset: number;
  }>({
    queryKey: ["/api/sales", { 
      ...filters, 
      excludePendingManual: true, 
      excludePerdida: filters.estadoEntrega !== "Perdida"
    }],
  });

  // Query for Reserva orders that are still pending (excludePerdida always true for this hardcoded query)
  const { data: reservasData, isLoading: reservasLoading } = useQuery<{
    data: any[];
    total: number;
    limit: number;
    offset: number;
  }>({
    queryKey: ["/api/sales", { tipo: "Reserva", estadoEntrega: "Pendiente", excludePerdida: true }],
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
      asesorId: string | null;
      totalOrderUsd: number | null;
      productCount: number;
      hasPagoInicial: boolean;
      hasFlete: boolean;
      installmentCount: number;
      pagoInicialUsd: number | null;
      pagoFleteUsd: number | null;
      ordenPlusFlete: number;
      totalCuotas: number;
      totalPagado: number;
      saldoPendiente: number;
      seguimientoPago: string | null;
    }>;
    total: number;
  }>({
    queryKey: ["/api/sales/orders", { 
      ...pagosFilters, 
      // Exclude Perdida by default, only show when explicitly selected
      excludePerdida: pagosFilters.estadoEntrega !== "Perdida"
    }],
  });

  // Query for recent uploads (Cargar Datos tab)
  const { data: recentUploads } = useQuery<any[]>({
    queryKey: ["/api/uploads/recent"],
  });

  const handleFilterChange = (newFilters: Partial<typeof filters>) => {
    const normalized = { ...newFilters };
    if (normalized.canal === "all") normalized.canal = "";
    if (normalized.estadoEntrega === "all") normalized.estadoEntrega = "";
    setFilters(prev => ({ ...prev, ...normalized, offset: 0 }));
  };

  const handlePageChange = (newOffset: number) => {
    setFilters(prev => ({ ...prev, offset: newOffset }));
  };

  const handlePagosFilterChange = (newFilters: Partial<typeof pagosFilters>) => {
    const normalized = { ...newFilters };
    if (normalized.canal === "all") normalized.canal = "";
    if (normalized.asesorId === "all") normalized.asesorId = "";
    if (normalized.estadoEntrega === "all") normalized.estadoEntrega = "";
    setPagosFilters(prev => ({ ...prev, ...normalized, offset: 0 }));
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
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
            <TabsList className="mb-4">
              <TabsTrigger value="lista" data-testid="tab-sales-list">Lista de Ventas</TabsTrigger>
              <TabsTrigger value="manual" data-testid="tab-manual-entry">Ventas por completar</TabsTrigger>
              <TabsTrigger value="reservas" data-testid="tab-reservas">Reservas</TabsTrigger>
              <TabsTrigger value="pagos" data-testid="tab-pagos">Pagos</TabsTrigger>
              <TabsTrigger value="cargar" data-testid="tab-cargar-datos">Cargar Datos</TabsTrigger>
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
                  activeTab={activeTab}
                />
              </div>
            </TabsContent>
            
            <TabsContent value="manual" className="h-full">
              <ManualSalesEntry />
            </TabsContent>
            
            <TabsContent value="reservas" className="h-full">
              <div className="bg-card rounded-lg border border-border h-full">
                <SalesTable 
                  data={reservasData?.data || []} 
                  total={reservasData?.total || 0}
                  limit={20}
                  offset={0}
                  isLoading={reservasLoading}
                  hideFilters={false}
                  hidePagination={false}
                  showDeliveryDateColumn={true}
                  activeTab={activeTab}
                  onNewReserva={() => setIsManualReservaModalOpen(true)}
                />
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
                  filters={pagosFilters}
                  onFilterChange={handlePagosFilterChange}
                  onPageChange={handlePagosPageChange}
                />
              </div>
            </TabsContent>

            <TabsContent value="cargar" className="h-full">
              <div className="max-w-2xl mx-auto">
                <UploadZone recentUploads={recentUploads} />
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
