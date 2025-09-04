import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { VerificacionPagosCasheaTab } from "@/components/admin/verificacion-pagos-cashea-tab";

export default function VerificacionPagosCashea() {
  return (
    <div className="h-screen flex bg-background">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Verificación de Pagos Cashea"
          description="Procesamiento automático de estados de cuenta y verificación de pagos"
        />
        
        <div className="flex-1 overflow-auto p-6">
          <VerificacionPagosCasheaTab />
        </div>
      </main>
    </div>
  );
}