import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Reportes() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reportes</h1>
          <p className="text-muted-foreground">
            Análisis y reportes del sistema de ventas
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Reportes Disponibles</CardTitle>
            <CardDescription>
              Selecciona un reporte para visualizar análisis detallados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-muted-foreground">
              <i className="fas fa-chart-bar text-4xl mb-4"></i>
              <p>Los reportes estarán disponibles próximamente</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
