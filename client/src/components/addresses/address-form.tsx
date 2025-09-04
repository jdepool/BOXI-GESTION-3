import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Search, MapPin, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Sale } from "@shared/schema";

interface AddressData {
  direccionFacturacionCalle: string;
  direccionFacturacionCiudad: string;
  direccionFacturacionEstado: string;
  direccionFacturacionCodigoPostal: string;
  direccionFacturacionPais: string;
  direccionDespachoIgualFacturacion: boolean;
  direccionDespachoCalle: string;
  direccionDespachoCiudad: string;
  direccionDespachoEstado: string;
  direccionDespachoCodigoPostal: string;
  direccionDespachoPais: string;
}

export default function AddressForm() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Sale | null>(null);
  const [showShippingForm, setShowShippingForm] = useState(false);
  const [addressData, setAddressData] = useState<AddressData>({
    direccionFacturacionCalle: "",
    direccionFacturacionCiudad: "",
    direccionFacturacionEstado: "",
    direccionFacturacionCodigoPostal: "",
    direccionFacturacionPais: "Venezuela",
    direccionDespachoIgualFacturacion: true,
    direccionDespachoCalle: "",
    direccionDespachoCiudad: "",
    direccionDespachoEstado: "",
    direccionDespachoCodigoPostal: "",
    direccionDespachoPais: "Venezuela"
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Search for orders
  const { data: searchResults, refetch: searchOrders } = useQuery({
    queryKey: ['/api/sales/search', searchTerm],
    enabled: false,
    queryFn: () => fetch(`/api/sales/search?q=${encodeURIComponent(searchTerm)}`).then(res => res.json())
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
      console.error('Address update error:', error);
    }
  });

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      toast({
        title: "Campo requerido",
        description: "Por favor ingresa un término de búsqueda",
        variant: "destructive"
      });
      return;
    }
    await searchOrders();
  };

  const handleSelectOrder = (order: Sale) => {
    setSelectedOrder(order);
    
    // Pre-fill with existing address data if available
    if (order.direccionFacturacionCalle) {
      setAddressData({
        direccionFacturacionCalle: order.direccionFacturacionCalle || "",
        direccionFacturacionCiudad: order.direccionFacturacionCiudad || "",
        direccionFacturacionEstado: order.direccionFacturacionEstado || "",
        direccionFacturacionCodigoPostal: order.direccionFacturacionCodigoPostal || "",
        direccionFacturacionPais: order.direccionFacturacionPais || "Venezuela",
        direccionDespachoIgualFacturacion: order.direccionDespachoIgualFacturacion === "true",
        direccionDespachoCalle: order.direccionDespachoCalle || "",
        direccionDespachoCiudad: order.direccionDespachoCiudad || "",
        direccionDespachoEstado: order.direccionDespachoEstado || "",
        direccionDespachoCodigoPostal: order.direccionDespachoCodigoPostal || "",
        direccionDespachoPais: order.direccionDespachoPais || "Venezuela"
      });
      setShowShippingForm(order.direccionDespachoIgualFacturacion !== "true");
    }
  };

  const handleAddressChange = (field: keyof AddressData, value: string | boolean) => {
    setAddressData(prev => ({
      ...prev,
      [field]: value
    }));

    if (field === 'direccionDespachoIgualFacturacion') {
      setShowShippingForm(!value);
    }
  };

  const handleSubmit = async () => {
    if (!selectedOrder) return;

    // Validate required billing fields
    const requiredBillingFields = [
      'direccionFacturacionCalle',
      'direccionFacturacionCiudad',
      'direccionFacturacionEstado'
    ];

    for (const field of requiredBillingFields) {
      if (!addressData[field as keyof AddressData]) {
        toast({
          title: "Campos requeridos",
          description: "Por favor completa todos los campos de dirección de facturación",
          variant: "destructive"
        });
        return;
      }
    }

    // Validate shipping fields if different from billing
    if (!addressData.direccionDespachoIgualFacturacion) {
      const requiredShippingFields = [
        'direccionDespachoCalle',
        'direccionDespachoCiudad',
        'direccionDespachoEstado'
      ];

      for (const field of requiredShippingFields) {
        if (!addressData[field as keyof AddressData]) {
          toast({
            title: "Campos requeridos",
            description: "Por favor completa todos los campos de dirección de despacho",
            variant: "destructive"
          });
          return;
        }
      }
    }

    await updateAddressMutation.mutateAsync({
      saleId: selectedOrder.id,
      addresses: {
        ...addressData,
        direccionDespachoIgualFacturacion: addressData.direccionDespachoIgualFacturacion
      }
    });
  };

  const resetForm = () => {
    setSelectedOrder(null);
    setSearchTerm("");
    setShowShippingForm(false);
    setAddressData({
      direccionFacturacionCalle: "",
      direccionFacturacionCiudad: "",
      direccionFacturacionEstado: "",
      direccionFacturacionCodigoPostal: "",
      direccionFacturacionPais: "Venezuela",
      direccionDespachoIgualFacturacion: true,
      direccionDespachoCalle: "",
      direccionDespachoCiudad: "",
      direccionDespachoEstado: "",
      direccionDespachoCodigoPostal: "",
      direccionDespachoPais: "Venezuela"
    });
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-2 mb-6">
        <MapPin className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-semibold">Gestión de Direcciones</h2>
      </div>

      {/* Order Search Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Buscar Orden
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Buscar por número de orden, cédula o nombre del cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1"
              data-testid="search-order-input"
            />
            <Button onClick={handleSearch} data-testid="search-order-button">
              <Search className="h-4 w-4 mr-2" />
              Buscar
            </Button>
          </div>

          {/* Search Results */}
          {searchResults?.data && searchResults.data.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {searchResults.data.length} resultado(s) encontrado(s):
              </p>
              {searchResults.data.map((order: Sale) => (
                <Card 
                  key={order.id} 
                  className={`cursor-pointer hover:bg-muted/50 transition-colors ${
                    selectedOrder?.id === order.id ? 'bg-primary/10 border-primary' : ''
                  }`}
                  onClick={() => handleSelectOrder(order)}
                  data-testid={`order-result-${order.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{order.nombre}</p>
                        <p className="text-sm text-muted-foreground">
                          {order.email && `${order.email} • `}
                          {order.cedula && `CI: ${order.cedula} • `}
                          {order.orden && `Orden: ${order.orden}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="mb-1">
                          {order.canal}
                        </Badge>
                        <p className="text-sm font-medium">${Number(order.totalUsd).toLocaleString()}</p>
                        {order.direccionFacturacionCalle && (
                          <p className="text-xs text-green-600">✓ Con dirección</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {searchResults?.data && searchResults.data.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No se encontraron órdenes con ese criterio de búsqueda
            </p>
          )}
        </CardContent>
      </Card>

      {/* Address Form Section */}
      {selectedOrder && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Direcciones para: {selectedOrder.nombre}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Orden: {selectedOrder.orden || 'N/A'} • Canal: {selectedOrder.canal} • 
              Total: ${Number(selectedOrder.totalUsd).toLocaleString()}
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Billing Address */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Dirección de Facturación</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="billing-street">Calle/Dirección *</Label>
                  <Input
                    id="billing-street"
                    value={addressData.direccionFacturacionCalle}
                    onChange={(e) => handleAddressChange('direccionFacturacionCalle', e.target.value)}
                    placeholder="Ej: Av. Principal, Casa 123"
                    data-testid="billing-street"
                  />
                </div>
                <div>
                  <Label htmlFor="billing-city">Ciudad *</Label>
                  <Input
                    id="billing-city"
                    value={addressData.direccionFacturacionCiudad}
                    onChange={(e) => handleAddressChange('direccionFacturacionCiudad', e.target.value)}
                    placeholder="Ej: Caracas"
                    data-testid="billing-city"
                  />
                </div>
                <div>
                  <Label htmlFor="billing-state">Estado *</Label>
                  <Input
                    id="billing-state"
                    value={addressData.direccionFacturacionEstado}
                    onChange={(e) => handleAddressChange('direccionFacturacionEstado', e.target.value)}
                    placeholder="Ej: Distrito Capital"
                    data-testid="billing-state"
                  />
                </div>
                <div>
                  <Label htmlFor="billing-postal">Código Postal</Label>
                  <Input
                    id="billing-postal"
                    value={addressData.direccionFacturacionCodigoPostal}
                    onChange={(e) => handleAddressChange('direccionFacturacionCodigoPostal', e.target.value)}
                    placeholder="Ej: 1010"
                    data-testid="billing-postal"
                  />
                </div>
                <div>
                  <Label htmlFor="billing-country">País</Label>
                  <Input
                    id="billing-country"
                    value={addressData.direccionFacturacionPais}
                    onChange={(e) => handleAddressChange('direccionFacturacionPais', e.target.value)}
                    data-testid="billing-country"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Same Address Checkbox */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="same-address"
                checked={addressData.direccionDespachoIgualFacturacion}
                onCheckedChange={(checked) => 
                  handleAddressChange('direccionDespachoIgualFacturacion', checked as boolean)
                }
                data-testid="same-address-checkbox"
              />
              <Label htmlFor="same-address" className="text-sm font-medium">
                La dirección de despacho es la misma que la de facturación
              </Label>
            </div>

            {/* Shipping Address */}
            {showShippingForm && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Dirección de Despacho</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label htmlFor="shipping-street">Calle/Dirección *</Label>
                    <Input
                      id="shipping-street"
                      value={addressData.direccionDespachoCalle}
                      onChange={(e) => handleAddressChange('direccionDespachoCalle', e.target.value)}
                      placeholder="Ej: Av. Secundaria, Edificio 456"
                      data-testid="shipping-street"
                    />
                  </div>
                  <div>
                    <Label htmlFor="shipping-city">Ciudad *</Label>
                    <Input
                      id="shipping-city"
                      value={addressData.direccionDespachoCiudad}
                      onChange={(e) => handleAddressChange('direccionDespachoCiudad', e.target.value)}
                      placeholder="Ej: Valencia"
                      data-testid="shipping-city"
                    />
                  </div>
                  <div>
                    <Label htmlFor="shipping-state">Estado *</Label>
                    <Input
                      id="shipping-state"
                      value={addressData.direccionDespachoEstado}
                      onChange={(e) => handleAddressChange('direccionDespachoEstado', e.target.value)}
                      placeholder="Ej: Carabobo"
                      data-testid="shipping-state"
                    />
                  </div>
                  <div>
                    <Label htmlFor="shipping-postal">Código Postal</Label>
                    <Input
                      id="shipping-postal"
                      value={addressData.direccionDespachoCodigoPostal}
                      onChange={(e) => handleAddressChange('direccionDespachoCodigoPostal', e.target.value)}
                      placeholder="Ej: 2001"
                      data-testid="shipping-postal"
                    />
                  </div>
                  <div>
                    <Label htmlFor="shipping-country">País</Label>
                    <Input
                      id="shipping-country"
                      value={addressData.direccionDespachoPais}
                      onChange={(e) => handleAddressChange('direccionDespachoPais', e.target.value)}
                      data-testid="shipping-country"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleSubmit}
                disabled={updateAddressMutation.isPending}
                data-testid="save-addresses-button"
                className="flex-1"
              >
                {updateAddressMutation.isPending ? "Guardando..." : "Guardar Direcciones"}
              </Button>
              <Button
                variant="outline"
                onClick={resetForm}
                data-testid="cancel-button"
              >
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}