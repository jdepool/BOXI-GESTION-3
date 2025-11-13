import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Box, Package, TrendingDown, Warehouse, AlertTriangle, Upload, FileSpreadsheet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import * as XLSX from "xlsx";

export default function Inventario() {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Inventario" />
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto p-6">
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
                <DashboardTab />
              </TabsContent>

              <TabsContent value="registrar-despacho">
                <RegistrarDespachoTab />
              </TabsContent>

              <TabsContent value="analisis-salidas">
                <AnalisisSalidasTab />
              </TabsContent>

              <TabsContent value="gestionar-almacenes">
                <GestionarAlmacenesTab />
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}

function DashboardTab() {
  const [searchTerm, setSearchTerm] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadTab, setUploadTab] = useState<"manual" | "excel">("manual");
  const { toast } = useToast();

  const { data: inventory = [], isLoading } = useQuery({
    queryKey: ["/api/inventario/dashboard"],
  });

  const filteredInventory = inventory.filter((item: any) =>
    item.productoSku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.productoNombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.almacenNombre?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (disponible: number, minimo: number) => {
    if (disponible <= 0) {
      return <Badge variant="destructive" data-testid={`badge-sin-stock`}>Sin Stock</Badge>;
    } else if (disponible <= minimo) {
      return <Badge className="bg-amber-500" data-testid={`badge-stock-bajo`}>Stock Bajo</Badge>;
    } else {
      return <Badge className="bg-green-600" data-testid={`badge-normal`}>Normal</Badge>;
    }
  };

  const totalProducts = inventory.length;
  const lowStock = inventory.filter((item: any) => {
    const stockDisponible = item.stockActual - (item.stockReservado ?? 0);
    return stockDisponible > 0 && stockDisponible <= item.stockMinimo;
  }).length;
  const outOfStock = inventory.filter((item: any) => {
    const stockDisponible = item.stockActual - (item.stockReservado ?? 0);
    return stockDisponible <= 0;
  }).length;

  return (
    <div className="space-y-6">
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

      <Card>
        <CardHeader>
          <CardTitle>Inventario</CardTitle>
          <CardDescription>Vista general del stock en todos los almacenes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center justify-between gap-4">
            <Input
              placeholder="Buscar por SKU, producto o almacén..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              data-testid="input-search"
              className="flex-1"
            />
            <Button 
              onClick={() => setUploadOpen(true)}
              data-testid="button-cargar-inventario"
            >
              <Upload className="h-4 w-4 mr-2" />
              Cargar Inventario
            </Button>
          </div>
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">Cargando...</TableCell>
                  </TableRow>
                ) : filteredInventory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">No hay datos de inventario</TableCell>
                  </TableRow>
                ) : (
                  filteredInventory.map((item: any) => {
                    const stockDisponible = item.stockActual - (item.stockReservado ?? 0);
                    return (
                      <TableRow key={item.id} data-testid={`row-inventory-${item.id}`}>
                        <TableCell className="font-medium">{item.productoSku}</TableCell>
                        <TableCell>{item.productoNombre}</TableCell>
                        <TableCell>{item.almacenNombre}</TableCell>
                        <TableCell className="text-right">{item.stockActual}</TableCell>
                        <TableCell className="text-right">{item.stockReservado ?? 0}</TableCell>
                        <TableCell className="text-right font-bold">{stockDisponible}</TableCell>
                        <TableCell className="text-right">{item.stockMinimo ?? 0}</TableCell>
                        <TableCell>{getStatusBadge(stockDisponible, item.stockMinimo ?? 0)}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <CargarInventarioDialog 
        open={uploadOpen} 
        onOpenChange={setUploadOpen}
        uploadTab={uploadTab}
        setUploadTab={setUploadTab}
      />
    </div>
  );
}

function CargarInventarioDialog({ 
  open, 
  onOpenChange, 
  uploadTab, 
  setUploadTab 
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  uploadTab: "manual" | "excel";
  setUploadTab: (tab: "manual" | "excel") => void;
}) {
  const { toast } = useToast();
  
  // Manual entry states
  const [selectedProducto, setSelectedProducto] = useState("");
  const [selectedAlmacen, setSelectedAlmacen] = useState("");
  const [stockActual, setStockActual] = useState("");
  const [stockReservado, setStockReservado] = useState("");
  const [stockMinimo, setStockMinimo] = useState("");
  
  // Excel upload states
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [uploadSummary, setUploadSummary] = useState<{
    created: number;
    updated: number;
    failedCount: number;
    failedRows: Array<{ rowIndex: number; sku: string; almacen: string; error: string }>;
  } | null>(null);
  
  // Fetch productos and almacenes
  const { data: productos = [] } = useQuery({
    queryKey: ["/api/productos"],
  });
  
  const { data: almacenes = [] } = useQuery({
    queryKey: ["/api/inventario/almacenes"],
  });
  
  // Manual entry mutation
  const manualMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/inventario/upload", {
        records: [data]
      });
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Stock actualizado",
        description: `${data.created} registros creados, ${data.updated} actualizados`,
      });
      // Reset form
      setSelectedProducto("");
      setSelectedAlmacen("");
      setStockActual("");
      setStockReservado("");
      setStockMinimo("");
      queryClient.invalidateQueries({ queryKey: ["/api/inventario"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventario/dashboard"] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Excel upload mutation
  const excelMutation = useMutation({
    mutationFn: async (records: any[]) => {
      const res = await apiRequest("POST", "/api/inventario/upload", { records });
      return await res.json();
    },
    onSuccess: (data) => {
      setUploadSummary(data);
      queryClient.invalidateQueries({ queryKey: ["/api/inventario"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventario/dashboard"] });
      setExcelFile(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error al procesar archivo",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const producto = productos.find((p: any) => p.id === selectedProducto);
    const almacen = almacenes.find((a: any) => a.id === selectedAlmacen);
    
    if (!producto || !almacen) {
      toast({
        title: "Error",
        description: "Seleccione producto y almacén",
        variant: "destructive",
      });
      return;
    }
    
    manualMutation.mutate({
      sku: producto.sku,
      almacen: almacen.nombre,
      stockActual: parseFloat(stockActual) || 0,
      stockReservado: stockReservado ? parseFloat(stockReservado) : undefined,
      stockMinimo: stockMinimo ? parseFloat(stockMinimo) : undefined,
    });
  };
  
  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setExcelFile(file);
    setUploadSummary(null);
    
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);
      
      // Map Excel columns to API format
      const records = jsonData.map((row) => ({
        sku: row["SKU"] || row["sku"] || "",
        almacen: row["Almacén"] || row["Almacen"] || row["almacen"] || "",
        stockActual: row["Stock Actual"] || row["Stock_Actual"] || row["stockActual"] || 0,
        stockReservado: row["Stock Reservado"] || row["Stock_Reservado"] || row["stockReservado"],
        stockMinimo: row["Stock Mínimo"] || row["Stock_Minimo"] || row["stockMinimo"],
      }));
      
      if (records.length === 0) {
        toast({
          title: "Error",
          description: "El archivo está vacío o no tiene el formato correcto",
          variant: "destructive",
        });
        return;
      }
      
      excelMutation.mutate(records);
    } catch (error) {
      toast({
        title: "Error al leer archivo",
        description: "Verifique que el archivo tenga el formato correcto",
        variant: "destructive",
      });
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cargar Inventario</DialogTitle>
        </DialogHeader>
        
        <Tabs value={uploadTab} onValueChange={(v) => setUploadTab(v as "manual" | "excel")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual" data-testid="tab-carga-manual">Carga Manual</TabsTrigger>
            <TabsTrigger value="excel" data-testid="tab-importar-excel">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Importar Excel
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="manual" className="space-y-4">
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="producto">Producto *</Label>
                <Select value={selectedProducto} onValueChange={setSelectedProducto}>
                  <SelectTrigger id="producto" data-testid="select-producto">
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
              
              <div className="space-y-2">
                <Label htmlFor="almacen">Almacén *</Label>
                <Select value={selectedAlmacen} onValueChange={setSelectedAlmacen}>
                  <SelectTrigger id="almacen" data-testid="select-almacen">
                    <SelectValue placeholder="Seleccione un almacén" />
                  </SelectTrigger>
                  <SelectContent>
                    {almacenes.map((a: any) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="stockActual">Stock Actual *</Label>
                  <Input
                    id="stockActual"
                    type="number"
                    min="0"
                    step="1"
                    value={stockActual}
                    onChange={(e) => setStockActual(e.target.value)}
                    placeholder="0"
                    data-testid="input-stock-actual"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="stockReservado">Stock Reservado</Label>
                  <Input
                    id="stockReservado"
                    type="number"
                    min="0"
                    step="1"
                    value={stockReservado}
                    onChange={(e) => setStockReservado(e.target.value)}
                    placeholder="0"
                    data-testid="input-stock-reservado"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="stockMinimo">Stock Mínimo</Label>
                  <Input
                    id="stockMinimo"
                    type="number"
                    min="0"
                    step="1"
                    value={stockMinimo}
                    onChange={(e) => setStockMinimo(e.target.value)}
                    placeholder="0"
                    data-testid="input-stock-minimo"
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => onOpenChange(false)}
                  data-testid="button-cancelar-manual"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={manualMutation.isPending}
                  data-testid="button-guardar-manual"
                >
                  {manualMutation.isPending ? "Guardando..." : "Guardar"}
                </Button>
              </div>
            </form>
          </TabsContent>
          
          <TabsContent value="excel" className="space-y-4">
            <div className="rounded-lg border p-4 bg-muted/50">
              <h4 className="font-medium mb-2">Formato del archivo Excel</h4>
              <p className="text-sm text-muted-foreground mb-2">El archivo debe contener las siguientes columnas:</p>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li><strong>SKU</strong> (requerido): Código del producto</li>
                <li><strong>Almacén</strong> (requerido): Nombre del almacén</li>
                <li><strong>Stock Actual</strong> (requerido): Cantidad en stock</li>
                <li><strong>Stock Reservado</strong> (opcional): Cantidad reservada</li>
                <li><strong>Stock Mínimo</strong> (opcional): Cantidad mínima</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="excelFile">Seleccionar archivo Excel</Label>
              <Input
                id="excelFile"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleExcelUpload}
                data-testid="input-excel-file"
              />
            </div>
            
            {excelMutation.isPending && (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">Procesando archivo...</p>
              </div>
            )}
            
            {uploadSummary && (
              <div className="space-y-3">
                <div className="rounded-lg border p-4 bg-green-50 dark:bg-green-950">
                  <h4 className="font-medium mb-2">Resultado de la carga</h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Creados</p>
                      <p className="text-lg font-bold">{uploadSummary.created}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Actualizados</p>
                      <p className="text-lg font-bold">{uploadSummary.updated}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Errores</p>
                      <p className="text-lg font-bold text-destructive">{uploadSummary.failedCount}</p>
                    </div>
                  </div>
                </div>
                
                {uploadSummary.failedRows.length > 0 && (
                  <div className="rounded-lg border p-4 bg-red-50 dark:bg-red-950">
                    <h4 className="font-medium mb-2 text-destructive">Registros con errores</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {uploadSummary.failedRows.map((row, idx) => (
                        <div key={idx} className="text-sm p-2 bg-background rounded">
                          <p><strong>Fila {row.rowIndex}:</strong> {row.sku} - {row.almacen}</p>
                          <p className="text-destructive">{row.error}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="flex justify-end">
                  <Button 
                    onClick={() => {
                      setUploadSummary(null);
                      onOpenChange(false);
                    }}
                    data-testid="button-cerrar-resumen"
                  >
                    Cerrar
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function RegistrarDespachoTab() {
  const { toast } = useToast();
  const [orderNumber, setOrderNumber] = useState("");
  const [fecha, setFecha] = useState("");
  const [almacenId, setAlmacenId] = useState("");

  const { data: almacenes = [] } = useQuery({
    queryKey: ["/api/inventario/almacenes"],
  });

  const despachoMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/inventario/dispatch", data);
    },
    onSuccess: () => {
      toast({
        title: "Despacho registrado",
        description: "El inventario ha sido actualizado correctamente",
      });
      setOrderNumber("");
      setFecha("");
      setAlmacenId("");
      queryClient.invalidateQueries({ queryKey: ["/api/inventario/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventario/movements"] });
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

function AnalisisSalidasTab() {
  const { data: movements = [], isLoading } = useQuery({
    queryKey: ["/api/inventario/movements"],
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

function GestionarAlmacenesTab() {
  const { toast } = useToast();
  const [nombre, setNombre] = useState("");

  const { data: almacenes = [] } = useQuery({
    queryKey: ["/api/inventario/almacenes"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/inventario/almacenes", data);
    },
    onSuccess: () => {
      toast({
        title: "Almacén creado",
        description: "El almacén ha sido creado exitosamente",
      });
      setNombre("");
      queryClient.invalidateQueries({ queryKey: ["/api/inventario/almacenes"] });
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
    if (!nombre.trim()) {
      toast({
        title: "Error",
        description: "El nombre del almacén es requerido",
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate({ nombre, activo: true });
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Crear Almacén</CardTitle>
            <CardDescription>Agregar un nuevo almacén al sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre del Almacén</Label>
                <Input
                  id="nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Almacén Principal"
                  data-testid="input-nombre-almacen"
                />
              </div>
              <Button 
                type="submit" 
                disabled={createMutation.isPending}
                data-testid="button-create-almacen"
              >
                {createMutation.isPending ? "Creando..." : "Crear Almacén"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Almacenes Activos</CardTitle>
            <CardDescription>Lista de almacenes registrados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {almacenes.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay almacenes registrados</p>
              ) : (
                almacenes.map((alm: any) => (
                  <div 
                    key={alm.id} 
                    className="flex items-center gap-2 p-2 rounded border"
                    data-testid={`almacen-${alm.id}`}
                  >
                    <Warehouse className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1">{alm.nombre}</span>
                    <Badge variant={alm.activo ? "default" : "secondary"}>
                      {alm.activo ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
