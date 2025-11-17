# Overview

BoxiSleep is a comprehensive sales management system for a sleep products company, designed to streamline operations from data ingestion to analytics. It supports multiple product lines (Boxi and Mompox) and their sales channels (Shopify, ShopMom). The system's key capabilities include sales data upload, advanced record management with filtering and export, financial payment tracking, and real-time analytics on sales performance, delivery status, and channel-specific metrics to empower informed business decisions.

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
The application utilizes a React 18 and TypeScript frontend, Wouter for routing, and shadcn/ui components (based on Radix UI) styled with Tailwind CSS for an accessible user interface. A tabbed structure organizes sales management and payment verification, with administrative functions accessible via a settings icon. A `DateRangePicker` handles date filtering. The system supports two distinct sales workflow pages ("Ventas" for Boxi products and "Ventas Mompox" for Mompox products), each with identical tab structures but filtered by their respective channel groups. Manual sales forms pre-fill the `canal` field based on the product line.

## Technical Implementations
The backend is an Express.js and TypeScript RESTful API, using PostgreSQL with Drizzle ORM. Authentication is handled by basic username/password with PostgreSQL session storage. Date-only fields are stored as `YYYY-MM-DD` strings to prevent timezone issues. Canal values are normalized during upload for consistency. The order search system employs dual modes (`search`, `ordenExacto`, `orden`) to prevent historical order confusion, especially in payment modals. A dual email system sends order confirmations using GoDaddy SMTP for Mompox sales and Microsoft Outlook via Graph API for Boxi sales. Real-time notifications are implemented via WebSocket connections with automatic reconnection logic.

**Treble-Boxi Webhook Address Logic**: When the webhook receives address data with `misma_dir_fact` not containing "No" (addresses are the same), it populates BOTH `direccionDespacho*` and `direccionFacturacion*` fields with identical data. This mirrors the manual form behavior and ensures the Despacho table displays addresses correctly (since it checks `direccionFacturacionPais` first). When addresses differ, only the respective field sets are populated.

**Payment Calculation Logic**: Critical business rule for balance calculations: use `fleteAPagar` (amount customer owes) NOT `pagoFleteUsd` (amount customer paid) when calculating `ordenPlusFlete`. This ensures `saldoPendiente` correctly reflects outstanding balance. The formula `ordenPlusFlete = ordenAPagar + (fleteGratis ? 0 : fleteAPagar)` is implemented in checkAndAutoUpdateDeliveryStatus function, payment verification endpoint, and bank reconciliation auto-verification loop.
**Cashea Payment Totals Logic**: Channel-specific calculation for "Total Pagado" and "Total Verificado" in the Pagos table. For Cashea/Cashea MP orders: Only `pagoFleteUsd` (freight payments) are included in totals. For all other channels: All payment types are included (`pagoInicialUsd` + `pagoFleteUsd` + `pagoCuotaUsd`).

## Feature Specifications
- **Sales Data Management**: Supports Excel uploads, filtering, searching, and export. Includes webhook integrations for automated order ingestion from Shopify (Boxi), ShopMom (Mompox), and address updates from Treble-Boxi. Features automatic SKU enrichment and a UI-based SKU correction tool.
- **Order & Payment Tracking**: Comprehensive tracking of sales, delivery statuses, multi-product orders, and reservations. Features payment verification, multi-currency support, and `Pendiente` (balance) calculation. Includes automated payment verification via bank statement reconciliation.
- **Delivery Workflow**: Manages channel-specific delivery status progression, returns, and cancellations.
- **Lead Management (Prospectos)**: Tracks leads with a 3-phase CRM follow-up workflow, automated date calculations, visual status tracking, and daily email reminders.
- **Follow-Up Protocols (Protocolos de Seguimiento)**: Configurable 3-phase follow-up protocols for both `Prospectos` and `Ordenes Pendientes`.
- **Pricing & Cost Management**: Tracks product prices and unit costs in USD with effective dates, supporting multiple records per SKU, Excel uploads, and undo functionality, including IVA (%).
- **Product Classification System**: A flat tag-based system using a single `categorias` table for Marca, Categoría, Subcategoría, and Característica.
- **Product Components System**: A relational component tracking system for managing product composition, enabling inventory, cost calculation, and despacho verification for combo products. Includes self-referencing components for consistent queries.
- **Inventory Management**: Comprehensive warehouse inventory tracking with stock levels (actual, reservado, mínimo) per product per warehouse. Features automatic stock deduction, handles combo product components, allows negative stock, and supports dual-mode inventory upload (manual and Excel import). Includes a principal warehouse system with atomic updates for transfers and detailed telemetry for imports.
- **Estados and Ciudades Master Data**: Hierarchical address management system for Venezuela.
- **Automation**: Configurable automated Cashea order downloads and payment detail assignment.
- **Reporting**: A dashboard-based system provides access to various reports, including temporary orders, lost orders, and lost prospects, all with date filtering and Excel export.
- **Order Numbering**: Separate order number ranges for manual (20000+) and Tienda (30000+) orders.
- **Accounts Payable (Egresos)**: A 4-stage workflow system (registration, authorization, payment recording, verification) for managing expenses.
- **Guest Access System**: JWT-based token authentication system for third-party users with scoped permissions. Supports two access levels: Despacho (edit fechaDespacho only) and Inventario (edit stock levels, excluding costs/prices). Features include shareable URLs for each scope, token revocation, complete audit trail, and real-time activity monitoring. Backend enforces server-side security with field stripping to prevent unauthorized updates. All guest actions are logged with before/after values, timestamps, and IP addresses for compliance and security tracking.

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