import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BancosTab } from "@/components/admin/bancos-tab";
import { TiposEgresosTab } from "@/components/admin/tipos-egresos-tab";
import { ProductosTab } from "@/components/admin/productos-tab";
import { MetodosPagoTab } from "@/components/admin/metodos-pago-tab";
import { MonedasTab } from "@/components/admin/monedas-tab";
import { CategoriasTab } from "@/components/admin/categorias-tab";

export default function Administracion() {
  const [activeTab, setActiveTab] = useState("bancos");

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Administración</h1>
        <p className="text-muted-foreground">
          Configuración y gestión de datos maestros del sistema
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:grid-cols-6">
          <TabsTrigger value="bancos" className="text-xs">
            BANCOS
          </TabsTrigger>
          <TabsTrigger value="tipos-egresos" className="text-xs">
            TIPOS DE EGRESOS
          </TabsTrigger>
          <TabsTrigger value="productos" className="text-xs">
            PRODUCTOS
          </TabsTrigger>
          <TabsTrigger value="metodos-pago" className="text-xs">
            MÉTODOS DE PAGO
          </TabsTrigger>
          <TabsTrigger value="monedas" className="text-xs">
            MONEDA
          </TabsTrigger>
          <TabsTrigger value="categorias" className="text-xs">
            CATEGORIA
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bancos" className="space-y-4">
          <BancosTab />
        </TabsContent>

        <TabsContent value="tipos-egresos" className="space-y-4">
          <TiposEgresosTab />
        </TabsContent>

        <TabsContent value="productos" className="space-y-4">
          <ProductosTab />
        </TabsContent>

        <TabsContent value="metodos-pago" className="space-y-4">
          <MetodosPagoTab />
        </TabsContent>

        <TabsContent value="monedas" className="space-y-4">
          <MonedasTab />
        </TabsContent>

        <TabsContent value="categorias" className="space-y-4">
          <CategoriasTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}