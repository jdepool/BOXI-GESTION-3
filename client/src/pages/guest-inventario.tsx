import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Shield, Package, Upload, X, FileSpreadsheet, TrendingDown, AlertTriangle, Box } from "lucide-react";
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
          Estás usando acceso de invitado con permisos limitados. Puedes gestionar inventario pero no costos ni precios.
        </AlertDescription>
      </Alert>

      <div className="mb-6">
        <div className="flex items-center gap-3">
          <Box className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Inventario</h1>
            <p className="text-muted-foreground">
              Gestión de stock, despachos y movimientos de almacén
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="dashboard" data-testid="tab-dashboard">
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="registrar-despacho" data-testid="tab-registrar-despacho">
            Registrar Despacho
          </TabsTrigger>
          <TabsTrigger value="analisis-salidas" data-testid="tab-analisis-salidas">
            Análisis de Salidas
          </TabsTrigger>
          <TabsTrigger value="gestionar-almacenes" data-testid="tab-gestionar-almacenes">
            Gestionar Almacenes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <DashboardTab token={token} />
        </TabsContent>

        <TabsContent value="registrar-despacho">
          <RegistrarDespachoTab token={token} />
        </TabsContent>

        <TabsContent value="analisis-salidas">
          <AnalisisSalidasTab token={token} />
        </TabsContent>

        <TabsContent value="gestionar-almacenes">
          <GestionarAlmacenesTab token={token} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Dashboard Tab Component
function DashboardTab({ token }: { token: string }) {
  const { toast } = useToast();
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

  // Fetch inventario data
  const { data: inventarioData, isLoading } = useQuery<{ data: Inventario[] }>({
    queryKey: ["/api/guest/inventario", { producto: productoFilter, sku: skuFilter }],
    queryFn: async () => {
      const url = new URL("/api/guest/inventario", window.location.origin);
      if (productoFilter) url.searchParams.set("producto", productoFilter);
      if (skuFilter) url.searchParams.set("sku", skuFilter);
      const response = await fetch(url.toString(), {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch inventario data");
      return response.json();
    },
  });

  const inventory = inventarioData?.data || [];
  const totalProducts = inventory.length;
  const lowStock = inventory.filter((item: Inventario) => {
    const disponible = item.stockActual - (item.stockReservado ?? 0);
    return disponible > 0 && disponible <= item.stockMinimo;
  }).length;
  const outOfStock = inventory.filter((item: Inventario) => {
    const disponible = item.stockActual - (item.stockReservado ?? 0);
    return disponible <= 0;
  }).length;

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

  // Upload mutation
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
    event.target.value = '';
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

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Productos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="total-productos">{totalProducts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Bajo</CardTitle>
            <TrendingDown className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500" data-testid="stock-bajo-count">{lowStock}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sin Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive" data-testid="sin-stock-count">{outOfStock}</div>
          </CardContent>
        </Card>
      </div>

      {/* Inventory Table */}
      <Card>
        <CardHeader>
          <CardTitle>Inventario</CardTitle>
          <CardDescription>Vista general del stock en todos los almacenes</CardDescription>
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
            <div className="flex items-end gap-2">
              <Button
                variant="outline"
                onClick={() => { setProductoFilter(""); setSkuFilter(""); }}
                disabled={!productoFilter && !skuFilter}
                data-testid="button-clear-filters"
              >
                <X className="h-4 w-4 mr-2" />
                Limpiar
              </Button>
              <Button
                variant="outline"
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

          {/* Excel Format Hint */}
          <Alert className="mb-4">
            <FileSpreadsheet className="h-4 w-4" />
            <AlertTitle>Formato del Excel</AlertTitle>
            <AlertDescription>
              El archivo debe tener las columnas: <strong>SKU</strong>, <strong>Almacen</strong>, <strong>Stock Actual</strong>, <strong>Stock Reservado</strong> (opcional), <strong>Stock Minimo</strong> (opcional)
            </AlertDescription>
          </Alert>

          <div className="rounded-md border">
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
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center">Cargando...</TableCell>
                  </TableRow>
                ) : inventory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center">No se encontró inventario</TableCell>
                  </TableRow>
                ) : (
                  inventory.map((item) => {
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
                        onClick={() => {
                          setSelectedInventario(item);
                          setFormData({
                            stockActual: item.stockActual,
                            stockReservado: item.stockReservado,
                            stockMinimo: item.stockMinimo,
                          });
                        }}
                        data-testid={`row-inventario-${item.id}`}
                      >
                        <TableCell className="font-medium" data-testid={`text-sku-${item.id}`}>
                          {item.sku || "-"}
                        </TableCell>
                        <TableCell data-testid={`text-producto-${item.id}`}>{item.producto}</TableCell>
                        <TableCell data-testid={`text-almacen-${item.id}`}>{item.almacen}</TableCell>
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
                  })
                )}
              </TableBody>
            </Table>
          </div>
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
              onClick={() => {
                if (selectedInventario) {
                  updateInventarioMutation.mutate({
                    id: selectedInventario.id,
                    data: formData,
                  });
                }
              }}
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

// Registrar Despacho Tab Component
function RegistrarDespachoTab({ token }: { token: string }) {
  const { toast } = useToast();
  const [orderNumber, setOrderNumber] = useState("");
  const [fecha, setFecha] = useState("");
  const [almacenId, setAlmacenId] = useState("");

  const { data: almacenes = [] } = useQuery({
    queryKey: ["/api/guest/inventario/almacenes"],
    queryFn: async () => {
      const response = await fetch("/api/guest/inventario/almacenes", {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch almacenes");
      return response.json();
    },
  });

  const despachoMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/guest/inventario/dispatch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to register dispatch");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Despacho registrado",
        description: "El inventario ha sido actualizado correctamente",
      });
      setOrderNumber("");
      setFecha("");
      setAlmacenId("");
      queryClient.invalidateQueries({ queryKey: ["/api/guest/inventario"] });
      queryClient.invalidateQueries({ queryKey: ["/api/guest/inventario/movements"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNumber || !fecha || !almacenId) {
      toast({
        title: "Error",
        description: "Todos los campos son requeridos",
        variant: "destructive",
      });
      return;
    }
    despachoMutation.mutate({ orderNumber, fecha, almacenId });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Registrar Despacho</CardTitle>
          <CardDescription>
            Registra un nuevo despacho para actualizar el inventario automáticamente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="orden">Número de Orden</Label>
                <Input
                  id="orden"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  placeholder="#30001"
                  data-testid="input-order-number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fecha">Fecha de Despacho</Label>
                <Input
                  id="fecha"
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  data-testid="input-fecha-despacho"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="almacen">Almacén</Label>
              <Select value={almacenId} onValueChange={setAlmacenId}>
                <SelectTrigger data-testid="select-almacen">
                  <SelectValue placeholder="Seleccionar almacén" />
                </SelectTrigger>
                <SelectContent>
                  {almacenes.map((alm: any) => (
                    <SelectItem key={alm.id} value={alm.id}>
                      {alm.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button 
              type="submit" 
              disabled={despachoMutation.isPending}
              data-testid="button-submit-despacho"
            >
              {despachoMutation.isPending ? "Procesando..." : "Registrar Despacho"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// Análisis de Salidas Tab Component
function AnalisisSalidasTab({ token }: { token: string }) {
  const { data: movements = [], isLoading } = useQuery({
    queryKey: ["/api/guest/inventario/movements"],
    queryFn: async () => {
      const response = await fetch("/api/guest/inventario/movements", {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch movements");
      return response.json();
    },
  });

  const salidas = movements.filter((m: any) => 
    m.tipo === 'salida' || m.tipo === 'despacho_automatico'
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Análisis de Salidas</CardTitle>
          <CardDescription>Historial de despachos y salidas de inventario</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Orden</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Almacén</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Notas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">Cargando...</TableCell>
                  </TableRow>
                ) : salidas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">No hay movimientos registrados</TableCell>
                  </TableRow>
                ) : (
                  salidas.map((mov: any) => (
                    <TableRow key={mov.id} data-testid={`row-movement-${mov.id}`}>
                      <TableCell>{mov.fecha}</TableCell>
                      <TableCell>{mov.ordenRelacionada || "-"}</TableCell>
                      <TableCell>{mov.nombreProducto}</TableCell>
                      <TableCell>{mov.nombreAlmacen}</TableCell>
                      <TableCell className="text-right">{mov.cantidad}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{mov.tipo}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{mov.notas || "-"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Gestionar Almacenes Tab Component
function GestionarAlmacenesTab({ token }: { token: string }) {
  const { toast } = useToast();
  const [selectedProducto, setSelectedProducto] = useState("");
  const [almacenOrigen, setAlmacenOrigen] = useState("");
  const [almacenDestino, setAlmacenDestino] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [fechaTransfer, setFechaTransfer] = useState(new Date().toISOString().split('T')[0]);
  const [notasTransfer, setNotasTransfer] = useState("");

  const { data: almacenes = [] } = useQuery({
    queryKey: ["/api/guest/inventario/almacenes"],
    queryFn: async () => {
      const response = await fetch("/api/guest/inventario/almacenes", {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch almacenes");
      return response.json();
    },
  });

  const { data: productos = [] } = useQuery({
    queryKey: ["/api/guest/productos"],
    queryFn: async () => {
      const response = await fetch("/api/productos");
      if (!response.ok) throw new Error("Failed to fetch productos");
      return response.json();
    },
  });

  const { data: transfers = [] } = useQuery({
    queryKey: ["/api/guest/inventario/transfer-history"],
    queryFn: async () => {
      const response = await fetch("/api/guest/inventario/transfer-history", {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch transfer history");
      return response.json();
    },
  });

  const transferMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/guest/inventario/transfer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to transfer stock");
      }
      return response.json();
    },
    onSuccess: (data) => {
      if (data.warning) {
        toast({
          title: "Transferencia completada con advertencia",
          description: data.warning,
        });
      } else {
        toast({
          title: "Transferencia completada",
          description: "El stock se ha transferido correctamente",
        });
      }
      setSelectedProducto("");
      setAlmacenOrigen("");
      setAlmacenDestino("");
      setCantidad("");
      setNotasTransfer("");
      queryClient.invalidateQueries({ queryKey: ["/api/guest/inventario"] });
      queryClient.invalidateQueries({ queryKey: ["/api/guest/inventario/transfer-history"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error en la transferencia",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedProducto || !almacenOrigen || !almacenDestino || !cantidad) {
      toast({
        title: "Error",
        description: "Todos los campos son requeridos",
        variant: "destructive",
      });
      return;
    }
    
    if (almacenOrigen === almacenDestino) {
      toast({
        title: "Error",
        description: "El almacén origen y destino deben ser diferentes",
        variant: "destructive",
      });
      return;
    }
    
    transferMutation.mutate({
      productoId: selectedProducto,
      almacenOrigenId: almacenOrigen,
      almacenDestinoId: almacenDestino,
      cantidad: parseFloat(cantidad),
      fecha: fechaTransfer,
      notas: notasTransfer || undefined,
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Transferir Stock entre Almacenes</CardTitle>
          <CardDescription>Mover productos de un almacén a otro</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleTransferSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="producto-transfer">Producto *</Label>
              <Select value={selectedProducto} onValueChange={setSelectedProducto}>
                <SelectTrigger id="producto-transfer" data-testid="select-producto-transfer">
                  <SelectValue placeholder="Seleccione un producto" />
                </SelectTrigger>
                <SelectContent>
                  {productos.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.sku} - {p.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="almacen-origen">Almacén Origen *</Label>
                <Select value={almacenOrigen} onValueChange={setAlmacenOrigen}>
                  <SelectTrigger id="almacen-origen" data-testid="select-almacen-origen">
                    <SelectValue placeholder="Seleccione origen" />
                  </SelectTrigger>
                  <SelectContent>
                    {almacenes.map((a: any) => (
                      <SelectItem key={a.id} value={a.id} disabled={a.id === almacenDestino}>
                        {a.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="almacen-destino">Almacén Destino *</Label>
                <Select value={almacenDestino} onValueChange={setAlmacenDestino}>
                  <SelectTrigger id="almacen-destino" data-testid="select-almacen-destino">
                    <SelectValue placeholder="Seleccione destino" />
                  </SelectTrigger>
                  <SelectContent>
                    {almacenes.map((a: any) => (
                      <SelectItem key={a.id} value={a.id} disabled={a.id === almacenOrigen}>
                        {a.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cantidad-transfer">Cantidad *</Label>
                <Input
                  id="cantidad-transfer"
                  type="number"
                  min="1"
                  step="1"
                  value={cantidad}
                  onChange={(e) => setCantidad(e.target.value)}
                  placeholder="0"
                  data-testid="input-cantidad-transfer"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="fecha-transfer">Fecha</Label>
                <Input
                  id="fecha-transfer"
                  type="date"
                  value={fechaTransfer}
                  onChange={(e) => setFechaTransfer(e.target.value)}
                  data-testid="input-fecha-transfer"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notas-transfer">Notas (opcional)</Label>
              <Input
                id="notas-transfer"
                value={notasTransfer}
                onChange={(e) => setNotasTransfer(e.target.value)}
                placeholder="Motivo de la transferencia..."
                data-testid="input-notas-transfer"
              />
            </div>
            
            <Button 
              type="submit" 
              disabled={transferMutation.isPending}
              data-testid="button-submit-transfer"
            >
              {transferMutation.isPending ? "Procesando..." : "Transferir Stock"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historial de Transferencias</CardTitle>
          <CardDescription>Últimas 20 transferencias realizadas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Desde</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead>Notas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transfers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">No hay transferencias registradas</TableCell>
                  </TableRow>
                ) : (
                  transfers.map((transfer: any) => (
                    <TableRow key={transfer.id}>
                      <TableCell>{transfer.fecha}</TableCell>
                      <TableCell>{transfer.productoNombre}</TableCell>
                      <TableCell>{transfer.almacenOrigen} → {transfer.almacenDestino}</TableCell>
                      <TableCell className="text-right">{transfer.cantidad}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{transfer.notas || "-"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
