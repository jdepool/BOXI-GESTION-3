import XLSX from 'xlsx';

// Crear un nuevo libro de trabajo
const wb = XLSX.utils.book_new();

// Definir todos los casos de prueba del UAT
const uatData = [
  // Encabezado
  ["ID", "Módulo", "Funcionalidad", "Pasos de Prueba", "Resultado Esperado", "Estado", "Probado Por", "Fecha", "Comentarios"],
  
  // === VENTAS BOXI ===
  ["VB-01", "Ventas Boxi", "Acceso a Ventas Boxi", "1. Iniciar sesión en el sistema\n2. Hacer clic en el menú 'Ventas'", "Se muestra la página de Ventas Boxi con las pestañas: Prospectos, Inmediatas, Reservas, Pagos, Lista de Ventas", "", "", "", ""],
  
  ["VB-02", "Ventas Boxi - Prospectos", "Ver prospectos activos", "1. Navegar a Ventas > Prospectos\n2. Verificar que se muestran solo prospectos con estadoProspecto = 'Activo'", "La tabla muestra únicamente prospectos activos, sin incluir los perdidos o convertidos", "", "", "", ""],
  
  ["VB-03", "Ventas Boxi - Prospectos", "Crear nuevo prospecto", "1. En Prospectos, hacer clic en 'Agregar Prospecto'\n2. Completar todos los campos requeridos\n3. Seleccionar Estado y Ciudad de los dropdowns\n4. Guardar", "El prospecto se crea exitosamente y aparece en la lista", "", "", "", ""],
  
  ["VB-04", "Ventas Boxi - Prospectos", "Convertir prospecto a orden", "1. Seleccionar un prospecto activo\n2. Hacer clic en 'Convertir a Orden'\n3. Completar datos adicionales\n4. Confirmar", "El prospecto cambia a estado 'Convertido' y se crea una orden con estado 'Pendiente'", "", "", "", ""],
  
  ["VB-05", "Ventas Boxi - Prospectos", "Seguimiento de prospectos (Fase 1, 2, 3)", "1. Abrir un prospecto\n2. Hacer clic en 'Seguimiento'\n3. Actualizar fase de seguimiento\n4. Verificar que se calcula la próxima fecha", "El sistema registra la fase actual y calcula automáticamente la fecha del próximo seguimiento según la configuración", "", "", "", ""],
  
  ["VB-06", "Ventas Boxi - Inmediatas", "Ver órdenes inmediatas", "1. Navegar a Ventas > Inmediatas\n2. Verificar el filtro de canal (Shopify, Cashea, Manual, Tienda)", "Se muestran solo órdenes de tipo 'Inmediato' de canales Boxi con estado Pendiente", "", "", "", ""],
  
  ["VB-07", "Ventas Boxi - Inmediatas", "Crear venta manual inmediata", "1. En Inmediatas, hacer clic en 'Agregar Venta Manual'\n2. Completar formulario (canal se pre-llena como 'Manual')\n3. Agregar productos\n4. Completar direcciones\n5. Guardar", "Se crea la venta con número de orden 20000+ y canal 'Manual'", "", "", "", ""],
  
  ["VB-08", "Ventas Boxi - Inmediatas", "Columna Próximo y seguimiento", "1. Verificar que existe columna 'Próximo'\n2. Hacer clic en botón 'Seguimiento' de una orden\n3. Actualizar fase de seguimiento", "La columna muestra la próxima fecha de seguimiento con código de color. El seguimiento se actualiza para todos los productos de la orden", "", "", "", ""],
  
  ["VB-09", "Ventas Boxi - Reservas", "Ver órdenes reservas", "1. Navegar a Ventas > Reservas\n2. Verificar el filtro de canal", "Se muestran solo órdenes de tipo 'Reserva' de canales Boxi con estado Pendiente", "", "", "", ""],
  
  ["VB-10", "Ventas Boxi - Reservas", "Crear reserva manual", "1. En Reservas, hacer clic en 'Agregar Reserva Manual'\n2. Completar formulario\n3. Especificar fecha de compromiso de entrega\n4. Guardar", "Se crea la reserva con fecha de compromiso y canal 'Manual'", "", "", "", ""],
  
  ["VB-11", "Ventas Boxi - Pagos", "Ver órdenes pendientes de pago", "1. Navegar a Ventas > Pagos\n2. Verificar filtro de Estado Entrega (solo Pendiente/En Proceso)", "Se muestran órdenes con saldo pendiente, filtradas por Pendiente o En Proceso", "", "", "", ""],
  
  ["VB-12", "Ventas Boxi - Pagos", "Registrar pago", "1. Seleccionar una orden con saldo pendiente\n2. Hacer clic en 'Registrar Pago'\n3. Ingresar monto, método, banco, referencia\n4. Guardar", "El pago se registra y el campo 'Pendiente' se actualiza restando el monto pagado", "", "", "", ""],
  
  ["VB-13", "Ventas Boxi - Lista de Ventas", "Ver todas las ventas Boxi", "1. Navegar a Ventas > Lista de Ventas\n2. Verificar que NO aparecen estados Pendiente ni Perdida en el filtro\n3. Aplicar filtros", "Se muestran todas las ventas Boxi (canales Shopify, Cashea, Manual, Tienda) excluyendo Pendiente y Perdida del filtro y resultados", "", "", "", ""],
  
  ["VB-14", "Ventas Boxi - Lista de Ventas", "Exportar a Excel", "1. Aplicar filtros deseados\n2. Hacer clic en botón de descarga Excel\n3. Verificar archivo descargado", "Se descarga archivo Excel con todas las ventas filtradas", "", "", "", ""],
  
  ["VB-15", "Ventas Boxi - Lista de Ventas", "Editar dirección de orden", "1. Seleccionar una orden\n2. Hacer clic en 'Editar Direcciones'\n3. Modificar dirección de despacho\n4. Checkbox direcciones iguales\n5. Guardar", "Las direcciones se actualizan. Si el checkbox está marcado, dirección de facturación se sincroniza con despacho", "", "", "", ""],
  
  // === VENTAS MOMPOX ===
  ["VM-01", "Ventas Mompox", "Acceso a Ventas Mompox", "1. Iniciar sesión en el sistema\n2. Hacer clic en el menú 'Ventas Mompox'", "Se muestra la página de Ventas Mompox con las mismas pestañas que Ventas Boxi", "", "", "", ""],
  
  ["VM-02", "Ventas Mompox", "Filtrado por canal Mompox", "1. Navegar a cualquier pestaña de Ventas Mompox\n2. Verificar que solo aparecen órdenes con canal ShopMom o que contengan 'MP'", "Se muestran solo órdenes de canales: ShopMom, Manual MP, Cashea MP, Tienda MP", "", "", "", ""],
  
  ["VM-03", "Ventas Mompox", "Crear venta manual Mompox", "1. En Inmediatas de Ventas Mompox, crear venta manual\n2. Verificar campo canal", "El canal se pre-llena automáticamente como 'Manual MP'", "", "", "", ""],
  
  ["VM-04", "Ventas Mompox", "Email de confirmación Mompox", "1. Crear o modificar una orden Mompox\n2. Verificar que se envía email de confirmación", "El email se envía desde hola@sofamompox.com usando GoDaddy SMTP", "", "", "", ""],
  
  // === ESTADOS DE ENTREGA ===
  ["EE-01", "Estados de Entrega", "Cambiar estado a En Proceso", "1. Seleccionar orden con estado Pendiente\n2. Cambiar estado a 'En Proceso'\n3. Guardar", "El estado se actualiza a 'En Proceso'", "", "", "", ""],
  
  ["EE-02", "Estados de Entrega", "Cambiar estado a Despachado", "1. Seleccionar orden En Proceso\n2. Cambiar a 'Despachado'\n3. Asignar transportista\n4. Guardar", "El estado cambia a Despachado y se registra transportista", "", "", "", ""],
  
  ["EE-03", "Estados de Entrega", "Cambiar estado a Entregado", "1. Seleccionar orden Despachado\n2. Cambiar a 'Entregado'\n3. Registrar fecha de entrega\n4. Guardar", "El estado cambia a Entregado y se registra fecha de entrega", "", "", "", ""],
  
  ["EE-04", "Estados de Entrega", "Marcar como Perdida", "1. Seleccionar cualquier orden\n2. Cambiar estado a 'Perdida'\n3. Confirmar", "La orden cambia a estado Perdida y desaparece de las listas principales", "", "", "", ""],
  
  ["EE-05", "Estados de Entrega", "Procesar devolución", "1. Seleccionar orden entregada\n2. Hacer clic en 'Devolución'\n3. SELECCIONAR tipo: '101 noches' o 'Garantía'\n4. Confirmar", "Se registra la devolución con el tipo seleccionado. El diálogo requiere selección obligatoria", "", "", "", ""],
  
  ["EE-06", "Estados de Entrega", "Cancelar diálogo de devolución", "1. Abrir diálogo de devolución\n2. Seleccionar tipo\n3. Cancelar o presionar ESC", "El diálogo se cierra y la selección se resetea (no guarda cambios)", "", "", "", ""],
  
  // === REPORTES ===
  ["RP-01", "Reportes", "Acceso a dashboard de reportes", "1. Hacer clic en menú 'Reportes'", "Se muestra dashboard con tarjetas: Reporte temporal de Ordenes, Ordenes Perdidas, Prospectos Perdidos", "", "", "", ""],
  
  ["RP-02", "Reportes", "Reporte temporal de órdenes", "1. Desde dashboard, hacer clic en 'Reporte temporal de Ordenes'\n2. Seleccionar rango de fechas\n3. Hacer clic en 'Generar Reporte'", "Se muestra tabla con todas las órdenes del período seleccionado", "", "", "", ""],
  
  ["RP-03", "Reportes", "Exportar reporte temporal", "1. Generar reporte temporal\n2. Hacer clic en botón de descarga Excel", "Se descarga archivo Excel con datos del reporte", "", "", "", ""],
  
  ["RP-04", "Reportes", "Reporte de órdenes perdidas", "1. Desde dashboard, hacer clic en 'Ordenes Perdidas'\n2. Seleccionar rango de fechas\n3. Ver resultados", "Se muestran todas las órdenes con estado 'Perdida' en el rango seleccionado", "", "", "", ""],
  
  ["RP-05", "Reportes", "Exportar órdenes perdidas", "1. Generar reporte de perdidas\n2. Descargar Excel", "Se descarga archivo con órdenes perdidas", "", "", "", ""],
  
  ["RP-06", "Reportes", "Reporte de prospectos perdidos", "1. Desde dashboard, hacer clic en 'Prospectos Perdidos'\n2. Seleccionar rango de fechas\n3. Ver resultados", "Se muestran todos los prospectos con estado 'Perdido' con información de seguimiento", "", "", "", ""],
  
  ["RP-07", "Reportes", "Exportar prospectos perdidos", "1. Generar reporte de prospectos perdidos\n2. Descargar Excel", "Se descarga archivo con prospectos perdidos", "", "", "", ""],
  
  // === CARGAR DATOS ===
  ["CD-01", "Cargar Datos", "Acceso a Cargar Datos", "1. En cualquier página principal, hacer clic en ícono de configuración (engranaje) en la esquina superior derecha", "Se abre diálogo de Cargar Datos con pestañas disponibles", "", "", "", ""],
  
  ["CD-02", "Cargar Datos", "Importar datos de Cashea", "1. Abrir Cargar Datos\n2. Ir a pestaña 'Cashea'\n3. Hacer clic en 'Descargar Ordenes Cashea'\n4. Verificar resultados", "Se descargan automáticamente las órdenes de Cashea y se importan al sistema", "", "", "", ""],
  
  ["CD-03", "Cargar Datos", "Configurar automatización Cashea", "1. En pestaña Cashea\n2. Activar automatización\n3. Configurar frecuencia (cada 30 minutos)\n4. Guardar", "La automatización se activa y ejecuta según la frecuencia configurada", "", "", "", ""],
  
  ["CD-04", "Cargar Datos", "Importar histórico - Vista previa", "1. Abrir Cargar Datos > Importar Histórico\n2. Cargar archivo Excel\n3. Hacer clic en 'Generar Vista Previa'", "Se muestra tabla con vista previa de los datos a importar con checkboxes para selección", "", "", "", ""],
  
  ["CD-05", "Cargar Datos", "Importar histórico - Modo agregar", "1. Generar vista previa\n2. Seleccionar filas a importar\n3. NO marcar checkbox 'Reemplazar datos existentes'\n4. Hacer clic en 'Importar Seleccionados'", "Los datos se agregan al sistema sin eliminar órdenes existentes", "", "", "", ""],
  
  ["CD-06", "Cargar Datos", "Importar histórico - Modo reemplazar", "1. Generar vista previa\n2. Seleccionar filas\n3. MARCAR checkbox 'Reemplazar datos existentes con el mismo número de orden'\n4. Verificar advertencia ámbar\n5. Importar", "Se eliminan órdenes existentes con los mismos números de orden del Excel, luego se importan los datos nuevos", "", "", "", ""],
  
  ["CD-07", "Cargar Datos", "Importar histórico - Campos nuevos", "1. Preparar Excel con columnas 'Urbanización (En Dirección de Despacho)' y 'Total Order USD'\n2. Importar archivo\n3. Verificar que los datos se guardan", "Los campos urbanización y totalOrderUsd se importan correctamente desde el Excel", "", "", "", ""],
  
  ["CD-08", "Cargar Datos", "Webhook Shopify Boxi", "1. Configurar webhook en Shopify apuntando a /api/webhooks/shopify\n2. Crear orden en Shopify\n3. Verificar en el sistema", "La orden de Shopify se recibe automáticamente y se crea en Ventas Boxi con canal 'Shopify'", "", "", "", ""],
  
  ["CD-09", "Cargar Datos", "Webhook ShopMom Mompox", "1. Configurar webhook en ShopMom apuntando a /api/webhooks/shopify-mompox\n2. Crear orden en ShopMom\n3. Verificar en el sistema", "La orden de ShopMom se recibe y se crea en Ventas Mompox con canal 'ShopMom'", "", "", "", ""],
  
  ["CD-10", "Cargar Datos", "Webhook Treble - Actualización direcciones", "1. Sistema recibe webhook de Treble con user_session_keys\n2. Verificar que dirección se actualiza en orden existente", "La dirección de la orden se actualiza con los datos del webhook incluyendo municipio y observaciones en referencia", "", "", "", ""],
  
  // === ADMINISTRACIÓN - PRODUCTOS ===
  ["AD-01", "Administración - Productos", "Acceso a administración", "1. Hacer clic en menú 'Administración'", "Se muestra página de administración con múltiples pestañas", "", "", "", ""],
  
  ["AD-02", "Administración - Productos", "Crear producto", "1. En pestaña PRODUCTOS\n2. Hacer clic en 'Agregar Producto'\n3. Completar nombre, SKU\n4. Seleccionar Marca, Categoría, Subcategoría, Característica (todos opcionales)\n5. Guardar", "El producto se crea con las clasificaciones seleccionadas", "", "", "", ""],
  
  ["AD-03", "Administración - Productos", "Editar producto", "1. Seleccionar producto existente\n2. Modificar datos\n3. Guardar", "Los cambios se guardan correctamente", "", "", "", ""],
  
  ["AD-04", "Administración - Productos", "Eliminar producto", "1. Seleccionar producto\n2. Hacer clic en eliminar\n3. Confirmar", "El producto se elimina del sistema", "", "", "", ""],
  
  ["AD-05", "Administración - Productos", "Importar productos desde Excel", "1. Preparar Excel con columnas: Producto (requerido), SKU, Marca, Categoría, Subcategoría, Característica\n2. Ir a importación de productos\n3. Cargar archivo\n4. Importar", "Los productos se importan y las clasificaciones se asignan mediante lookup case-insensitive", "", "", "", ""],
  
  // === ADMINISTRACIÓN - CATEGORÍAS ===
  ["AD-06", "Administración - Categorías", "Ver categorías por tipo", "1. En pestaña CATEGORÍA\n2. Usar dropdown de tipo para seleccionar: Marca, Categoría, Subcategoría, o Característica\n3. Ver resultados filtrados", "Se muestran solo las categorías del tipo seleccionado", "", "", "", ""],
  
  ["AD-07", "Administración - Categorías", "Crear categoría", "1. Seleccionar tipo en dropdown\n2. Hacer clic en 'Agregar'\n3. Ingresar nombre\n4. Guardar", "La categoría se crea con el tipo seleccionado", "", "", "", ""],
  
  ["AD-08", "Administración - Categorías", "Editar/Eliminar categoría", "1. Seleccionar categoría\n2. Editar o eliminar\n3. Confirmar", "La categoría se modifica o elimina", "", "", "", ""],
  
  // === ADMINISTRACIÓN - PRECIOS/COSTOS ===
  ["AD-09", "Administración - Precios/Costos", "Crear registro de precio", "1. En pestaña PRECIOS/COSTOS\n2. Hacer clic en 'Agregar Precio'\n3. Seleccionar producto (SKU)\n4. Ingresar precios: Inmediata, Reserva, Cashea\n5. Ingresar costo unitario USD\n6. Especificar fecha efectiva\n7. Guardar", "Se crea registro de precio con fecha efectiva. Pueden existir múltiples registros por SKU", "", "", "", ""],
  
  ["AD-10", "Administración - Precios/Costos", "Importar precios desde Excel", "1. Preparar Excel con columnas de precios\n2. Importar\n3. Verificar", "Los precios se importan correctamente", "", "", "", ""],
  
  ["AD-11", "Administración - Precios/Costos", "Función Undo", "1. Hacer cambio en precios\n2. Hacer clic en 'Deshacer'\n3. Verificar", "El último cambio se revierte", "", "", "", ""],
  
  ["AD-12", "Administración - Precios/Costos", "Cálculo totalUSD con precio Cashea", "1. Crear orden con canal Cashea\n2. Verificar que totalUSD usa precio Cashea interno", "El sistema calcula totalUSD usando el precio Cashea configurado", "", "", "", ""],
  
  // === ADMINISTRACIÓN - ESTADOS/CIUDADES ===
  ["AD-13", "Administración - Estados/Ciudades", "Ver estados", "1. Ir a pestaña ESTADOS/CIUDADES\n2. Ver lista de estados", "Se muestran 24 estados venezolanos incluyendo Distrito Capital", "", "", "", ""],
  
  ["AD-14", "Administración - Estados/Ciudades", "Crear estado", "1. Hacer clic en 'Agregar Estado'\n2. Ingresar nombre\n3. Guardar", "El estado se crea exitosamente", "", "", "", ""],
  
  ["AD-15", "Administración - Estados/Ciudades", "Ver ciudades de estado", "1. Seleccionar un estado\n2. Ver lista de ciudades asociadas", "Se muestran capital y 'Otra' para cada estado (48 ciudades totales)", "", "", "", ""],
  
  ["AD-16", "Administración - Estados/Ciudades", "Crear ciudad", "1. Seleccionar estado padre\n2. Hacer clic en 'Agregar Ciudad'\n3. Ingresar nombre\n4. Guardar", "La ciudad se crea asociada al estado seleccionado", "", "", "", ""],
  
  ["AD-17", "Administración - Estados/Ciudades", "Editar/Eliminar estado o ciudad", "1. Seleccionar elemento\n2. Usar controles táctiles para editar/eliminar\n3. Confirmar", "El elemento se modifica o elimina correctamente", "", "", "", ""],
  
  // === ADMINISTRACIÓN - OTROS ===
  ["AD-18", "Administración - Bancos", "Gestionar bancos", "1. Ir a pestaña BANCOS\n2. Crear/editar/eliminar bancos\n3. Especificar: nombre, número cuenta, tipo, moneda, método de pago", "Los bancos se gestionan correctamente", "", "", "", ""],
  
  ["AD-19", "Administración - Canales", "Gestionar canales", "1. Ir a pestaña CANALES\n2. Crear/editar/eliminar canales de venta", "Los canales se gestionan correctamente", "", "", "", ""],
  
  ["AD-20", "Administración - Asesores", "Gestionar asesores", "1. Ir a pestaña ASESORES\n2. Crear/editar/eliminar asesores\n3. Incluir nombre y email", "Los asesores se gestionan correctamente", "", "", "", ""],
  
  ["AD-21", "Administración - Transportistas", "Gestionar transportistas", "1. Ir a pestaña TRANSPORTISTAS\n2. Crear/editar/eliminar transportistas", "Los transportistas se gestionan correctamente", "", "", "", ""],
  
  ["AD-22", "Administración - Moneda", "Gestionar tipos de moneda", "1. Ir a pestaña MONEDA\n2. Verificar monedas disponibles (BS, USD)", "Las monedas están configuradas correctamente", "", "", "", ""],
  
  ["AD-23", "Administración - Métodos de Pago", "Gestionar métodos de pago", "1. Ir a pestaña MÉTODOS DE PAGO\n2. Crear/editar/eliminar métodos", "Los métodos de pago se gestionan correctamente", "", "", "", ""],
  
  ["AD-24", "Administración - Tipos de Egresos", "Gestionar tipos de egresos", "1. Ir a pestaña TIPOS DE EGRESOS\n2. Crear/editar/eliminar tipos", "Los tipos de egresos se gestionan correctamente", "", "", "", ""],
  
  ["AD-25", "Administración - Edición Órdenes", "Editar orden existente", "1. Ir a pestaña EDICIÓN DE ÓRDENES\n2. Buscar orden por número\n3. Hacer modificaciones\n4. Guardar", "La orden se actualiza con los nuevos datos", "", "", "", ""],
  
  // === PROTOCOLOS DE SEGUIMIENTO ===
  ["PS-01", "Seguimiento - Configuración", "Configurar protocolo prospectos", "1. Ir a pestaña SEGUIMIENTO\n2. En tarjeta 'Prospectos', configurar:\n   - Días entre Fase 1, 2, 3\n   - Emails de asesores (máximo 5)\n   - Email general fallback\n3. Guardar", "La configuración se guarda y se aplica a prospectos", "", "", "", ""],
  
  ["PS-02", "Seguimiento - Configuración", "Configurar protocolo órdenes", "1. En tarjeta 'Ordenes Pendientes', configurar:\n   - Días entre fases\n   - Emails de asesores\n   - Email general\n2. Guardar", "La configuración se guarda y se aplica a órdenes pendientes", "", "", "", ""],
  
  ["PS-03", "Seguimiento - Emails", "Verificar envío automático de emails", "1. Esperar la ejecución del scheduler (diario a 1:00 AM)\n2. Verificar que se envían emails a asesores según fase de seguimiento", "Se envían emails de recordatorio a asesores con prospectos/órdenes que requieren seguimiento", "", "", "", ""],
  
  // === DIRECCIONES ===
  ["DR-01", "Direcciones", "Selección jerárquica Estado-Ciudad", "1. En cualquier formulario de dirección\n2. Seleccionar Estado del dropdown\n3. Verificar que Ciudad se habilita\n4. Seleccionar Ciudad (solo muestra ciudades del estado seleccionado)", "Los dropdowns funcionan jerárquicamente. Ciudad está deshabilitada hasta seleccionar Estado", "", "", "", ""],
  
  ["DR-02", "Direcciones", "Cambio de estado resetea ciudad", "1. Seleccionar Estado\n2. Seleccionar Ciudad\n3. Cambiar Estado", "El campo Ciudad se limpia automáticamente al cambiar Estado", "", "", "", ""],
  
  ["DR-03", "Direcciones", "Checkbox direcciones iguales", "1. En formulario, completar Dirección de Despacho\n2. Verificar checkbox 'La dirección de facturación es igual a la de despacho' marcado por defecto\n3. Modificar dirección de despacho", "La dirección de facturación se sincroniza automáticamente con despacho mientras checkbox esté marcado", "", "", "", ""],
  
  ["DR-04", "Direcciones", "Direcciones diferentes", "1. Desmarcar checkbox\n2. Verificar que aparecen campos de Dirección de Facturación\n3. Completar con datos diferentes", "Se pueden ingresar direcciones diferentes para despacho y facturación", "", "", "", ""],
  
  // === NUMERACIÓN DE ÓRDENES ===
  ["NO-01", "Numeración", "Órdenes manuales", "1. Crear venta manual\n2. Verificar número de orden asignado", "El número de orden comienza en 20000+", "", "", "", ""],
  
  ["NO-02", "Numeración", "Órdenes de tienda", "1. Crear venta desde Tienda\n2. Verificar número de orden", "El número de orden comienza en 30000+", "", "", "", ""],
  
  // === SISTEMA DE EMAILS ===
  ["EM-01", "Emails", "Email confirmación Boxi", "1. Crear orden con canal Shopify/Cashea/Manual/Tienda\n2. Verificar envío de email", "El email se envía usando Microsoft Outlook Graph API", "", "", "", ""],
  
  ["EM-02", "Emails", "Email confirmación Mompox", "1. Crear orden con canal ShopMom/Manual MP/Cashea MP/Tienda MP\n2. Verificar envío de email", "El email se envía desde hola@sofamompox.com usando GoDaddy SMTP", "", "", "", ""],
  
  // === BÚSQUEDA Y FILTROS ===
  ["BF-01", "Búsqueda/Filtros", "Filtrar por fecha", "1. En cualquier tabla con filtro de fecha\n2. Seleccionar rango de fechas\n3. Aplicar", "Los resultados se filtran por el rango seleccionado", "", "", "", ""],
  
  ["BF-02", "Búsqueda/Filtros", "Filtrar por canal", "1. Usar filtro de canal\n2. Seleccionar uno o múltiples canales", "Los resultados muestran solo órdenes del canal seleccionado", "", "", "", ""],
  
  ["BF-03", "Búsqueda/Filtros", "Buscar por texto", "1. Usar campo de búsqueda\n2. Ingresar nombre, orden, o email\n3. Ver resultados", "La búsqueda filtra resultados en tiempo real", "", "", "", ""],
  
  ["BF-04", "Búsqueda/Filtros", "Filtros combinados", "1. Aplicar múltiples filtros simultáneamente (fecha + canal + estado)\n2. Ver resultados", "Todos los filtros se aplican correctamente en conjunto", "", "", "", ""],
  
  // === CÁLCULOS FINANCIEROS ===
  ["CF-01", "Cálculos", "Cálculo de Pendiente", "1. Crear orden con totalUsd = 500\n2. Registrar pago de 200\n3. Verificar campo Pendiente", "Pendiente = 300 (totalUsd - suma de pagos)", "", "", "", ""],
  
  ["CF-02", "Cálculos", "Múltiples pagos", "1. Crear orden con totalUsd = 1000\n2. Registrar pago 1: 300\n3. Registrar pago 2: 400\n4. Verificar Pendiente", "Pendiente = 300 (1000 - 300 - 400)", "", "", "", ""],
  
  ["CF-03", "Cálculos", "Soporte multi-moneda", "1. Registrar pago en BS\n2. Registrar pago en USD\n3. Verificar cálculos", "El sistema maneja correctamente múltiples monedas en la misma orden", "", "", "", ""],
  
  // === MULTI-PRODUCTO ===
  ["MP-01", "Multi-Producto", "Orden con múltiples productos", "1. Crear orden\n2. Agregar producto 1 (cantidad 2)\n3. Agregar producto 2 (cantidad 1)\n4. Guardar", "La orden se crea con múltiples productos y cantidades", "", "", "", ""],
  
  ["MP-02", "Multi-Producto", "Seguimiento multi-producto", "1. Abrir orden con 3 productos\n2. Actualizar seguimiento\n3. Verificar", "El seguimiento se aplica a TODOS los productos de la orden simultáneamente (mismo cliente)", "", "", "", ""],
  
  // === AUTENTICACIÓN ===
  ["AU-01", "Autenticación", "Inicio de sesión", "1. Ir a página de login\n2. Ingresar usuario y contraseña\n3. Hacer clic en Iniciar Sesión", "El usuario accede al sistema si las credenciales son correctas", "", "", "", ""],
  
  ["AU-02", "Autenticación", "Sesión persistente", "1. Iniciar sesión\n2. Cerrar navegador\n3. Abrir navegador y volver a la app", "La sesión se mantiene activa (almacenada en PostgreSQL)", "", "", "", ""],
  
  ["AU-03", "Autenticación", "Cerrar sesión", "1. Hacer clic en botón de cerrar sesión\n2. Verificar redirección", "El usuario cierra sesión y es redirigido al login", "", "", "", ""],
];

// Crear hoja de trabajo
const ws = XLSX.utils.aoa_to_sheet(uatData);

// Configurar ancho de columnas
ws['!cols'] = [
  { wch: 8 },   // ID
  { wch: 25 },  // Módulo
  { wch: 35 },  // Funcionalidad
  { wch: 60 },  // Pasos de Prueba
  { wch: 60 },  // Resultado Esperado
  { wch: 15 },  // Estado
  { wch: 20 },  // Probado Por
  { wch: 12 },  // Fecha
  { wch: 40 },  // Comentarios
];

// Agregar la hoja al libro
XLSX.utils.book_append_sheet(wb, ws, "UAT BoxiSleep");

// Guardar el archivo
XLSX.writeFile(wb, 'UAT_BoxiSleep.xlsx');
console.log('✅ Archivo UAT_BoxiSleep.xlsx creado exitosamente');
