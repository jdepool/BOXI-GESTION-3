# Overview

BoxiSleep is a sales management system for a sleep products company, aiming to streamline operations from data ingestion to analytics. It supports multiple product lines (Boxi and Mompox) across various sales channels (Shopify, ShopMom). Key capabilities include sales data upload, advanced record management, financial payment tracking, and real-time analytics on sales performance, delivery, and channel-specific metrics to empower informed business decisions.

# User Preferences

Preferred communication style: Simple, everyday language.
Cargar Datos Implementation: Implemented as a settings/gear icon button positioned in the top-right of the tabs bar, opening a dialog with upload controls and automation settings. This separates administrative features from regular sales workflow tabs.
Address Form Organization: All address forms (Direcciones, Manual Sales, Manual Reserva) display Dirección de Despacho first, followed by a checkbox (checked by default) labeled "La dirección de facturación es igual a la de despacho". Dirección de Facturación fields appear below only when the checkbox is unchecked. When checked, shipping address changes automatically sync to billing address. Despacho fields are required; facturación fields are optional when addresses differ.
Reportes Organization: Reportes tab displays a dashboard with card-based layout where each report type is accessible via a dedicated button. Currently includes "Reporte temporal de Ordenes", "Ordenes Perdidas", and "Prospectos Perdidos" cards. This scalable structure allows easy addition of new report types as separate cards.
Status Badge Color System: Standardized color-coded badges across Ingresos and Egresos verification systems using shared utility functions in `client/src/lib/badge-utils.ts`. Consistent colors: Verificado (green), Por verificar/Pagado (amber), Rechazado (purple). Egresos-specific: Por Pagar (red), Por Autorizar (blue), Borrador (grey). All colors include dark mode variants. The "Pagado a" field (formerly "Beneficiario") identifies payee in egresos workflow.
Egresos Verification Table: Simplified interface in Verificación section displays only verification-essential columns: Fecha de pago, Monto Pagado Bs, Monto Pagado USD, Referencia, Banco, Estado (con badge de color), Notas. Verification dialog similarly streamlined to show only payment-relevant details. This focused design eliminates administrative fields (Tipo, Descripción, Pagado a) from the verification workflow.
Excel Export Filtering: All Excel export buttons in Ventas Mompox (Lista de Ventas, Inmediatas, Reservas, Pagos) use `canalMompox: 'true'` filter to ensure exports match displayed data. The PagosTable component accepts `extraExportParams` prop for dynamic filtering. Export filtering follows the "what you see is what you export" principle - exported data always matches the filtered table view.
Real-Time Notifications: WebSocket-based real-time notifications display modal dialogs for critical events (e.g., Treble webhook address updates). The WebSocket provider uses refs (`wsRef`, `shouldReconnectRef`, `reconnectTimeoutRef`) to prevent memory leaks and post-unmount state updates, with automatic reconnection after 5 seconds on disconnect. All event handlers check `shouldReconnectRef.current` before updating state to prevent React warnings. Cleanup function closes WebSocket unconditionally (works for all connection states) and cancels pending reconnection timeouts.

# System Architecture

## UI/UX Design
The application uses a React 18 and TypeScript frontend with Wouter for routing. shadcn/ui components (based on Radix UI) styled with Tailwind CSS provide an accessible user interface. A tabbed structure organizes sales management and payment verification, with administrative functions under a settings icon. A `DateRangePicker` is used for date filtering. The system features distinct sales workflow pages for Boxi and Mompox products, each with identical tab structures filtered by product line. Manual sales forms pre-fill the `canal` field based on the product line.

## Technical Implementations
The backend is an Express.js and TypeScript RESTful API, utilizing PostgreSQL with Drizzle ORM. Authentication uses basic username/password with PostgreSQL session storage. Date-only fields are stored as `YYYY-MM-DD` strings to prevent timezone issues, requiring specific local date parsing patterns for calculations and display. Canal values are normalized during upload. The order search system uses dual modes to prevent historical order confusion. A dual email system handles order confirmations via GoDaddy SMTP for Mompox and Microsoft Outlook Graph API for Boxi. Real-time notifications are implemented with WebSockets and automatic reconnection logic.

**CRITICAL Date Parsing Pattern**: Date-only fields (e.g., `YYYY-MM-DD`) must be parsed as local dates (e.g., `new Date(year, month-1, day)`) to prevent timezone-related off-by-one errors. Avoid `new Date("YYYY-MM-DD")`. This pattern is critical for both backend calculations and frontend display, and specific utilities (`parseLocalDate`, `formatLocalDate`) enforce this.

**Treble-Boxi Webhook Address Logic**: When address data is received via webhook, if billing and shipping addresses are the same (`misma_dir_fact` not "No"), both `direccionDespacho*` and `direccionFacturacion*` fields are populated identically. This mirrors manual form behavior.

**Payment Calculation Logic**: `fleteAPagar` (amount customer owes) is used for `ordenPlusFlete` calculations, not `pagoFleteUsd` (amount customer paid), to accurately determine `saldoPendiente`. The formula `ordenPlusFlete = ordenAPagar + (fleteGratis ? 0 : fleteAPagar)` is applied consistently.

**Cashea Payment Totals Logic**: For Cashea/Cashea MP orders, "Total Pagado" and "Total Verificado" in the Pagos table only include `pagoFleteUsd`. For other channels, all payment types (`pagoInicialUsd` + `pagoFleteUsd` + `pagoCuotaUsd`) are included.

## Feature Specifications
- **Sales Data Management**: Excel uploads, filtering, searching, export, SKU enrichment/correction, and webhook integration for automated order/address ingestion.
- **Order & Payment Tracking**: Sales, delivery, multi-product orders, reservations, payment verification, multi-currency support, `Pendiente` balance calculation, and automated bank reconciliation.
- **Delivery Workflow**: Channel-specific delivery status progression, returns, and cancellations.
- **Lead Management (Prospectos)**: 3-phase CRM with automated date calculations, visual tracking, and email reminders.
- **Follow-Up Protocols**: Configurable 3-phase protocols for `Prospectos` and `Ordenes Pendientes`.
- **Pricing & Cost Management**: Tracks product prices and unit costs (USD) with effective dates, IVA, Excel uploads, and undo functionality.
- **Product Classification System**: Flat tag-based system (`categorias` table) for Marca, Categoría, Subcategoría, Característica.
- **Product Components System**: Relational system for managing product composition, inventory, cost, and despacho verification for combo products. Productos Excel export/import uses two-sheet format:
  - **Sheet 1 "Productos"**: SKU, Nombre, Marca, Categoría, Subcategoría, Característica
  - **Sheet 2 "Componentes"**: Producto SKU, Componente SKU, Cantidad (always exported with headers, even when empty, to provide template)
  - Import validates SKU references and surfaces explicit errors for missing SKUs or invalid data
  - Empty template rows are skipped gracefully during import
  - This format enables production-to-development data migration with full component relationships
- **Inventory Management**: Warehouse tracking (actual, reservado, mínimo stock), automatic stock deduction on `despachado` check (not date set), combo product handling, negative stock support, manual/Excel uploads, and principal warehouse system with atomic updates for transfers.
- **Estados and Ciudades Master Data**: Hierarchical address management for Venezuela.
- **Automation**: Configurable automated Cashea order downloads and payment detail assignment.
- **Reporting**: Dashboard with various reports (temporary orders, lost orders, lost prospects) with date filtering and Excel export.
- **Order Numbering**: Separate ranges for manual (20000+) and Tienda (30000+) orders.
- **Accounts Payable (Egresos)**: 4-stage workflow (registration, authorization, payment, verification) for expense management.
- **Guest Access System**: JWT-based token authentication for third-party users with scoped permissions (Despacho, Inventario). Features shareable URLs, token revocation, audit trails, and real-time activity monitoring. Server-side security enforces field stripping and logs all guest actions.

# External Dependencies

## Database Services
- **Neon Database**: Serverless PostgreSQL hosting.
- **Drizzle ORM**: Type-safe database client.

## File Processing
- **SheetJS (XLSX)**: Excel file parsing.
- **Multer**: Express middleware for file uploads.
- **CSV Parse**: CSV file parsing.

## UI and Styling
- **shadcn/ui**: Pre-built component library.
- **Radix UI**: Unstyled, accessible UI primitives.
- **Tailwind CSS**: Utility-first CSS framework.
- **Lucide React**: Icon library.

## Data Management
- **TanStack Query**: Server state management and caching.
- **date-fns**: Date manipulation.
- **Zod**: Schema validation.