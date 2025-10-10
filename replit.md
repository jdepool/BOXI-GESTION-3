# Overview

BoxiSleep is a comprehensive sales management dashboard for a sleep products company. It enables users to upload sales data from various channels (Cashea, Shopify, Treble), visualize key metrics through interactive dashboards, and manage sales records with filtering and export functionalities. The application provides real-time analytics on sales performance, delivery status, and channel-specific metrics to support informed business decisions.

# Recent Changes (October 2025)

## Payment Installments - Pago Cuota USD Field Addition (October 10, 2025)
- **Added**: New `pagoCuotaUsd` field to payment installments for tracking agreed installment payment amounts
- **Database Field**: `pago_cuota_usd` (decimal) in payment_installments table
- **Purpose**: Allows tracking the agreed/expected installment payment amount separately from the actual payment amounts
- **UI Integration**:
  - Added "Pago Cuota USD" input field in the payment installments form (optional field)
  - Added "Pago Cuota USD" column in the installments display table
  - Field appears between "Monto Bs" and "Banco" in the form
- **Backend**: Auto-handled through Drizzle schema validation in create/update installment endpoints
- **Bug Fix**: Added missing `verificado` boolean field to payment_installments schema (default: true) to resolve database query errors

## Flete Modal Field Reordering and Pago Flete USD Addition (October 10, 2025)
- **Added**: New `pagoFleteUsd` field to track the agreed/paid freight cost in USD
- **Database Field**: `pago_flete_usd` (decimal) in sales table - stores the freight payment amount in USD
- **Field Reordering**: Reorganized Flete Modal fields in logical payment flow order:
  1. Fecha Pago Flete (date picker)
  2. Pago Flete USD (NEW number input) - The agreed freight cost
  3. Banco Receptor (dropdown)
  4. Referencia (text)
  5. Monto Bs (si el pago es en Bs)
  6. Monto USD (si el pago es en USD)
- **Purpose**: Separate the agreed freight cost (Pago Flete USD) from the actual payment amounts (Monto Bs/USD)
- **Backend Updates**: Updated IStorage interface and updateSaleFlete method to handle the new field
- **Frontend Updates**: Added pagoFleteUsd to FleteData state and form validation

## Flete Modal SKU List (October 10, 2025)
- **Changed**: Flete modal now displays SKU list instead of "Total USD"
- **Implementation**: 
  - Added query to fetch all sales from the same order number
  - Replaced "Total USD" display with list of SKUs and quantities
  - Format: "SKU × quantity" for each product in the order
- **Multi-Product Support**: Shows all products from an order, one SKU per line
- **Fallback**: Displays single sale SKU if no order number exists
- **Location**: Sale information section at the top of the Flete modal

## Pago Inicial Field Renaming (October 10, 2025)
- **Renamed**: Pago Inicial payment fields to uniquely identify them from other payment types
- **Database Changes**:
  - `referencia` → `referenciaInicial` (Pago Inicial/Total payment reference)
  - `monto_bs` → `monto_inicial_bs` (Pago Inicial/Total amount in Bolivars)
  - `monto_usd` → `monto_inicial_usd` (Pago Inicial/Total amount in USD)
- **Purpose**: Clear separation of payment types for better data organization
  - **Pago Inicial/Total**: Uses referenciaInicial, montoInicialBs, montoInicialUsd
  - **Flete**: Uses referenciaFlete, montoFleteBs, montoFleteUsd (already separate)
  - **Cuotas**: Uses referencia, cuotaAmount, cuotaAmountBs in payment_installments table (already separate)
- **Schema Updates**: All frontend, backend, and database references updated to use new field names

## Bank Type Differentiation (October 10, 2025)
- **Added**: Bank type classification system to separate receiving and issuing banks
- **Database Field**: `tipo` field in bancos table with check constraint (values: "Receptor" or "Emisor")
- **Bank Types**:
  - **Banco Receptor** (Receiving Bank) - Used for incoming payments from sales orders
  - **Banco Emisor** (Issuing Bank) - Reserved for future expense/outflow tracking (Egresos)
- **Admin UI Updates**:
  - Added tipo selector in bank add/edit form with visual indicators
  - Added tipo column in banks table with color-coded badges (green for Receptor, blue for Emisor)
  - Icons distinguish types: ArrowDownToLine for Receptor, ArrowUpFromLine for Emisor
- **Payment Form Filtering**:
  - All payment-related forms now show only Banco Receptor banks
  - Applies to: Pago Inicial/Total modal, Payment Installments, Flete, and Manual Sales forms
  - Banco Emisor banks will be used exclusively in future Egresos feature
- **Migration**: All existing banks automatically set to tipo="Receptor"

## Payment Date Field Addition (October 9, 2025)
- **Added**: New `fechaPagoInicial` database field to track payment date separately from order creation date
- **Database Field**: `fecha_pago_inicial` (timestamp) - stores the actual date when Pago Inicial/Total was received
- **Form Label**: Updated from "Fecha Pago Inicial" to "Fecha Pago Inicial/Total" for clarity
- **Purpose**: Enables separate tracking of:
  - `fecha` = Order creation date
  - `fechaPagoInicial` = Payment date (when Pago Inicial/Total was received)
- **Default Behavior**: Defaults to today's date but remains fully editable

## Pago Inicial/Total Form Updates (October 9, 2025)
- **Removed**: Estado de Pago field from form UI (kept in database for future functionality)
- **Reason**: Payment state tracking will be managed through a different workflow to be defined later
- **Header Updates**:
  - Changed "Total USD" to "Total Order USD" to display full order amount
  - Changed "Estado de Entrega" to "Tipo" to show order type (Inmediato/Reserva)
- **Current Payment Form Fields**:
  - Fecha Pago Inicial/Total (defaults to today's date, editable)
  - Pago Inicial/Total USD
  - Banco (with "Sin banco" and "Otro ($)" options)
  - Referencia
  - Monto Bs (optional)
  - Monto en USD (optional)

## Payment Fields Reorganization (October 9, 2025)
- **Removed**: Payment information section from "Nueva Reserva Manual" form
- **Reason**: Payment fields already exist in the "Pago Inicial/Total" modal accessible from the Pagos tab
- **Workflow**: Users now create reservations with customer/product details, then add payment info via Pagos tab
- **Fields Removed** from Nueva Reserva Manual:
  - Pago Inicial USD
  - Referencia
  - Banco
  - Monto Bs
  - Monto en USD

## Chrome Autocomplete Suppression Fix (October 9, 2025)
- **Problem**: Chrome browser was ignoring `autoComplete="off"` and showing unwanted autofill suggestions on phone and address fields
- **Solution**: Implemented unique autocomplete values that break Chrome's pattern recognition
  - Teléfono: `autoComplete="nope-phone"`
  - Address fields use unique values like `nope-country-billing`, `nope-state-shipping`, etc.
- **Implementation**: Uses only unique autocomplete attribute values (no readonly tricks)
  - Prevents Chrome from recognizing field patterns
  - Allows normal typing without interference
- **Scope**: Applied to all customer info and address fields in both Nueva Venta Manual and Nueva Reserva Manual forms

## Field Order Consistency in Manual Entry Forms (October 9, 2025)
- **Nueva Venta Manual**: Added mandatory "Fecha de Entrega" field
- **Nueva Reserva Manual**: Reordered fields to match Nueva Venta Manual layout
- **Consistent Field Order** (both forms):
  1. Nombre
  2. Cédula
  3. Teléfono
  4. Email
  5. Fecha de Entrega (calendar picker, dd/MM/yyyy format)
  6. Canal (at the end)
- **Validation**: Required field with error message if not provided
- **Date Restriction**: Prevents selection of dates before yesterday

## Status Field Consolidation
- **Removed**: Duplicate "estado" field that was causing confusion
- **Single Source of Truth**: All order/delivery status now tracked exclusively through `estadoEntrega` field
- **Valid Status Values** (9 states, case-sensitive):
  - `Pendiente` - New orders awaiting payment verification
  - `Perdida` - Lost/abandoned orders
  - `En proceso` - Orders with verified payment, ready for dispatch
  - `A despachar` - Orders ready to ship
  - `En tránsito` - Orders in delivery
  - `Entregado` - Successfully delivered orders
  - `A devolver` - Orders pending return
  - `Devuelto` - Returned orders
  - `Cancelada` - Cancelled orders
- **Database Constraint**: Check constraint enforces exact value matching (case-sensitive)
- **Default Status**: All new sales/reservations default to "Pendiente"

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
The application utilizes shadcn/ui for consistent design patterns and accessibility, built upon Radix UI primitives. Tailwind CSS is used for rapid and responsive styling. Lucide React provides a consistent icon set.

## Feature Specifications
- **Sales Data Upload**: Supports Excel files from Cashea, Shopify, and Treble.
- **Interactive Dashboards**: Visualizes sales metrics and performance.
- **Sales Management**: Includes filtering, searching, and export capabilities for sales records.
- **Delivery Status Tracking**: Monitors the status of product deliveries.
- **Channel-Specific Metrics**: Provides insights tailored to different sales channels.
- **Multi-Product Order Handling**: Supports orders with multiple products, tracking both order-level and individual product totals.
- **Manual Sales & Reservations**: Allows for manual creation of sales and reservations with integrated payment tracking and status updates.

# External Dependencies

## Database Services
- **Neon Database**: Serverless PostgreSQL hosting.
- **Drizzle ORM**: Type-safe database client for schema management and querying.

## UI and Styling
- **shadcn/ui**: Pre-built component library.
- **Radix UI**: Unstyled, accessible UI primitives.
- **Tailwind CSS**: Utility-first CSS framework.
- **Lucide React**: Icon library.

<h2>File Processing</h2>
- **SheetJS (XLSX)**: Excel file parsing library.
- **Multer**: Express middleware for handling file uploads.
- **CSV Parse**: Library for parsing CSV files from various sales channels.

## Data Management
- **TanStack Query**: Server state management, caching, and synchronization.
- **date-fns**: Date manipulation library.
- **Zod**: Schema validation library.