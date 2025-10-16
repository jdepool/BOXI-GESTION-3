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

interface BankTransaction {
  referencia: string;
  monto: number;
  fecha: string;
  descripcion?: string;
}

interface PendingPayment {
  paymentId: string;
  paymentType: string;
  orden: string;
  tipoPago: string;
  montoBs: number | null;
  montoUsd: number | null;
  referencia: string | null;
  bancoId: string | null;
  estadoVerificacion: string;
  notasVerificacion: string | null;
  fecha: Date | null;
}

interface PaymentMatch {
  payment: PendingPayment;
  bankTransaction: BankTransaction;
  matchType: 'exact' | 'partial' | 'amount' | 'reference_amount';
  confidence: number;
}

export function VerificacionPagosCasheaTab() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>([]);
  const [paymentMatches, setPaymentMatches] = useState<PaymentMatch[]>([]);
  const [verifiedMatches, setVerifiedMatches] = useState<PaymentMatch[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get all payments that are pending verification
  // Filter by estadoVerificacion AND estadoEntrega (only Pendiente/En proceso orders)
  const { data: pendingPaymentsData, isLoading } = useQuery<{ data: any[]; total: number }>({
    queryKey: ["/api/sales/verification-payments", { estadoVerificacion: "Por verificar", estadoEntrega: "Pendiente,En proceso" }],
    queryFn: () => 
      fetch("/api/sales/verification-payments?estadoVerificacion=Por%20verificar&estadoEntrega=Pendiente,En%20proceso&limit=9999")
        .then(res => res.json()),
    staleTime: 0, // Always fetch fresh data
    gcTime: 0, // Don't cache data
  });
  
  // Filter out payments with no Bs amount (0 or null/empty)
  const pendingPayments = (pendingPaymentsData?.data || []).filter(
    (payment: PendingPayment) => payment.montoBs && payment.montoBs > 0
  );

  // Get bancos for display
  const { data: bancos = [] } = useQuery<Array<{ id: string; banco: string }>>({
    queryKey: ["/api/admin/bancos"],
  });

  const getBancoName = (bancoId: string | null) => {
    if (!bancoId) return '-';
    const banco = bancos.find(b => b.id === bancoId);
    return banco?.banco || bancoId;
  };

  const verifyPaymentsMutation = useMutation({
    mutationFn: (matches: PaymentMatch[]) =>
      apiRequest("POST", "/api/admin/verify-cashea-payments", { matches }),
    onSuccess: (data: any, variables: PaymentMatch[]) => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales/verification-payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales/orders"] });
      
      // Append newly verified matches to existing ones (accumulate results)
      setVerifiedMatches(prev => [...prev, ...variables]);
      
      // Remove only the verified matches from paymentMatches, keep unverified ones
      setPaymentMatches(prev => 
        prev.filter(match => !variables.some(v => 
          v.payment.paymentId === match.payment.paymentId && 
          v.payment.paymentType === match.payment.paymentType
        ))
      );
      
      toast({ 
        title: "Pagos verificados", 
        description: `Se verificaron ${data?.verified || 0} de ${variables.length} pagos exitosamente.` 
      });
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
    setVerifiedMatches([]);
    toast({
      title: "Reset completado",
      description: "Se limpiaron todas las transacciones y resultados."
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
      
      // Compare with pending payments
      const matches = findPaymentMatches(data.transactions, pendingPayments);
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

  const findPaymentMatches = (transactions: BankTransaction[], payments: PendingPayment[]): PaymentMatch[] => {
    const matches: PaymentMatch[] = [];

    console.log('Buscando matches...', {
      transactions: transactions.length,
      payments: payments.length
    });

    for (const transaction of transactions) {
      for (const payment of payments) {
        if (!payment.referencia) continue;

        console.log('Comparando:', {
          transactionRef: transaction.referencia,
          paymentRef: payment.referencia,
          transactionAmount: transaction.monto,
          paymentAmount: payment.montoBs,
          orden: payment.orden,
          tipoPago: payment.tipoPago
        });

        const match = compareReferences(transaction.referencia, payment.referencia);
        console.log('Match result:', match);
        
        if (match.type === 'exact') {
          console.log('Match exacto encontrado para pago:', payment.orden, payment.tipoPago);
          matches.push({
            payment: payment,
            bankTransaction: transaction,
            matchType: 'exact',
            confidence: 100
          });
        } else if (match.type === 'partial' && match.matchingDigits >= 6) {
          // For partial matches, verify amount only if montoBs is available (VES payment)
          const paymentAmountVES = payment.montoBs;
          const bankAmount = transaction.monto;
          
          // If the payment has VES amount, check amount tolerance
          if (paymentAmountVES !== null && paymentAmountVES !== undefined) {
            console.log('Verificando montos para partial match:', {
              paymentAmountVES,
              bankAmount,
              difference: Math.abs(bankAmount - paymentAmountVES),
              matchingDigits: match.matchingDigits
            });
            
            // Para matches con menos dígitos, ser más estricto con el monto
            const amountTolerance = match.matchingDigits >= 8 ? 1000 : 100; // Mayor tolerancia para matches largos
            if (Math.abs(bankAmount - paymentAmountVES) < amountTolerance) {
              console.log('Match por referencia + monto encontrado para pago:', payment.orden, payment.tipoPago);
              const confidence = match.matchingDigits >= 8 ? 95 : 85; // Confianza basada en dígitos
              matches.push({
                payment: payment,
                bankTransaction: transaction,
                matchType: 'reference_amount',
                confidence
              });
            }
          } else {
            // For USD-only payments (no VES amount), rely on strong reference match alone
            if (match.matchingDigits >= 8) {
              console.log('Match por referencia fuerte (sin monto VES) para pago USD:', payment.orden, payment.tipoPago);
              matches.push({
                payment: payment,
                bankTransaction: transaction,
                matchType: 'reference_amount',
                confidence: 90 // High confidence for strong reference even without amount check
              });
            }
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
            Verificación Automática de Pagos
          </h3>
          <p className="text-sm text-muted-foreground">
            Carga el estado de cuenta del banco para verificar automáticamente todos los pagos pendientes
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="outline" className="flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {pendingPayments.length} pagos pendientes
          </Badge>
          {(bankTransactions.length > 0 || paymentMatches.length > 0 || verifiedMatches.length > 0) && (
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
      {/* Verification Results */}
      {verifiedMatches.length > 0 && (
        <Card className="border-green-200 bg-green-50/50">
          <CardHeader className="flex flex-col space-y-1.5 p-6 bg-[#4285fb]">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2 text-[#07085b]">
                <CheckCircle className="h-4 w-4" />
                Pagos Verificados Exitosamente
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                data-testid="clear-verified-results"
                className="flex items-center gap-1"
              >
                <RotateCcw className="h-3 w-3" />
                Limpiar Resultados
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm font-medium text-[#07080a]">
                ✓ Se verificaron {verifiedMatches.length} pagos automáticamente
              </p>

              <Separator />

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[#07085b]">Orden</TableHead>
                    <TableHead className="text-[#07085b]">Tipo de Pago</TableHead>
                    <TableHead className="text-[#07085b]">Banco</TableHead>
                    <TableHead className="text-[#07085b]">Ref. Sistema</TableHead>
                    <TableHead className="text-[#07085b]">Ref. Banco</TableHead>
                    <TableHead className="text-[#07085b]">Monto Sistema</TableHead>
                    <TableHead className="text-[#07085b]">Monto Banco</TableHead>
                    <TableHead className="text-[#07085b]">Confianza</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {verifiedMatches.map((match, index) => (
                    <TableRow key={index} data-testid={`verified-match-${index}`}>
                      <TableCell className="font-medium text-sm text-white">{match.payment.orden}</TableCell>
                      <TableCell className="text-sm text-white">
                        <Badge variant="outline" className="bg-white text-[#242527]">{match.payment.tipoPago}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{getBancoName(match.payment.bancoId)}</TableCell>
                      <TableCell className="font-mono text-xs text-white">{match.payment.referencia}</TableCell>
                      <TableCell className="font-mono text-xs font-semibold text-white">
                        {match.bankTransaction.referencia}
                      </TableCell>
                      <TableCell className="text-sm text-white">{formatCurrency(match.payment.montoBs || 0)}</TableCell>
                      <TableCell className="font-semibold text-sm text-white">{formatCurrency(match.bankTransaction.monto)}</TableCell>
                      <TableCell>
                        <Badge variant="default" className="bg-green-600">
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
                    <TableHead>Tipo de Pago</TableHead>
                    <TableHead>Banco</TableHead>
                    <TableHead>Ref. Pago</TableHead>
                    <TableHead>Ref. Banco</TableHead>
                    <TableHead>Monto Pago</TableHead>
                    <TableHead>Monto Banco</TableHead>
                    <TableHead>Coincidencia</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentMatches.map((match, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{match.payment.orden}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{match.payment.tipoPago}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{getBancoName(match.payment.bancoId)}</TableCell>
                      <TableCell className="font-mono text-xs">{match.payment.referencia}</TableCell>
                      <TableCell className="font-mono text-xs">{match.bankTransaction.referencia}</TableCell>
                      <TableCell>{formatCurrency(match.payment.montoBs || 0)}</TableCell>
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
      {/* All Pending Payments Waiting for Verification */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Pagos Pendientes de Verificación
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando pagos...</p>
          ) : pendingPayments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay pagos pendientes de verificación.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Orden</TableHead>
                  <TableHead>Tipo de Pago</TableHead>
                  <TableHead>Banco</TableHead>
                  <TableHead>Referencia</TableHead>
                  <TableHead>Monto Bs</TableHead>
                  <TableHead>Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingPayments.slice(0, 20).map((payment: PendingPayment) => (
                  <TableRow key={`${payment.paymentId}-${payment.paymentType}`}>
                    <TableCell className="font-medium">{payment.orden}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{payment.tipoPago}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{getBancoName(payment.bancoId)}</TableCell>
                    <TableCell className="font-mono text-xs">{payment.referencia || 'N/A'}</TableCell>
                    <TableCell>{formatCurrency(payment.montoBs || 0)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {payment.fecha ? new Date(payment.fecha).toLocaleDateString('es-ES') : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {pendingPayments.length > 20 && (
            <p className="text-sm text-muted-foreground mt-2">
              Mostrando 20 de {pendingPayments.length} pagos pendientes
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}