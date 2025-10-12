# Overview

BoxiSleep is a comprehensive sales management dashboard for a sleep products company. It enables users to upload sales data from various channels (Cashea, Shopify, Treble), visualize key metrics through interactive dashboards, and manage sales records with filtering and export functionalities. The application provides real-time analytics on sales performance, delivery status, and channel-specific metrics to support informed business decisions, with financial payment tracking.

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
The application utilizes shadcn/ui for consistent design patterns and accessibility, built upon Radix UI primitives. Tailwind CSS is used for rapid and responsive styling. Lucide React provides a consistent icon set. The design includes a redesigned dashboard with five financial payment tracking metrics: Total USD, Pago Inicial/Total, Total Cuotas, Total Pagado, and Pendiente. It also features a new "Verificación" section with tabs for "Ingresos" (income) and "Egresos" (expenses), displaying payment verification statuses and allowing updates via a modal. Payment metrics in the "Pagos" tab now only reflect verified payments. The "Orden + Flete" metric calculates as the sum of Pago Inicial/Total USD + Pago Flete USD, with Flete counting as $0 when either the amount is zero or the Gratis checkbox is marked.

## Feature Specifications
- **Sales Data Upload**: Supports Excel files from Cashea, Shopify, and Treble.
- **Interactive Dashboards**: Visualizes sales metrics and financial payment tracking.
- **Sales Management**: Includes filtering, searching, and export capabilities for sales records. Notes field supports up to 200 characters with hover tooltip to view full text in truncated table display.
- **Delivery Status Tracking**: Monitors the status of product deliveries with nine distinct states.
- **Channel-Specific Metrics**: Provides insights tailored to different sales channels.
- **Multi-Product Order Handling**: Supports orders with multiple products, tracking both order-level and individual product totals.
- **Manual Sales & Reservations**: Allows for manual creation with integrated payment tracking and status updates. Includes a mandatory "Fecha de Entrega" field and consistent field ordering across forms.
- **Payment Management**: Features a Pago Inicial/Total modal with accurate total order USD display, installment tracking, and a Flete modal that displays SKU lists. Payment fields are clearly separated and renamed for better organization. Mandatory field validation is implemented for key payment fields (Pago Inicial/Total USD, Banco Receptor, Referencia), with additional warning validation for payment amounts in Monto Bs/USD. Action buttons for payment types are dynamically labeled "Agregar" or "Editar" based on existing data, and individual payment action columns replace a single "Acciones" column for better organization. The Flete button shows "Editar" when either a payment amount exists OR the Gratis checkbox is marked, indicating saved data. Free shipping logic (Gratis) is correctly applied to "Orden + Flete" calculations.
- **Payment Verification**: A dedicated "Verificación" section with "Ingresos" and "Egresos" tabs allows for tracking and updating the verification status of initial payments, freight, and installments. This includes status badges, notes, and a verification modal. Payments only appear in the Verificación table when BOTH Banco Receptor AND Referencia are filled, ensuring only complete payment records are ready for verification. When a payment is verified in the Verificación tab, the Pagos tab automatically refreshes to show updated Total Pagado and Pendiente metrics.
- **Bank Field Naming**: Consistent naming across all payment types for clarity - Pago Inicial uses `bancoReceptorInicial`, Flete uses `bancoReceptorFlete`, and Cuotas use `bancoReceptorCuota`. All banco fields reference the "Receptor" (receiving) banks from the Administración tab.
- **Bank Type Classification**: Differentiates between "Receptor" (receiving) and "Emisor" (issuing) banks, with payment forms filtering to show only "Receptor" banks.
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