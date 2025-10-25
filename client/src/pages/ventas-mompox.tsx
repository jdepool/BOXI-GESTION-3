import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import SalesTable from "@/components/sales/sales-table";
import ManualSalesEntry from "@/components/sales/manual-sales-entry";
import ManualReservaModal from "@/components/sales/manual-reserva-modal";
import PagosTable from "@/components/sales/pagos-table";
import ProspectosTable from "@/components/prospectos/prospectos-table";
import UploadZone from "@/components/upload/upload-zone";
import type { Prospecto } from "@shared/schema";

export default function VentasMompox() {
  const [filters, setFilters] = useState({
    canalMompox: "true", // Filter for ShopMom OR canals containing "MP"
    estadoEntrega: "",
    orden: "",
    startDate: "",
    endDate: "",
    limit: 20,
    offset: 0,
  });

  const [pagosFilters, setPagosFilters] = useState({
    canalMompox: "true", // Filter for ShopMom OR canals containing "MP"
    orden: "",
    startDate: "",
    endDate: "",
    asesorId: "",
    estadoEntrega: "",
    limit: 20,
    offset: 0,
  });

  const [inmediatasFilters, setInmediatasFilters] = useState({
    canalMompox: "true", // Filter for ShopMom OR canals containing "MP"
    startDate: "",
    endDate: "",
    limit: 20,
    offset: 0,
  });

  const [reservasFilters, setReservasFilters] = useState({
    canalMompox: "true", // Filter for ShopMom OR canals containing "MP"
    startDate: "",
    endDate: "",
    limit: 20,
    offset: 0,
  });

  const [prospectosFilters, setProspectosFilters] = useState({
    asesorId: "",
    estadoProspecto: "Activo",
    canalMompox: "true", // Filter for ShopMom OR canals containing "MP"
    prospecto: "",
    startDate: "",
    endDate: "",
    limit: 20,
    offset: 0,
  });

  const [isManualInmediataModalOpen, setIsManualInmediataModalOpen] = useState(false);
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

  // Query for Inmediato orders that are still pending (excludePerdida always true)
  const { data: inmediatasData, isLoading: inmediatasLoading } = useQuery<{
    data: any[];
    total: number;
    limit: number;
    offset: number;
  }>({
    queryKey: ["/api/sales", { 
      ...inmediatasFilters,
      tipo: "Inmediato", 
      estadoEntrega: "Pendiente", 
      excludePerdida: true 
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
      fleteAPagar: number;
      ordenPlusFlete: number;
      totalCuotas: number;
      totalPagado: number;
      totalVerificado: number;
      saldoPendiente: number;
      notas: string | null;
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
    if (normalized.estadoEntrega === "all") normalized.estadoEntrega = "";
    setFilters(prev => ({ ...prev, ...normalized, offset: 0, canalMompox: "true" })); // Always maintain Mompox filter
  };

  const handlePageChange = (newOffset: number) => {
    setFilters(prev => ({ ...prev, offset: newOffset }));
  };

  const handleClearFilters = () => {
    setFilters({
      canalMompox: "true", // Keep Mompox filter
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
    if (normalized.asesorId === "all") normalized.asesorId = "";
    if (normalized.estadoEntrega === "all") normalized.estadoEntrega = "";
    setPagosFilters(prev => ({ ...prev, ...normalized, offset: 0, canalMompox: "true" })); // Always maintain Mompox filter
  };

  const handlePagosPageChange = (newOffset: number) => {
    setPagosFilters(prev => ({ ...prev, offset: newOffset }));
  };

  const handleClearPagosFilters = () => {
    setPagosFilters({
      canalMompox: "true", // Keep Mompox filter
      orden: "",
      startDate: "",
      endDate: "",
      asesorId: "",
      estadoEntrega: "",
      limit: 20,
      offset: 0,
    });
  };

  const handleInmediatasFilterChange = (newFilters: Partial<typeof inmediatasFilters>) => {
    setInmediatasFilters(prev => ({ ...prev, ...newFilters, offset: 0, canalMompox: "true" })); // Always maintain Mompox filter
  };

  const handleInmediatasPageChange = (newOffset: number) => {
    setInmediatasFilters(prev => ({ ...prev, offset: newOffset }));
  };

  const handleClearInmediatasFilters = () => {
    setInmediatasFilters({
      canalMompox: "true", // Keep Mompox filter
      startDate: "",
      endDate: "",
      limit: 20,
      offset: 0,
    });
  };

  const handleReservasFilterChange = (newFilters: Partial<typeof reservasFilters>) => {
    setReservasFilters(prev => ({ ...prev, ...newFilters, offset: 0, canalMompox: "true" })); // Always maintain Mompox filter
  };

  const handleReservasPageChange = (newOffset: number) => {
    setReservasFilters(prev => ({ ...prev, offset: newOffset }));
  };

  const handleClearReservasFilters = () => {
    setReservasFilters({
      canalMompox: "true", // Keep Mompox filter
      startDate: "",
      endDate: "",
      limit: 20,
      offset: 0,
    });
  };

  const handleProspectosFilterChange = (newFilters: Partial<typeof prospectosFilters>) => {
    const normalized = { ...newFilters };
    if (normalized.asesorId === "all") normalized.asesorId = "";
    setProspectosFilters(prev => ({ ...prev, ...normalized, offset: 0, canalMompox: "true" })); // Always maintain Mompox filter
  };

  const handleProspectosPageChange = (newOffset: number) => {
    setProspectosFilters(prev => ({ ...prev, offset: newOffset }));
  };

  const handleClearProspectosFilters = () => {
    setProspectosFilters({
      asesorId: "",
      estadoProspecto: "Activo",
      canalMompox: "true", // Keep Mompox filter
      prospecto: "",
      startDate: "",
      endDate: "",
      limit: 20,
      offset: 0,
    });
  };

  const handleProspectoConvert = (tipo: "inmediata" | "reserva", prospecto: Prospecto) => {
    setConvertingProspecto({ tipo, prospecto });
    // Open the appropriate modal
    if (tipo === "inmediata") {
      setIsManualInmediataModalOpen(true);
    } else {
      setIsManualReservaModalOpen(true);
    }
  };

  return (
    <div className="h-screen flex bg-background">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Ventas Mompox"
        />
        
        <div className="flex-1 overflow-auto p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
            <div className="flex items-center justify-between mb-4">
              <TabsList>
                <TabsTrigger value="prospectos" data-testid="tab-mompox-prospectos">Prospectos</TabsTrigger>
                <TabsTrigger value="manual" data-testid="tab-mompox-manual-entry">Inmediatas</TabsTrigger>
                <TabsTrigger value="reservas" data-testid="tab-mompox-reservas">Reservas</TabsTrigger>
                <TabsTrigger value="pagos" data-testid="tab-mompox-pagos">Pagos</TabsTrigger>
                <TabsTrigger value="lista" data-testid="tab-mompox-sales-list">Lista de Ventas</TabsTrigger>
              </TabsList>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsSettingsDialogOpen(true)}
                data-testid="button-mompox-settings"
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
                  productLine="mompox"
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
                    canal: 'ShopMom',
                    excludePendingManual: 'true',
                    excludePerdida: filters.estadoEntrega !== "Perdida" ? 'true' : undefined
                  }}
                  onFilterChange={handleFilterChange}
                  onPageChange={handlePageChange}
                  onClearFilters={handleClearFilters}
                  showDeliveryDateColumn={true}
                  activeTab={activeTab}
                  productLine="mompox"
                />
              </div>
            </TabsContent>
            
            <TabsContent value="manual" className="h-full">
              <div className="bg-card rounded-lg border border-border h-full">
                <SalesTable 
                  data={inmediatasData?.data || []} 
                  total={inmediatasData?.total || 0}
                  limit={inmediatasFilters.limit}
                  offset={inmediatasFilters.offset}
                  isLoading={inmediatasLoading}
                  hideFilters={false}
                  hidePagination={false}
                  showDeliveryDateColumn={true}
                  showSeguimientoColumns={true}
                  hideEstadoEntregaFilter={true}
                  activeTab={activeTab}
                  filters={inmediatasFilters}
                  extraExportParams={{
                    canalMompox: 'true',
                    tipo: 'Inmediato',
                    estadoEntrega: 'Pendiente',
                    excludePerdida: 'true'
                  }}
                  onFilterChange={handleInmediatasFilterChange}
                  onPageChange={handleInmediatasPageChange}
                  onClearFilters={handleClearInmediatasFilters}
                  onNewManualSale={() => setIsManualInmediataModalOpen(true)}
                  productLine="mompox"
                />
              </div>
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
                    canal: 'ShopMom',
                    tipo: 'Reserva',
                    estadoEntrega: 'Pendiente',
                    excludePerdida: 'true'
                  }}
                  onFilterChange={handleReservasFilterChange}
                  onPageChange={handleReservasPageChange}
                  onClearFilters={handleClearReservasFilters}
                  onNewReserva={() => setIsManualReservaModalOpen(true)}
                  productLine="mompox"
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

      <Dialog open={isManualInmediataModalOpen} onOpenChange={(open) => {
        setIsManualInmediataModalOpen(open);
        if (!open && convertingProspecto?.tipo === "inmediata") {
          setConvertingProspecto(null);
        }
      }}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto" data-testid="dialog-mompox-manual-inmediata">
          <DialogHeader>
            <DialogTitle>Nueva Venta Inmediata Mompox</DialogTitle>
          </DialogHeader>
          <ManualSalesEntry 
            convertingProspecto={convertingProspecto?.tipo === "inmediata" ? convertingProspecto.prospecto : null}
            onConversionComplete={() => {
              setIsManualInmediataModalOpen(false);
              setConvertingProspecto(null);
            }}
            openFormImmediately={true}
            productLine="mompox"
          />
        </DialogContent>
      </Dialog>

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
        productLine="mompox"
      />

      <Dialog open={isSettingsDialogOpen} onOpenChange={setIsSettingsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="dialog-mompox-settings">
          <DialogHeader>
            <DialogTitle>Configuración y Cargar Datos - Mompox</DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-6">
            <UploadZone recentUploads={recentUploads} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
