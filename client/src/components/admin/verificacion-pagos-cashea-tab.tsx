import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Upload, FileText, CheckCircle, AlertCircle, DollarSign, Hash } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Sale } from "@shared/schema";

interface BankTransaction {
  referencia: string;
  monto: number;
  fecha: string;
  descripcion?: string;
}

interface PaymentMatch {
  sale: Sale;
  bankTransaction: BankTransaction;
  matchType: 'exact' | 'partial' | 'amount';
  confidence: number;
}

export function VerificacionPagosCasheaTab() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>([]);
  const [paymentMatches, setPaymentMatches] = useState<PaymentMatch[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get Cashea orders that are in PROCESSING status
  const { data: casheaOrders = [], isLoading } = useQuery({
    queryKey: ["/api/sales", { canal: "cashea", estadoEntrega: "PROCESSING" }],
    queryFn: () => 
      fetch("/api/sales?canal=cashea&estadoEntrega=PROCESSING")
        .then(res => res.json())
        .then(data => data.data || []),
  });

  const verifyPaymentsMutation = useMutation({
    mutationFn: (matches: PaymentMatch[]) =>
      apiRequest("POST", "/api/admin/verify-cashea-payments", { matches }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      toast({ 
        title: "Pagos verificados", 
        description: `Se verificaron ${data.verified} pagos exitosamente.` 
      });
      setPaymentMatches([]);
      setBankTransactions([]);
      setSelectedFile(null);
    },
    onError: () => {
      toast({ 
        title: "Error", 
        description: "No se pudieron verificar los pagos.", 
        variant: "destructive" 
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setBankTransactions([]);
      setPaymentMatches([]);
    }
  };

  const processBankStatement = async () => {
    if (!selectedFile) {
      toast({ 
        title: "Error", 
        description: "Selecciona un archivo primero.", 
        variant: "destructive" 
      });
      return;
    }

    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('/api/admin/process-bank-statement', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Error processing file');
      }

      const data = await response.json();
      setBankTransactions(data.transactions);
      
      // Compare with Cashea orders
      const matches = findPaymentMatches(data.transactions, casheaOrders);
      setPaymentMatches(matches);

      toast({ 
        title: "Archivo procesado", 
        description: `Se encontraron ${data.transactions.length} transacciones y ${matches.length} coincidencias.` 
      });
    } catch (error) {
      console.error('Error processing bank statement:', error);
      toast({ 
        title: "Error", 
        description: "No se pudo procesar el estado de cuenta.", 
        variant: "destructive" 
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const findPaymentMatches = (transactions: BankTransaction[], orders: Sale[]): PaymentMatch[] => {
    const matches: PaymentMatch[] = [];

    for (const transaction of transactions) {
      for (const order of orders) {
        if (!order.referencia) continue;

        const match = compareReferences(transaction.referencia, order.referencia);
        
        if (match.type === 'exact') {
          matches.push({
            sale: order,
            bankTransaction: transaction,
            matchType: 'exact',
            confidence: 100
          });
        } else if (match.type === 'partial' && match.matchingDigits >= 8) {
          // Si coinciden 8+ dígitos, verificar que el monto en haber (banco) sea igual al monto en VES
          const orderAmountVES = parseFloat(order.montoBs || '0');
          const bankAmount = transaction.monto;
          
          // Los montos deben ser exactamente iguales (o con diferencia mínima de centavos)
          if (Math.abs(bankAmount - orderAmountVES) < 0.01) {
            matches.push({
              sale: order,
              bankTransaction: transaction,
              matchType: 'reference_amount',
              confidence: 95 // Alta confianza por matching de referencia + monto
            });
          }
        }
      }
    }

    return matches;
  };

  const compareReferences = (ref1: string, ref2: string) => {
    // Remove non-numeric characters for comparison
    let clean1 = ref1.replace(/\D/g, '');
    let clean2 = ref2.replace(/\D/g, '');

    // Remove leading zeros
    clean1 = clean1.replace(/^0+/, '') || '0';
    clean2 = clean2.replace(/^0+/, '') || '0';

    if (clean1 === clean2) {
      return { type: 'exact' as const, matchingDigits: clean1.length };
    }

    // Count matching consecutive digits from the end (most significant digits)
    let matchingDigits = 0;
    const minLength = Math.min(clean1.length, clean2.length);
    
    // Match from the end of the strings (right to left)
    for (let i = 1; i <= minLength; i++) {
      if (clean1[clean1.length - i] === clean2[clean2.length - i]) {
        matchingDigits++;
      } else {
        break;
      }
    }

    // If we don't have enough consecutive matches, check for 8+ digit match anywhere
    if (matchingDigits < 8) {
      // Check if either reference contains the other (ignoring leading zeros)
      const shorter = clean1.length < clean2.length ? clean1 : clean2;
      const longer = clean1.length >= clean2.length ? clean1 : clean2;
      
      if (shorter.length >= 8 && longer.includes(shorter)) {
        matchingDigits = shorter.length;
      }
    }

    return { 
      type: 'partial' as const, 
      matchingDigits: matchingDigits 
    };
  };

  const handleVerifyPayments = () => {
    const validMatches = paymentMatches.filter(match => match.confidence >= 80);
    verifyPaymentsMutation.mutate(validMatches);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-VE", {
      style: "currency",
      currency: "VES",
    }).format(amount);
  };

  const getMatchBadgeVariant = (matchType: string, confidence: number) => {
    if (matchType === 'exact') return 'default';
    if (confidence >= 80) return 'secondary';
    return 'outline';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Verificación de Pagos Cashea
          </h3>
          <p className="text-sm text-muted-foreground">
            Carga el estado de cuenta del banco para verificar automáticamente los pagos de Cashea
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="outline" className="flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {casheaOrders.length} órdenes pendientes
          </Badge>
        </div>
      </div>

      {/* File Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Cargar Estado de Cuenta
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="bankStatement">Estado de Cuenta (Excel/CSV)</Label>
            <Input
              id="bankStatement"
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileSelect}
              data-testid="bank-statement-upload"
            />
          </div>
          
          {selectedFile && (
            <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
              <FileText className="h-4 w-4" />
              <span className="text-sm">{selectedFile.name}</span>
              <Button
                size="sm"
                onClick={processBankStatement}
                disabled={isProcessing}
                data-testid="process-bank-statement"
              >
                {isProcessing ? "Procesando..." : "Procesar"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bank Transactions Summary */}
      {bankTransactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Transacciones Encontradas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Se encontraron {bankTransactions.length} transacciones en el estado de cuenta.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Payment Matches */}
      {paymentMatches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Hash className="h-4 w-4" />
              Coincidencias de Pagos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  Se encontraron {paymentMatches.length} posibles coincidencias.
                </p>
                <Button
                  onClick={handleVerifyPayments}
                  disabled={verifyPaymentsMutation.isPending || paymentMatches.length === 0}
                  data-testid="verify-payments"
                >
                  {verifyPaymentsMutation.isPending ? "Verificando..." : "Verificar Pagos"}
                </Button>
              </div>

              <Separator />

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Orden</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Ref. Venta</TableHead>
                    <TableHead>Ref. Banco</TableHead>
                    <TableHead>Monto Venta</TableHead>
                    <TableHead>Monto Banco</TableHead>
                    <TableHead>Coincidencia</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentMatches.map((match, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{match.sale.orden}</TableCell>
                      <TableCell>{match.sale.nombre}</TableCell>
                      <TableCell className="font-mono text-xs">{match.sale.referencia}</TableCell>
                      <TableCell className="font-mono text-xs">{match.bankTransaction.referencia}</TableCell>
                      <TableCell>{formatCurrency(parseFloat(match.sale.montoBs || '0'))}</TableCell>
                      <TableCell>{formatCurrency(match.bankTransaction.monto)}</TableCell>
                      <TableCell>
                        <Badge variant={getMatchBadgeVariant(match.matchType, match.confidence)}>
                          {match.matchType === 'exact' ? 'Exacta' : 
                           match.matchType === 'amount' ? 'Por monto' : 'Parcial'} 
                          ({Math.round(match.confidence)}%)
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cashea Orders Waiting for Verification */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Órdenes Cashea Pendientes de Verificación
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando órdenes...</p>
          ) : casheaOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay órdenes de Cashea pendientes de verificación.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Orden</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Referencia</TableHead>
                  <TableHead>Monto VES</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {casheaOrders.slice(0, 10).map((order: Sale) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.orden}</TableCell>
                    <TableCell>{order.nombre}</TableCell>
                    <TableCell className="font-mono text-xs">{order.referencia || 'N/A'}</TableCell>
                    <TableCell>{formatCurrency(parseFloat(order.montoBs || '0'))}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{order.estadoEntrega}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}