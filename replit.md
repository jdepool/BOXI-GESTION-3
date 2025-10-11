# Overview

BoxiSleep is a comprehensive sales management dashboard for a sleep products company. It enables users to upload sales data from various channels (Cashea, Shopify, Treble), visualize key metrics through interactive dashboards, and manage sales records with filtering and export functionalities. The application provides real-time analytics on sales performance, delivery status, and channel-specific metrics to support informed business decisions, supporting informed business decisions with financial payment tracking.

# User Preferences

Preferred communication style: Simple, everyday language.

# Recent Changes (October 2025)

## Pagos Tab - Payment Metrics Display (October 11, 2025)
- **Added**: Three essential metric columns displaying payment status at a glance in the Pagos table
- **Metrics Displayed**:
  - Orden + Flete: Total order value plus shipping cost (Total Orden USD + Pago Flete USD) (blue card)
  - Total Pagado: Total amount paid (Pago Inicial + Total Cuotas) (teal card)
  - Pendiente: Outstanding balance (Total Orden USD - Total Pagado) (orange card)
- **Implementation**:
  - Backend calculates metrics using SQL aggregation (MAX for pago inicial/flete, SUM for installments)
  - Server-side calculation of ordenPlusFlete, totalPagado and saldoPendiente for accuracy
  - Frontend displays metrics as compact colored cards matching Cuotas modal design
  - Color-coded backgrounds for easy visual scanning (blue, teal, orange)
  - Light/dark theme support with appropriate contrast
- **Impact**: Users can now quickly assess payment status for each order without opening modals, improving workflow efficiency and providing instant visibility into outstanding balances. The simplified metrics focus on what matters most: total owed, total paid, and what's pending.

## Ventas por Completar - Verificado Button Removed (October 11, 2025)
- **Removed**: "Verificado" button from the Ventas por completar table
- **Reason**: Button functionality will be moved to a new dedicated tab in a future update
- **Impact**: The table now only shows Edit and Email action buttons, streamlining the interface until the verification feature is relocated

## Pago Inicial/Total Modal - Mandatory Field Validation (October 11, 2025)
- **Added**: Mandatory field validation for Pago Inicial/Total modal
- **Required Fields** (blocking save):
  - Pago Inicial/Total USD: Must be filled and greater than 0
  - Banco Receptor: Must select a valid bank (cannot be "Sin banco")
  - Referencia: Must be filled (cannot be empty or whitespace)
- **Warning Validation** (non-blocking):
  - Shows warning "No has incluído el Monto pagado" when both Monto Bs and Monto USD are empty
  - Allows save to proceed but reminds user to add payment amount in Bs or USD
- **Implementation**:
  - Mandatory validation runs first, blocking save if fields are missing
  - Warning validation runs after, showing toast but allowing save to continue
  - Visual feedback: Red borders, red labels with asterisks (*), and error messages below invalid fields
  - Error toast for mandatory fields (destructive variant) vs warning toast for monto fields (default variant)
  - Error state resets when modal opens (separate useEffect with [open] dependency)
  - Form data resets when sale changes (useEffect with [sale] dependency)
- **Impact**: Ensures data quality by preventing incomplete payment records from being saved while providing helpful reminders for optional fields

## Pagos Tab - Dynamic "Agregar" / "Editar" Button Text (October 11, 2025)
- **Changed**: Action buttons in Pagos Tab now show "Agregar" (when empty) or "Editar" (when data exists)
- **Implementation**:
  - Backend now returns payment status flags for each order: `hasPagoInicial`, `hasFlete`, and `installmentCount`
  - Pago Inicial/Total: Shows "Editar" if `pagoInicialUsd` OR `fechaPagoInicial` exists
  - Flete: Shows "Editar" if `montoFleteUsd` OR `pagoFleteUsd` exists
  - Cuotas: Shows "Editar" if `installmentCount > 0`
  - Uses BOOL_OR aggregation for payment status across all products in an order
- **Impact**: Creates a uniform user experience matching the "Direcciones" column pattern in other tables, making it clear when data needs to be added vs edited

## Pagos Tab - Separate Action Columns (October 11, 2025)
- **Changed**: Replaced the single "Acciones" column with three separate columns: "Pago Inicial/Total", "Flete", and "Cuotas"
- **Implementation**:
  - Each action button now has its own dedicated column with centered alignment
  - Column widths: Pago Inicial/Total (150px), Flete (100px), Cuotas (100px)
  - Updated table colspan from 8 to 10 to accommodate the new structure
- **Impact**: Provides a cleaner, more organized layout that matches the look and feel of other tables in the application

## Pagos Tab - Fixed Wrong Order Data in Modals (October 11, 2025)
- **Fixed**: Clicking on an order row in the Pagos Tab now shows the correct order data in all modals (Pago Inicial/Total, Flete, Cuotas)
- **Issue**: Order #2386 was showing data from #2387 and other orders showed incorrect data
- **Root Cause**: The `#` symbol in order numbers was not being URL-encoded, causing the API to misinterpret the query parameter
- **Solution**: 
  - Added `encodeURIComponent()` to properly encode order numbers before API calls
  - Ensured all three modals (Pago Inicial, Flete, Cuotas) receive the correct `orden` value from the order object
- **Impact**: Users can now reliably access the correct order information from any modal in the Pagos Tab

## Notes Character Limit Increased (October 11, 2025)
- **Changed**: Increased the character limit for notes from 150 to 200 characters
- **Implementation**:
  - Updated `maxLength` attribute on notes input field from 150 to 200
  - Updated `handleNotesChange` validation to allow 200 characters
- **UI Behavior**:
  - Column width remains narrow (min-w-[150px]) to save table space
  - Long notes display truncated with ellipsis (...) in the table
  - Hovering over truncated notes shows the full text (up to 200 characters) in a tooltip
- **Impact**: Users can now write more detailed notes (50 characters more than before) while maintaining the compact table layout

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
The application utilizes shadcn/ui for consistent design patterns and accessibility, built upon Radix UI primitives. Tailwind CSS is used for rapid and responsive styling. Lucide React provides a consistent icon set. The design includes a redesigned dashboard with five financial payment tracking metrics: Total USD, Pago Inicial/Total, Total Cuotas, Total Pagado, and Pendiente.

## Feature Specifications
- **Sales Data Upload**: Supports Excel files from Cashea, Shopify, and Treble.
- **Interactive Dashboards**: Visualizes sales metrics and financial payment tracking.
- **Sales Management**: Includes filtering, searching, and export capabilities for sales records. Notes field supports up to 200 characters with hover tooltip to view full text in truncated table display.
- **Delivery Status Tracking**: Monitors the status of product deliveries with nine distinct states (`Pendiente`, `Perdida`, `En proceso`, `A despachar`, `En tránsito`, `Entregado`, `A devolver`, `Devuelto`, `Cancelada`).
- **Channel-Specific Metrics**: Provides insights tailored to different sales channels.
- **Multi-Product Order Handling**: Supports orders with multiple products, tracking both order-level and individual product totals.
- **Manual Sales & Reservations**: Allows for manual creation with integrated payment tracking and status updates. Includes a mandatory "Fecha de Entrega" field and consistent field ordering across forms.
- **Payment Management**: Features a Pago Inicial/Total modal with accurate total order USD display, installment tracking with `pagoCuotaUsd` field, and a Flete modal that displays SKU lists. Payment fields are clearly separated and renamed for better organization (e.g., `referenciaInicial`, `montoInicialBs`).
- **Bank Type Classification**: Differentiates between "Receptor" (receiving) and "Emisor" (issuing) banks, with payment forms filtering to show only "Receptor" banks.
- **Payment Date Tracking**: `fechaPagoInicial` field tracks the actual date Pago Inicial/Total was received, separate from the order creation date.
- **Chrome Autocomplete Suppression**: Implements unique autocomplete values to prevent unwanted autofill suggestions.

# External Dependencies

## Database Services
- **Neon Database**: Serverless PostgreSQL hosting.
- **Drizzle ORM**: Type-safe database client for schema management and querying.

<h2>File Processing</h2>
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