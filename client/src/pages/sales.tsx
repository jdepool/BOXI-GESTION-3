import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download } from "lucide-react";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import SalesTable from "@/components/sales/sales-table";
import ManualSalesEntry from "@/components/sales/manual-sales-entry";
import ManualReservaModal from "@/components/sales/manual-reserva-modal";
import PagosTable from "@/components/sales/pagos-table";
import ProspectosTable from "@/components/prospectos/prospectos-table";
import UploadZone from "@/components/upload/upload-zone";
import type { Prospecto } from "@shared/schema";

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

  const [reservasFilters, setReservasFilters] = useState({
    startDate: "",
    endDate: "",
    limit: 20,
    offset: 0,
  });

  const [prospectosFilters, setProspectosFilters] = useState({
    asesorId: "",
    estadoProspecto: "Activo",
    canal: "",
    prospecto: "",
    startDate: "",
    endDate: "",
    limit: 20,
    offset: 0,
  });

  const [isManualReservaModalOpen, setIsManualReservaModalOpen] = useState(false);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("lista");
  const [convertingProspecto, setConvertingProspecto] = useState<{ tipo: "inmediata" | "reserva"; prospecto: Prospecto } | null>(null);

  const { data: salesData, isLoading } = useQuery<{
    data: any[];
    total: number;
    limit: number;
    offset: number;
  }>({
    queryKey: ["/api/sales", { 
      ...filters, 
      excludePendingManual: true,
      // Lista de Ventas always excludes Pendiente and Perdida orders
      excludePerdida: true,
      excludePendiente: true
    }],
  });

  // Query for Reserva orders that are still pending (excludePerdida always true)
  const { data: reservasData, isLoading: reservasLoading } = useQuery<{
    data: any[];
    total: number;
    limit: number;
    offset: number;
  }>({
    queryKey: ["/api/sales", { 
      ...reservasFilters,
      tipo: "Reserva", 
      estadoEntrega: "Pendiente", 
      excludePerdida: true 
    }],
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
      pagoInicialUsd: number;
      pagoFleteUsd: number;
      ordenPlusFlete: number;
      totalCuotas: number;
      totalPagado: number;
      totalVerificado: number;
      saldoPendiente: number;
      seguimientoPago: string | null;
    }>;
    total: number;
  }>({
    queryKey: ["/api/sales/orders", { 
      ...pagosFilters, 
      // Always exclude Perdida orders from Pagos view
      excludePerdida: true
    }],
    staleTime: 0, // Always fetch fresh data
    gcTime: 0, // Don't cache data
  });

  // Query for recent uploads (Cargar Datos tab)
  const { data: recentUploads } = useQuery<any[]>({
    queryKey: ["/api/uploads/recent"],
  });

  // Query for Prospectos tab
  const { data: prospectosData, isLoading: prospectosLoading } = useQuery<{
    data: Prospecto[];
    total: number;
    limit: number;
    offset: number;
  }>({
    queryKey: ["/api/prospectos", prospectosFilters],
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

  const handleClearFilters = () => {
    setFilters({
      canal: "",
      estadoEntrega: "",
      orden: "",
      startDate: "",
      endDate: "",
      limit: 20,
      offset: 0,
    });
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

  const handleClearPagosFilters = () => {
    setPagosFilters({
      canal: "",
      orden: "",
      startDate: "",
      endDate: "",
      asesorId: "",
      estadoEntrega: "",
      limit: 20,
      offset: 0,
    });
  };

  const handleReservasFilterChange = (newFilters: Partial<typeof reservasFilters>) => {
    setReservasFilters(prev => ({ ...prev, ...newFilters, offset: 0 }));
  };

  const handleReservasPageChange = (newOffset: number) => {
    setReservasFilters(prev => ({ ...prev, offset: newOffset }));
  };

  const handleClearReservasFilters = () => {
    setReservasFilters({
      startDate: "",
      endDate: "",
      limit: 20,
      offset: 0,
    });
  };

  const handleProspectosFilterChange = (newFilters: Partial<typeof prospectosFilters>) => {
    const normalized = { ...newFilters };
    if (normalized.asesorId === "all") normalized.asesorId = "";
    setProspectosFilters(prev => ({ ...prev, ...normalized, offset: 0 }));
  };

  const handleProspectosPageChange = (newOffset: number) => {
    setProspectosFilters(prev => ({ ...prev, offset: newOffset }));
  };

  const handleClearProspectosFilters = () => {
    setProspectosFilters({
      asesorId: "",
      estadoProspecto: "Activo",
      canal: "",
      prospecto: "",
      startDate: "",
      endDate: "",
      limit: 20,
      offset: 0,
    });
  };

  const handleProspectoConvert = (tipo: "inmediata" | "reserva", prospecto: Prospecto) => {
    setConvertingProspecto({ tipo, prospecto });
    // Switch to the appropriate tab and open the form
    if (tipo === "inmediata") {
      setActiveTab("manual");
    } else {
      setActiveTab("reservas");
      setIsManualReservaModalOpen(true);
    }
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
            <div className="flex items-center justify-between mb-4">
              <TabsList>
                <TabsTrigger value="prospectos" data-testid="tab-prospectos">Prospectos</TabsTrigger>
                <TabsTrigger value="manual" data-testid="tab-manual-entry">Inmediatas</TabsTrigger>
                <TabsTrigger value="reservas" data-testid="tab-reservas">Reservas</TabsTrigger>
                <TabsTrigger value="pagos" data-testid="tab-pagos">Pagos</TabsTrigger>
                <TabsTrigger value="lista" data-testid="tab-sales-list">Lista de Ventas</TabsTrigger>
              </TabsList>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsSettingsDialogOpen(true)}
                data-testid="button-settings"
                className="text-muted-foreground hover:text-foreground"
              >
                Cargar datos
              </Button>
            </div>
            
            <TabsContent value="prospectos" className="h-full">
              <div className="bg-card rounded-lg border border-border h-full">
                <ProspectosTable 
                  data={prospectosData?.data || []} 
                  total={prospectosData?.total || 0}
                  limit={prospectosFilters.limit}
                  offset={prospectosFilters.offset}
                  isLoading={prospectosLoading}
                  filters={prospectosFilters}
                  onFilterChange={handleProspectosFilterChange}
                  onPageChange={handleProspectosPageChange}
                  onClearFilters={handleClearProspectosFilters}
                  onConvertProspecto={handleProspectoConvert}
                />
              </div>
            </TabsContent>
            
            <TabsContent value="lista" className="h-full">
              <div className="bg-card rounded-lg border border-border h-full">
                <SalesTable 
                  data={salesData?.data || []} 
                  total={salesData?.total || 0}
                  limit={filters.limit}
                  offset={filters.offset}
                  isLoading={isLoading}
                  filters={filters}
                  extraExportParams={{
                    excludePendingManual: 'true',
                    excludePerdida: filters.estadoEntrega !== "Perdida" ? 'true' : undefined
                  }}
                  onFilterChange={handleFilterChange}
                  onPageChange={handlePageChange}
                  onClearFilters={handleClearFilters}
                  showDeliveryDateColumn={true}
                  activeTab={activeTab}
                />
              </div>
            </TabsContent>
            
            <TabsContent value="manual" className="h-full">
              <ManualSalesEntry 
                convertingProspecto={convertingProspecto?.tipo === "inmediata" ? convertingProspecto.prospecto : null}
                onConversionComplete={() => setConvertingProspecto(null)}
              />
            </TabsContent>
            
            <TabsContent value="reservas" className="h-full">
              <div className="bg-card rounded-lg border border-border h-full">
                <SalesTable 
                  data={reservasData?.data || []} 
                  total={reservasData?.total || 0}
                  limit={reservasFilters.limit}
                  offset={reservasFilters.offset}
                  isLoading={reservasLoading}
                  hideFilters={false}
                  hidePagination={false}
                  showDeliveryDateColumn={true}
                  showSeguimientoColumns={true}
                  hideEstadoEntregaFilter={true}
                  activeTab={activeTab}
                  filters={reservasFilters}
                  extraExportParams={{
                    tipo: 'Reserva',
                    estadoEntrega: 'Pendiente',
                    excludePerdida: 'true'
                  }}
                  onFilterChange={handleReservasFilterChange}
                  onPageChange={handleReservasPageChange}
                  onClearFilters={handleClearReservasFilters}
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
                  onClearFilters={handleClearPagosFilters}
                />
              </div>
            </TabsContent>

          </Tabs>
        </div>
      </main>

      <ManualReservaModal 
        isOpen={isManualReservaModalOpen}
        onClose={() => {
          setIsManualReservaModalOpen(false);
          if (convertingProspecto?.tipo === "reserva") {
            setConvertingProspecto(null);
          }
        }}
        onSuccess={() => {
          setIsManualReservaModalOpen(false);
          if (convertingProspecto?.tipo === "reserva") {
            setConvertingProspecto(null);
          }
          // The modal will handle cache invalidation internally
        }}
        convertingProspecto={convertingProspecto?.tipo === "reserva" ? convertingProspecto.prospecto : null}
      />

      <Dialog open={isSettingsDialogOpen} onOpenChange={setIsSettingsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="dialog-settings">
          <DialogHeader>
            <DialogTitle>Configuración y Cargar Datos</DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-6">
            <UploadZone recentUploads={recentUploads} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
