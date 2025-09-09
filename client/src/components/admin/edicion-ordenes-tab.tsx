import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Edit, Package, Calendar, DollarSign, Trash2, User, MapPin, Package2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Sale, Banco, MetodoPago, Producto } from "@shared/schema";

export function EdicionOrdenesTab() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Sale | null>(null);
  const [formData, setFormData] = useState({
    // Campos principales
    nombre: "",
    cedula: "",
    telefono: "",
    email: "",
    totalUsd: "",
    fecha: "",
    canal: "",
    estado: "",
    estadoEntrega: "",
    product: "",
    cantidad: "",
    
    // Campos de pago
    orden: "",
    factura: "",
    referencia: "",
    montoBs: "",
    montoUsd: "",
    metodoPagoId: "",
    bancoId: "",
    
    // Direcciones
    direccionFacturacionPais: "",
    direccionFacturacionEstado: "",
    direccionFacturacionCiudad: "",
    direccionFacturacionDireccion: "",
    direccionFacturacionUrbanizacion: "",
    direccionFacturacionReferencia: "",
    direccionDespachoIgualFacturacion: false,
    direccionDespachoPais: "",
    direccionDespachoEstado: "",
    direccionDespachoCiudad: "",
    direccionDespachoDireccion: "",
    direccionDespachoUrbanizacion: "",
    direccionDespachoReferencia: "",
    
    // Flete
    montoFleteUsd: "",
    fechaFlete: "",
    referenciaFlete: "",
    montoFleteVes: "",
    bancoReceptorFlete: "",
    statusFlete: "",
    fleteGratis: false,
    
    // Notas
    notas: ""
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch ALL orders (not just A Despachar)
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["/api/sales"],
    queryFn: () => 
      fetch("/api/sales?limit=100")
        .then(res => res.json())
        .then(data => data.data || []),
  });
  
  // Fetch admin data for dropdowns
  const { data: bancos = [] } = useQuery({
    queryKey: ["/api/admin/bancos"],
    queryFn: () => fetch("/api/admin/bancos").then(res => res.json()),
  });
  
  const { data: metodosPago = [] } = useQuery({
    queryKey: ["/api/admin/metodos-pago"],
    queryFn: () => fetch("/api/admin/metodos-pago").then(res => res.json()),
  });
  
  const { data: productos = [] } = useQuery({
    queryKey: ["/api/admin/productos"],
    queryFn: () => fetch("/api/admin/productos").then(res => res.json()),
  });

  const updateOrderMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiRequest("PUT", `/api/sales/${id}`, data),
    onSuccess: () => {
      // Invalidate all sales-related queries and metrics
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales/metrics"] });
      setIsDialogOpen(false);
      setEditingOrder(null);
      resetFormData();
      toast({ title: "Orden actualizada exitosamente" });
    },
    onError: () => {
      toast({ title: "Error al actualizar orden", variant: "destructive" });
    },
  });

  const deleteOrderMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/sales/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales/metrics"] });
      toast({ title: "Orden eliminada exitosamente" });
    },
    onError: () => {
      toast({ title: "Error al eliminar orden", variant: "destructive" });
    },
  });

  const resetFormData = () => {
    setFormData({
      // Campos principales
      nombre: "",
      cedula: "",
      telefono: "",
      email: "",
      totalUsd: "",
      fecha: "",
      canal: "",
      estado: "",
      estadoEntrega: "",
      product: "",
      cantidad: "",
      
      // Campos de pago
      orden: "",
      factura: "",
      referencia: "",
      montoBs: "",
      montoUsd: "",
      metodoPagoId: "",
      bancoId: "",
      
      // Direcciones
      direccionFacturacionPais: "",
      direccionFacturacionEstado: "",
      direccionFacturacionCiudad: "",
      direccionFacturacionDireccion: "",
      direccionFacturacionUrbanizacion: "",
      direccionFacturacionReferencia: "",
      direccionDespachoIgualFacturacion: false,
      direccionDespachoPais: "",
      direccionDespachoEstado: "",
      direccionDespachoCiudad: "",
      direccionDespachoDireccion: "",
      direccionDespachoUrbanizacion: "",
      direccionDespachoReferencia: "",
      
      // Flete
      montoFleteUsd: "",
      fechaFlete: "",
      referenciaFlete: "",
      montoFleteVes: "",
      bancoReceptorFlete: "",
      statusFlete: "",
      fleteGratis: false,
      
      // Notas
      notas: ""
    });
  };

  const handleEdit = (order: Sale) => {
    setEditingOrder(order);
    setFormData({
      // Campos principales
      nombre: order.nombre || "",
      cedula: order.cedula || "",
      telefono: order.telefono || "",
      email: order.email || "",
      totalUsd: order.totalUsd || "",
      fecha: order.fecha ? new Date(order.fecha).toISOString().split('T')[0] : "",
      canal: order.canal || "",
      estado: order.estado || "",
      estadoEntrega: order.estadoEntrega || "",
      product: order.product || "",
      cantidad: order.cantidad?.toString() || "",
      
      // Campos de pago
      orden: order.orden || "",
      factura: order.factura || "",
      referencia: order.referencia || "",
      montoBs: order.montoBs || "",
      montoUsd: order.montoUsd || "",
      metodoPagoId: order.metodoPagoId || "",
      bancoId: order.bancoId || "",
      
      // Direcciones
      direccionFacturacionPais: order.direccionFacturacionPais || "",
      direccionFacturacionEstado: order.direccionFacturacionEstado || "",
      direccionFacturacionCiudad: order.direccionFacturacionCiudad || "",
      direccionFacturacionDireccion: order.direccionFacturacionDireccion || "",
      direccionFacturacionUrbanizacion: order.direccionFacturacionUrbanizacion || "",
      direccionFacturacionReferencia: order.direccionFacturacionReferencia || "",
      direccionDespachoIgualFacturacion: order.direccionDespachoIgualFacturacion === "true",
      direccionDespachoPais: order.direccionDespachoPais || "",
      direccionDespachoEstado: order.direccionDespachoEstado || "",
      direccionDespachoCiudad: order.direccionDespachoCiudad || "",
      direccionDespachoDireccion: order.direccionDespachoDireccion || "",
      direccionDespachoUrbanizacion: order.direccionDespachoUrbanizacion || "",
      direccionDespachoReferencia: order.direccionDespachoReferencia || "",
      
      // Flete
      montoFleteUsd: order.montoFleteUsd || "",
      fechaFlete: order.fechaFlete ? new Date(order.fechaFlete).toISOString().split('T')[0] : "",
      referenciaFlete: order.referenciaFlete || "",
      montoFleteVes: order.montoFleteVes || "",
      bancoReceptorFlete: order.bancoReceptorFlete || "",
      statusFlete: order.statusFlete || "",
      fleteGratis: order.fleteGratis || false,
      
      // Notas
      notas: order.notas || ""
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;

    // Prepare data for submission
    const submitData = {
      nombre: formData.nombre,
      cedula: formData.cedula || null,
      telefono: formData.telefono || null,
      email: formData.email || null,
      totalUsd: formData.totalUsd,
      fecha: formData.fecha,
      canal: formData.canal,
      estado: formData.estado,
      estadoEntrega: formData.estadoEntrega,
      product: formData.product,
      cantidad: parseInt(formData.cantidad) || 1,
      
      // Campos de pago
      orden: formData.orden || null,
      factura: formData.factura || null,
      referencia: formData.referencia || null,
      montoBs: formData.montoBs || null,
      montoUsd: formData.montoUsd || null,
      metodoPagoId: formData.metodoPagoId || null,
      bancoId: formData.bancoId || null,
      
      // Direcciones
      direccionFacturacionPais: formData.direccionFacturacionPais || null,
      direccionFacturacionEstado: formData.direccionFacturacionEstado || null,
      direccionFacturacionCiudad: formData.direccionFacturacionCiudad || null,
      direccionFacturacionDireccion: formData.direccionFacturacionDireccion || null,
      direccionFacturacionUrbanizacion: formData.direccionFacturacionUrbanizacion || null,
      direccionFacturacionReferencia: formData.direccionFacturacionReferencia || null,
      direccionDespachoIgualFacturacion: formData.direccionDespachoIgualFacturacion,
      direccionDespachoPais: formData.direccionDespachoPais || null,
      direccionDespachoEstado: formData.direccionDespachoEstado || null,
      direccionDespachoCiudad: formData.direccionDespachoCiudad || null,
      direccionDespachoDireccion: formData.direccionDespachoDireccion || null,
      direccionDespachoUrbanizacion: formData.direccionDespachoUrbanizacion || null,
      direccionDespachoReferencia: formData.direccionDespachoReferencia || null,
      
      // Flete
      montoFleteUsd: formData.montoFleteUsd || null,
      fechaFlete: formData.fechaFlete || null,
      referenciaFlete: formData.referenciaFlete || null,
      montoFleteVes: formData.montoFleteVes || null,
      bancoReceptorFlete: formData.bancoReceptorFlete || null,
      statusFlete: formData.statusFlete || null,
      fleteGratis: formData.fleteGratis,
      
      // Notas
      notas: formData.notas || null
    };

    updateOrderMutation.mutate({
      id: editingOrder.id,
      data: submitData,
    });
  };

  const handleDelete = (orderId: string) => {
    deleteOrderMutation.mutate(orderId);
  };

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(parseFloat(amount));
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "A Despachar":
        return "default";
      case "DELIVERED":
        return "secondary";
      case "CANCELLED":
        return "destructive";
      default:
        return "outline";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Package className="h-5 w-5" />
            Edición de Órdenes
          </h3>
          <p className="text-sm text-muted-foreground">
            Gestiona todas las órdenes del sistema - Editar cualquier campo o eliminar órdenes
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="outline" className="flex items-center gap-1">
            <Package className="h-3 w-3" />
            {orders.length} órdenes totales
          </Badge>
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Número de Orden</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-4">
                  Cargando órdenes...
                </TableCell>
              </TableRow>
            ) : orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-4">
                  No hay órdenes en el sistema
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order: Sale) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.orden || 'Sin número'}</TableCell>
                  <TableCell>{order.nombre}</TableCell>
                  <TableCell>{order.product}</TableCell>
                  <TableCell className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(order.fecha)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(order)}
                        data-testid={`edit-order-${order.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            data-testid={`delete-order-${order.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar Orden?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta acción no se puede deshacer. Se eliminará permanentemente la orden <strong>{order.orden}</strong> de <strong>{order.nombre}</strong> del sistema.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel data-testid="cancel-delete-order">Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(order.id)}
                              className="bg-red-600 hover:bg-red-700"
                              data-testid="confirm-delete-order"
                            >
                              Eliminar Orden
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Editar Orden Completa
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[calc(90vh-8rem)]">
            <form onSubmit={handleSubmit} className="space-y-6 p-1">
              {editingOrder && (
                <div className="space-y-6">
                  {/* Información General */}
                  <div className="border rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Información General
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="nombre">Nombre *</Label>
                        <Input
                          id="nombre"
                          value={formData.nombre}
                          onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                          data-testid="input-nombre"
                        />
                      </div>
                      <div>
                        <Label htmlFor="cedula">Cédula</Label>
                        <Input
                          id="cedula"
                          value={formData.cedula}
                          onChange={(e) => setFormData({ ...formData, cedula: e.target.value })}
                          data-testid="input-cedula"
                        />
                      </div>
                      <div>
                        <Label htmlFor="telefono">Teléfono</Label>
                        <Input
                          id="telefono"
                          value={formData.telefono}
                          onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                          data-testid="input-telefono"
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          data-testid="input-email"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Información del Pedido */}
                  <div className="border rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Package2 className="h-5 w-5" />
                      Información del Pedido
                    </h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="orden">Número de Orden</Label>
                        <Input
                          id="orden"
                          value={formData.orden}
                          onChange={(e) => setFormData({ ...formData, orden: e.target.value })}
                          data-testid="input-orden"
                        />
                      </div>
                      <div>
                        <Label htmlFor="totalUsd">Total USD *</Label>
                        <Input
                          id="totalUsd"
                          type="number"
                          step="0.01"
                          value={formData.totalUsd}
                          onChange={(e) => setFormData({ ...formData, totalUsd: e.target.value })}
                          data-testid="input-total-usd"
                        />
                      </div>
                      <div>
                        <Label htmlFor="fecha">Fecha *</Label>
                        <Input
                          id="fecha"
                          type="date"
                          value={formData.fecha}
                          onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                          data-testid="input-fecha"
                        />
                      </div>
                      <div>
                        <Label htmlFor="product">Producto *</Label>
                        <Select
                          value={formData.product}
                          onValueChange={(value) => setFormData({ ...formData, product: value })}
                        >
                          <SelectTrigger data-testid="select-product">
                            <SelectValue placeholder="Seleccionar producto" />
                          </SelectTrigger>
                          <SelectContent>
                            {productos.map((producto: Producto) => (
                              <SelectItem key={producto.id} value={producto.nombre}>
                                {producto.nombre}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="cantidad">Cantidad *</Label>
                        <Input
                          id="cantidad"
                          type="number"
                          min="1"
                          value={formData.cantidad}
                          onChange={(e) => setFormData({ ...formData, cantidad: e.target.value })}
                          data-testid="input-cantidad"
                        />
                      </div>
                      <div>
                        <Label htmlFor="canal">Canal</Label>
                        <Select
                          value={formData.canal}
                          onValueChange={(value) => setFormData({ ...formData, canal: value })}
                        >
                          <SelectTrigger data-testid="select-canal">
                            <SelectValue placeholder="Seleccionar canal" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Cashea">Cashea</SelectItem>
                            <SelectItem value="Shopify">Shopify</SelectItem>
                            <SelectItem value="Treble">Treble</SelectItem>
                            <SelectItem value="Manual">Manual</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Estados */}
                  <div className="border rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-4">Estados</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="estado">Estado</Label>
                        <Select
                          value={formData.estado}
                          onValueChange={(value) => setFormData({ ...formData, estado: value })}
                        >
                          <SelectTrigger data-testid="select-estado">
                            <SelectValue placeholder="Seleccionar estado" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pendiente">Pendiente</SelectItem>
                            <SelectItem value="activo">Activo</SelectItem>
                            <SelectItem value="cancelado">Cancelado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="estadoEntrega">Estado de Entrega</Label>
                        <Select
                          value={formData.estadoEntrega}
                          onValueChange={(value) => setFormData({ ...formData, estadoEntrega: value })}
                        >
                          <SelectTrigger data-testid="select-estado-entrega">
                            <SelectValue placeholder="Seleccionar estado" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="En Proceso">En Proceso</SelectItem>
                            <SelectItem value="A Despachar">A Despachar</SelectItem>
                            <SelectItem value="DELIVERED">DELIVERED</SelectItem>
                            <SelectItem value="CANCELLED">CANCELLED</SelectItem>
                            <SelectItem value="IN TRANSIT">IN TRANSIT</SelectItem>
                            <SelectItem value="PROCESSING">PROCESSING</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Información de Pago */}
                  <div className="border rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Información de Pago
                    </h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="metodoPagoId">Método de Pago</Label>
                        <Select
                          value={formData.metodoPagoId}
                          onValueChange={(value) => setFormData({ ...formData, metodoPagoId: value })}
                        >
                          <SelectTrigger data-testid="select-metodo-pago">
                            <SelectValue placeholder="Seleccionar método" />
                          </SelectTrigger>
                          <SelectContent>
                            {metodosPago.map((metodo: MetodoPago) => (
                              <SelectItem key={metodo.id} value={metodo.id}>
                                {metodo.nombre}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="bancoId">Banco</Label>
                        <Select
                          value={formData.bancoId}
                          onValueChange={(value) => setFormData({ ...formData, bancoId: value })}
                        >
                          <SelectTrigger data-testid="select-banco">
                            <SelectValue placeholder="Seleccionar banco" />
                          </SelectTrigger>
                          <SelectContent>
                            {bancos.map((banco: Banco) => (
                              <SelectItem key={banco.id} value={banco.id}>
                                {banco.banco}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="referencia">Referencia</Label>
                        <Input
                          id="referencia"
                          value={formData.referencia}
                          onChange={(e) => setFormData({ ...formData, referencia: e.target.value })}
                          data-testid="input-referencia"
                        />
                      </div>
                      <div>
                        <Label htmlFor="montoBs">Monto Bs</Label>
                        <Input
                          id="montoBs"
                          type="number"
                          step="0.01"
                          value={formData.montoBs}
                          onChange={(e) => setFormData({ ...formData, montoBs: e.target.value })}
                          data-testid="input-monto-bs"
                        />
                      </div>
                      <div>
                        <Label htmlFor="montoUsd">Monto USD</Label>
                        <Input
                          id="montoUsd"
                          type="number"
                          step="0.01"
                          value={formData.montoUsd}
                          onChange={(e) => setFormData({ ...formData, montoUsd: e.target.value })}
                          data-testid="input-monto-usd"
                        />
                      </div>
                      <div>
                        <Label htmlFor="factura">Factura</Label>
                        <Input
                          id="factura"
                          value={formData.factura}
                          onChange={(e) => setFormData({ ...formData, factura: e.target.value })}
                          data-testid="input-factura"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Notas */}
                  <div className="border rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-4">Notas</h3>
                    <div>
                      <Label htmlFor="notas">Observaciones</Label>
                      <Textarea
                        id="notas"
                        value={formData.notas}
                        onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                        placeholder="Agregar notas o comentarios sobre la orden..."
                        className="min-h-20"
                        data-testid="textarea-notas"
                      />
                    </div>
                  </div>
                </div>
              )}
            </form>
          </ScrollArea>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              data-testid="cancel-edit-order"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={updateOrderMutation.isPending}
              onClick={handleSubmit}
              data-testid="save-order-changes"
            >
              {updateOrderMutation.isPending ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}