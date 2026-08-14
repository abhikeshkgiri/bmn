# BookMyNai

A professional online salon appointment and home barber booking platform built with modern web technologies.

## Description

BookMyNai is an online platform that enables customers to discover salons and barbers, book appointments and home barber services, manage their bookings, and access reviews and offers. The platform supports salon owners and barbers with management dashboards and provides administrators with comprehensive control tools.

## Technology Stack

- **Framework**: Next.js (with App Router)
- **UI Library**: React
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: MongoDB with Mongoose
- **Validation**: Zod
- **Forms**: React Hook Form
- **State Management**: Zustand
- **Icons**: Lucide React
- **Security**: bcryptjs, jsonwebtoken
- **Linting**: ESLint

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd bookmynai
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in your values:
```
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Development

Start the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint to check code quality

## Environment Variables

Create a `.env.local` file in the project root with the following variables:

```
MONGODB_URI=        # MongoDB connection string
JWT_SECRET=         # Secret key for JWT token generation
NEXT_PUBLIC_APP_URL= # Public application URL
```

**Note**: Never commit `.env.local` to version control. Use `.env.example` to document required variables without sensitive values.

## Project Structure

```
src/
├── app/              # Next.js App Router pages and layouts
│   ├── (public)/     # Public pages
│   ├── (auth)/       # Authentication pages
│   ├── customer/     # Customer dashboard
│   ├── salon/        # Salon owner dashboard
│   ├── barber/       # Barber dashboard
│   ├── admin/        # Admin dashboard
│   ├── api/          # API routes
│   └── layout.tsx    # Root layout
├── components/       # Reusable React components
│   ├── ui/          # UI components
│   ├── navbar/      # Navigation components
│   ├── footer/      # Footer components
│   ├── booking/     # Booking-related components
│   ├── salon/       # Salon components
│   ├── barber/      # Barber components
│   └── maps/        # Map components
├── lib/             # Utility functions and configurations
│   └── db.ts        # MongoDB connection utility
├── models/          # Mongoose data models
├── services/        # Business logic services
├── types/           # TypeScript type definitions
├── validations/     # Data validation schemas
├── hooks/           # Custom React hooks
└── utils/           # General utility functions
```

## Database Architecture

**Phase 2: Database Foundation Complete**

### MongoDB & Mongoose

BookMyNai uses MongoDB as its primary database with Mongoose as the ODM (Object Data Modeling) layer. This provides:

- Schema validation and type safety
- Automatic timestamps (createdAt, updatedAt)
- Connection pooling and reuse during development
- Index management for performance optimization

### Core Models

**User Model** (`src/models/User.ts`)
- Supports multiple roles: CUSTOMER, BARBER, SALON_OWNER, SALON_STAFF, ADMIN, SUPER_ADMIN
- Fields: name, phone, email, avatar, role, isActive, isVerified
- Indexes: phone (unique), email (sparse index)
- Purpose: Central user management for all system roles

**Salon Model** (`src/models/Salon.ts`)
- Represents salon businesses
- Fields include: name, slug, owner, staff, barbers, services, address, location, openingHours, facilities
- Nested documents: Address, OpeningHours, Location (GeoJSON)
- Indexes: slug (unique), owner, location (2dsphere), city, isActive, isVerified
- Relationships: References User (owner/staff), Barber, Service
- Future support: Geospatial queries for location-based searches

**Barber Model** (`src/models/Barber.ts`)
- Represents individual barbers/hairstylists
- Fields: user, salon, name, slug, bio, experienceYears, specializations, services, portfolio
- Features: Rating system, home service capability, availability tracking
- Indexes: slug (unique), salon, isActive, isVerified
- Relationships: References User, Salon, Service

**Service Model** (`src/models/Service.ts`)
- Represents salon services (haircut, beard, coloring, etc.)
- Fields: salon, name, slug, category, duration (in minutes), price (in paise), discountPrice
- Pricing strategy: Integer paise values (₹300 = 30000 paise) for precision
- Indexes: salon + slug (unique compound), category, isActive
- Relationships: References Salon

**Booking Model** (`src/models/Booking.ts`)
- Foundation for appointment bookings
- Fields: bookingNumber, customer, salon, barber, service, appointmentDate, startTime, endTime, duration, amounts, status, paymentStatus
- Statuses: PENDING, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED, NO_SHOW
- Booking types: SALON, HOME_SERVICE
- Indexes: bookingNumber (unique), customer, salon, barber, appointmentDate, status, paymentStatus
- Relationships: References User (customer), Salon, Barber, Service

**Payment Model** (`src/models/Payment.ts`)
- Stores payment transaction records
- Fields: booking, customer, amount, currency, method, provider, providerOrderId, status
- Payment methods: UPI, CARD, NET_BANKING, CASH
- Payment statuses: PENDING, AUTHORIZED, PAID, FAILED, REFUNDED, PARTIALLY_REFUNDED
- Provider support: RAZORPAY (initial), extensible for future providers
- Indexes: booking, customer, providerOrderId (unique), providerPaymentId (unique), status
- Note: Never stores sensitive data (card numbers, CVV, passwords)
- Relationships: References Booking, User (customer)

### Constants & Enums

Centralized constant definitions prevent magic strings throughout the codebase:

- **Roles** (`src/constants/roles.ts`): USER_ROLES with TypeScript types
- **Booking constants** (`src/constants/booking.ts`): BOOKING_STATUS, BOOKING_TYPE, PAYMENT_STATUS, PAYMENT_METHOD, PAYMENT_PROVIDER, PAYMENT_CURRENCY
- **Service constants** (`src/constants/services.ts`): SERVICE_CATEGORY, BARBER_SPECIALIZATION, SALON_FACILITY

### Validation & Types

- **Zod Schemas** (`src/validations/`): API input validation for user, salon, barber, service, booking, payment
- **TypeScript Types** (`src/types/`): Comprehensive type definitions, API response types, filter interfaces

### Indexing Strategy

Indexes are created for:
- **Search**: slug, name fields for quick lookups
- **Filtering**: role, category, status, isActive, isVerified fields
- **Relationships**: owner, salon, customer for foreign key queries
- **Performance**: Compound indexes for frequently combined queries
- **Geolocation**: 2dsphere index on salon location for distance queries

### Database Verification

Test the database setup:
```bash
npx ts-node scripts/test-db.ts
```

This verifies:
- MongoDB connection
- All 6 models register without OverwriteModelError
- Indexes are properly created
- Document counts in each collection

### Development Seed Data

Create sample data for development:
```bash
npx ts-node scripts/seed.ts
```

⚠️ **Development only** - Creates:
- 1 customer with verified status
- 1 salon owner
- 1 complete salon with details
- 2 barbers with specializations
- 3 sample services

This data helps with local development testing.

### Data Storage Patterns

**Monetary Values**: Stored in paise (₹ × 100) as integers to avoid floating-point precision issues
- ₹300 → 30000 paise

**Time Values**: 
- Appointment dates stored as ISO Date objects
- Time stored as "HH:MM" strings for flexibility

**References**: Uses MongoDB ObjectId references between collections rather than embedding full documents

**Geolocation**: GeoJSON Point format with [longitude, latitude] coordinates (note the order)

## Current Status

**Initial project setup + Database foundation completed.**

The following features will be implemented in subsequent stages:

- Customer authentication and user management
- Salon discovery and management
- Barber discovery and management
- Service discovery and management
- Appointment booking system
- Home barber booking system
- Payment processing
- Review and rating system
- Offers and promotions
- Membership programs
- Notifications system
- Mobile applications

## Code Quality Standards

- **TypeScript**: Strict mode enabled - avoid `any` type
- **No hardcoded secrets**: All sensitive data uses environment variables
- **Small components**: Keep components focused and reusable
- **DRY principle**: Avoid code duplication
- **Server Components**: Use Next.js Server Components by default
- **Client Components**: Use sparingly when client-side interactivity is required
- **Separation of concerns**: Keep business logic, UI, database, validation, and API logic separate
- **Meaningful names**: Use clear, descriptive naming for variables and functions
- **Next.js conventions**: Follow App Router conventions and best practices

## Development Notes

- The project uses MongoDB for data persistence
- Mongoose provides schema validation and database abstraction
- Environment variables are required to run the application
- The development server includes hot module reloading
- ESLint is configured for code quality checks

## Future Deployment

Production deployment instructions will be added when deployment features are implemented.

## License

[Add your license information here]

## Support

[Add support contact information here]
