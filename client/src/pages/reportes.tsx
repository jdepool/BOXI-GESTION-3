import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DateRangePicker } from "@/components/shared/date-range-picker";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Download } from "lucide-react";

interface ReporteOrdenesRow {
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

export default function Reportes() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Fetch report data
  const { data: reportData, isLoading } = useQuery<ReporteOrdenesRow[]>({
    queryKey: ["/api/reports/ordenes", startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const url = `/api/reports/ordenes?${params.toString()}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch report');
      return response.json();
    },
  });

  // Find max number of installments for table headers
  const maxInstallments = reportData 
    ? Math.max(...reportData.map(row => row.installments.length), 0)
    : 0;

  // Handle Excel download
  const handleDownload = () => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const url = `/api/reports/ordenes/download?${params.toString()}`;
    window.location.href = url;
  };

  // Extract date portion from ISO string
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
                <h1 className="text-3xl font-bold tracking-tight">Reporte de Ordenes</h1>
                <p className="text-muted-foreground">
                  Detalle completo de ventas con información de pagos y entregas
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
                    <i className="fas fa-inbox text-4xl mb-4"></i>
                    <p>No hay datos disponibles para el rango de fechas seleccionado</p>
                  </div>
                ) : (
                  <div className="max-h-[600px] overflow-auto border rounded-md">
                    <Table>
                      <TableHeader className="sticky top-0 bg-background z-10">
                        <TableRow>
                          <TableHead className="bg-muted">Orden</TableHead>
                          <TableHead className="bg-muted">Fecha</TableHead>
                          <TableHead className="bg-muted">Notas</TableHead>
                          <TableHead className="bg-muted">Fecha Entrega</TableHead>
                          <TableHead className="bg-muted">Estado Entrega</TableHead>
                          <TableHead className="bg-muted">Nombre</TableHead>
                          <TableHead className="bg-muted">Telefono</TableHead>
                          <TableHead className="bg-muted">Cedula</TableHead>
                          <TableHead className="bg-muted">Email</TableHead>
                          <TableHead className="bg-muted">Estado</TableHead>
                          <TableHead className="bg-muted">Ciudad</TableHead>
                          <TableHead className="bg-muted">Dirección</TableHead>
                          <TableHead className="bg-muted">Urbanización</TableHead>
                          <TableHead className="bg-muted">Referencia</TableHead>
                          <TableHead className="bg-muted">Categoria</TableHead>
                          <TableHead className="bg-muted">Producto</TableHead>
                          <TableHead className="bg-muted">SKU</TableHead>
                          <TableHead className="bg-muted">Cantidad</TableHead>
                          <TableHead className="bg-muted">Banco</TableHead>
                          <TableHead className="bg-muted">Pago Inicial USD</TableHead>
                          <TableHead className="bg-muted">Total USD</TableHead>
                          {Array.from({ length: maxInstallments }).map((_, i) => (
                            <TableHead key={i} className="bg-muted">Pago Cuota USD</TableHead>
                          ))}
                          <TableHead className="bg-muted">Pendiente</TableHead>
                          <TableHead className="bg-muted">Canal</TableHead>
                          <TableHead className="bg-muted">Asesor</TableHead>
                          <TableHead className="bg-muted">Flete</TableHead>
                          <TableHead className="bg-muted">Tipo</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.map((row, index) => (
                          <TableRow key={index} data-testid={`row-report-${index}`}>
                            <TableCell>{row.orden}</TableCell>
                            <TableCell>{formatDate(row.fecha)}</TableCell>
                            <TableCell>{row.notas || '-'}</TableCell>
                            <TableCell>{formatDate(row.fechaEntrega)}</TableCell>
                            <TableCell>{row.estadoEntrega}</TableCell>
                            <TableCell>{row.nombre}</TableCell>
                            <TableCell>{row.telefono || '-'}</TableCell>
                            <TableCell>{row.cedula || '-'}</TableCell>
                            <TableCell>{row.email || '-'}</TableCell>
                            <TableCell>{row.estado || '-'}</TableCell>
                            <TableCell>{row.ciudad || '-'}</TableCell>
                            <TableCell>{row.direccion || '-'}</TableCell>
                            <TableCell>{row.urbanizacion || '-'}</TableCell>
                            <TableCell>{row.referencia || '-'}</TableCell>
                            <TableCell>{row.categoria || '-'}</TableCell>
                            <TableCell>{row.producto}</TableCell>
                            <TableCell>{row.sku || '-'}</TableCell>
                            <TableCell>{row.cantidad}</TableCell>
                            <TableCell>{row.banco || '-'}</TableCell>
                            <TableCell>{row.pagoInicialUsd.toFixed(2)}</TableCell>
                            <TableCell>{row.totalUsd.toFixed(2)}</TableCell>
                            {Array.from({ length: maxInstallments }).map((_, i) => {
                              const installment = row.installments.find(inst => inst.installmentNumber === i + 1);
                              return (
                                <TableCell key={i}>
                                  {installment ? installment.pagoCuotaUsd.toFixed(2) : '-'}
                                </TableCell>
                              );
                            })}
                            <TableCell>{row.pendiente.toFixed(2)}</TableCell>
                            <TableCell>{row.canal}</TableCell>
                            <TableCell>{row.asesor || '-'}</TableCell>
                            <TableCell>{row.flete.toFixed(2)}</TableCell>
                            <TableCell>{row.tipo || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
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
