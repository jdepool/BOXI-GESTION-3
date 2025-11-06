import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MapPin, Package, User, Phone, Mail, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { Sale } from "@shared/schema";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEstadosCiudades } from "@/hooks/use-estados-ciudades";

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

interface AddressModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale: Sale | null;
}

export default function AddressModal({ open, onOpenChange, sale }: AddressModalProps) {
  const [showBillingForm, setShowBillingForm] = useState(false);
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

  // Use estados/ciudades hook for both despacho and facturacion addresses
  const { estados, ciudades: ciudadesDespacho } = useEstadosCiudades(addressData.direccionDespachoEstado);
  const { ciudades: ciudadesFacturacion } = useEstadosCiudades(addressData.direccionFacturacionEstado);

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
      onOpenChange(false);
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

  // Initialize form when sale changes
  useEffect(() => {
    if (sale && open) {
      setAddressData({
        direccionFacturacionPais: sale.direccionFacturacionPais || "Venezuela",
        direccionFacturacionEstado: sale.direccionFacturacionEstado || "",
        direccionFacturacionCiudad: sale.direccionFacturacionCiudad || "",
        direccionFacturacionDireccion: sale.direccionFacturacionDireccion || "",
        direccionFacturacionUrbanizacion: sale.direccionFacturacionUrbanizacion || "",
        direccionFacturacionReferencia: sale.direccionFacturacionReferencia || "",
        direccionDespachoIgualFacturacion: sale.direccionDespachoIgualFacturacion === "true",
        direccionDespachoPais: sale.direccionDespachoPais || "Venezuela",
        direccionDespachoEstado: sale.direccionDespachoEstado || "",
        direccionDespachoCiudad: sale.direccionDespachoCiudad || "",
        direccionDespachoDireccion: sale.direccionDespachoDireccion || "",
        direccionDespachoUrbanizacion: sale.direccionDespachoUrbanizacion || "",
        direccionDespachoReferencia: sale.direccionDespachoReferencia || ""
      });
      setShowBillingForm(!(sale.direccionDespachoIgualFacturacion === "true"));
    }
  }, [sale, open]);

  const resetForm = () => {
    setShowBillingForm(false);
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

  const handleAddressChange = (field: keyof AddressData, value: string | boolean) => {
    setAddressData(prev => {
      const updates: Partial<AddressData> = { [field]: value } as Partial<AddressData>;
      
      // If checkbox is checked and a despacho field is being changed, mirror to facturación
      if (prev.direccionDespachoIgualFacturacion && typeof value === 'string') {
        const fieldMapping: Record<string, keyof AddressData> = {
          'direccionDespachoPais': 'direccionFacturacionPais',
          'direccionDespachoEstado': 'direccionFacturacionEstado',
          'direccionDespachoCiudad': 'direccionFacturacionCiudad',
          'direccionDespachoDireccion': 'direccionFacturacionDireccion',
          'direccionDespachoUrbanizacion': 'direccionFacturacionUrbanizacion',
          'direccionDespachoReferencia': 'direccionFacturacionReferencia'
        };
        
        const mirrorField = fieldMapping[field as string];
        if (mirrorField) {
          (updates as any)[mirrorField] = value;
        }
      }
      
      return { ...prev, ...updates };
    });
  };

  const handleSameAddressChange = (checked: boolean) => {
    if (checked) {
      // When checked, copy shipping address to billing address
      setAddressData(prev => ({
        ...prev,
        direccionDespachoIgualFacturacion: checked,
        direccionFacturacionPais: prev.direccionDespachoPais,
        direccionFacturacionEstado: prev.direccionDespachoEstado,
        direccionFacturacionCiudad: prev.direccionDespachoCiudad,
        direccionFacturacionDireccion: prev.direccionDespachoDireccion,
        direccionFacturacionUrbanizacion: prev.direccionDespachoUrbanizacion,
        direccionFacturacionReferencia: prev.direccionDespachoReferencia
      }));
    } else {
      // When unchecked, just update the flag
      setAddressData(prev => ({
        ...prev,
        direccionDespachoIgualFacturacion: checked
      }));
    }
    setShowBillingForm(!checked);
  };

  const validateForm = (): boolean => {
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

    if (!addressData.direccionDespachoIgualFacturacion) {
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
    }

    return true;
  };

  const handleSubmit = () => {
    if (!sale) return;

    if (!validateForm()) {
      return;
    }

    updateAddressMutation.mutate({
      saleId: sale.id,
      addresses: addressData
    });
  };

  if (!sale) return null;

  const isCasheaOrder = sale.canal?.toLowerCase().includes("cashea") || false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Direcciones de {sale.nombre}
          </DialogTitle>
          <DialogDescription>
            Agregar direcciones de facturación y despacho para la orden #{sale.orden}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Order Info */}
          <div className="bg-muted rounded-lg p-4">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{sale.nombre}</span>
                  <Badge variant="secondary">#{sale.orden}</Badge>
                </div>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {sale.telefono}
                  </div>
                  <div className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {sale.email}
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(sale.fecha), 'dd/MM/yyyy')}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm">
                    <strong>{sale.product}</strong> (x{sale.cantidad})
                  </span>
                  <Badge variant="outline">
                    ${sale.totalUsd} USD
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Shipping Address */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Package className="h-5 w-5" />
              Dirección de Despacho
            </h3>
            
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
                {isCasheaOrder ? (
                  <Input
                    id="shipping-state"
                    value={addressData.direccionDespachoEstado}
                    onChange={(e) => handleAddressChange('direccionDespachoEstado', e.target.value)}
                    placeholder="Estado o provincia"
                    data-testid="input-shipping-state"
                  />
                ) : (
                  <Select
                    value={addressData.direccionDespachoEstado}
                    onValueChange={(value) => {
                      handleAddressChange('direccionDespachoEstado', value);
                      handleAddressChange('direccionDespachoCiudad', '');
                    }}
                  >
                    <SelectTrigger id="shipping-state" data-testid="select-shipping-state">
                      <SelectValue placeholder="Seleccione estado" />
                    </SelectTrigger>
                    <SelectContent>
                      {estados.map((estado) => (
                        <SelectItem key={estado.id} value={estado.nombre}>
                          {estado.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="shipping-city">Ciudad *</Label>
                {isCasheaOrder ? (
                  <Input
                    id="shipping-city"
                    value={addressData.direccionDespachoCiudad}
                    onChange={(e) => handleAddressChange('direccionDespachoCiudad', e.target.value)}
                    placeholder="Ciudad"
                    data-testid="input-shipping-city"
                  />
                ) : (
                  <Select
                    value={addressData.direccionDespachoCiudad}
                    onValueChange={(value) => handleAddressChange('direccionDespachoCiudad', value)}
                    disabled={!addressData.direccionDespachoEstado}
                  >
                    <SelectTrigger id="shipping-city" data-testid="select-shipping-city">
                      <SelectValue placeholder={addressData.direccionDespachoEstado ? "Seleccione ciudad" : "Seleccione estado primero"} />
                    </SelectTrigger>
                    <SelectContent>
                      {ciudadesDespacho.map((ciudad) => (
                        <SelectItem key={ciudad.id} value={ciudad.nombre}>
                          {ciudad.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
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
          </div>

          <Separator />

          {/* Same Address Checkbox */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="same-address"
              checked={addressData.direccionDespachoIgualFacturacion}
              onCheckedChange={handleSameAddressChange}
              data-testid="checkbox-same-address"
            />
            <Label htmlFor="same-address">
              La dirección de facturación es igual a la de despacho
            </Label>
          </div>

          {/* Billing Address */}
          {showBillingForm && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Dirección de Facturación
              </h3>
              
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
                  {isCasheaOrder ? (
                    <Input
                      id="billing-state"
                      value={addressData.direccionFacturacionEstado}
                      onChange={(e) => handleAddressChange('direccionFacturacionEstado', e.target.value)}
                      placeholder="Estado o provincia"
                      data-testid="input-billing-state"
                    />
                  ) : (
                    <Select
                      value={addressData.direccionFacturacionEstado}
                      onValueChange={(value) => {
                        handleAddressChange('direccionFacturacionEstado', value);
                        handleAddressChange('direccionFacturacionCiudad', '');
                      }}
                    >
                      <SelectTrigger id="billing-state" data-testid="select-billing-state">
                        <SelectValue placeholder="Seleccione estado" />
                      </SelectTrigger>
                      <SelectContent>
                        {estados.map((estado) => (
                          <SelectItem key={estado.id} value={estado.nombre}>
                            {estado.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="billing-city">Ciudad *</Label>
                  {isCasheaOrder ? (
                    <Input
                      id="billing-city"
                      value={addressData.direccionFacturacionCiudad}
                      onChange={(e) => handleAddressChange('direccionFacturacionCiudad', e.target.value)}
                      placeholder="Ciudad"
                      data-testid="input-billing-city"
                    />
                  ) : (
                    <Select
                      value={addressData.direccionFacturacionCiudad}
                      onValueChange={(value) => handleAddressChange('direccionFacturacionCiudad', value)}
                      disabled={!addressData.direccionFacturacionEstado}
                    >
                      <SelectTrigger id="billing-city" data-testid="select-billing-city">
                        <SelectValue placeholder={addressData.direccionFacturacionEstado ? "Seleccione ciudad" : "Seleccione estado primero"} />
                      </SelectTrigger>
                      <SelectContent>
                        {ciudadesFacturacion.map((ciudad) => (
                          <SelectItem key={ciudad.id} value={ciudad.nombre}>
                            {ciudad.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
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
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel">
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
      </DialogContent>
    </Dialog>
  );
}