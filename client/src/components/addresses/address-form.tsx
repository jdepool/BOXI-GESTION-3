import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MapPin, Package, Calendar, User, Phone, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { Sale } from "@shared/schema";

interface AddressData {
  direccionFacturacionPais: string;
  direccionFacturacionEstado: string;
  direccionFacturacionCiudad: string;
  direccionFacturacionDireccion: string;
  direccionFacturacionUrbanizacion: string;
  direccionFacturacionReferencia: string;
  direccionDespachoIgualFacturacion: boolean;
  direccionDespachoPais: string;
  direccionDespachoEstado: string;
  direccionDespachoCiudad: string;
  direccionDespachoDireccion: string;
  direccionDespachoUrbanizacion: string;
  direccionDespachoReferencia: string;
}

export default function AddressForm() {
  const [selectedOrder, setSelectedOrder] = useState<Sale | null>(null);
  const [showShippingForm, setShowShippingForm] = useState(false);
  const [addressData, setAddressData] = useState<AddressData>({
    direccionFacturacionPais: "Venezuela",
    direccionFacturacionEstado: "",
    direccionFacturacionCiudad: "",
    direccionFacturacionDireccion: "",
    direccionFacturacionUrbanizacion: "",
    direccionFacturacionReferencia: "",
    direccionDespachoIgualFacturacion: true,
    direccionDespachoPais: "Venezuela",
    direccionDespachoEstado: "",
    direccionDespachoCiudad: "",
    direccionDespachoDireccion: "",
    direccionDespachoUrbanizacion: "",
    direccionDespachoReferencia: ""
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get all Cashea orders
  const { data: casheaOrders, isLoading } = useQuery({
    queryKey: ['/api/sales/cashea'],
    queryFn: () => fetch('/api/sales/cashea').then(res => res.json())
  });

  // Update address mutation
  const updateAddressMutation = useMutation({
    mutationFn: async (data: { saleId: string; addresses: AddressData }) => {
      const response = await fetch(`/api/sales/${data.saleId}/addresses`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data.addresses)
      });
      if (!response.ok) {
        throw new Error('Failed to update addresses');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Direcciones actualizadas",
        description: "Las direcciones han sido guardadas correctamente",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/sales'] });
      resetForm();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudieron actualizar las direcciones",
        variant: "destructive"
      });
    }
  });

  const resetForm = () => {
    setSelectedOrder(null);
    setShowShippingForm(false);
    setAddressData({
      direccionFacturacionPais: "Venezuela",
      direccionFacturacionEstado: "",
      direccionFacturacionCiudad: "",
      direccionFacturacionDireccion: "",
      direccionFacturacionUrbanizacion: "",
      direccionFacturacionReferencia: "",
      direccionDespachoIgualFacturacion: true,
      direccionDespachoPais: "Venezuela",
      direccionDespachoEstado: "",
      direccionDespachoCiudad: "",
      direccionDespachoDireccion: "",
      direccionDespachoUrbanizacion: "",
      direccionDespachoReferencia: ""
    });
  };

  const handleOrderSelect = (order: Sale) => {
    setSelectedOrder(order);
    // For orders without addresses, default checkbox to checked (same address)
    // For orders with addresses, respect the saved value
    const hasAddresses = !!order.direccionFacturacionPais;
    const sameAddressDefault = hasAddresses 
      ? (order.direccionDespachoIgualFacturacion === "true") 
      : true; // Default to true (checked) for new orders
    
    setAddressData({
      direccionFacturacionPais: order.direccionFacturacionPais || "Venezuela",
      direccionFacturacionEstado: order.direccionFacturacionEstado || "",
      direccionFacturacionCiudad: order.direccionFacturacionCiudad || "",
      direccionFacturacionDireccion: order.direccionFacturacionDireccion || "",
      direccionFacturacionUrbanizacion: order.direccionFacturacionUrbanizacion || "",
      direccionFacturacionReferencia: order.direccionFacturacionReferencia || "",
      direccionDespachoIgualFacturacion: sameAddressDefault,
      direccionDespachoPais: order.direccionDespachoPais || "Venezuela",
      direccionDespachoEstado: order.direccionDespachoEstado || "",
      direccionDespachoCiudad: order.direccionDespachoCiudad || "",
      direccionDespachoDireccion: order.direccionDespachoDireccion || "",
      direccionDespachoUrbanizacion: order.direccionDespachoUrbanizacion || "",
      direccionDespachoReferencia: order.direccionDespachoReferencia || ""
    });
    setShowShippingForm(!sameAddressDefault);
  };

  const handleAddressChange = (field: keyof AddressData, value: string | boolean) => {
    setAddressData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSameAddressChange = (checked: boolean) => {
    setAddressData(prev => ({
      ...prev,
      direccionDespachoIgualFacturacion: checked
    }));
    setShowShippingForm(!checked);
  };

  const validateForm = (): boolean => {
    const requiredBillingFields = [
      'direccionFacturacionPais',
      'direccionFacturacionEstado', 
      'direccionFacturacionCiudad',
      'direccionFacturacionDireccion'
    ];

    for (const field of requiredBillingFields) {
      if (!addressData[field as keyof AddressData]) {
        toast({
          title: "Campos requeridos",
          description: "Por favor complete todos los campos de la dirección de facturación",
          variant: "destructive"
        });
        return false;
      }
    }

    if (!addressData.direccionDespachoIgualFacturacion) {
      const requiredShippingFields = [
        'direccionDespachoPais',
        'direccionDespachoEstado',
        'direccionDespachoCiudad', 
        'direccionDespachoDireccion'
      ];

      for (const field of requiredShippingFields) {
        if (!addressData[field as keyof AddressData]) {
          toast({
            title: "Campos requeridos",
            description: "Por favor complete todos los campos de la dirección de despacho",
            variant: "destructive"
          });
          return false;
        }
      }
    }

    return true;
  };

  const handleSubmit = () => {
    if (!selectedOrder) {
      toast({
        title: "Error",
        description: "Debe seleccionar una orden primero",
        variant: "destructive"
      });
      return;
    }

    if (!validateForm()) {
      return;
    }

    updateAddressMutation.mutate({
      saleId: selectedOrder.id,
      addresses: addressData
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Cargando órdenes de Cashea...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Order Selection */}
      {!selectedOrder && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Órdenes de Cashea
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Selecciona una orden de Cashea para agregar direcciones de facturación y despacho:
            </p>
            
            {casheaOrders?.data?.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No hay órdenes de Cashea disponibles
              </p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {casheaOrders?.data?.map((order: Sale) => (
                  <div
                    key={order.id}
                    className="border border-border rounded-lg p-4 cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => handleOrderSelect(order)}
                    data-testid={`order-card-${order.id}`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{order.nombre}</span>
                          <Badge variant="secondary">#{order.orden}</Badge>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {order.telefono}
                          </div>
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {order.email}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(order.fecha), 'dd/MM/yyyy')}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className="text-sm">
                            <strong>{order.product}</strong> (x{order.cantidad})
                          </span>
                          <Badge variant="outline">
                            ${order.totalUsd} USD
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <Badge 
                          variant={order.direccionFacturacionPais ? "default" : "secondary"}
                          className="mb-2"
                        >
                          {order.direccionFacturacionPais ? "Con direcciones" : "Sin direcciones"}
                        </Badge>
                        <div className="text-xs text-muted-foreground">
                          Estado: {order.estadoEntrega}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Address Forms */}
      {selectedOrder && (
        <div className="space-y-6">
          {/* Selected Order Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Orden Seleccionada
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">{selectedOrder.nombre} - #{selectedOrder.orden}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedOrder.product} (x{selectedOrder.cantidad}) - ${selectedOrder.totalUsd} USD
                  </p>
                </div>
                <Button variant="outline" onClick={resetForm} data-testid="button-change-order">
                  Cambiar Orden
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Billing Address */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Dirección de Facturación
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="billing-country">País *</Label>
                  <Input
                    id="billing-country"
                    value={addressData.direccionFacturacionPais}
                    onChange={(e) => handleAddressChange('direccionFacturacionPais', e.target.value)}
                    data-testid="input-billing-country"
                  />
                </div>
                <div>
                  <Label htmlFor="billing-state">Estado *</Label>
                  <Input
                    id="billing-state"
                    value={addressData.direccionFacturacionEstado}
                    onChange={(e) => handleAddressChange('direccionFacturacionEstado', e.target.value)}
                    data-testid="input-billing-state"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="billing-city">Ciudad *</Label>
                  <Input
                    id="billing-city"
                    value={addressData.direccionFacturacionCiudad}
                    onChange={(e) => handleAddressChange('direccionFacturacionCiudad', e.target.value)}
                    data-testid="input-billing-city"
                  />
                </div>
                <div>
                  <Label htmlFor="billing-urbanization">Urbanización</Label>
                  <Input
                    id="billing-urbanization"
                    value={addressData.direccionFacturacionUrbanizacion}
                    onChange={(e) => handleAddressChange('direccionFacturacionUrbanizacion', e.target.value)}
                    data-testid="input-billing-urbanization"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="billing-address">Dirección *</Label>
                <Input
                  id="billing-address"
                  value={addressData.direccionFacturacionDireccion}
                  onChange={(e) => handleAddressChange('direccionFacturacionDireccion', e.target.value)}
                  placeholder="Calle, número, edificio, apartamento..."
                  data-testid="input-billing-address"
                />
              </div>

              <div>
                <Label htmlFor="billing-reference">Referencia</Label>
                <Input
                  id="billing-reference"
                  value={addressData.direccionFacturacionReferencia}
                  onChange={(e) => handleAddressChange('direccionFacturacionReferencia', e.target.value)}
                  placeholder="Punto de referencia..."
                  data-testid="input-billing-reference"
                />
              </div>
            </CardContent>
          </Card>

          {/* Same Address Checkbox */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="same-address"
                  checked={addressData.direccionDespachoIgualFacturacion}
                  onCheckedChange={handleSameAddressChange}
                  data-testid="checkbox-same-address"
                />
                <Label htmlFor="same-address">
                  La dirección de despacho es igual a la de facturación
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Shipping Address */}
          {showShippingForm && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Dirección de Despacho
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="shipping-country">País *</Label>
                    <Input
                      id="shipping-country"
                      value={addressData.direccionDespachoPais}
                      onChange={(e) => handleAddressChange('direccionDespachoPais', e.target.value)}
                      data-testid="input-shipping-country"
                    />
                  </div>
                  <div>
                    <Label htmlFor="shipping-state">Estado *</Label>
                    <Input
                      id="shipping-state"
                      value={addressData.direccionDespachoEstado}
                      onChange={(e) => handleAddressChange('direccionDespachoEstado', e.target.value)}
                      data-testid="input-shipping-state"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="shipping-city">Ciudad *</Label>
                    <Input
                      id="shipping-city"
                      value={addressData.direccionDespachoCiudad}
                      onChange={(e) => handleAddressChange('direccionDespachoCiudad', e.target.value)}
                      data-testid="input-shipping-city"
                    />
                  </div>
                  <div>
                    <Label htmlFor="shipping-urbanization">Urbanización</Label>
                    <Input
                      id="shipping-urbanization"
                      value={addressData.direccionDespachoUrbanizacion}
                      onChange={(e) => handleAddressChange('direccionDespachoUrbanizacion', e.target.value)}
                      data-testid="input-shipping-urbanization"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="shipping-address">Dirección *</Label>
                  <Input
                    id="shipping-address"
                    value={addressData.direccionDespachoDireccion}
                    onChange={(e) => handleAddressChange('direccionDespachoDireccion', e.target.value)}
                    placeholder="Calle, número, edificio, apartamento..."
                    data-testid="input-shipping-address"
                  />
                </div>

                <div>
                  <Label htmlFor="shipping-reference">Referencia</Label>
                  <Input
                    id="shipping-reference"
                    value={addressData.direccionDespachoReferencia}
                    onChange={(e) => handleAddressChange('direccionDespachoReferencia', e.target.value)}
                    placeholder="Punto de referencia..."
                    data-testid="input-shipping-reference"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4">
            <Button variant="outline" onClick={resetForm} data-testid="button-cancel">
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={updateAddressMutation.isPending}
              data-testid="button-save-addresses"
            >
              {updateAddressMutation.isPending ? "Guardando..." : "Guardar Direcciones"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}