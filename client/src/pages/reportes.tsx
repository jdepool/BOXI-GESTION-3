import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { FileText } from "lucide-react";
import { Link } from "wouter";

export default function Reportes() {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Reportes" />
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto p-6 space-y-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Reportes</h1>
              <p className="text-muted-foreground">
                Selecciona el tipo de reporte que deseas generar
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <FileText className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="mt-4">Reporte temporal de Ordenes</CardTitle>
                  <CardDescription>
                    Detalle completo de ventas con información de pagos y entregas filtrado por rango de fechas
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href="/reportes/ordenes">
                    <Button className="w-full" data-testid="button-reporte-ordenes">
                      Ver Reporte
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <FileText className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="mt-4">Ordenes Perdidas</CardTitle>
                  <CardDescription>Detalle de ordenes marcadas como perdidas con información de contacto y productos</CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href="/reportes/perdidas">
                    <Button className="w-full" data-testid="button-reporte-perdidas">
                      Ver Reporte
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
