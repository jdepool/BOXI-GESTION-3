import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DevolucionesTable from "@/components/devoluciones/devoluciones-table";
import CancellationsTable from "@/components/cancelaciones/cancellations-table";
import type { Sale } from "@shared/schema";

export default function DevolucionesCancelaciones() {
  const [devolucionesFilters, setDevolucionesFilters] = useState({
    limit: 20,
    offset: 0,
  });

  const [cancelacionesFilters, setCancelacionesFilters] = useState({
    limit: 20,
    offset: 0,
  });

  const { data: devolucionesData, isLoading: devolucionesLoading } = useQuery<{
    data: Sale[];
    total: number;
    limit: number;
    offset: number;
  }>({
    queryKey: ["/api/sales/devoluciones", devolucionesFilters],
  });

  const { data: cancelacionesData, isLoading: cancelacionesLoading } = useQuery<{
    data: Sale[];
    total: number;
    limit: number;
    offset: number;
  }>({
    queryKey: ["/api/sales/cancelaciones", cancelacionesFilters],
  });

  const handleDevolucionesPageChange = (newOffset: number) => {
    setDevolucionesFilters(prev => ({ ...prev, offset: newOffset }));
  };

  const handleCancelacionesPageChange = (newOffset: number) => {
    setCancelacionesFilters(prev => ({ ...prev, offset: newOffset }));
  };

  return (
    <div className="h-screen flex bg-background">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Devoluciones/Cancelaciones"
        />
        
        <div className="flex-1 overflow-auto p-6">
          <Tabs defaultValue="devoluciones" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="devoluciones" data-testid="tab-devoluciones">
                Devoluciones
              </TabsTrigger>
              <TabsTrigger value="cancelaciones" data-testid="tab-cancelaciones">
                Cancelaciones
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="devoluciones" className="mt-6">
              <div className="bg-card rounded-lg border border-border">
                <DevolucionesTable 
                  data={devolucionesData?.data || []} 
                  total={devolucionesData?.total || 0}
                  limit={devolucionesFilters.limit}
                  offset={devolucionesFilters.offset}
                  isLoading={devolucionesLoading}
                  onPageChange={handleDevolucionesPageChange}
                />
              </div>
            </TabsContent>
            
            <TabsContent value="cancelaciones" className="mt-6">
              <div className="bg-card rounded-lg border border-border">
                <CancellationsTable 
                  data={cancelacionesData?.data || []} 
                  total={cancelacionesData?.total || 0}
                  limit={cancelacionesFilters.limit}
                  offset={cancelacionesFilters.offset}
                  isLoading={cancelacionesLoading}
                  onPageChange={handleCancelacionesPageChange}
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
