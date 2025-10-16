import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { BancosTab } from "../components/admin/bancos-tab";
import { TiposEgresosTab } from "../components/admin/tipos-egresos-tab";
import { ProductosTab } from "../components/admin/productos-tab";
import { MetodosPagoTab } from "../components/admin/metodos-pago-tab";
import { MonedasTab } from "../components/admin/monedas-tab";
import { CategoriasTab } from "../components/admin/categorias-tab";
import { EdicionOrdenesTab } from "../components/admin/edicion-ordenes-tab";
import { CanalesTab } from "../components/admin/canales-tab";
import { AsesorTab } from "../components/admin/asesores-tab";
import { TransportistasTab } from "../components/admin/transportistas-tab";

export default function Administracion() {
  const [activeTab, setActiveTab] = useState("bancos");

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Administración</h1>
          </div>
          <Link href="/sales">
            <Button variant="outline" className="flex items-center gap-2" data-testid="back-to-dashboard">
              <ArrowLeft className="h-4 w-4" />
              Regresar al Menú Principal
            </Button>
          </Link>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-10 lg:w-auto lg:grid-cols-10">
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
          <TabsTrigger value="edicion-ordenes" className="text-xs">
            EDICIÓN DE ÓRDENES
          </TabsTrigger>
          <TabsTrigger value="canales" className="text-xs">
            CANALES
          </TabsTrigger>
          <TabsTrigger value="asesores" className="text-xs">
            ASESORES
          </TabsTrigger>
          <TabsTrigger value="transportistas" className="text-xs">
            TRANSPORTISTAS
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

        <TabsContent value="edicion-ordenes" className="space-y-4">
          <EdicionOrdenesTab />
        </TabsContent>

        <TabsContent value="canales" className="space-y-4">
          <CanalesTab />
        </TabsContent>

        <TabsContent value="asesores" className="space-y-4">
          <AsesorTab />
        </TabsContent>

        <TabsContent value="transportistas" className="space-y-4">
          <TransportistasTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}