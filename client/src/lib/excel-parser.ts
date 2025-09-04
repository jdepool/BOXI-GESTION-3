import * as XLSX from "xlsx";

export interface ExcelRow {
  Nombre: string;
  Cedula?: string;
  Telefono?: string;
  Email?: string;
  "Total usd": number;
  Sucursal?: string;
  Tienda?: string;
  Fecha: string | number;
  Canal: string;
  Estado: string;
  "Estado pago inicial"?: string;
  "Pago inicial usd"?: number;
  Orden?: string;
  Factura?: string;
  Referencia?: string;
  "Monto en bs"?: number;
  "Estado de entrega": string;
  Product: string;
  Cantidad: number;
}

export function parseExcelFile(file: File): Promise<ExcelRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as ExcelRow[];
        
        resolve(jsonData);
      } catch (error) {
        reject(new Error(`Error parsing Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Error reading file'));
    };
    
    reader.readAsArrayBuffer(file);
  });
}

export function validateExcelStructure(data: any[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!Array.isArray(data) || data.length === 0) {
    errors.push('El archivo está vacío o no contiene datos válidos');
    return { valid: false, errors };
  }
  
  const requiredColumns = [
    'Nombre',
    'Total usd', 
    'Fecha',
    'Canal',
    'Estado',
    'Estado de entrega',
    'Product',
    'Cantidad'
  ];
  
  const firstRow = data[0];
  const missingColumns = requiredColumns.filter(col => !(col in firstRow));
  
  if (missingColumns.length > 0) {
    errors.push(`Faltan las siguientes columnas requeridas: ${missingColumns.join(', ')}`);
  }
  
  return { valid: errors.length === 0, errors };
}
