import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import AddressForm from "@/components/addresses/address-form";

export default function Addresses() {
  return (
    <div className="h-screen flex bg-background">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Gestión de Direcciones"
          description="Agregar y editar direcciones de facturación y despacho"
        />
        
        <div className="flex-1 overflow-auto">
          <AddressForm />
        </div>
      </main>
    </div>
  );
}