# Overview

BoxiSleep is a sales management system for a sleep products company, designed to streamline sales operations from data ingestion to analytics. It enables users to upload sales data, manage sales records with advanced filtering and export functionalities, track financial payments, and provides real-time analytics on sales performance, delivery status, and channel-specific metrics to empower informed business decisions.

# User Preferences

Preferred communication style: Simple, everyday language.
Cargar Datos Implementation: Implemented as a settings/gear icon button positioned in the top-right of the tabs bar, opening a dialog with upload controls and automation settings. This separates administrative features from regular sales workflow tabs.
Address Form Organization: All address forms (Direcciones, Manual Sales, Manual Reserva) display Dirección de Despacho first, followed by a checkbox (checked by default) labeled "La dirección de facturación es igual a la de despacho". Dirección de Facturación fields appear below only when the checkbox is unchecked. When checked, shipping address changes automatically sync to billing address. Despacho fields are required; facturación fields are optional when addresses differ.

# System Architecture

## UI/UX Design
The application features a React 18 and TypeScript frontend, using Wouter for routing and shadcn/ui components (based on Radix UI) styled with Tailwind CSS for an accessible and customizable user interface. The design emphasizes a tabbed structure for sales management, payment verification, and specialized pages, with administrative functions accessed via a dedicated settings icon. Date filtering is handled by a reusable `DateRangePicker`.

## Technical Implementations
The backend is a RESTful API built with Express.js and TypeScript, featuring a modular structure. PostgreSQL is the primary database, accessed via Drizzle ORM. Authentication uses basic username/password with PostgreSQL session storage. A critical date handling standard ensures all date-only fields are stored as `YYYY-MM-DD` strings, parsed using `parseLocalDate()`, and formatted using `formatDateOnly()` to prevent timezone issues.

## Feature Specifications
- **Sales Data Upload & Management**: Excel uploads from multiple channels with replacement logic, filtering, searching, and export.
- **Order & Payment Tracking**: Detailed tracking of sales, nine delivery statuses, multi-product orders, manual sales, and reservations. Includes payment verification, multi-currency support, and a centralized `Pendiente` (balance) calculation.
- **Delivery Workflow**: Channel-specific delivery status progression and management of returns and cancellations.
- **Lead Management (Prospectos)**: Full lead tracking system with a 3-phase CRM follow-up workflow, automatic date calculations, and visual status tracking, including automated daily email reminders to asesores.
- **Follow-Up Protocols (Protocolos de Seguimiento)**: Dual follow-up protocol system with separate configurations for Prospectos and Ordenes Pendientes. Each protocol independently configures 3-phase follow-up intervals (días between phases), asesor-specific email recipients (max 5), and general fallback email. Implemented via `seguimiento_config` table with `tipo` field ('prospectos' or 'ordenes'), unique constraint ensuring one config per type, and admin UI with two separate configuration cards.
- **Pricing & Cost Management**: Comprehensive system for tracking product prices (Inmediata, Reserva, Cashea) and unit costs in USD with effective dates, supporting multiple records per SKU, Excel uploads, and undo functionality. Dynamic Cashea pricing uses internal pricing for `totalUSD` calculation.
- **Automation**: Configurable automated Cashea order downloads and automatic assignment of payment details for Cashea sales.
- **Reporting**: Comprehensive sales reports (`Reporte de Ordenes`) with date filtering and Excel download.
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