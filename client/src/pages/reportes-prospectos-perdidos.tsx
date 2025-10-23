import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/shared/date-range-picker";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Download, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

interface ReporteProspectosPerdidosRow {
  prospecto: string;
  nombre: string;
  telefono: string | null;
  email: string | null;
  cedula: string | null;
  canal: string | null;
  asesor: string | null;
  fechaCreacion: string;
  totalUsd: string | null;
  notas: string | null;
  fechaSeguimiento1: string | null;
  respuestaSeguimiento1: string | null;
  fechaSeguimiento2: string | null;
  respuestaSeguimiento2: string | null;
  fechaSeguimiento3: string | null;
  respuestaSeguimiento3: string | null;
}

export default function ReporteProspectosPerdidos() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const { data: reportData, isLoading } = useQuery<ReporteProspectosPerdidosRow[]>({
    queryKey: ["/api/reports/prospectos-perdidos", startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const url = `/api/reports/prospectos-perdidos?${params.toString()}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch prospectos perdidos report');
      return response.json();
    },
  });

  const handleDownload = () => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const url = `/api/reports/prospectos-perdidos/download?${params.toString()}`;
    window.location.href = url;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    const match = dateString.match(/(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : '';
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Reportes" />
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Link href="/reportes">
                  <Button variant="ghost" size="sm" className="mb-2" data-testid="button-back-reportes">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver a Reportes
                  </Button>
                </Link>
                <h1 className="text-3xl font-bold tracking-tight">Prospectos Perdidos</h1>
                <p className="text-muted-foreground">
                  Detalle completo de prospectos perdidos con información de seguimiento
                </p>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Filtros</CardTitle>
                <CardDescription>Selecciona el rango de fechas para el reporte</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-4">
                  <DateRangePicker
                    startDate={startDate}
                    endDate={endDate}
                    onStartDateChange={setStartDate}
                    onEndDateChange={setEndDate}
                  />
                  <Button 
                    onClick={handleDownload}
                    disabled={isLoading || !reportData || reportData.length === 0}
                    data-testid="button-download-excel"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Descargar Excel
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Datos del Reporte</CardTitle>
                <CardDescription>
                  {reportData ? `${reportData.length} registros encontrados` : 'Cargando...'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">Cargando reporte...</p>
                  </div>
                ) : !reportData || reportData.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <p>No hay prospectos perdidos para el rango de fechas seleccionado</p>
                  </div>
                ) : (
                  <div className="relative border rounded-md">
                    <div className="max-h-[600px] overflow-x-auto overflow-y-auto">
                      <table className="w-full text-sm whitespace-nowrap">
                        <thead className="text-left">
                          <tr>
                            <th className="sticky top-0 bg-muted p-4 font-medium border-b z-10">Prospecto</th>
                            <th className="sticky top-0 bg-muted p-4 font-medium border-b z-10">Nombre</th>
                            <th className="sticky top-0 bg-muted p-4 font-medium border-b z-10">Teléfono</th>
                            <th className="sticky top-0 bg-muted p-4 font-medium border-b z-10">Email</th>
                            <th className="sticky top-0 bg-muted p-4 font-medium border-b z-10">Cédula</th>
                            <th className="sticky top-0 bg-muted p-4 font-medium border-b z-10">Canal</th>
                            <th className="sticky top-0 bg-muted p-4 font-medium border-b z-10">Asesor</th>
                            <th className="sticky top-0 bg-muted p-4 font-medium border-b z-10">Fecha Creación</th>
                            <th className="sticky top-0 bg-muted p-4 font-medium border-b z-10">Total USD</th>
                            <th className="sticky top-0 bg-muted p-4 font-medium border-b z-10">Notas</th>
                            <th className="sticky top-0 bg-muted p-4 font-medium border-b z-10">Fecha Seguimiento 1</th>
                            <th className="sticky top-0 bg-muted p-4 font-medium border-b z-10">Respuesta Seguimiento 1</th>
                            <th className="sticky top-0 bg-muted p-4 font-medium border-b z-10">Fecha Seguimiento 2</th>
                            <th className="sticky top-0 bg-muted p-4 font-medium border-b z-10">Respuesta Seguimiento 2</th>
                            <th className="sticky top-0 bg-muted p-4 font-medium border-b z-10">Fecha Seguimiento 3</th>
                            <th className="sticky top-0 bg-muted p-4 font-medium border-b z-10">Respuesta Seguimiento 3</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.map((row, index) => (
                            <tr key={index} className="border-b hover:bg-muted/50" data-testid={`row-prospectos-perdidos-${index}`}>
                              <td className="p-4">{row.prospecto}</td>
                              <td className="p-4">{row.nombre}</td>
                              <td className="p-4">{row.telefono || '-'}</td>
                              <td className="p-4">{row.email || '-'}</td>
                              <td className="p-4">{row.cedula || '-'}</td>
                              <td className="p-4">{row.canal || '-'}</td>
                              <td className="p-4">{row.asesor || '-'}</td>
                              <td className="p-4">{formatDate(row.fechaCreacion)}</td>
                              <td className="p-4">{row.totalUsd || '-'}</td>
                              <td className="p-4">{row.notas || '-'}</td>
                              <td className="p-4">{formatDate(row.fechaSeguimiento1)}</td>
                              <td className="p-4">{row.respuestaSeguimiento1 || '-'}</td>
                              <td className="p-4">{formatDate(row.fechaSeguimiento2)}</td>
                              <td className="p-4">{row.respuestaSeguimiento2 || '-'}</td>
                              <td className="p-4">{formatDate(row.fechaSeguimiento3)}</td>
                              <td className="p-4">{row.respuestaSeguimiento3 || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
