# Overview

BoxiSleep is a comprehensive sales management system for a sleep products company, designed to streamline sales operations from data ingestion to analytics. It allows users to upload sales data from various channels (Cashea, Shopify, Treble), manage sales records with advanced filtering and export functionalities, and track financial payments. The system provides real-time analytics on sales performance, delivery status, and channel-specific metrics, empowering informed business decisions.

# User Preferences

Preferred communication style: Simple, everyday language.
Cargar Datos Implementation: Implemented as a settings/gear icon button positioned in the top-right of the tabs bar, opening a dialog with upload controls and automation settings. This separates administrative features from regular sales workflow tabs.
Address Form Organization: All address forms (Direcciones, Manual Sales, Manual Reserva) display Dirección de Despacho first, followed by a checkbox (checked by default) labeled "La dirección de facturación es igual a la de despacho". Dirección de Facturación fields appear below only when the checkbox is unchecked. When checked, shipping address changes automatically sync to billing address. Despacho fields are required; facturación fields are optional when addresses differ.

# System Architecture

## Frontend
The frontend is a React 18 and TypeScript single-page application, utilizing Wouter for routing, TanStack Query for server state management, and shadcn/ui components (based on Radix UI) styled with Tailwind CSS for an accessible and customizable user interface.

## Backend
The backend is a RESTful API built with Express.js and TypeScript, featuring a modular structure for sales, file uploads, and analytics. It includes a storage abstraction layer and Multer for Excel file uploads.

## Data Storage
PostgreSQL serves as the primary database, accessed via Drizzle ORM for type-safe operations. Key tables include `users`, `sales`, and `upload_history`. Neon's serverless PostgreSQL client manages database connections.

## Authentication
Basic username/password authentication is implemented, with user sessions managed securely through PostgreSQL session storage using `connect-pg-simple`.

## UI/UX Design
The application leverages shadcn/ui, Radix UI, Tailwind CSS, and Lucide React for a consistent, accessible design. The interface features a tabbed structure for sales management ("Prospectos", "Lista de Ventas", "Inmediatas", "Reservas", "Pagos"), payment verification ("Ingresos", "Egresos", "Cashea Pago Inicial"), and specialized pages for "Despachos" and "Devoluciones". Administrative functions like data upload and automation are accessed via a dedicated settings icon. Date filtering is handled by a reusable `DateRangePicker` component, ensuring timezone correctness. Orders progress through tabs based on payment and delivery status, with temporary tabs for pending orders and permanent tabs for processed sales.

## Feature Specifications
- **Sales Data Upload & Management**: Supports Excel uploads from multiple channels with complete replacement logic for administration items, including automatic backup and undo. Features comprehensive filtering, searching, and tailored export functionalities for different views.
- **Order & Payment Tracking**: Detailed tracking of sales, nine delivery statuses, and channel-specific metrics. Supports multi-product orders, manual sales, and reservations. The Pagos tab includes asesor filtering, delivery status filtering, and separate metric columns for "Orden" (totalOrderUsd) and "Flete" (pagoFleteUsd), plus "Total Pagado", "Total Verificado", and "Pendiente".
- **Advanced Payment System**: Manages initial payments, freight, and installments, differentiating between "agreed payment" and "actual payment". Includes a "Verificación" section with status filters. Automatically updates `estadoEntrega` to "A despachar" when balances reach zero.
- **Centralized Pendiente Calculation**: The Pendiente (balance) calculation is centralized in `getOrdersForPayments()` using the formula: Pendiente = ordenPlusFlete - totalVerificado. This ensures consistency across the Pagos tab and Reporte de Ordenes. Since Pendiente is calculated at the order level, all products within the same order display the same Pendiente value.
- **Estado Entrega Workflow**: Channel-specific delivery status progression (e.g., Manual/Shopify orders go from "Pendiente" to "A despachar"; Cashea orders use "En Proceso" → "A despachar").
- **Payment Tracking Notes**: Separate fields for general `Notas` (sales level) and `Seguimiento Pago` (order level, for payment follow-up).
- **Asesor Management**: Automatic asesor propagation ensures consistency across multi-product orders.
- **Installment (Cuotas) Architecture**: Installments are tracked at the order level with sequential numbering.
- **Bank Management**: Differentiates between "Receptor" and "Emisor" banks.
- **Automation & Consistency**: Automatic assignment of "Cashea (BNC compartido Bs)" as Banco Receptor and `Fecha Pago Inicial` for Cashea sales. Chrome autocomplete suppression is implemented.
- **Perdida Status**: Orders can be marked as "Perdida" (Lost) from the Pagos tab, affecting all sales within an order.
- **Cancelar/Devolver Actions**: Individual sales in "Lista de Ventas" can be marked as "Cancelada" or "A devolver", with "Devoluciones" having a dedicated management page featuring a dropdown menu in the Estado Entrega column for quick status updates and a confirmation dialog when marking as "Devuelto" to ensure the return process was successfully completed.
- **Transportista Management**: Full CRUD operations for transportation companies in the Administración section.
- **Automated Cashea Downloads**: Configurable automation system for periodic Cashea order downloads, including enable/disable toggle, frequency options, download history, backend scheduler, and webhook integration for new Cashea orders.
- **Reporte de Ordenes**: Comprehensive sales report with date filtering, sticky headers, dual-axis scrolling, Excel download with dynamic installment columns, and centralized Pendiente calculation matching the Pagos tab for consistency.
- **Order Number Sequencing**: Separate order number ranges for manually-created sales to prevent collisions and enable easy canal identification: Manual orders use 20000+ (20000, 20001, 20002...), Tienda orders use 30000+ (30000, 30001, 30002...). Both sequences are generated through the same manual sales forms.
- **Prospectos (Lead Management)**: Complete lead tracking system with separate numbering (P-0001, P-0002...) from sales orders. Features include: dedicated Prospectos tab as first tab in Sales section, minimal MVP fields (nombre, telefono required; canal defaults to "Tienda", asesor optional), filtering by asesor, full CRUD operations via ProspectosTable and ProspectoDialog components, pagination, and automatic prospecto number generation. Designed for early-stage customer inquiries before conversion to actual sales.

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