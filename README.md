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

## Salon Management Architecture

**Phase 5: Salon Management Foundation Complete**

### Overview

The Salon Management system enables salon owners to create and manage their salon profiles, while providing customers with a discovery interface and administrators with verification and control capabilities. The architecture follows a layered pattern: API routes → Service layer → Database models, with role-based authorization at each level.

### Role Permissions

| Role | Create Salon | View Own | Update Own | Update Others | Verify | List Salons | Notes |
|------|:---:|:---:|:---:|:---:|:---:|:---:|---|
| CUSTOMER | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | View public listings only |
| BARBER | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | View public listings only |
| SALON_OWNER | ✓ | ✓ | ✓ | ✗ | ✗ | ✓ | Can only manage own salons |
| SALON_STAFF | ✗ | ✓* | ✗ | ✗ | ✗ | ✓ | View/read only access |
| ADMIN | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Full access with verification |
| SUPER_ADMIN | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Full access with verification |

*Staff can view but not modify

### API Endpoints

**Create Salon**
```
POST /api/salons
Authorization: Required (SALON_OWNER, ADMIN, SUPER_ADMIN)
Body: { name, address, location, contact, openingHours, facilities }
Response: 201 Created { success, data: Salon }
```

**List Salons (Public)**
```
GET /api/salons?page=1&limit=20&city=Mumbai&search=name&sortBy=newest&isVerified=true
Authorization: Optional
Response: 200 OK { success, data: Salon[], pagination: { total, totalPages } }
- Only returns active (isActive=true) salons
- Pagination: max limit 50
- Sorting options: newest (createdAt), rating, name
- Filters: city, state, isVerified status
- Search: name, description, area
```

**Get Salon Detail**
```
GET /api/salons/[id]
Authorization: Optional
Response: 200 OK { success, data: Salon }
- Returns public salon details
- Only active salons accessible
```

**Update Salon**
```
PATCH /api/salons/[id]
Authorization: Required (Owner, ADMIN, SUPER_ADMIN)
Body: { name?, description?, logo?, coverImage?, address?, location?, contact?, openingHours?, facilities? }
Response: 200 OK { success, data: Salon }
- Protects: owner, slug, _id, isVerified (owner cannot change)
- Only admins can modify isActive status
```

**Delete Salon (Soft Delete)**
```
DELETE /api/salons/[id]
Authorization: Required (Owner, ADMIN, SUPER_ADMIN)
Response: 200 OK { success, data: Salon, message: "Salon deactivated" }
- Sets isActive = false (logical deletion)
- Salon hidden from public listings
```

**Toggle Salon Status**
```
PATCH /api/salons/[id]/status
Authorization: Required (Owner, ADMIN, SUPER_ADMIN)
Body: { isActive: boolean }
Response: 200 OK { success, data: Salon, message: "Status updated" }
```

**Verify/Unverify Salon**
```
PATCH /api/salons/[id]/verify
Authorization: Required (ADMIN, SUPER_ADMIN only)
Body: { isVerified: boolean }
Response: 200 OK { success, data: Salon, message: "Verification updated" }
- Admin-only endpoint
- Marks salons as verified partners
```

### Authorization & Security

**Server-Side Authorization**
- All protected endpoints use `requireAuth()` middleware
- Authorization checks performed in service layer
- Ownership verified: `salon.owner.toString() === currentUser._id`
- Role-based access using USER_ROLES enum
- Admin/Super_Admin override access for any resource

**Protected Fields**
- `_id`: Never modifiable (MongoDB immutable)
- `owner`: Set at creation, never changes
- `slug`: Unique per salon, not modifiable after creation
- `isVerified`: Admin-only, owner cannot self-verify
- `isActive`: Admin-only toggle (owners use /status endpoint for request)

**Phone Normalization**
- Indian phone numbers normalized to +91XXXXXXXXXX format
- Applied on create and update
- Prevents duplicate phone entries

**Pagination Security**
- Maximum limit: 50 results
- Defaults: page=1, limit=10
- Request limit > 50 returns 400 error

### Slug Generation

**Slug Creation Strategy**
- Source: Salon name (e.g., "Royal Hair Studio" → "royal-hair-studio")
- Characters: lowercase a-z, 0-9, hyphens only
- Uniqueness: Appends counter (-2, -3, etc.) for conflicts
- Fallback: Timestamp suffix after 100 attempts
- Validation: `/^[a-z0-9-]+$/` regex, no leading/trailing hyphens

**Slug Database Storage**
- Stored as unique indexed field in Salon model
- Used for URL-friendly public access (`/salons/salon-name`)
- Index prevents duplicate slugs

### CRUD Behavior

**Create (POST)**
- Input validation: Zod schema SalonCreateSchema
- Ownership: Auto-assigned to authenticated user
- Slug generation: Automatic unique slug from name
- Status: Created as active (isActive=true, isVerified=false)
- Response: Full salon object with populated owner data

**Read (GET)**
- Public: List endpoint returns active salons only
- Detail: Shows full information including contact
- Private: Owner can view own with `getSalonForOwner()`
- Filtering: By city, state, verification status
- Search: Full-text search on name, description, area

**Update (PATCH)**
- Partial updates supported
- Protected fields: owner, slug, _id, isVerified
- Phone normalization: Applied to contact.phone
- Address validation: Required fields enforced
- Location format: [longitude, latitude] GeoJSON

**Delete (DELETE/Soft Delete)**
- Sets isActive=false
- Salon hidden from public listings
- No hard delete - preserves historical data
- Staff/barber entries remain linked

### Salon Model Fields

```typescript
{
  name: string,                    // Required, 3-100 chars
  slug: string,                    // Unique, auto-generated
  description?: string,            // Optional
  logo?: string,                   // Image URL
  coverImage?: string,             // Image URL
  owner: ObjectId,                 // References User
  staff?: ObjectId[],              // Array of User refs
  barbers?: ObjectId[],            // Array of Barber refs
  services?: ObjectId[],           // Array of Service refs
  address: {
    addressLine1: string,
    addressLine2?: string,
    area?: string,
    landmark?: string,
    city: string,
    state: string,
    postalCode: string,
    country: string
  },
  location: {                       // GeoJSON for geospatial queries
    type: "Point",
    coordinates: [longitude, latitude]
  },
  contact: {
    phone: string,                 // Normalized +91XXXXXXXXXX
    email?: string,
    website?: string
  },
  openingHours: {
    monday: { isOpen: boolean, openTime?: string, closeTime?: string },
    tuesday: { ... },
    // ... through sunday
  },
  facilities: string[],             // e.g., ["WiFi", "Parking", "AC"]
  rating: number,                   // 0-5 (future: from reviews)
  reviewCount: number,              // (future: from reviews)
  isVerified: boolean,              // Admin-verified status
  isActive: boolean,                // Public visibility
  createdAt: Date,
  updatedAt: Date
}
```

### UI Pages

**Public Salon Listing** (`/salons`)
- Search form: Name/business keywords
- Filters: City dropdown
- Sort options: Newest, Highest Rated, A-Z
- Card display: Logo, name, rating, location, verified badge
- Pagination: Numbered buttons, Previous/Next
- Empty state: Message when no results

**Salon Detail** (`/salons/[slug]`)
- Cover image and logo display
- Name, rating (stars), review count, verified badge
- Full address with landmark
- Contact: Phone (clickable tel:), Email, Website
- Opening hours: 7-day table with status
- Facilities: Badge list
- Owner name and salon status
- "Book Appointment" button (placeholder)
- Sidebar: Quick info card with owner and status
- Responsive: 2-column layout on desktop, 1-column on mobile

### Service Layer

**Service File**: `src/services/salon.service.ts`

Functions:
- `createSalon(input, currentUser)` - Validation, slug generation, ownership setup
- `getSalonById(id)` - Query by MongoDB ID
- `getSalonBySlug(slug)` - Query by URL slug
- `getSalonForOwner(id, currentUser)` - Ownership authorization check
- `updateSalon(id, input, currentUser)` - Partial update with field protection
- `activateSalon(id, currentUser)` - Toggle isActive flag
- `deactivateSalon(id, currentUser)` - Deactivate (soft delete)
- `verifySalon(id, currentUser)` - Admin verify
- `unverifySalon(id, currentUser)` - Admin unverify
- `listSalons(options)` - Paginated list with filters
- `getSalonsForOwner(ownerId)` - All salons owned by user
- `softDeleteSalon(id, currentUser)` - Calls deactivateSalon

**Authorization Pattern**:
```typescript
// Each function enforces role-based access
if (currentUser.role !== USER_ROLES.ADMIN && currentUser.role !== USER_ROLES.SUPER_ADMIN) {
  throw new Error('SALON_VERIFICATION_DENIED: Only admins can verify salons');
}
```

### Pagination Details

- **Parameters**: `page` (default 1), `limit` (default 10, max 50)
- **Query**: `?page=2&limit=20`
- **Response**:
  ```json
  {
    "success": true,
    "data": [ ... salons ... ],
    "pagination": {
      "page": 2,
      "limit": 20,
      "total": 45,
      "totalPages": 3
    }
  }
  ```
- **Validation**: limit > 50 returns 400 error
- **Skipping**: `skip = (page - 1) * limit`

### Files Created

- `src/utils/slug.ts` - Slug generation utility
- `src/services/salon.service.ts` - Business logic layer
- `src/app/api/salons/route.ts` - POST/GET endpoints
- `src/app/api/salons/[id]/route.ts` - GET/PATCH/DELETE endpoints
- `src/app/api/salons/[id]/status/route.ts` - Status toggle
- `src/app/api/salons/[id]/verify/route.ts` - Verification
- `src/app/salons/page.tsx` - Public listing page
- `src/app/salons/[slug]/page.tsx` - Public detail page
- `src/app/salon/page.tsx` - Owner dashboard (redirects to /salons)

### Error Handling

**HTTP Status Codes**
- 201: Salon created successfully
- 200: Success
- 400: Invalid request data or validation error
- 401: Authentication required
- 403: Access denied (authorization failure)
- 404: Salon not found
- 500: Server error

**Error Response Format**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "User-friendly error message"
  }
}
```

### Security Rules

1. **Ownership Verification**: Only owner or admin can modify salon
2. **Field Protection**: Critical fields never modifiable by owner
3. **Verification Gate**: Only admins can mark salons as verified
4. **Public Visibility**: Only active salons shown in listings
5. **Role Enforcement**: Role checks at service layer, not routes
6. **Phone Validation**: Regex + normalization for data consistency
7. **Pagination Limits**: Max 50 results per request
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

## Authentication Architecture

**Phase 4: Authentication & Role-Based Authorization Foundation**

BookMyNai implements a secure, mobile-first OTP-based authentication system with role-based authorization.

### Overview

The authentication system is designed around three core principles:
1. **Mobile-first**: Users authenticate using Indian mobile numbers + OTP
2. **Stateless sessions**: JWT tokens stored in HTTP-only, secure cookies
3. **Server-side enforcement**: All authorization checks happen on the server, never trusting client state

### OTP-Based Authentication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. User enters mobile number on /login page                     │
│    Request: POST /api/auth/send-otp { phone }                 │
│    Response: { success: true, devOtp?: "123456" }             │
│              (devOtp shown in dev mode only)                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. Server generates 6-digit OTP                                │
│    - Random generation: 000000 - 999999                        │
│    - Stored: Hashed with SHA256 in OtpVerification model     │
│    - Expiry: 5 minutes from creation                          │
│    - OTP Provider: Sends via SMS/WhatsApp (dev: logs to console)│
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. User enters 6-digit OTP on /login page                     │
│    Request: POST /api/auth/verify-otp { phone, otp }         │
│    Response: { success: true, user: {...} }                  │
│    Cookie: Set bookmynai-session (HTTP-only, 7 days)         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. Session cookie persists authentication                      │
│    - Cookie contains JWT token                                │
│    - Token payload: { userId, phone, role, iat, exp }        │
│    - Verified on each request via /api/auth/me                │
│    - Expires: 7 days from creation                            │
└─────────────────────────────────────────────────────────────────┘
```

### Security Features

**OTP Security**
- **6-digit length**: 1 million possible combinations
- **5-minute expiry**: Limits brute-force window
- **5-attempt max**: Blocks after 5 incorrect attempts
- **Hashed storage**: SHA256 hash stored in database, plaintext never stored
- **Rate limiting**: 60-second cooldown between resend attempts, 3 requests per 15 minutes per phone

**Session Security**
- **HTTP-only cookies**: JavaScript cannot access token via `document.cookie`
- **Secure flag**: Cookie sent only over HTTPS in production
- **SameSite=Lax**: Protects against CSRF attacks
- **Signed JWT**: Token validates authenticity using AUTH_SECRET
- **Expiration**: 7-day token lifetime with automatic refresh on re-login

**Authentication Server-Side Validation**
- Every protected route must call `requireAuth()` or `requireRole()`
- Session cookie is verified on each request
- User status (isActive) is checked to prevent logged-in deleted accounts
- Database lookup confirms user still exists and is authorized

### Supported User Roles

Six role levels with hierarchical authorization:

| Role | Description | Permissions |
|------|-------------|------------|
| **CUSTOMER** | Regular user booking appointments | Browse salons, book appointments, view history |
| **BARBER** | Self-employed barber or salon employee | Manage availability, view bookings, home service |
| **SALON_OWNER** | Salon business owner | Manage salon, staff, services, bookings, revenue |
| **SALON_STAFF** | Salon receptionist/manager | Manage bookings, customer details, scheduling |
| **ADMIN** | Platform administrator | Manage users, salons, disputes, basic moderation |
| **SUPER_ADMIN** | Platform superuser | Full system access, role management, auditing |

Authorization rules:
- Admin roles cannot be self-assigned via API
- Role is set at user creation (default: CUSTOMER)
- Role changes require admin intervention
- Server-side checks prevent privilege escalation

### Implementation Details

**API Endpoints**

```typescript
// Request OTP
POST /api/auth/send-otp
Request:  { phone: string }
Response: { success: true, message: string, devOtp?: string }

// Verify OTP and create session
POST /api/auth/verify-otp
Request:  { phone: string, otp: string }
Response: { success: true, user: AuthUser, message: string }
Cookie:   Set bookmynai-session (HTTP-only, secure, 7 days)

// Get current user
GET /api/auth/me
Response: { success: true, user: AuthUser } or 401 Unauthorized
Cookie:   Must include valid bookmynai-session

// Logout
POST /api/auth/logout
Response: { success: true, message: string }
Cookie:   Clear bookmynai-session (maxAge: 0)
```

**Core Services** (`src/services/auth.service.ts`)
- `generateOtp()`: Creates random 6-digit OTP
- `hashOtp(otp)`: SHA256 hash for storage
- `verifyOtpHash(otp, hash)`: Compares plaintext OTP to hash
- `requestOtp(phone)`: Main OTP send flow - validation, rate limiting, database storage, provider call
- `verifyOtpAndGetUser(phone, otp)`: Main OTP verify flow - hash comparison, expiry check, user find/create
- `createSessionToken(user)`: Generate 7-day JWT token using JOSE library
- `logoutUser()`: Placeholder for future session cleanup

**Authentication Utilities** (`src/lib/auth.ts`)
- `getCurrentUser()`: Extract session cookie, verify JWT, return user with server-side validation
- `requireAuth()`: Throw error if not authenticated (used in protected routes)
- `requireRole(role)`: Throw error if user doesn't have required role (for role-based endpoints)
- `hasRole(role)`: Boolean check for conditional rendering (client-safe)
- `isAuthenticated()`: Boolean check without throwing

**OTP Provider Abstraction** (`src/lib/otp-provider.ts`)
- `OtpProvider` interface: Simple contract for sending OTPs
- `DevelopmentOtpProvider`: Logs OTP to console (NODE_ENV !== 'production')
- `ProductionOtpProvider`: Placeholder that throws error (must be implemented with real SMS provider)
- `sendOtp(phone, otp)`: Public function that routes to appropriate provider
- **Future integration**: Replace ProductionOtpProvider with:
  - Twilio (SMS + WhatsApp)
  - AWS SNS (SMS)
  - Gupshup (SMS + WhatsApp)
  - Firebase Cloud Messaging
  - Custom SMS gateway

**Rate Limiting** (`src/lib/rate-limit.ts`)
- In-memory Map storage (production should use Redis)
- Per-phone-number rate limits
- OTP request: Max 3 requests per 15 minutes
- OTP resend: 60-second cooldown
- Automatic cleanup of expired records every 5 minutes

**Data Models**

`OtpVerification` model (`src/models/OtpVerification.ts`):
- Fields: phone, otpHash, expiresAt, attempts, verified, createdAt, updatedAt
- Indexes: phone + verified (find active OTPs), TTL on expiresAt (auto-delete after expiry)
- Privacy: otpHash has `select: false` to prevent accidental exposure

`User` model (existing, enhanced for auth):
- Fields used: _id, name, phone, email, avatar, role, isActive, isVerified, createdAt, updatedAt
- Phone field: Unique index prevents duplicate accounts
- New users created with role=CUSTOMER, isActive=true, isVerified=true after OTP verification

**Configuration** (`src/constants/auth.ts`)

```typescript
OTP_CONFIG = {
  LENGTH: 6,              // Digits in OTP
  EXPIRY_MINUTES: 5,      // Minutes before OTP expires
  MAX_ATTEMPTS: 5,        // Failed verification attempts allowed
  RESEND_COOLDOWN_SECONDS: 60  // Seconds before resend allowed
}

SESSION_CONFIG = {
  DURATION_DAYS: 7,       // Days until session expires
  COOKIE_NAME: 'bookmynai-session',
  SECURE: true,           // HTTPS only in production
  HTTP_ONLY: true,        // No JavaScript access
  SAME_SITE: 'lax'        // CSRF protection
}

AUTH_DEV_MODE: true/false // Controls development behavior
DEV_OTP: '123456'         // Fixed OTP in development (helps testing)
```

**Validation** (`src/validations/auth.schema.ts`)

Using Zod for strict input validation:
- `SendOtpSchema`: { phone: string, normalized via `normalizePhoneNumber()` }
- `VerifyOtpSchema`: { phone: string (normalized), otp: string (length 6, digits only) }

**Phone Normalization** (`src/utils/phone.ts`)

Handles all Indian phone formats:
- Input: "9876543210" → Normalized: "+919876543210"
- Input: "+919876543210" → Normalized: "+919876543210"
- Input: "919876543210" → Normalized: "+919876543210"
- Input: "09876543210" → Normalized: "+919876543210"
- Input: "9876 543 210" → Normalized: "+919876543210"
- Input: "(987) 654-3210" → Normalized: "+919876543210"

Functions:
- `normalizePhoneNumber(input)`: Returns "+91XXXXXXXXXX" format
- `isValidIndianPhoneNumber(phone)`: Validates format
- `getPhoneDigits(phone)`: Extracts 10-digit portion

### Development Mode

Set `AUTH_DEV_MODE=true` in `.env.local` to enable development features:

1. **Console OTP Display**: OTP appears in server console when Send OTP is called
   ```
   📱 [DEV OTP] Phone: +919876543210, OTP: 123456
   ```

2. **Development OTP Provider**: All SMS send attempts are logged instead of actually sending
   ```
   ⚠️ This is development mode only. In production, OTP would be sent via SMS/WhatsApp.
   ```

3. **Fixed Development OTP**: Use `123456` for all development testing (set in constants/auth.ts)

In production (`NODE_ENV=production`), all development features are disabled:
- OTP is randomly generated and never logged
- SMS provider errors are logged only
- OTP is never exposed in API responses

### Protected Routes

Routes requiring authentication use `requireAuth()`:
- `/customer/*` - Customer dashboard and profile
- `/barber/*` - Barber dashboard and management
- `/salon/*` - Salon dashboard and management
- `/admin/*` - Admin panel (checked with `requireRole('ADMIN')`)

Public routes (no authentication required):
- `/` - Homepage
- `/login` - Login page
- `/salons` - Salon browse
- `/barbers` - Barber browse
- `/services` - Service browse
- `/offers` - Promotions
- `/about` - About page
- `/help` - Help/FAQ

### Error Handling

Specific error messages returned by the authentication API:

| Error | Status | Meaning |
|-------|--------|---------|
| `OTP_INVALID` | 401 | OTP doesn't match stored hash |
| `OTP_EXPIRED` | 401 | OTP expired (older than 5 minutes) |
| `OTP_ATTEMPTS_EXCEEDED` | 401 | User exceeded 5 verification attempts |
| `OTP_RATE_LIMITED` | 429 | Too many requests within cooldown |
| `USER_INACTIVE` | 403 | Account deactivated by admin |
| `UNAUTHORIZED` | 401 | No valid session cookie |
| `FORBIDDEN` | 403 | User role doesn't have permission |
| `AUTH_PROVIDER_ERROR` | 500 | OTP provider failed |

### Environment Variables Required

```bash
# .env.local
AUTH_SECRET=your-very-long-random-secret-key-minimum-32-characters
AUTH_DEV_MODE=true  # Set to false in production
MONGODB_URI=mongodb://localhost:27017/bookmynai
JWT_SECRET=your-jwt-secret  # Legacy, will be deprecated
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Testing Authentication

1. **Send OTP**
   ```bash
   curl -X POST http://localhost:3000/api/auth/send-otp \
     -H "Content-Type: application/json" \
     -d '{"phone":"9876543210"}'
   ```
   Response: `{ "success": true, "devOtp": "123456" }`

2. **Verify OTP**
   ```bash
   curl -X POST http://localhost:3000/api/auth/verify-otp \
     -H "Content-Type: application/json" \
     -d '{"phone":"9876543210", "otp":"123456"}'
   ```
   Response: `{ "success": true, "user": {...} }`
   Cookie: `bookmynai-session=<jwt-token>`

3. **Get Current User**
   ```bash
   curl http://localhost:3000/api/auth/me \
     -H "Cookie: bookmynai-session=<jwt-token>"
   ```
   Response: `{ "success": true, "user": {...} }`

4. **Logout**
   ```bash
   curl -X POST http://localhost:3000/api/auth/logout
   ```
   Cookie: `bookmynai-session` cleared

## Current Status

**Phase 4: Authentication & Role-Based Authorization Foundation COMPLETE**

Completed phases:
- ✅ Phase 1: Next.js foundation, TypeScript, Tailwind CSS, MongoDB setup
- ✅ Phase 2: Global Light Theme, 14+ UI components (Button, Input, Card, Badge, etc.)
- ✅ Phase 3: Database architecture with 6 core models (User, Salon, Barber, Service, Booking, Payment)
- ✅ Phase 4: OTP-based mobile authentication, role-based authorization, session management

**Phase 4 Implementation Summary:**

*Infrastructure*
- [x] OTP constants and configuration (src/constants/auth.ts)
- [x] Phone normalization utility (src/utils/phone.ts)
- [x] OtpVerification MongoDB model with TTL auto-cleanup
- [x] Auth validation schemas (Zod) for OTP operations
- [x] Session and auth types (SessionPayload, AuthUser)
- [x] Rate limiting utility (in-memory, Redis-ready)
- [x] OTP provider abstraction (development/production)

*Business Logic*
- [x] Auth service layer (send OTP, verify OTP, create session)
- [x] Session token generation (JWT with 7-day expiry)
- [x] Auth utilities (getCurrentUser, requireAuth, requireRole)

*API Endpoints*
- [x] POST /api/auth/send-otp - Request OTP
- [x] POST /api/auth/verify-otp - Verify OTP and create session
- [x] GET /api/auth/me - Get current authenticated user
- [x] POST /api/auth/logout - Clear session

*UI*
- [x] Login page (/login) with OTP flow
- [x] Phone input with validation
- [x] OTP input with 6-digit format
- [x] Resend OTP with cooldown
- [x] Error handling and loading states
- [x] Development OTP display (dev mode)

*Quality Assurance*
- [x] ESLint: All files pass without errors
- [x] TypeScript: Strict mode, all types validated
- [x] Build: Next.js production build successful
- [x] Environment: .env.example and .env.local configured
- [x] Documentation: Complete README with auth architecture

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
