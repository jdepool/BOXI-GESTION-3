# Overview

BoxiSleep is a comprehensive sales management system for a sleep products company. It enables users to upload sales data from various channels (Cashea, Shopify, Treble) and manage sales records with filtering and export functionalities. The application provides real-time analytics on sales performance, delivery status, and channel-specific metrics to support informed business decisions, with financial payment tracking.

# Recent Changes

**2025-10-14**: Reordered Despachos table columns for improved workflow: Orden → Estado de Entrega → Fecha de Entrega → Producto → Cantidad → Dirección de Despacho → Nombre → Teléfono → Email → Cédula → Dirección de Facturación → Fecha → Canal → Acciones. This prioritizes delivery status and date visibility. Renamed "Estado" to "Estado de Entrega" and "Cliente" to "Nombre" for consistency. Warning simplifications: Fecha de Entrega shows "⚠️ Sin fecha" (only when status is "A despachar" and date missing), addresses show "⚠️ Sin dirección" (removed "Pendiente de agregar" text). Earlier: Pagos table lighter styling with `text-muted-foreground`; auto-calculation for Total Orden USD in manual forms.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend
Built with React 18 and TypeScript, the frontend uses a single-page application architecture. Wouter handles client-side routing, and TanStack Query manages server state and caching. The UI is constructed with shadcn/ui components (based on Radix UI) styled with Tailwind CSS, ensuring accessibility and customizability.

## Backend
The backend is a RESTful API built with Express.js and TypeScript. It features a modular structure with dedicated route handlers for sales, file uploads, and analytics. A storage abstraction layer separates business logic from data access. Multer middleware is used for processing Excel file uploads.

## Data Storage
PostgreSQL is the primary database, accessed via Drizzle ORM for type-safe operations. Key tables include `users`, `sales`, and `upload_history`. Drizzle provides schema validation and type inference. Neon's serverless PostgreSQL client manages the database connection for optimal performance.

## Authentication
The system uses basic username/password authentication. User sessions are managed through PostgreSQL session storage using `connect-pg-simple` for secure server-side session management.

## UI/UX Design
The application utilizes shadcn/ui for consistent design patterns and accessibility, built upon Radix UI primitives. Tailwind CSS is used for rapid and responsive styling. Lucide React provides a consistent icon set. The application features a tabbed interface for managing sales data, with dedicated views for Lista de Ventas, Ventas por completar, Reservas, Pagos, and Despachos. It also includes a "Verificación" section with tabs for "Ingresos" (income) and "Egresos" (expenses), displaying payment verification statuses and allowing updates via a modal. Payment metrics in the "Pagos" tab only reflect verified payments. The interface is space-optimized with compact headers (p-4 padding) and context-aware action buttons in the filter toolbar that appear only for relevant tabs (Nueva Venta Manual for "Ventas por completar", Nueva Reserva Manual for "Reservas"), maximizing table visibility. Table footers use minimal pagination design showing only record count (e.g., "1-20 de 162 registros") with arrow-only navigation buttons, eliminating verbose text for a cleaner interface.

### Tab Workflow Logic
The system implements a workflow where orders move between tabs based on payment status and delivery state:

**Temporary Tabs (holding areas for incomplete orders):**
- **Ventas por Completar**: Shows `tipo = 'Inmediata'` + `estadoEntrega = 'Pendiente'` orders
- **Reservas**: Shows `tipo = 'Reserva'` + `estadoEntrega = 'Pendiente'` orders
- **Pagos**: Shows orders with `estadoEntrega IN ('Pendiente', 'En proceso')` for payment management

**Permanent/Working Tabs:**
- **Lista de Ventas**: Shows all sales where `estadoEntrega ≠ 'Pendiente'` (completed/processed sales)
- **Despachos**: Shows all orders with `estadoEntrega = 'A despachar'` (ready for shipping)

**Workflow for Shopify/Manual Orders:**
1. New order enters → `estadoEntrega = 'Pendiente'` → Appears in Ventas por Completar/Reservas + Pagos (NOT in Lista de Ventas)
2. Payments verified → Pendiente reaches $0 → Auto-updates to `estadoEntrega = 'A despachar'`
3. Final state → Appears in Lista de Ventas + Despachos, disappears from Pagos + temporary tabs

**Workflow for Cashea Orders (exception):**
1. New order enters → `estadoEntrega = 'En proceso'` → Appears directly in Lista de Ventas + Pagos (skips temporary tabs)
2. Payments verified → Pendiente reaches $0 → Auto-updates to `estadoEntrega = 'A despachar'`
3. Final state → Stays in Lista de Ventas + appears in Despachos, disappears from Pagos

## Feature Specifications
- **Sales Data Upload**: Supports Excel files from Cashea, Shopify, and Treble. For Shopify orders, Total USD is correctly calculated as unit price × quantity for each line item (both webhook and file upload paths).
- **Sales Management**: Includes filtering, searching, and export capabilities for sales records. Notes field supports up to 200 characters with hover tooltip to view full text in truncated table display. The "Orden + Flete" metric in the Pagos tab is calculated as Total Order USD + Pago Flete USD (with Flete counted as $0 if the amount is zero or the Gratis checkbox is marked).
- **Delivery Status Tracking**: Monitors the status of product deliveries with nine distinct states.
- **Channel-Specific Metrics**: Provides insights tailored to different sales channels.
- **Multi-Product Order Handling**: Supports orders with multiple products, tracking both order-level and individual product totals.
- **Manual Sales & Reservations**: Allows for manual creation with integrated payment tracking and status updates. Includes a mandatory "Fecha de Entrega" field and consistent field ordering across forms.
- **Payment Management**: Features a Pago Inicial/Total modal with accurate total order USD display, installment tracking, and a Flete modal that displays SKU lists. Payment fields are clearly separated and renamed for better organization. Mandatory field validation is consistently implemented across payment types - Pago Inicial requires (Pago Inicial/Total USD, Banco Receptor, Referencia), while Cuotas require (Pago Cuota USD, Banco Receptor, Referencia) with optional Monto USD/Bs. Additional warning validation for payment amounts in Monto Bs/USD in Pago Inicial modal. Field naming follows consistent pattern: `montoInicialUsd/Bs`, `montoFleteUsd/Bs`, `montoCuotaUsd/Bs` for actual payments. All payment types distinguish between "agreed payment" (pago*) and "actual payment" (monto*) fields: Pago Inicial uses `pagoInicialUsd` (agreed) and `montoInicialUsd/Bs` (actual), Flete uses `pagoFleteUsd` (agreed) and `montoFleteUsd/Bs` (actual), Cuotas use `pagoCuotaUsd` (agreed) and `montoCuotaUsd/Bs` (actual). Action buttons for payment types are dynamically labeled "Agregar" or "Editar" based on existing data, and individual payment action columns replace a single "Acciones" column for better organization. The `hasFlete` calculation checks only `pagoFleteUsd` and `fleteGratis` fields (not `montoFleteUsd`) to determine if the Flete button shows "Editar". Free shipping logic (Gratis) is correctly applied to "Orden + Flete" calculations. Cache invalidation in payment modals (Flete, Pago Inicial, Cuotas) properly refreshes all sales-related queries including the Pagos tab orders query. Both Pago Inicial and Flete modals update all sales in the order (not just individual sales) using order-level endpoints, ensuring consistent payment data across multi-product orders.
- **Payment Verification**: A dedicated "Verificación" section with "Ingresos" and "Egresos" tabs allows for tracking and updating the verification status of initial payments, freight, and installments. This includes status badges, notes, and a verification modal. The system distinguishes between "agreed payment" fields (pago*) and "actual payment" fields (monto*): agreed payments are required to save payment modals and determine if a payment appears in Verificación, while actual payments are what get displayed for verification. Payments appear in Verificación when: the agreed payment field exists (`pagoInicialUsd` for Pago Inicial, `pagoFleteUsd` for Flete, `pagoCuotaUsd` for Cuotas), AND both Banco Receptor and Referencia are filled. The verification table displays actual payment amounts: Pago Inicial shows `montoInicialUsd/Bs`, Flete shows `montoFleteUsd/montoFleteBs`, and Cuotas show `montoCuotaUsd/montoCuotaBs`. When a payment is verified in the Verificación tab, the Pagos tab automatically refreshes to show updated Total Pagado and Pendiente metrics. The verification system deduplicates order-level payments (Pago Inicial and Flete) to prevent the same payment appearing multiple times for multi-product orders.
- **Automatic Status Updates**: When payments are verified and the Pendiente (balance) reaches zero (within 0.01 USD tolerance for floating-point precision), the system automatically updates the Estado Entrega to "A despachar" for all sales in that order. This automation only triggers during payment verification, not manual edits. Orders with zero balance but status still showing "Pendiente" or "En proceso" display with light grey styling as a visual warning.
- **Manual Status Control**: The Pagos tab includes a Estado Entrega dropdown that allows manual status changes for any order. Changes apply to all sales within the order and properly refresh all related tables through cache invalidation.
- **Payment Metrics Calculation**: In the Pagos tab, Total Pagado reflects the sum of all verified payments (Pago Inicial + Flete + Cuotas). The Pendiente (balance owed) is calculated as `Order + Flete - Total Pagado`, ensuring freight costs are included in the outstanding balance customers need to pay.
- **Installment (Cuotas) Architecture**: Installments are tracked at the order level (by `orden` field) rather than individual sale level. The Cuotas modal queries by `orden` to display all installments for the entire order, matching the behavior of the Verificación table. This ensures multi-product orders show all cuotas regardless of which sale opens the modal. Installments are numbered sequentially per order. The system uses new standardized fields (`montoCuotaUsd`, `montoCuotaBs`) for actual payments while maintaining backward compatibility with legacy fields (`cuotaAmount`, `cuotaAmountBs`). Both the Cuotas summary table and payment verification calculations check new fields first with automatic fallback to legacy fields for existing data.
- **Bank Field Naming**: Consistent naming across all payment types for clarity - Pago Inicial uses `bancoReceptorInicial`, Flete uses `bancoReceptorFlete`, and Cuotas use `bancoReceptorCuota`. All banco fields reference the "Receptor" (receiving) banks from the Administración tab.
- **Bank Type Classification**: Differentiates between "Receptor" (receiving) and "Emisor" (issuing) banks. All forms with Banco Receptor fields consistently filter to show only "Receptor" banks (payment modals and manual sales form in Administración).
- **Payment Date Tracking**: `fechaPagoInicial` field tracks the actual date Pago Inicial/Total was received, separate from the order creation date.
- **Chrome Autocomplete Suppression**: Implements unique autocomplete values to prevent unwanted autofill suggestions.
- **Cashea Auto-Bank Assignment**: All Cashea channel sales automatically have Banco Receptor set to "Cashea (BNC compartido Bs)" during both file upload and API download, matching the referencia and payment amounts that come from Cashea.

# External Dependencies

## Database Services
- **Neon Database**: Serverless PostgreSQL hosting.
- **Drizzle ORM**: Type-safe database client for schema management and querying.

## File Processing
- **SheetJS (XLSX)**: Excel file parsing library.
- **Multer**: Express middleware for handling file uploads.
- **CSV Parse**: Library for parsing CSV files from various sales channels.

## UI and Styling
- **shadcn/ui**: Pre-built component library.
- **Radix UI**: Unstyled, accessible UI primitives.
- **Tailwind CSS**: Utility-first CSS framework.
- **Lucide React**: Icon library.

## Data Management
- **TanStack Query**: Server state management, caching, and synchronization.
- **date-fns**: Date manipulation library.
- **Zod**: Schema validation library.