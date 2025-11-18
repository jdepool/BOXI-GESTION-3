import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Shield, Package, Upload, X, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";

type Inventario = {
  id: string;
  almacen: string;
  producto: string;
  sku: string | null;
  stockActual: number;
  stockReservado: number;
  stockMinimo: number;
  costoUnitario: number | null;
  precio: number | null;
  fechaActualizacion?: string | null;
};

type UploadResult = {
  success: boolean;
  created: number;
  updated: number;
  failed: number;
  failedRows: Array<{ rowIndex: number; sku: string; almacen: string; error: string }>;
  totalProcessed: number;
};

export default function GuestInventario() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [token, setToken] = useState<string | null>(null);
  const [productoFilter, setProductoFilter] = useState("");
  const [skuFilter, setSkuFilter] = useState("");
  const [selectedInventario, setSelectedInventario] = useState<Inventario | null>(null);
  const [formData, setFormData] = useState({
    stockActual: 0,
    stockReservado: 0,
    stockMinimo: 0,
  });
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [showUploadResult, setShowUploadResult] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get("token");
    if (!tokenParam) {
      toast({
        title: "Error de Acceso",
        description: "Token de acceso no proporcionado",
        variant: "destructive",
      });
      navigate("/");
      return;
    }
    setToken(tokenParam);
  }, [navigate, toast]);

  // Fetch inventario data using guest token with filters
  const { data: inventarioData, isLoading } = useQuery<{ data: Inventario[] }>({
    queryKey: ["/api/guest/inventario", { producto: productoFilter, sku: skuFilter }],
    enabled: !!token,
    queryFn: async () => {
      const url = new URL("/api/guest/inventario", window.location.origin);
      if (productoFilter) {
        url.searchParams.set("producto", productoFilter);
      }
      if (skuFilter) {
        url.searchParams.set("sku", skuFilter);
      }
      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch inventario data");
      }
      return response.json();
    },
  });

  // Update inventario mutation
  const updateInventarioMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Inventario> }) => {
      const response = await fetch(`/api/guest/inventario/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update inventario");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/guest/inventario"] });
      toast({
        title: "Actualizado",
        description: "El inventario ha sido actualizado exitosamente.",
      });
      setSelectedInventario(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el inventario",
        variant: "destructive",
      });
    },
  });

  // Upload inventario mutation
  const uploadInventarioMutation = useMutation({
    mutationFn: async (records: any[]) => {
      const response = await fetch("/api/guest/inventario/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ records }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to upload inventario");
      }
      return response.json();
    },
    onSuccess: (data: UploadResult) => {
      queryClient.invalidateQueries({ queryKey: ["/api/guest/inventario"] });
      setUploadResult(data);
      setShowUploadResult(true);
      
      if (data.failed === 0) {
        toast({
          title: "Carga Exitosa",
          description: `${data.created} registros creados, ${data.updated} actualizados`,
        });
      } else {
        toast({
          title: "Carga Completada con Errores",
          description: `${data.failed} de ${data.totalProcessed} registros fallaron`,
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo cargar el archivo",
        variant: "destructive",
      });
    },
  });

  const handleEditInventario = (inventario: Inventario) => {
    setSelectedInventario(inventario);
    setFormData({
      stockActual: inventario.stockActual,
      stockReservado: inventario.stockReservado,
      stockMinimo: inventario.stockMinimo,
    });
  };

  const handleSaveInventario = () => {
    if (!selectedInventario) return;
    updateInventarioMutation.mutate({
      id: selectedInventario.id,
      data: formData,
    });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

        // Transform to expected format
        const records = jsonData.map(row => ({
          sku: row.SKU || row.sku || '',
          almacen: row.Almacen || row.almacen || row.Almacén || '',
          stockActual: parseInt(row['Stock Actual'] || row.stockActual || row.stock_actual || '0'),
          stockReservado: parseInt(row['Stock Reservado'] || row.stockReservado || row.stock_reservado || '0'),
          stockMinimo: parseInt(row['Stock Minimo'] || row['Stock Mínimo'] || row.stockMinimo || row.stock_minimo || '0'),
        }));

        uploadInventarioMutation.mutate(records);
      } catch (error) {
        toast({
          title: "Error",
          description: "No se pudo leer el archivo Excel",
          variant: "destructive",
        });
      }
    };
    reader.readAsArrayBuffer(file);
    
    // Reset file input
    event.target.value = '';
  };

  const clearFilters = () => {
    setProductoFilter("");
    setSkuFilter("");
  };

  const getStatusBadge = (disponible: number, minimo: number) => {
    if (disponible === 0) {
      return <Badge variant="destructive" data-testid="badge-sin-existencia">Sin Existencia</Badge>;
    } else if (disponible <= minimo) {
      return <Badge className="bg-yellow-500 dark:bg-yellow-600" data-testid="badge-critico">Crítico</Badge>;
    } else {
      return <Badge className="bg-green-600 dark:bg-green-700" data-testid="badge-activo">Activo</Badge>;
    }
  };

  if (!token) {
    return null;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Guest Mode Banner */}
      <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-950">
        <Shield className="h-4 w-4" />
        <AlertTitle>Modo Invitado - Inventario</AlertTitle>
        <AlertDescription>
          Estás usando acceso de invitado con permisos limitados. Puedes editar niveles de stock pero no costos ni precios.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Inventario</CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => document.getElementById('excel-upload')?.click()}
                disabled={uploadInventarioMutation.isPending}
                data-testid="button-upload-excel"
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploadInventarioMutation.isPending ? "Subiendo..." : "Cargar Excel"}
              </Button>
              <input
                id="excel-upload"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label>Filtrar por Producto</Label>
              <Input
                placeholder="Nombre del producto..."
                value={productoFilter}
                onChange={(e) => setProductoFilter(e.target.value)}
                data-testid="input-filter-producto"
              />
            </div>
            <div>
              <Label>Filtrar por SKU</Label>
              <Input
                placeholder="SKU..."
                value={skuFilter}
                onChange={(e) => setSkuFilter(e.target.value)}
                data-testid="input-filter-sku"
              />
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={clearFilters}
                disabled={!productoFilter && !skuFilter}
                data-testid="button-clear-filters"
              >
                <X className="h-4 w-4 mr-2" />
                Limpiar Filtros
              </Button>
            </div>
          </div>

          {/* Excel Format Hint */}
          <Alert className="mb-4">
            <FileSpreadsheet className="h-4 w-4" />
            <AlertTitle>Formato del Excel</AlertTitle>
            <AlertDescription>
              El archivo debe tener las columnas: <strong>SKU</strong>, <strong>Almacen</strong>, <strong>Stock Actual</strong>, <strong>Stock Reservado</strong> (opcional), <strong>Stock Minimo</strong> (opcional)
            </AlertDescription>
          </Alert>

          {isLoading ? (
            <div className="text-center py-8">Cargando...</div>
          ) : !inventarioData || inventarioData.data.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No se encontró inventario
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead>Almacén</TableHead>
                    <TableHead className="text-right">Stock Actual</TableHead>
                    <TableHead className="text-right">Reservado</TableHead>
                    <TableHead className="text-right">Disponible</TableHead>
                    <TableHead className="text-right">Stock Mínimo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Última Modificación</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventarioData.data.map((item) => {
                    const stockDisponible = item.stockActual - (item.stockReservado ?? 0);
                    const fechaMod = item.fechaActualizacion 
                      ? new Date(item.fechaActualizacion).toLocaleString('es-VE', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : '-';
                    return (
                      <TableRow 
                        key={item.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleEditInventario(item)}
                        data-testid={`row-inventario-${item.id}`}
                      >
                        <TableCell className="font-medium" data-testid={`text-sku-${item.id}`}>
                          {item.sku || "-"}
                        </TableCell>
                        <TableCell data-testid={`text-producto-${item.id}`}>
                          {item.producto}
                        </TableCell>
                        <TableCell data-testid={`text-almacen-${item.id}`}>
                          {item.almacen}
                        </TableCell>
                        <TableCell className="text-right" data-testid={`text-stock-actual-${item.id}`}>
                          {item.stockActual}
                        </TableCell>
                        <TableCell className="text-right" data-testid={`text-stock-reservado-${item.id}`}>
                          {item.stockReservado ?? 0}
                        </TableCell>
                        <TableCell className="text-right font-bold" data-testid={`text-disponible-${item.id}`}>
                          {stockDisponible}
                        </TableCell>
                        <TableCell className="text-right" data-testid={`text-stock-minimo-${item.id}`}>
                          {item.stockMinimo ?? 0}
                        </TableCell>
                        <TableCell data-testid={`badge-estado-${item.id}`}>
                          {getStatusBadge(stockDisponible, item.stockMinimo ?? 0)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground" data-testid={`text-fecha-actualizacion-${item.id}`}>
                          {fechaMod}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!selectedInventario} onOpenChange={(open) => !open && setSelectedInventario(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Inventario</DialogTitle>
          </DialogHeader>
          {selectedInventario && (
            <div className="space-y-4">
              <div>
                <Label>Almacén</Label>
                <Input value={selectedInventario.almacen} disabled />
              </div>
              <div>
                <Label>Producto</Label>
                <Input value={selectedInventario.producto} disabled />
              </div>
              <div>
                <Label>SKU</Label>
                <Input value={selectedInventario.sku || "-"} disabled />
              </div>
              <div>
                <Label>Stock Actual</Label>
                <Input
                  type="number"
                  value={formData.stockActual}
                  onChange={(e) => setFormData({ ...formData, stockActual: parseInt(e.target.value) || 0 })}
                  data-testid="input-stock-actual"
                />
              </div>
              <div>
                <Label>Stock Reservado</Label>
                <Input
                  type="number"
                  value={formData.stockReservado}
                  onChange={(e) => setFormData({ ...formData, stockReservado: parseInt(e.target.value) || 0 })}
                  data-testid="input-stock-reservado"
                />
              </div>
              <div>
                <Label>Stock Mínimo</Label>
                <Input
                  type="number"
                  value={formData.stockMinimo}
                  onChange={(e) => setFormData({ ...formData, stockMinimo: parseInt(e.target.value) || 0 })}
                  data-testid="input-stock-minimo"
                />
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground">
                  Nota: Los costos y precios no pueden ser editados en modo invitado.
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSelectedInventario(null)}
              data-testid="button-cancel"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveInventario}
              disabled={updateInventarioMutation.isPending}
              data-testid="button-save"
            >
              {updateInventarioMutation.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Result Dialog */}
      <Dialog open={showUploadResult} onOpenChange={setShowUploadResult}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Resultado de la Carga</DialogTitle>
          </DialogHeader>
          {uploadResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6 text-center">
                    <div className="text-2xl font-bold text-green-600">{uploadResult.created}</div>
                    <div className="text-sm text-muted-foreground">Creados</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <div className="text-2xl font-bold text-blue-600">{uploadResult.updated}</div>
                    <div className="text-sm text-muted-foreground">Actualizados</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <div className="text-2xl font-bold text-red-600">{uploadResult.failed}</div>
                    <div className="text-sm text-muted-foreground">Fallidos</div>
                  </CardContent>
                </Card>
              </div>

              {uploadResult.failedRows && uploadResult.failedRows.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Errores:</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fila</TableHead>
                          <TableHead>SKU</TableHead>
                          <TableHead>Almacén</TableHead>
                          <TableHead>Error</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {uploadResult.failedRows.map((row, index) => (
                          <TableRow key={index}>
                            <TableCell>{row.rowIndex}</TableCell>
                            <TableCell>{row.sku}</TableCell>
                            <TableCell>{row.almacen}</TableCell>
                            <TableCell className="text-red-600">{row.error}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setShowUploadResult(false)} data-testid="button-close-result">
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
