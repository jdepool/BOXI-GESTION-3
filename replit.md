# Overview

BoxiSleep is a comprehensive sales management system for a sleep products company, designed to streamline sales operations from data ingestion to analytics. It allows users to upload sales data from various channels (Cashea, Shopify, Treble), manage sales records with advanced filtering and export functionalities, and track financial payments. The system provides real-time analytics on sales performance, delivery status, and channel-specific metrics, empowering informed business decisions.

# User Preferences

Preferred communication style: Simple, everyday language.

## UI Preferences
- **Cargar Datos Implementation**: ✅ Implemented as a settings/gear icon button positioned in the top-right of the tabs bar, opening a dialog with upload controls and automation settings. This separates administrative features from regular sales workflow tabs.

# System Architecture

## Frontend
The frontend is a React 18 and TypeScript single-page application. It uses Wouter for routing, TanStack Query for server state management, and shadcn/ui components (based on Radix UI) styled with Tailwind CSS for an accessible and customizable user interface.

## Backend
The backend is a RESTful API built with Express.js and TypeScript, featuring a modular structure for sales, file uploads, and analytics. A storage abstraction layer separates business logic from data access, and Multer handles Excel file uploads.

## Data Storage
PostgreSQL serves as the primary database, accessed via Drizzle ORM for type-safe operations. Key tables include `users`, `sales`, and `upload_history`. Neon's serverless PostgreSQL client manages database connections.

## Authentication
Basic username/password authentication is implemented, with user sessions managed securely through PostgreSQL session storage using `connect-pg-simple`.

## UI/UX Design
The application leverages shadcn/ui and Radix UI for consistent design and accessibility, with Tailwind CSS for styling and Lucide React for icons. The Ventas section features a tabbed interface with "Lista de Ventas", "Ventas por Completar", "Reservas", and "Pagos" tabs for managing sales data. Administrative features (data upload and automation settings) are accessed via a settings/gear icon button positioned in the top-right of the tabs bar, which opens a dialog containing the UploadZone with upload controls and Cashea automation configuration. This design separates administrative functions from regular sales workflow tabs. The Verificación section includes "Ingresos", "Egresos", and "Cashea Pago Inicial" tabs for payment verification. Despachos is a separate page with a directly editable Estado de Entrega dropdown in the sticky column for quick status updates, with customer contact information (Nombre, Teléfono, Cédula, Dirección de Despacho) positioned immediately after the delivery date for efficient dispatch workflow. The interface is optimized for space with compact headers and context-aware action buttons.

### Date Filtering
A reusable DateRangePicker component (`client/src/components/shared/date-range-picker.tsx`) provides consistent date range filtering across all tables (Pagos, Lista de Ventas, Ventas por Completar, Reservas). The component handles timezone correctly by parsing yyyy-MM-dd strings as local dates, preventing the "day before" bug that occurs when JavaScript interprets date strings as UTC.

### Tab Workflow Logic
Orders progress through tabs based on payment and delivery status:
- **Temporary Tabs (`Ventas por Completar`, `Reservas`, `Pagos`):** Hold incomplete or pending orders.
- **Permanent/Working Tabs (`Lista de Ventas`, `Despachos`):** Display processed or ready-for-delivery sales.
Orders typically move from temporary tabs to permanent tabs upon payment verification and status updates. Cashea orders have a unique workflow, appearing directly in "Lista de Ventas" and "Pagos".

## Feature Specifications
- **Sales Data Upload & Management**: Supports Excel uploads from multiple channels with complete replacement logic for Administración items (products and bank accounts) - uploads delete existing data then insert from file, preserving row order via position field. Includes automatic backup and undo mechanism. Features comprehensive filtering, searching, and export.
- **Excel Export Functionality**: Each table (Lista de Ventas, Ventas por Completar, Reservas, Pagos) has tailored exports showing only data visible/accessible in that specific tab:
  - **Lista de Ventas/Ventas por Completar/Reservas** (`/api/sales/export`): Exports table columns (order info, product details, customer info, basic payment fields with Pago Inicial, Referencia, Banco Receptor showing bank names, Monto Bs) plus accessible modal data (billing/shipping addresses, notas). Excludes Flete and Cuotas columns (only in Pagos tab).
  - **Pagos** (`/api/sales/orders/export`): Exports complete payment records with one row per installment (or one row if no installments). Includes order info, customer contact data (Nombre, Teléfono, Email, Dirección de Despacho), metric card data (Orden + Flete USD, Total Pagado USD, Pendiente USD), Seguimiento Pago notes, full Initial Payment details (pago/monto USD/Bs, fecha, referencia, banco, verificación, notas), full Flete details (pago/monto USD/Bs, fecha, referencia, banco, verificación, notas, gratis), and per-row Installment details (cuota #, fecha, pago/monto USD/Bs, referencia, banco, verificación, notas). Orders without installments show "N/A" in cuota fields.
  - Bank fields display human-readable names instead of UUIDs through banco lookup (fetches bancos catalog, creates lookup map, handles special case "otro" → "Otro($)").
- **Order & Payment Tracking**: Detailed tracking of sales, delivery statuses (nine states), and channel-specific metrics. Supports multi-product orders, manual sales, and reservations. The Pagos tab displays orders with an Asesor column showing assigned sales representatives and includes filtering by Asesor (Todos los asesores, Sin asesor, or specific asesor), Estado Entrega (all nine delivery statuses), and Canal. By default, Perdida orders are excluded from the view; they only appear when "Perdida" is explicitly selected in the Estado Entrega filter, allowing for recovery when needed. The Perdida button displays a green icon indicator when an order is already marked as Perdida. Filter implementation uses whitelist validation in the route layer to ensure only valid delivery statuses are processed, with defensive normalization converting any invalid values to undefined.
- **Advanced Payment System**: Manages initial payments, freight, and installments with distinct fields for "agreed payment" (pago*) and "actual payment" (monto*). Includes a "Verificación" section for tracking and updating payment verification statuses, with Estado filter ("Verificado", "Por verificar", "Rechazado") for quick filtering of payment verification status across all payment types, plus a reset filters button to clear all applied filters. Automatically updates `estadoEntrega` to "A despachar" when balances reach zero. Supports manual status control.
- **Estado Entrega Workflow**: Channel-specific delivery status progression ensures accurate order tracking:
  - **Manual/Shopify orders**: Stay "Pendiente" until fully paid (balance = 0), then automatically transition to "A despachar" - they never use "En Proceso" status
  - **Cashea orders only**: Use "En Proceso" → "A despachar" workflow when fully paid
  - Automatic status updates preserve business logic while preventing incorrect status assignments for Manual sales
- **Payment Tracking Notes**: Two separate note fields serve different purposes:
  - **Notas** (sales level): General notes about products, customer preferences, and sale details
  - **Seguimiento Pago** (order level in Pagos tab): Payment follow-up notes, communication logs, and payment method issues specific to tracking payment collection
- **Asesor Management**: Automatic asesor propagation ensures one order = one asesor. When an asesor is assigned to any sale in an order, the system automatically assigns that same asesor to all sales in that order, maintaining consistency across multi-product orders.
- **Installment (Cuotas) Architecture**: Installments are tracked at the order level, with sequential numbering per order.
- **Bank Management**: Differentiates between "Receptor" (receiving) and "Emisor" (issuing) banks, with forms consistently filtering to show only "Receptor" banks.
- **Automation & Consistency**: Automatic assignment of "Cashea (BNC compartido Bs)" as Banco Receptor and automatic assignment of Fecha Pago Inicial (set to order creation date) for Cashea sales, since Cashea customers pay immediately when creating orders. Consistent naming conventions for bank fields and payment date tracking (`fechaPagoInicial`). Chrome autocomplete suppression is implemented.
- **Perdida Status**: Orders that never complete payment can be marked as "Perdida" (Lost) exclusively from the Pagos tab, operating at the order level to mark all sales in an order simultaneously.
- **Cancelar/Devolver Actions**: Sales in Lista de Ventas can be individually cancelled or marked as returned through action buttons:
  - **Cancelar**: Changes Estado Entrega to "Cancelada" for cancelled sales (visible in all views including Pagos and Despachos)
  - **Devolver**: Changes Estado Entrega to "A devolver" for products to be returned (visible in Lista de Ventas and Pagos, but not in Despachos since returned items are out of the dispatch workflow)
  - Both buttons display with green icon indicator when sale is already in that status, with disabled state to prevent duplicate actions
  - Buttons are positioned in a dedicated column (without header label) separate from the Acciones column for cleaner layout and better visual organization
- **Transportista Management**: Full CRUD operations for managing transportation companies in the Administración section. Transportistas are tracked with nombre (name), teléfono (phone), and email fields for efficient logistics coordination.
- **Automated Cashea Downloads**: Configurable automation system for periodic Cashea order downloads integrated into the Cargar Datos tab. Features:
  - **Enable/Disable Toggle**: Turn automation on/off with visual "Activa" status badge
  - **Frequency Options**: 7 configurable intervals (30 min, 1 hour, 2 hours, 4 hours, 8 hours, 16 hours, 24 hours)
  - **Download History**: Last 5 automatic downloads with status (success/error), timestamp, record count, and error messages
  - **Backend Scheduler**: Cron-based automation with proper error handling, automatic date range calculation, and deduplication
  - **Safe UI**: Loading states with skeleton loaders, error handling with visual feedback, disabled controls during loading/errors
  - **Database Tables**: `cashea_automation_config` (enabled, frequency) and `cashea_automatic_downloads` (execution history)
  - **Webhook Integration**: When Cashea orders are successfully downloaded and saved to Lista de Ventas, the system automatically sends order details to a configurable webhook URL (stored in CASHEA_WEBHOOK_URL secret). Each new Cashea order is sent individually via GET request with query parameters: Orden, nombre_cliente, telefono, producto. A 500ms delay is enforced between consecutive webhook calls to avoid rate limiting. The webhook fires ONLY for Cashea channel orders (not Shopify/Treble/Manual sales), ensuring targeted n8n workflow automation. Error handling ensures that webhook failures do not prevent order processing.

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