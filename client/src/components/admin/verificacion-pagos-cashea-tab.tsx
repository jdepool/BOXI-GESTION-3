import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Upload, FileText, CheckCircle, AlertCircle, DollarSign, Hash, RotateCcw } from "lucide-react";
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
  matchType: 'exact' | 'partial' | 'amount' | 'reference_amount';
  confidence: number;
}

export function VerificacionPagosCasheaTab() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>([]);
  const [paymentMatches, setPaymentMatches] = useState<PaymentMatch[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get Cashea orders that are in En proceso status
  const { data: casheaOrders = [], isLoading } = useQuery({
    queryKey: ["/api/sales", { canal: "cashea", estadoEntrega: "En proceso" }],
    queryFn: () => 
      fetch("/api/sales?canal=cashea&estadoEntrega=En proceso")
        .then(res => res.json())
        .then(data => data.data || []),
  });

  const verifyPaymentsMutation = useMutation({
    mutationFn: (matches: PaymentMatch[]) =>
      apiRequest("POST", "/api/admin/verify-cashea-payments", { matches }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      toast({ 
        title: "Pagos verificados automáticamente", 
        description: `Se verificaron ${data?.verified || 0} pagos y se actualizaron a A despachar.` 
      });
      // NO limpiar los matches automáticamente - mantener hasta reset manual
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
      // NO limpiar automáticamente las transacciones y matches previos
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setBankTransactions([]);
    setPaymentMatches([]);
    toast({
      title: "Reset completado",
      description: "Se limpiaron todas las transacciones y matches."
    });
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

      // Automatically verify high-confidence matches (>=80%)
      const highConfidenceMatches = matches.filter(match => match.confidence >= 80);
      if (highConfidenceMatches.length > 0) {
        console.log(`Verificando automáticamente ${highConfidenceMatches.length} matches con alta confianza`);
        verifyPaymentsMutation.mutate(highConfidenceMatches);
      }

      toast({ 
        title: "Archivo procesado", 
        description: `Se encontraron ${data.transactions.length} transacciones y ${matches.length} coincidencias. ${highConfidenceMatches.length} se verificaron automáticamente.` 
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

    console.log('Buscando matches...', {
      transactions: transactions.length,
      orders: orders.length
    });

    for (const transaction of transactions) {
      for (const order of orders) {
        if (!order.referenciaInicial) continue;

        console.log('Comparando:', {
          transactionRef: transaction.referencia,
          orderRef: order.referenciaInicial,
          transactionAmount: transaction.monto,
          orderAmount: order.montoInicialBs,
          orden: order.orden
        });

        const match = compareReferences(transaction.referencia, order.referenciaInicial);
        console.log('Match result:', match);
        
        if (match.type === 'exact') {
          console.log('Match exacto encontrado para orden:', order.orden);
          matches.push({
            sale: order,
            bankTransaction: transaction,
            matchType: 'exact',
            confidence: 100
          });
        } else if (match.type === 'partial' && match.matchingDigits >= 6) {
          // Si coinciden 6+ dígitos (menos restrictivo), verificar monto
          const orderAmountVES = parseFloat(order.montoInicialBs || '0');
          const bankAmount = transaction.monto;
          
          console.log('Verificando montos para partial match:', {
            orderAmountVES,
            bankAmount,
            difference: Math.abs(bankAmount - orderAmountVES),
            matchingDigits: match.matchingDigits
          });
          
          // Para matches con menos dígitos, ser más estricto con el monto
          const amountTolerance = match.matchingDigits >= 8 ? 1000 : 100; // Mayor tolerancia para matches largos
          if (Math.abs(bankAmount - orderAmountVES) < amountTolerance) {
            console.log('Match por referencia + monto encontrado para orden:', order.orden);
            const confidence = match.matchingDigits >= 8 ? 95 : 85; // Confianza basada en dígitos
            matches.push({
              sale: order,
              bankTransaction: transaction,
              matchType: 'reference_amount',
              confidence
            });
          }
        }
      }
    }

    console.log('Total matches encontrados:', matches.length);
    return matches;
  };

  const compareReferences = (ref1: string, ref2: string) => {
    // Remove non-numeric characters for comparison
    let clean1 = ref1.replace(/\D/g, '');
    let clean2 = ref2.replace(/\D/g, '');

    // Remove ALL leading zeros completely - this is key for matching
    clean1 = clean1.replace(/^0+/, '') || '0';
    clean2 = clean2.replace(/^0+/, '') || '0';

    console.log('Comparing cleaned references:', { 
      original1: ref1, 
      original2: ref2, 
      clean1, 
      clean2 
    });

    // Check for exact match after removing leading zeros
    if (clean1 === clean2 && clean1 !== '0') {
      console.log('EXACT MATCH found!');
      return { type: 'exact' as const, matchingDigits: clean1.length };
    }

    // Check if one reference contains the other completely
    const shorter = clean1.length < clean2.length ? clean1 : clean2;
    const longer = clean1.length >= clean2.length ? clean1 : clean2;
    
    if (shorter.length >= 6 && longer.includes(shorter)) {
      console.log('CONTAINS MATCH found!', { shorter, longer });
      return { type: 'exact' as const, matchingDigits: shorter.length };
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

    console.log('Consecutive digits from end:', matchingDigits);

    // If we have 8+ consecutive digits, that's a strong partial match
    if (matchingDigits >= 8) {
      return { 
        type: 'partial' as const, 
        matchingDigits: matchingDigits 
      };
    }

    // Check for substring matches (either direction) - más agresivo
    if (clean1.length >= 6 && clean2.includes(clean1)) {
      console.log('SUBSTRING MATCH 1:', clean1, 'found in', clean2);
      return { type: 'partial' as const, matchingDigits: clean1.length };
    }
    
    if (clean2.length >= 6 && clean1.includes(clean2)) {
      console.log('SUBSTRING MATCH 2:', clean2, 'found in', clean1);
      return { type: 'partial' as const, matchingDigits: clean2.length };
    }
    
    // Check for partial matches - últimos 6+ dígitos
    if (clean1.length >= 6 && clean2.length >= 6) {
      const suffix1 = clean1.slice(-6); // Últimos 6 dígitos
      const suffix2 = clean2.slice(-6);
      if (suffix1 === suffix2) {
        console.log('SUFFIX MATCH (6 digits):', suffix1);
        return { type: 'partial' as const, matchingDigits: 6 };
      }
    }
    
    // Check for prefix matches - primeros 6+ dígitos  
    if (clean1.length >= 8 && clean2.length >= 8) {
      const prefix1 = clean1.slice(0, 8); // Primeros 8 dígitos
      const prefix2 = clean2.slice(0, 8);
      if (prefix1 === prefix2) {
        console.log('PREFIX MATCH (8 digits):', prefix1);
        return { type: 'partial' as const, matchingDigits: 8 };
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
          {(bankTransactions.length > 0 || paymentMatches.length > 0) && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleReset}
              data-testid="reset-button"
              className="flex items-center gap-1"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </Button>
          )}
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
                      <TableCell className="font-mono text-xs">{match.sale.referenciaInicial}</TableCell>
                      <TableCell className="font-mono text-xs">{match.bankTransaction.referencia}</TableCell>
                      <TableCell>{formatCurrency(parseFloat(match.sale.montoInicialBs || '0'))}</TableCell>
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
                  <TableHead>Monto Bs</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {casheaOrders.slice(0, 10).map((order: Sale) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.orden}</TableCell>
                    <TableCell>{order.nombre}</TableCell>
                    <TableCell className="font-mono text-xs">{order.referenciaInicial || 'N/A'}</TableCell>
                    <TableCell>{formatCurrency(parseFloat(order.montoInicialBs || '0'))}</TableCell>
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