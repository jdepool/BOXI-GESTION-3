# Overview

BoxiSleep is a comprehensive sales management system for a sleep products company. It enables users to upload sales data from various channels (Cashea, Shopify, Treble) and manage sales records with filtering and export functionalities. The application provides real-time analytics on sales performance, delivery status, and channel-specific metrics to support informed business decisions, with financial payment tracking.

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
The application utilizes shadcn/ui for consistent design patterns and accessibility, built upon Radix UI primitives. Tailwind CSS is used for rapid and responsive styling. Lucide React provides a consistent icon set. The application features a tabbed interface for managing sales data, with dedicated views for Lista de Ventas, Ventas por completar, Reservas, and Pagos. It also includes a "Verificación" section with tabs for "Ingresos" (income) and "Egresos" (expenses), displaying payment verification statuses and allowing updates via a modal. Payment metrics in the "Pagos" tab only reflect verified payments.

## Feature Specifications
- **Sales Data Upload**: Supports Excel files from Cashea, Shopify, and Treble.
- **Sales Management**: Includes filtering, searching, and export capabilities for sales records. Notes field supports up to 200 characters with hover tooltip to view full text in truncated table display. The "Orden + Flete" metric in the Pagos tab is calculated as Total Order USD + Pago Flete USD (with Flete counted as $0 if the amount is zero or the Gratis checkbox is marked).
- **Delivery Status Tracking**: Monitors the status of product deliveries with nine distinct states.
- **Channel-Specific Metrics**: Provides insights tailored to different sales channels.
- **Multi-Product Order Handling**: Supports orders with multiple products, tracking both order-level and individual product totals.
- **Manual Sales & Reservations**: Allows for manual creation with integrated payment tracking and status updates. Includes a mandatory "Fecha de Entrega" field and consistent field ordering across forms.
- **Payment Management**: Features a Pago Inicial/Total modal with accurate total order USD display, installment tracking, and a Flete modal that displays SKU lists. Payment fields are clearly separated and renamed for better organization. Mandatory field validation is implemented for key payment fields (Pago Inicial/Total USD, Banco Receptor, Referencia), with additional warning validation for payment amounts in Monto Bs/USD. Action buttons for payment types are dynamically labeled "Agregar" or "Editar" based on existing data, and individual payment action columns replace a single "Acciones" column for better organization. The `hasFlete` calculation checks only `pagoFleteUsd` and `fleteGratis` fields (not `montoFleteUsd`) to determine if the Flete button shows "Editar". Free shipping logic (Gratis) is correctly applied to "Orden + Flete" calculations. Cache invalidation in payment modals (Flete, Pago Inicial, Cuotas) properly refreshes all sales-related queries including the Pagos tab orders query.
- **Payment Verification**: A dedicated "Verificación" section with "Ingresos" and "Egresos" tabs allows for tracking and updating the verification status of initial payments, freight, and installments. This includes status badges, notes, and a verification modal. Payments only appear in the Verificación table when BOTH Banco Receptor AND Referencia are filled, ensuring only complete payment records are ready for verification. When a payment is verified in the Verificación tab, the Pagos tab automatically refreshes to show updated Total Pagado and Pendiente metrics. The verification system deduplicates order-level payments (Pago Inicial and Flete) to prevent the same payment appearing multiple times for multi-product orders.
- **Automatic Status Updates**: When payments are verified and the Pendiente (balance) reaches zero (within 0.01 USD tolerance for floating-point precision), the system automatically updates the Estado Entrega to "A despachar" for all sales in that order. This automation only triggers during payment verification, not manual edits. Orders with zero balance but status still showing "Pendiente" or "En proceso" display with light grey styling as a visual warning.
- **Manual Status Control**: The Pagos tab includes a Estado Entrega dropdown that allows manual status changes for any order. Changes apply to all sales within the order and properly refresh all related tables through cache invalidation.
- **Payment Metrics Calculation**: In the Pagos tab, Total Pagado reflects the sum of all verified payments (Pago Inicial + Flete + Cuotas). The Pendiente (balance owed) is calculated as `Order + Flete - Total Pagado`, ensuring freight costs are included in the outstanding balance customers need to pay.
- **Installment (Cuotas) Architecture**: Installments are tracked at the order level (by `orden` field) rather than individual sale level. The Cuotas modal queries by `orden` to display all installments for the entire order, matching the behavior of the Verificación table. This ensures multi-product orders show all cuotas regardless of which sale opens the modal. Installments are numbered sequentially per order.
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