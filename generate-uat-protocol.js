import XLSX from 'xlsx';
import fs from 'fs';

// UAT test cases organized by module
const testCases = [
  // SALES MANAGEMENT - Lista de Ventas
  { id: 'V-001', module: 'Ventas - Lista de Ventas', testCase: 'Verify all sales records display correctly with complete information', steps: '1. Navigate to Lista de Ventas\n2. Review displayed records', expectedResult: 'All sales show: Order #, Customer info, Products, Delivery status, Payment info', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
  { id: 'V-002', module: 'Ventas - Lista de Ventas', testCase: 'Test date range filtering', steps: '1. Select start and end dates\n2. Apply filter', expectedResult: 'Only sales within selected date range appear', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
  { id: 'V-003', module: 'Ventas - Lista de Ventas', testCase: 'Test search functionality by order number', steps: '1. Enter order number in search\n2. Press Enter', expectedResult: 'Only matching order(s) display', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
  { id: 'V-004', module: 'Ventas - Lista de Ventas', testCase: 'Test channel filter (Cashea, Shopify, Treble, Manual)', steps: '1. Select channel from dropdown\n2. Apply filter', expectedResult: 'Only sales from selected channel appear', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
  { id: 'V-005', module: 'Ventas - Lista de Ventas', testCase: 'Test export to Excel', steps: '1. Apply filters as needed\n2. Click Export Excel button', expectedResult: 'Excel file downloads with filtered data', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
  { id: 'V-006', module: 'Ventas - Lista de Ventas', testCase: 'Test "Cancelar" action on individual sale', steps: '1. Click actions menu on a sale\n2. Select Cancelar\n3. Confirm action', expectedResult: 'Sale marked as Cancelada, removed from active lists', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
  { id: 'V-007', module: 'Ventas - Lista de Ventas', testCase: 'Test "A devolver" action on individual sale', steps: '1. Click actions menu on a sale\n2. Select A devolver\n3. Confirm action', expectedResult: 'Sale moved to Devoluciones tab', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
  
  // SALES MANAGEMENT - Ventas por Completar
  { id: 'V-010', module: 'Ventas - Ventas por Completar', testCase: 'Verify only incomplete sales display', steps: '1. Navigate to Ventas por Completar tab', expectedResult: 'Only sales with pending payments or incomplete delivery appear', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
  { id: 'V-011', module: 'Ventas - Ventas por Completar', testCase: 'Test asesor filter', steps: '1. Select asesor from dropdown\n2. Apply filter', expectedResult: 'Only sales assigned to selected asesor appear', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
  { id: 'V-012', module: 'Ventas - Ventas por Completar', testCase: 'Test delivery status filter', steps: '1. Select Estado Entrega from dropdown\n2. Apply filter', expectedResult: 'Only sales with selected delivery status appear', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
  
  // SALES MANAGEMENT - Reservas
  { id: 'V-020', module: 'Ventas - Reservas', testCase: 'Verify only reservations display', steps: '1. Navigate to Reservas tab', expectedResult: 'Only sales marked as Tipo: Reserva appear', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
  { id: 'V-021', module: 'Ventas - Reservas', testCase: 'Test conversion of reservation to regular sale', steps: '1. Edit reservation\n2. Change Tipo to Venta\n3. Save', expectedResult: 'Sale moves to appropriate tab based on payment/delivery status', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
  
  // SALES MANAGEMENT - Pagos
  { id: 'V-030', module: 'Ventas - Pagos', testCase: 'Verify payment summary displays correctly', steps: '1. Navigate to Pagos tab', expectedResult: 'All orders show: Orden, Total Pagado, Total Verificado, Pendiente columns', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
  { id: 'V-031', module: 'Ventas - Pagos', testCase: 'Test "Orden" column calculation (totalOrderUsd)', steps: '1. Review Orden column values', expectedResult: 'Values match sum of product totals per order', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
  { id: 'V-032', module: 'Ventas - Pagos', testCase: 'Test "Flete" column calculation (pagoFleteUsd)', steps: '1. Review Flete column values', expectedResult: 'Values match freight payment amounts', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
  { id: 'V-033', module: 'Ventas - Pagos', testCase: 'Test "Total Pagado" calculation', steps: '1. Review Total Pagado values', expectedResult: 'Equals sum of pagoInicialUsd + pagoFleteUsd + all pagoCuotaUsd', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
  { id: 'V-034', module: 'Ventas - Pagos', testCase: 'Test "Total Verificado" calculation', steps: '1. Review Total Verificado values', expectedResult: 'Equals sum of all verified payment amounts', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
  { id: 'V-035', module: 'Ventas - Pagos', testCase: 'Test "Pendiente" calculation', steps: '1. Review Pendiente values', expectedResult: 'Equals Total Pagado - Total Verificado', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
  { id: 'V-036', module: 'Ventas - Pagos', testCase: 'Test "Perdida" action on order', steps: '1. Click actions menu on order\n2. Select Perdida\n3. Confirm', expectedResult: 'All sales in order marked as Perdida, removed from active tabs', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
  { id: 'V-037', module: 'Ventas - Pagos', testCase: 'Test automatic estado entrega change when balance = 0', steps: '1. Add payments until Pendiente = 0\n2. Verify status change', expectedResult: 'Estado Entrega automatically changes to "A despachar"', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
  
  // DATA UPLOAD - Cashea
  { id: 'U-001', module: 'Data Upload - Cashea', testCase: 'Upload Cashea Excel file', steps: '1. Click settings icon\n2. Select Cashea\n3. Upload Excel file\n4. Click Upload', expectedResult: 'File processes successfully, records added/updated, backup created', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
  { id: 'U-002', module: 'Data Upload - Cashea', testCase: 'Test duplicate handling (same order number)', steps: '1. Upload file with existing orders\n2. Review results', expectedResult: 'Duplicates ignored, summary shows duplicatesIgnored count', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
  { id: 'U-003', module: 'Data Upload - Cashea', testCase: 'Test Cashea-specific defaults', steps: '1. Upload Cashea file\n2. Check new records', expectedResult: 'Banco Receptor = "Cashea (BNC compartido Bs)", Fecha Pago Inicial set', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
  { id: 'U-004', module: 'Data Upload - Cashea', testCase: 'Test backup creation', steps: '1. Upload file\n2. Check backup in upload history', expectedResult: 'Pre-upload backup created with timestamp', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
  { id: 'U-005', module: 'Data Upload - Cashea', testCase: 'Test undo functionality', steps: '1. Upload file\n2. Click Undo button\n3. Confirm', expectedResult: 'Database restored to pre-upload state', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
  
  // DATA UPLOAD - Shopify
  { id: 'U-010', module: 'Data Upload - Shopify', testCase: 'Upload Shopify CSV file', steps: '1. Click settings icon\n2. Select Shopify\n3. Upload CSV file\n4. Click Upload', expectedResult: 'File processes successfully, multi-product orders handled correctly', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
  { id: 'U-011', module: 'Data Upload - Shopify', testCase: 'Test multi-product order grouping', steps: '1. Upload Shopify file with multi-product orders\n2. Review results', expectedResult: 'Products grouped under same order number, asesor propagated', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
  
  // DATA UPLOAD - Treble  
  { id: 'U-020', module: 'Data Upload - Treble', testCase: 'Upload Treble Excel file', steps: '1. Click settings icon\n2. Select Treble\n3. Upload Excel file\n4. Click Upload', expectedResult: 'File processes successfully, records created', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
  
  // DATA UPLOAD - Manual
  { id: 'U-030', module: 'Data Upload - Manual', testCase: 'Create manual sale with single product', steps: '1. Click Nueva Venta Manual\n2. Fill all required fields\n3. Submit', expectedResult: 'Manual sale created successfully', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
  { id: 'U-031', module: 'Data Upload - Manual', testCase: 'Create manual sale with multiple products', steps: '1. Click Nueva Venta Manual\n2. Add multiple products\n3. Submit', expectedResult: 'All products created under same order, asesor propagated', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
  
  // AUTOMATION - Cashea
  { id: 'A-001', module: 'Automation - Cashea', testCase: 'Enable Cashea automation', steps: '1. Navigate to Administración\n2. Go to Automatización section\n3. Toggle Cashea automation ON\n4. Set frequency', expectedResult: 'Automation enabled, schedule set', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
  { id: 'A-002', module: 'Automation - Cashea', testCase: 'Test scheduled Cashea download', steps: '1. Wait for scheduled time\n2. Check download history', expectedResult: 'Automatic download executes, records updated, history logged', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
  { id: 'A-003', module: 'Automation - Cashea', testCase: 'Test webhook trigger', steps: '1. Configure CASHEA_WEBHOOK_URL\n2. Trigger external webhook\n3. Check results', expectedResult: 'Webhook triggers download, new orders processed', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
  { id: 'A-004', module: 'Automation - Cashea', testCase: 'Disable Cashea automation', steps: '1. Toggle Cashea automation OFF', expectedResult: 'Scheduled downloads stop', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
  
  // VERIFICATION - Ingresos
  { id: 'VF-001', module: 'Verificación - Ingresos', testCase: 'View all pending income verifications', steps: '1. Navigate to Verificación > Ingresos', expectedResult: 'All unverified income payments display', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
  { id: 'VF-002', module: 'Verificación - Ingresos', testCase: 'Match payment with bank statement', steps: '1. Enter Monto USD/Bs matching bank statement\n2. Mark as Verificado\n3. Save', expectedResult: 'Payment verified, moves to verified list', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
  { id: 'VF-003', module: 'Verificación - Ingresos', testCase: 'Filter by verification status', steps: '1. Select status filter (Pendiente/Verificado/Rechazado)\n2. Apply', expectedResult: 'Only payments with selected status appear', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
  { id: 'VF-004', module: 'Verificación - Ingresos', testCase: 'Test payment rejection', steps: '1. Select payment\n2. Mark as Rechazado\n3. Add note\n4. Save', expectedResult: 'Payment marked rejected with note', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
  
  // VERIFICATION - Egresos
  { id: 'VF-010', module: 'Verificación - Egresos', testCase: 'View pending expense verifications', steps: '1. Navigate to Verificación > Egresos', expectedResult: 'All unverified expenses display', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
  { id: 'VF-011', module: 'Verificación - Egresos', testCase: 'Verify expense against bank statement', steps: '1. Enter Monto USD/Bs\n2. Mark as Verificado\n3. Save', expectedResult: 'Expense verified successfully', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
  
  // VERIFICATION - Cashea Pago Inicial
  { id: 'VF-020', module: 'Verificación - Cashea Pago Inicial', testCase: 'View Cashea initial payments', steps: '1. Navigate to Verificación > Cashea Pago Inicial', expectedResult: 'All Cashea initial payments display', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
  { id: 'VF-021', module: 'Verificación - Cashea Pago Inicial', testCase: 'Verify Cashea initial payment', steps: '1. Enter Monto USD/Bs\n2. Mark as Verificado\n3. Save', expectedResult: 'Cashea payment verified', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
  
  // DESPACHOS
  { id: 'D-001', module: 'Despachos', testCase: 'View all orders ready for dispatch', steps: '1. Navigate to Despachos', expectedResult: 'All orders with Estado Entrega = "A despachar" appear', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
  { id: 'D-002', module: 'Despachos', testCase: 'Update delivery status', steps: '1. Select order\n2. Change Estado Entrega\n3. Save', expectedResult: 'Status updated successfully', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
  { id: 'D-003', module: 'Despachos', testCase: 'Assign transportista', steps: '1. Select order\n2. Choose transportista\n3. Save', expectedResult: 'Transportista assigned to order', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
  { id: 'D-004', module: 'Despachos', testCase: 'Test estado entrega progression (Manual/Shopify)', steps: '1. Check initial status = "Pendiente"\n2. Change to "A despachar"', expectedResult: 'Status changes correctly through workflow', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
  { id: 'D-005', module: 'Despachos', testCase: 'Test estado entrega progression (Cashea)', steps: '1. Check initial status = "En proceso"\n2. Change to "A despachar"', expectedResult: 'Cashea orders follow correct workflow', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
  
  // DEVOLUCIONES
  { id: 'DV-001', module: 'Devoluciones', testCase: 'View all returns', steps: '1. Navigate to Devoluciones', expectedResult: 'All sales marked "A devolver" or "Devuelto" appear', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
  { id: 'DV-002', module: 'Devoluciones', testCase: 'Process return (mark as Devuelto)', steps: '1. Select return\n2. Click Estado Entrega dropdown\n3. Select "Devuelto"\n4. Confirm in dialog', expectedResult: 'Confirmation dialog appears, status changes to Devuelto', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
  { id: 'DV-003', module: 'Devoluciones', testCase: 'Test return confirmation dialog', steps: '1. Change status to Devuelto\n2. Review dialog message', expectedResult: 'Dialog confirms return process was completed successfully', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
  
  // REPORTES
  { id: 'R-001', module: 'Reportes - Reporte de Ordenes', testCase: 'View report without filters', steps: '1. Navigate to Reportes\n2. View Reporte de Ordenes', expectedResult: 'All sales display with complete information', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
  { id: 'R-002', module: 'Reportes - Reporte de Ordenes', testCase: 'Test date range filter', steps: '1. Select start date\n2. Select end date\n3. View results', expectedResult: 'Only sales within date range appear', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
  { id: 'R-003', module: 'Reportes - Reporte de Ordenes', testCase: 'Test sticky table headers', steps: '1. Scroll down through report\n2. Observe headers', expectedResult: 'Column headers remain visible while scrolling', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
  { id: 'R-004', module: 'Reportes - Reporte de Ordenes', testCase: 'Test horizontal scrolling', steps: '1. Scroll right to view all columns', expectedResult: 'Horizontal scrollbar appears, all columns accessible', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
  { id: 'R-005', module: 'Reportes - Reporte de Ordenes', testCase: 'Test vertical scrolling', steps: '1. Scroll down through records', expectedResult: 'Vertical scrollbar appears, all records accessible', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
  { id: 'R-006', module: 'Reportes - Reporte de Ordenes', testCase: 'Download Excel report', steps: '1. Apply filters as needed\n2. Click Descargar Excel', expectedResult: 'Excel file downloads with all columns including dynamic installments', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
  { id: 'R-007', module: 'Reportes - Reporte de Ordenes', testCase: 'Verify Pendiente calculation in report', steps: '1. View report\n2. Check Pendiente values', expectedResult: 'Pendiente = Total USD - Pago Inicial USD - Pago Flete USD - Sum(Pago Cuota USD)', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
  
  // ADMINISTRACION - Asesores
  { id: 'AD-001', module: 'Administración - Asesores', testCase: 'Create new asesor', steps: '1. Navigate to Administración\n2. Click Nuevo Asesor\n3. Fill form\n4. Submit', expectedResult: 'Asesor created successfully', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
  { id: 'AD-002', module: 'Administración - Asesores', testCase: 'Edit existing asesor', steps: '1. Select asesor\n2. Click edit\n3. Update info\n4. Save', expectedResult: 'Asesor updated successfully', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
  { id: 'AD-003', module: 'Administración - Asesores', testCase: 'Delete asesor', steps: '1. Select asesor\n2. Click delete\n3. Confirm', expectedResult: 'Asesor deleted successfully', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
  
  // ADMINISTRACION - Transportistas
  { id: 'AD-010', module: 'Administración - Transportistas', testCase: 'Create new transportista', steps: '1. Navigate to Administración\n2. Click Nuevo Transportista\n3. Fill form\n4. Submit', expectedResult: 'Transportista created successfully', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
  { id: 'AD-011', module: 'Administración - Transportistas', testCase: 'Edit transportista', steps: '1. Select transportista\n2. Edit details\n3. Save', expectedResult: 'Transportista updated successfully', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
  { id: 'AD-012', module: 'Administración - Transportistas', testCase: 'Delete transportista', steps: '1. Select transportista\n2. Delete\n3. Confirm', expectedResult: 'Transportista deleted successfully', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
  
  // EDGE CASES & ERROR HANDLING
  { id: 'E-001', module: 'Edge Cases', testCase: 'Test upload with invalid file format', steps: '1. Try to upload .txt or .pdf file', expectedResult: 'Error message: Only Excel/CSV files allowed', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
  { id: 'E-002', module: 'Edge Cases', testCase: 'Test upload with empty file', steps: '1. Upload empty Excel file', expectedResult: 'Error message or handles gracefully', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
  { id: 'E-003', module: 'Edge Cases', testCase: 'Test upload with missing required columns', steps: '1. Upload file missing required fields', expectedResult: 'Clear error message indicating missing columns', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
  { id: 'E-004', module: 'Edge Cases', testCase: 'Test form submission with missing required fields', steps: '1. Try to submit form without required data', expectedResult: 'Validation errors display, form does not submit', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
  { id: 'E-005', module: 'Edge Cases', testCase: 'Test concurrent uploads', steps: '1. Upload two files simultaneously', expectedResult: 'Both process correctly or queue properly', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
  { id: 'E-006', module: 'Edge Cases', testCase: 'Test very large file upload (500+ records)', steps: '1. Upload large Excel file', expectedResult: 'Processes successfully or shows progress indicator', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
  { id: 'E-007', module: 'Edge Cases', testCase: 'Test browser refresh during operation', steps: '1. Start upload/operation\n2. Refresh browser', expectedResult: 'No data corruption, clear state recovery', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
  { id: 'E-008', module: 'Edge Cases', testCase: 'Test special characters in text fields', steps: '1. Enter special characters (é, ñ, ü, etc.)\n2. Save', expectedResult: 'Characters display and save correctly', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
  { id: 'E-009', module: 'Edge Cases', testCase: 'Test negative numbers in payment fields', steps: '1. Try to enter negative payment amount', expectedResult: 'Validation prevents or handles appropriately', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
  { id: 'E-010', module: 'Edge Cases', testCase: 'Test session timeout', steps: '1. Leave app idle for extended period\n2. Try to perform action', expectedResult: 'Redirects to login or shows session expired message', actualResult: '', status: '☐', testerName: '', dateCompleted: '' },
];

// Create workbook
const wb = XLSX.utils.book_new();

// Create main test cases sheet
const headers = [
  'Test ID',
  'Module/Feature', 
  'Test Case Description',
  'Steps to Execute',
  'Expected Result',
  'Status (☐=Not Done, ☑=Pass, ☒=Fail)',
  'Actual Result',
  'Tester Name',
  'Date Completed'
];

const rows = testCases.map(tc => [
  tc.id,
  tc.module,
  tc.testCase,
  tc.steps,
  tc.expectedResult,
  tc.status,
  tc.actualResult,
  tc.testerName,
  tc.dateCompleted
]);

const sheetData = [headers, ...rows];
const ws = XLSX.utils.aoa_to_sheet(sheetData);

// Set column widths
ws['!cols'] = [
  { wch: 10 },  // Test ID
  { wch: 35 },  // Module
  { wch: 50 },  // Test Case
  { wch: 60 },  // Steps
  { wch: 50 },  // Expected Result
  { wch: 35 },  // Status
  { wch: 40 },  // Actual Result
  { wch: 20 },  // Tester Name
  { wch: 15 },  // Date
];

XLSX.utils.book_append_sheet(wb, ws, "UAT Test Cases");

// Create summary/instructions sheet
const instructionsData = [
  ['BoxiSleep - User Acceptance Testing (UAT) Protocol'],
  [''],
  ['INSTRUCTIONS:'],
  ['1. Review each test case in the "UAT Test Cases" sheet'],
  ['2. Follow the "Steps to Execute" column exactly as written'],
  ['3. Compare actual results with "Expected Result" column'],
  ['4. Update "Status" column:'],
  ['   - ☐ = Not yet tested'],
  ['   - ☑ = Test passed'],
  ['   - ☒ = Test failed'],
  ['5. Record any differences in "Actual Result" column'],
  ['6. Enter your name in "Tester Name" column'],
  ['7. Enter completion date in "Date Completed" column'],
  [''],
  ['TEST ENVIRONMENT:'],
  ['- URL: [Your test environment URL]'],
  ['- Test User Credentials: [To be provided]'],
  ['- Test Data: Use provided sample files'],
  [''],
  ['MODULES COVERED:'],
  ['✓ Sales Management (Lista de Ventas, Ventas por Completar, Reservas, Pagos)'],
  ['✓ Data Upload (Cashea, Shopify, Treble, Manual)'],
  ['✓ Automation (Cashea scheduled downloads, webhooks)'],
  ['✓ Verification (Ingresos, Egresos, Cashea Pago Inicial)'],
  ['✓ Despachos (Delivery management)'],
  ['✓ Devoluciones (Returns management)'],
  ['✓ Reportes (Reporte de Ordenes)'],
  ['✓ Administración (Asesores, Transportistas)'],
  ['✓ Edge Cases & Error Handling'],
  [''],
  ['SIGN-OFF:'],
  [''],
  ['Test Lead: __________________ Date: __________'],
  [''],
  ['Product Owner: __________________ Date: __________'],
  [''],
  ['Notes:'],
  [''],
];

const wsInstructions = XLSX.utils.aoa_to_sheet(instructionsData);
wsInstructions['!cols'] = [{ wch: 80 }];
XLSX.utils.book_append_sheet(wb, wsInstructions, "Instructions");

// Create summary tracker sheet
const summaryData = [
  ['UAT SUMMARY TRACKER'],
  [''],
  ['Module', 'Total Tests', 'Passed', 'Failed', 'Not Tested', '% Complete'],
  ['Ventas - Lista de Ventas', '7', '', '', '', ''],
  ['Ventas - Ventas por Completar', '3', '', '', '', ''],
  ['Ventas - Reservas', '2', '', '', '', ''],
  ['Ventas - Pagos', '8', '', '', '', ''],
  ['Data Upload - Cashea', '5', '', '', '', ''],
  ['Data Upload - Shopify', '2', '', '', '', ''],
  ['Data Upload - Treble', '1', '', '', '', ''],
  ['Data Upload - Manual', '2', '', '', '', ''],
  ['Automation - Cashea', '4', '', '', '', ''],
  ['Verificación - Ingresos', '4', '', '', '', ''],
  ['Verificación - Egresos', '2', '', '', '', ''],
  ['Verificación - Cashea Pago Inicial', '2', '', '', '', ''],
  ['Despachos', '5', '', '', '', ''],
  ['Devoluciones', '3', '', '', '', ''],
  ['Reportes - Reporte de Ordenes', '7', '', '', '', ''],
  ['Administración - Asesores', '3', '', '', '', ''],
  ['Administración - Transportistas', '3', '', '', '', ''],
  ['Edge Cases', '10', '', '', '', ''],
  [''],
  ['TOTAL', '73', '', '', '', ''],
];

const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
wsSummary['!cols'] = [
  { wch: 40 },
  { wch: 12 },
  { wch: 10 },
  { wch: 10 },
  { wch: 12 },
  { wch: 12 }
];
XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

// Generate Excel file and write to disk
const filename = `BoxiSleep_UAT_Protocol_${new Date().toISOString().split('T')[0]}.xlsx`;
XLSX.writeFile(wb, filename);

console.log(`✅ UAT Protocol generated successfully: ${filename}`);
console.log(`📥 Download it from the Files panel in Replit`);
