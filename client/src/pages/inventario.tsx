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
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Box, Package, TrendingDown, Warehouse, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

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

  const { data: inventory = [], isLoading } = useQuery({
    queryKey: ["/api/inventory/dashboard"],
  });

  const filteredInventory = inventory.filter((item: any) =>
    item.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.nombreProducto?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.nombreAlmacen?.toLowerCase().includes(searchTerm.toLowerCase())
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
  const lowStock = inventory.filter((item: any) => item.stockDisponible > 0 && item.stockDisponible <= item.stockMinimo).length;
  const outOfStock = inventory.filter((item: any) => item.stockDisponible <= 0).length;

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
          <div className="mb-4">
            <Input
              placeholder="Buscar por SKU, producto o almacén..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              data-testid="input-search"
            />
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
                  filteredInventory.map((item: any) => (
                    <TableRow key={item.id} data-testid={`row-inventory-${item.id}`}>
                      <TableCell className="font-medium">{item.sku}</TableCell>
                      <TableCell>{item.nombreProducto}</TableCell>
                      <TableCell>{item.nombreAlmacen}</TableCell>
                      <TableCell className="text-right">{item.stockActual}</TableCell>
                      <TableCell className="text-right">{item.stockReservado}</TableCell>
                      <TableCell className="text-right font-bold">{item.stockDisponible}</TableCell>
                      <TableCell className="text-right">{item.stockMinimo}</TableCell>
                      <TableCell>{getStatusBadge(item.stockDisponible, item.stockMinimo)}</TableCell>
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

function RegistrarDespachoTab() {
  const { toast } = useToast();
  const [orderNumber, setOrderNumber] = useState("");
  const [fecha, setFecha] = useState("");
  const [almacenId, setAlmacenId] = useState("");

  const { data: almacenes = [] } = useQuery({
    queryKey: ["/api/inventory/almacenes"],
  });

  const despachoMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("/api/inventory/dispatch", "POST", data);
    },
    onSuccess: () => {
      toast({
        title: "Despacho registrado",
        description: "El inventario ha sido actualizado correctamente",
      });
      setOrderNumber("");
      setFecha("");
      setAlmacenId("");
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/movements"] });
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
    queryKey: ["/api/inventory/movements"],
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
    queryKey: ["/api/inventory/almacenes"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("/api/inventory/almacenes", "POST", data);
    },
    onSuccess: () => {
      toast({
        title: "Almacén creado",
        description: "El almacén ha sido creado exitosamente",
      });
      setNombre("");
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/almacenes"] });
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
