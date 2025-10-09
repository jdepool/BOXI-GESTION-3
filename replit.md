# Overview

BoxiSleep is a comprehensive sales management dashboard for a sleep products company. It enables users to upload sales data from various channels (Cashea, Shopify, Treble), visualize key metrics through interactive dashboards, and manage sales records with filtering and export functionalities. The application provides real-time analytics on sales performance, delivery status, and channel-specific metrics to support informed business decisions.

# Recent Changes (October 2025)

## Status Field Consolidation
- **Removed**: Duplicate "estado" field that was causing confusion
- **Single Source of Truth**: All order/delivery status now tracked exclusively through `estadoEntrega` field
- **Valid Status Values** (10 states, case-sensitive):
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