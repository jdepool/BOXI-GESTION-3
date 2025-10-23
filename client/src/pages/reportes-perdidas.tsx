import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/shared/date-range-picker";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Download, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

interface ReportePerdidasRow {
  orden: string;
  fecha: string;
  notas: string | null;
  fechaEntrega: string | null;
  estadoEntrega: string;
  nombre: string;
  telefono: string | null;
  cedula: string | null;
  email: string | null;
  estado: string | null;
  ciudad: string | null;
  direccion: string | null;
  urbanizacion: string | null;
  referencia: string | null;
  categoria: string | null;
  producto: string;
  sku: string | null;
  cantidad: number;
  banco: string | null;
  pagoInicialUsd: number;
  totalUsd: number;
  installments: Array<{ installmentNumber: number; pagoCuotaUsd: number }>;
  pendiente: number;
  canal: string;
  asesor: string | null;
  flete: number;
  tipo: string | null;
}

export default function ReportePerdidas() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const { data: reportData, isLoading } = useQuery<ReportePerdidasRow[]>({
    queryKey: ["/api/reports/perdidas", startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const url = `/api/reports/perdidas?${params.toString()}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch perdidas report');
      return response.json();
    },
  });

  const maxInstallments = reportData 
    ? Math.max(...reportData.map(row => row.installments.length), 0)
    : 0;

  const handleDownload = () => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const url = `/api/reports/perdidas/download?${params.toString()}`;
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
                <h1 className="text-3xl font-bold tracking-tight">Ordenes Perdidas</h1>
                <p className="text-muted-foreground">
                  Detalle completo de ordenes perdidas con información de pagos y entregas
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
                    <p>No hay ordenes perdidas para el rango de fechas seleccionado</p>
                  </div>
                ) : (
                  <div className="relative border rounded-md">
                    <div className="max-h-[600px] overflow-x-auto overflow-y-auto">
                      <table className="w-full text-sm whitespace-nowrap">
                        <thead className="text-left">
                          <tr>
                            <th className="sticky top-0 bg-muted p-4 font-medium border-b z-10">Orden</th>
                            <th className="sticky top-0 bg-muted p-4 font-medium border-b z-10">Fecha</th>
                            <th className="sticky top-0 bg-muted p-4 font-medium border-b z-10">Notas</th>
                            <th className="sticky top-0 bg-muted p-4 font-medium border-b z-10">Fecha Entrega</th>
                            <th className="sticky top-0 bg-muted p-4 font-medium border-b z-10">Estado Entrega</th>
                            <th className="sticky top-0 bg-muted p-4 font-medium border-b z-10">Nombre</th>
                            <th className="sticky top-0 bg-muted p-4 font-medium border-b z-10">Telefono</th>
                            <th className="sticky top-0 bg-muted p-4 font-medium border-b z-10">Cedula</th>
                            <th className="sticky top-0 bg-muted p-4 font-medium border-b z-10">Email</th>
                            <th className="sticky top-0 bg-muted p-4 font-medium border-b z-10">Estado</th>
                            <th className="sticky top-0 bg-muted p-4 font-medium border-b z-10">Ciudad</th>
                            <th className="sticky top-0 bg-muted p-4 font-medium border-b z-10">Dirección</th>
                            <th className="sticky top-0 bg-muted p-4 font-medium border-b z-10">Urbanización</th>
                            <th className="sticky top-0 bg-muted p-4 font-medium border-b z-10">Referencia</th>
                            <th className="sticky top-0 bg-muted p-4 font-medium border-b z-10">Categoria</th>
                            <th className="sticky top-0 bg-muted p-4 font-medium border-b z-10">Producto</th>
                            <th className="sticky top-0 bg-muted p-4 font-medium border-b z-10">SKU</th>
                            <th className="sticky top-0 bg-muted p-4 font-medium border-b z-10">Cantidad</th>
                            <th className="sticky top-0 bg-muted p-4 font-medium border-b z-10">Banco</th>
                            <th className="sticky top-0 bg-muted p-4 font-medium border-b z-10">Pago Inicial USD</th>
                            <th className="sticky top-0 bg-muted p-4 font-medium border-b z-10">Total USD</th>
                            {Array.from({ length: maxInstallments }).map((_, i) => (
                              <th key={i} className="sticky top-0 bg-muted p-4 font-medium border-b z-10">Pago Cuota USD</th>
                            ))}
                            <th className="sticky top-0 bg-muted p-4 font-medium border-b z-10">Pendiente</th>
                            <th className="sticky top-0 bg-muted p-4 font-medium border-b z-10">Canal</th>
                            <th className="sticky top-0 bg-muted p-4 font-medium border-b z-10">Asesor</th>
                            <th className="sticky top-0 bg-muted p-4 font-medium border-b z-10">Flete</th>
                            <th className="sticky top-0 bg-muted p-4 font-medium border-b z-10">Tipo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.map((row, index) => (
                            <tr key={index} className="border-b hover:bg-muted/50" data-testid={`row-perdidas-${index}`}>
                              <td className="p-4">{row.orden}</td>
                              <td className="p-4">{formatDate(row.fecha)}</td>
                              <td className="p-4">{row.notas || '-'}</td>
                              <td className="p-4">{formatDate(row.fechaEntrega)}</td>
                              <td className="p-4">{row.estadoEntrega}</td>
                              <td className="p-4">{row.nombre}</td>
                              <td className="p-4">{row.telefono || '-'}</td>
                              <td className="p-4">{row.cedula || '-'}</td>
                              <td className="p-4">{row.email || '-'}</td>
                              <td className="p-4">{row.estado || '-'}</td>
                              <td className="p-4">{row.ciudad || '-'}</td>
                              <td className="p-4">{row.direccion || '-'}</td>
                              <td className="p-4">{row.urbanizacion || '-'}</td>
                              <td className="p-4">{row.referencia || '-'}</td>
                              <td className="p-4">{row.categoria || '-'}</td>
                              <td className="p-4">{row.producto}</td>
                              <td className="p-4">{row.sku || '-'}</td>
                              <td className="p-4">{row.cantidad}</td>
                              <td className="p-4">{row.banco || '-'}</td>
                              <td className="p-4">{row.pagoInicialUsd.toFixed(2)}</td>
                              <td className="p-4">{row.totalUsd.toFixed(2)}</td>
                              {Array.from({ length: maxInstallments }).map((_, i) => {
                                const installment = row.installments.find(inst => inst.installmentNumber === i + 1);
                                return (
                                  <td key={i} className="p-4">
                                    {installment ? installment.pagoCuotaUsd.toFixed(2) : '-'}
                                  </td>
                                );
                              })}
                              <td className="p-4">{row.pendiente.toFixed(2)}</td>
                              <td className="p-4">{row.canal}</td>
                              <td className="p-4">{row.asesor || '-'}</td>
                              <td className="p-4">{row.flete.toFixed(2)}</td>
                              <td className="p-4">{row.tipo || '-'}</td>
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
