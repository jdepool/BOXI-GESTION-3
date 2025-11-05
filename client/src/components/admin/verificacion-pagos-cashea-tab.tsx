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

  // Get payments for automatic verification (Conciliación tab)
  // Filter: Por verificar status, with Bs amounts (for bank statement matching)
  const { data: pendingPaymentsData, isLoading } = useQuery<{ data: any[]; total: number }>({
    queryKey: ["/api/sales/verification-payments", { estadoVerificacion: "Por verificar" }],
    queryFn: () => 
      fetch("/api/sales/verification-payments?estadoVerificacion=Por%20verificar&limit=9999")
        .then(res => res.json()),
    staleTime: 0, // Always fetch fresh data
    gcTime: 0, // Don't cache data
  });
  
  // Filter to only show payments with Bs amounts (can be matched with bank statements)
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
      queryClient.invalidateQueries({ queryKey: ["/api/sales/verification-payments", { estadoVerificacion: "Por verificar" }] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales/payments"] });
      
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
    
    // Clear previous verified matches to prevent duplicates when processing a new file
    setVerifiedMatches([]);
    
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

  // Helper function to count differing digits between two references
  const countDifferingDigits = (ref1: string, ref2: string): number => {
    // Clean references: remove non-numeric and leading zeros
    let clean1 = ref1.replace(/\D/g, '').replace(/^0+/, '') || '0';
    let clean2 = ref2.replace(/\D/g, '').replace(/^0+/, '') || '0';
    
    // If lengths differ significantly, they're very different
    if (clean1.length !== clean2.length) {
      return Math.max(clean1.length, clean2.length);
    }
    
    // Count differing positions
    let differingCount = 0;
    for (let i = 0; i < clean1.length; i++) {
      if (clean1[i] !== clean2[i]) {
        differingCount++;
      }
    }
    
    return differingCount;
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

    // Check for EXACT match after removing leading zeros
    // IMPORTANT: Only mark as exact when references are IDENTICAL
    if (clean1 === clean2 && clean1 !== '0') {
      console.log('✅ EXACT MATCH found (identical)!');
      return { 
        type: 'exact' as const, 
        matchingDigits: clean1.length,
        differingDigits: 0
      };
    }

    // All other cases are NOT exact (including substring/containment matches)
    // Count differing digits for near-exact matches
    const differingDigits = countDifferingDigits(ref1, ref2);
    
    console.log('❌ NOT exact match. Differing digits count:', differingDigits);

    return { 
      type: 'partial' as const, 
      matchingDigits: 0,
      differingDigits: differingDigits
    };
  };

  const findPaymentMatches = (transactions: BankTransaction[], payments: PendingPayment[]): PaymentMatch[] => {
    const matches: PaymentMatch[] = [];

    console.log('🔍 Buscando matches con nuevos criterios...', {
      transactions: transactions.length,
      payments: payments.length
    });

    for (const transaction of transactions) {
      for (const payment of payments) {
        if (!payment.referencia) continue;

        // Skip if payment doesn't have a VES amount (can't match bank statement)
        if (!payment.montoBs || payment.montoBs <= 0) continue;

        const bankAmount = transaction.monto;
        const paymentAmount = payment.montoBs;
        const amountDifference = Math.abs(bankAmount - paymentAmount);
        const isAmountExact = amountDifference === 0;
        const isAmountWithinTolerance = amountDifference <= 1000;

        console.log('💰 Comparando:', {
          orden: payment.orden,
          tipoPago: payment.tipoPago,
          transactionRef: transaction.referencia,
          paymentRef: payment.referencia,
          bankAmount,
          paymentAmount,
          amountDifference,
          isAmountExact,
          isAmountWithinTolerance
        });

        const refMatch = compareReferences(transaction.referencia, payment.referencia);
        console.log('📋 Reference match result:', refMatch);
        
        // CRITERIA 1: 100% Confidence - Exact reference + Exact amount
        if (refMatch.type === 'exact' && isAmountExact) {
          console.log('✅ 100% MATCH: Referencia exacta + Monto exacto');
          matches.push({
            payment: payment,
            bankTransaction: transaction,
            matchType: 'exact',
            confidence: 100
          });
          continue;
        }

        // CRITERIA 2a: 90% Confidence - Exact reference + Amount within tolerance (Bs 1000)
        if (refMatch.type === 'exact' && isAmountWithinTolerance && !isAmountExact) {
          console.log('⚠️ 90% MATCH: Referencia exacta + Monto dentro de tolerancia (Bs 1000)');
          matches.push({
            payment: payment,
            bankTransaction: transaction,
            matchType: 'reference_amount',
            confidence: 90
          });
          continue;
        }

        // CRITERIA 2b: 90% Confidence - Exact amount + Only 1 digit differs in reference
        if (isAmountExact && refMatch.differingDigits === 1) {
          console.log('⚠️ 90% MATCH: Monto exacto + Solo 1 dígito diferente en referencia');
          matches.push({
            payment: payment,
            bankTransaction: transaction,
            matchType: 'reference_amount',
            confidence: 90
          });
          continue;
        }

        // All other cases: REJECT (no match added)
        console.log('❌ RECHAZADO: No cumple criterios (ref exacta + monto exacto, ref exacta + tolerancia, o monto exacto + 1 dígito)');
      }
    }

    console.log(`✨ Total matches encontrados: ${matches.length}`);
    console.log('  - 100% confianza:', matches.filter(m => m.confidence === 100).length);
    console.log('  - 90% confianza:', matches.filter(m => m.confidence === 90).length);
    return matches;
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
          <CardContent className="bg-[#5883f7]">
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
      {/* Payments Pending Verification (for bank statement matching) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Pagos en Bs. Por Verificar
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