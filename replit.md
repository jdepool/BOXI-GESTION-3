# Overview

BoxiSleep is a comprehensive sales management dashboard application for a sleep products company. The system allows users to upload Excel files containing sales data from multiple sales channels (Cashea, Shopify, Treble), visualize sales metrics through interactive dashboards, and manage sales records with filtering and export capabilities. The application provides real-time analytics on sales performance, delivery status tracking, and channel-specific metrics to help business stakeholders make informed decisions.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The frontend is built using React 18 with TypeScript, implementing a modern single-page application architecture. The application uses Wouter for client-side routing, providing lightweight navigation between dashboard, upload, and sales management pages. State management is handled through TanStack Query (React Query) for server state and caching, ensuring efficient data fetching and synchronization. The UI framework is based on shadcn/ui components built on top of Radix UI primitives, providing accessible and customizable interface elements styled with Tailwind CSS.

## Backend Architecture  
The backend follows a RESTful API architecture using Express.js with TypeScript. The server implements a modular structure with separate route handlers for sales operations, file uploads, and analytics endpoints. The application uses a storage abstraction layer that separates business logic from data access, making the system more maintainable and testable. File upload functionality is implemented using Multer middleware with memory storage for processing Excel files.

## Data Storage Solutions
The application uses PostgreSQL as the primary database, accessed through Drizzle ORM for type-safe database operations. The database schema includes three main tables: users for authentication, sales for storing transaction records, and upload_history for tracking file import operations. Drizzle provides schema validation and type inference, ensuring data integrity and reducing runtime errors. The connection is managed through Neon's serverless PostgreSQL client for optimal performance and scalability.

## Authentication and Authorization
The system implements a basic user management structure with username/password authentication. User sessions are managed through PostgreSQL session storage using connect-pg-simple, providing secure server-side session management. The authentication system is designed to be extensible for future enhancements like role-based access control or OAuth integration.

# External Dependencies

## Database Services
- **Neon Database**: Serverless PostgreSQL hosting for production workloads with automatic scaling and connection pooling
- **Drizzle ORM**: Type-safe database client providing schema management, query building, and migration capabilities

## UI and Styling
- **shadcn/ui**: Pre-built component library offering consistent design patterns and accessibility features  
- **Radix UI**: Unstyled, accessible UI primitives serving as the foundation for custom components
- **Tailwind CSS**: Utility-first CSS framework for rapid styling and responsive design
- **Lucide React**: Icon library providing consistent SVG icons throughout the application

## File Processing
- **SheetJS (XLSX)**: Excel file parsing library for reading and converting spreadsheet data to JSON format
- **Multer**: Express middleware for handling multipart/form-data file uploads with validation and size limits
- **CSV Parse**: Library for parsing CSV files from Shopify and other sales channels with column header mapping

## Development Tools
- **Vite**: Modern build tool providing fast development server and optimized production builds
- **TypeScript**: Static type checking for enhanced code reliability and developer experience
- **ESBuild**: Fast JavaScript bundler used by Vite for compilation and optimization

## Data Management
- **TanStack Query**: Server state management library providing caching, synchronization, and background updates
- **date-fns**: Date manipulation library for formatting and parsing date values in sales records
- **Zod**: Schema validation library used with Drizzle for runtime type checking and data validation

# Recent Changes

## September 2025 - SKU Management System

### Comprehensive SKU Implementation for Productos
Added complete SKU (Stock Keeping Unit) management functionality to the Productos administration system:

**Database Schema Updates:**
- Added `sku text unique` column to productos table with nullable constraint
- Unique constraint allows multiple NULL values while enforcing uniqueness for non-NULL SKUs
- Supports inventory tracking across all sales channels

**Frontend Administration UI:**
- Added SKU input field to the producto creation/editing form with proper validation
- Updated productos display table to include SKU column with "Sin SKU" placeholder for empty values
- Implemented proper form state management including SKU field in all CRUD operations
- Fixed critical unique constraint handling by normalizing empty strings to undefined

**Backend API Integration:**
- SKU field automatically included in validation schemas via `createInsertSchema(productos)`
- Existing CRUD endpoints transparently handle SKU field through schema-driven approach
- Proper type safety with optional SKU field support in TypeScript interfaces

**Technical Implementation:**
- Frontend normalizes empty SKU inputs (`formData.sku.trim() || undefined`) to maintain database NULL semantics
- Updated mutation type signatures to make SKU optional (`sku?: string`)
- Ensures multiple products can be created without SKUs while enforcing uniqueness for assigned SKUs
- Maintains compatibility with existing bulk product loading functionality

## December 2025 - Shopify Data Integration

### Shopify CSV/Excel Mapping Implementation
Added comprehensive Shopify data mapping functionality that automatically processes Shopify export files and maps them to the Ventas Pendientes (Pending Sales) system:

**Field Mappings (Shopify → Database):**
- Name → orden (Order number)
- Billing Name → nombre (Customer name)  
- Billing Phone → telefono (Phone number)
- Email → email (Email address)
- Outstanding Balance → totalUsd (Total amount in USD)
- Created at → fecha (Order date)
- Lineitem name → product (Product name)
- Lineitem quantity → cantidad (Quantity)
- Billing Country → direccionFacturacionPais (Billing country)
- Billing Province name → direccionFacturacionEstado (Billing state)
- Billing City → direccionFacturacionCiudad (Billing city)
- Billing Address1 → direccionFacturacionDireccion (Billing address)
- Billing Address2 → direccionFacturacionUrbanizacion (Billing urbanization)
- Shipping Country → direccionDespachoPais (Shipping country)
- Shipping Province name → direccionDespachoEstado (Shipping state)
- Shipping City → direccionDespachoCiudad (Shipping city)  
- Shipping Address1 → direccionDespachoDireccion (Shipping address)
- Shipping Address2 → direccionDespachoUrbanizacion (Shipping urbanization)

**Automatic Status Configuration:**
- All Shopify orders are automatically set to estado: 'Pendiente' (Pending status)
- estadoEntrega: 'Pendiente' (Delivery status: Pending)
- statusFlete: 'Pendiente' (Freight status: Pending)
- canal: 'shopify' (Sales channel: Shopify)

**Default Values for Missing Shopify Fields:**
- cedula: null (ID number not available in Shopify)
- sucursal: null (Branch not applicable)
- tienda: null (Store not applicable)
- All freight-related fields initialized as null/pending for manual configuration

## September 2025 - Manual Sales Workflow Improvements

### Manual Sales Tab Movement Fix
Fixed the workflow for manual sales created through "Nueva Venta Manual" to properly move between sales tabs:

**Issue Resolution:**
- Manual sales were not correctly moving from "Ventas por Completar" to "Lista de Ventas" after payment completion
- Root cause: Filter logic was checking `estadoEntrega` instead of `estado` for pending sales

**Changes Made:**
1. **Updated Sales Filtering Logic**: Modified `excludePendingManual` parameter to filter based on `estado: "pendiente"` instead of `estadoEntrega: "Pendiente"`
2. **Fixed Payment Verification**: Updated `/api/sales/:id/verify-payment` endpoint to set `estado: "completado"` and `estadoEntrega: "En Proceso"`

**Current Workflow:**
- **Manual Sales Creation**: Created with `estado: "pendiente"` and `estadoEntrega: "En Proceso"`
- **Ventas por Completar Tab**: Shows sales with `estado: "pendiente"` (excluding reservas)
- **Payment Completion**: Changes `estado` to "completado", automatically moving sale to main list
- **Lista de Ventas Tab**: Shows completed sales, excluding those with `estado: "pendiente"`

**Technical Implementation:**
- Modified `getSales` and `getTotalSalesCount` functions in `server/storage.ts`
- Updated payment verification logic in `server/routes.ts`
- Maintains consistent filtering across both listing and count queries

### Payment Information Auto-Status Update
Updated the system so manual sales automatically move from "Ventas por Completar" to "Lista de Ventas" when payment information is filled up (not verified):

**Issue Clarification:**
- User clarified that orders don't need verification to appear in "Lista de Ventas"
- Orders should move when payment information is filled up (installment created with payment details)
- Status changes to "En Proceso" and moves to "Lista de Ventas"

**Changes Made:**
1. **Updated Installment Creation Endpoint**: Added logic in `POST /api/sales/:saleId/installments` to automatically update sale status when payment info is provided
2. **Updated Installment Update Endpoint**: Added logic in `PATCH /api/installments/:id` to check for status updates when installment is modified with payment info

**Current Workflow (Updated):**
- **Manual Sales Creation**: Created with `estado: "pendiente"` and appear in "Ventas por Completar"
- **Payment Info Filled**: When installment is created with payment amount > 0, `estado` changes to "activo" and `estadoEntrega` remains "En Proceso"
- **Automatic Movement**: Sale automatically moves from "Ventas por Completar" to "Lista de Ventas"
- **Payment Verification**: Remains independent - `verificado` flag can be toggled separately without affecting tab placement

## October 2025 - Multi-Product Order Enhancement

### Total Order USD Field Implementation
Added separation between overall order total and individual product prices for manual sales with multiple products:

**Database Schema Updates:**
- Added `totalOrderUsd` nullable decimal(10,2) column to sales table
- Stores the overall order total from the main manual sales form
- Separate from `totalUsd` which stores individual product prices

**Data Model:**
- `totalOrderUsd`: Overall order total from main form's "Total Orden USD" field (shared across all products in same order)
- `totalUsd`: Individual product price from "Agregar Producto" dialog (unique per product)
- Both fields stored in each sale record for flexibility in future reporting

**Backend Implementation:**
- Manual sales route (`POST /api/sales/manual`) stores form's total USD in `totalOrderUsd` for all product records
- Each product record gets its own `totalUsd` from the product dialog
- Legacy single-product mode maintains backward compatibility

**Frontend Updates:**
- Main form field renamed from "Total USD" to "Total Orden USD" for clarity
- Product dialog maintains "Total USD" for individual product pricing
- Table displays individual product totals in "Total USD" column

**Use Case:**
- Enables tracking both order-level totals (for billing/invoicing) and product-level totals (for inventory/reporting)
- Supports future views that aggregate by order using `totalOrderUsd`
- Maintains product-level detail in "Ventas por Completar" table using `totalUsd`