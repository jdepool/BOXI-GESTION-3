# Overview

BoxiSleep is a sales management system for a sleep products company, designed to streamline sales operations from data ingestion to analytics. It enables users to upload sales data, manage sales records with advanced filtering and export functionalities, track financial payments, and provides real-time analytics on sales performance, delivery status, and channel-specific metrics to empower informed business decisions. The system now supports multiple product lines including Boxi and Mompox products with separate workflow tracking through distinct sales channels (Shopify for Boxi, ShopMom for Mompox).

# User Preferences

Preferred communication style: Simple, everyday language.
Cargar Datos Implementation: Implemented as a settings/gear icon button positioned in the top-right of the tabs bar, opening a dialog with upload controls and automation settings. This separates administrative features from regular sales workflow tabs.
Address Form Organization: All address forms (Direcciones, Manual Sales, Manual Reserva) display Dirección de Despacho first, followed by a checkbox (checked by default) labeled "La dirección de facturación es igual a la de despacho". Dirección de Facturación fields appear below only when the checkbox is unchecked. When checked, shipping address changes automatically sync to billing address. Despacho fields are required; facturación fields are optional when addresses differ.
Reportes Organization: Reportes tab displays a dashboard with card-based layout where each report type is accessible via a dedicated button. Currently includes "Reporte temporal de Ordenes", "Ordenes Perdidas", and "Prospectos Perdidos" cards. This scalable structure allows easy addition of new report types as separate cards.

# System Architecture

## UI/UX Design
The application features a React 18 and TypeScript frontend, using Wouter for routing and shadcn/ui components (based on Radix UI) styled with Tailwind CSS for an accessible and customizable user interface. The design emphasizes a tabbed structure for sales management, payment verification, and specialized pages, with administrative functions accessed via a dedicated settings icon. Date filtering is handled by a reusable `DateRangePicker`. The system includes two separate sales workflow pages: "Ventas" (for Boxi products) and "Ventas Mompox" (for Mompox products), each with identical tab structure (Prospectos, Inmediatas, Reservas, Pagos, Lista de Ventas) but filtered by their respective canal groups. Ventas Mompox uses the `canalMompox` filter to show orders where canal='ShopMom' OR canal contains 'MP' (Manual MP, Cashea MP, Tienda MP), while Ventas filters by specific Boxi channels (Shopify, Cashea, Manual, Tienda). Manual sales forms automatically pre-fill the canal field based on the parent page: "Manual MP" for Mompox orders, "Manual" for Boxi orders.

## Technical Implementations
The backend is a RESTful API built with Express.js and TypeScript, featuring a modular structure. PostgreSQL is the primary database, accessed via Drizzle ORM. Authentication uses basic username/password with PostgreSQL session storage. A critical date handling standard ensures all date-only fields are stored as `YYYY-MM-DD` strings, parsed using `parseLocalDate()`, and formatted using `formatDateOnly()` to prevent timezone issues. Canal values are normalized to canonical casing during upload ('shopmom' → 'ShopMom') to ensure consistent database storage and UI filtering.

## Feature Specifications
- **Sales Data Upload & Management**: Excel uploads from multiple channels with replacement logic, filtering, searching, and export. Supports webhook integration for automated order ingestion from Shopify (Boxi products via `/api/webhooks/shopify`) and ShopMom (Mompox products via `/api/webhooks/shopify-mompox`).
- **Order & Payment Tracking**: Detailed tracking of sales, nine delivery statuses, multi-product orders, manual sales, and reservations. Includes payment verification, multi-currency support, and a centralized `Pendiente` (balance) calculation.
- **Delivery Workflow**: Channel-specific delivery status progression and management of returns and cancellations. Simplified filtering: Lista de Ventas excludes Pendiente/Perdida from dropdown and results; Inmediata/Reservas tables hide Estado Entrega filter completely (all orders are Pendiente); Pagos filter restricted to Pendiente/En Proceso only. Perdida orders accessible via dedicated report in Reportes dashboard with date filtering and Excel export.
- **Lead Management (Prospectos)**: Full lead tracking system with a 3-phase CRM follow-up workflow, automatic date calculations, and visual status tracking, including automated daily email reminders to asesores. Prospectos table always displays only active leads (estadoProspecto = 'Activo'). Perdido prospectos are excluded from the table view and are accessible via a dedicated report in Reportes dashboard with date filtering and Excel export. Convertido prospectos automatically transition to Pendiente estado when converted to orders.
- **Follow-Up Protocols (Protocolos de Seguimiento)**: Dual follow-up protocol system with separate configurations for Prospectos and Ordenes Pendientes. Each protocol independently configures 3-phase follow-up intervals (días between phases), asesor-specific email recipients (max 5), and general fallback email. Implemented via `seguimiento_config` table with `tipo` field ('prospectos' or 'ordenes'), unique constraint ensuring one config per type, and admin UI with two separate configuration cards. Both Inmediatas and Reservas tables now include Próximo column (showing next follow-up date with color-coded status) and Seguimiento button to track 3-phase follow-up for pending orders. Follow-up updates apply to all products in the same order simultaneously since the customer is the same.
- **Pricing & Cost Management**: Comprehensive system for tracking product prices (Inmediata, Reserva, Cashea) and unit costs in USD with effective dates, supporting multiple records per SKU, Excel uploads, and undo functionality. Dynamic Cashea pricing uses internal pricing for `totalUSD` calculation.
- **Product Classification System**: Flat tag-based classification system using a single `categorias` table with `tipo` field supporting four classification types: Marca, Categoría, Subcategoría, and Característica. Products associate with classifications via separate foreign keys (marcaId, categoriaId, subcategoriaId, caracteristicaId) with no enforced hierarchy. Admin UI provides type selector dropdown and filtering tabs for managing different classification types. Productos form displays separate dropdowns for each classification type, all optional. Legacy `categoria` text field retained for backward compatibility.
- **Automation**: Configurable automated Cashea order downloads and automatic assignment of payment details for Cashea sales.
- **Reporting**: Dashboard-based reporting system with card interface for accessing different report types. Reporte temporal de Ordenes provides comprehensive sales data with date filtering and Excel download. Ordenes Perdidas report provides detailed view of all lost orders with date filtering and Excel export. Prospectos Perdidos report provides detailed view of all lost prospects with follow-up information, date filtering, and Excel export. Navigation structure uses `/reportes` for dashboard, `/reportes/ordenes` for the orders report view, `/reportes/perdidas` for the lost orders report, and `/reportes/prospectos-perdidos` for the lost prospects report.
- **Order Numbering**: Separate order number ranges for manual (20000+) and Tienda (30000+) orders.

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