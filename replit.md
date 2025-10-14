# Overview

BoxiSleep is a comprehensive sales management system for a sleep products company, designed to streamline sales operations from data ingestion to analytics. It allows users to upload sales data from various channels (Cashea, Shopify, Treble), manage sales records with advanced filtering and export functionalities, and track financial payments. The system provides real-time analytics on sales performance, delivery status, and channel-specific metrics, empowering informed business decisions.

# User Preferences

Preferred communication style: Simple, everyday language.

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
The application leverages shadcn/ui and Radix UI for consistent design and accessibility, with Tailwind CSS for styling and Lucide React for icons. It features a tabbed interface for managing sales data across "Lista de Ventas", "Ventas por Completar", "Reservas", "Pagos", and "Despachos". A "Verificación" section includes "Ingresos" and "Egresos" tabs for payment verification. The interface is optimized for space with compact headers and context-aware action buttons.

### Tab Workflow Logic
Orders progress through tabs based on payment and delivery status:
- **Temporary Tabs (`Ventas por Completar`, `Reservas`, `Pagos`):** Hold incomplete or pending orders.
- **Permanent/Working Tabs (`Lista de Ventas`, `Despachos`):** Display processed or ready-for-delivery sales.
Orders typically move from temporary tabs to permanent tabs upon payment verification and status updates. Cashea orders have a unique workflow, appearing directly in "Lista de Ventas" and "Pagos".

## Feature Specifications
- **Sales Data Upload & Management**: Supports Excel uploads from multiple channels with upsert logic for products and bank accounts, including an undo mechanism. Features comprehensive filtering, searching, and export.
- **Order & Payment Tracking**: Detailed tracking of sales, delivery statuses (nine states), and channel-specific metrics. Supports multi-product orders, manual sales, and reservations.
- **Advanced Payment System**: Manages initial payments, freight, and installments with distinct fields for "agreed payment" (pago*) and "actual payment" (monto*). Includes a "Verificación" section for tracking and updating payment verification statuses, automatically updating `estadoEntrega` to "A despachar" when balances reach zero. Supports manual status control.
- **Installment (Cuotas) Architecture**: Installments are tracked at the order level, with sequential numbering per order.
- **Bank Management**: Differentiates between "Receptor" (receiving) and "Emisor" (issuing) banks, with forms consistently filtering to show only "Receptor" banks.
- **Automation & Consistency**: Automatic assignment of "Cashea (BNC compartido Bs)" as Banco Receptor for Cashea sales. Consistent naming conventions for bank fields and payment date tracking (`fechaPagoInicial`). Chrome autocomplete suppression is implemented.

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