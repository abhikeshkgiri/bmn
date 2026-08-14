# Phase 8 Booking Implementation - Architecture Review

**Date:** December 2024  
**Status:** Pre-Implementation Architecture Analysis  
**Purpose:** Comprehensive codebase review to guide Phase 8 booking system development

---

## 1. BOOKING MODEL STRUCTURE

### Current State (src/models/Booking.ts)

**Interface Fields:**
```typescript
interface IBooking extends Document {
  _id: Types.ObjectId;
  bookingNumber: string;           // Unique identifier (e.g., BK-20240101-001)
  customer: Types.ObjectId;         // Reference to User (CUSTOMER role)
  salon: Types.ObjectId;            // Reference to Salon
  barber: Types.ObjectId;           // Reference to Barber
  service: Types.ObjectId;          // Reference to Service
  appointmentDate: Date;            // Date of appointment
  startTime: string;                // HH:MM format (e.g., "14:30")
  endTime: string;                  // HH:MM format (e.g., "15:00")
  duration: number;                 // Minutes: min 15, max 480
  servicePrice: number;             // In PAISE (₹100 = 10,000 paise)
  discountAmount?: number;          // In paise, default 0
  taxAmount?: number;               // In paise, default 0
  totalAmount: number;              // In paise (servicePrice + tax - discount)
  status: BookingStatus;            // PENDING|CONFIRMED|IN_PROGRESS|COMPLETED|CANCELLED|NO_SHOW
  paymentStatus: PaymentStatus;     // PENDING|AUTHORIZED|PAID|FAILED|REFUNDED|PARTIALLY_REFUNDED
  bookingType: BookingType;         // SALON|HOME_SERVICE
  customerNotes?: string;           // Customer's special requests
  cancellationReason?: string;      // Reason if cancelled
  createdAt: Date;
  updatedAt: Date;
}
```

**Validation Rules:**
- Time format: Regex `/^([01]\d|2[0-3]):([0-5]\d)$/` (HH:MM)
- Duration: 15-480 minutes
- All monetary fields: Minimum 0 (no negative values)
- bookingNumber: Unique, indexed
- customer, salon, barber, service: Required, indexed

### Missing for Phase 8
✅ **Already Present:**
- All core booking fields exist
- Pagination support via indexes
- Status tracking (6 statuses)
- Payment integration structure (separate Payment model)
- Time slot management (startTime, endTime, duration)
- Type distinction (SALON vs HOME_SERVICE)

### Recommendations for Phase 8
- ✅ No schema changes needed - model is complete
- Consider adding `cancelledAt` timestamp for cancellation tracking
- Consider adding `completedAt` timestamp for completion verification
- Consider adding `refundReason` field for payment refunds

---

## 2. USER MODEL STRUCTURE

### Current State (src/models/User.ts)

**Key Fields:**
```typescript
interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;                    // 2-100 chars, required
  phone: string;                   // Unique, validated format, indexed
  email?: string;                  // Optional, lowercase, validated format
  avatar?: string;                 // URL to avatar image
  role: UserRole;                  // CUSTOMER|BARBER|SALON_OWNER|SALON_STAFF|ADMIN|SUPER_ADMIN
  isActive: boolean;               // Default true, indexed
  isVerified: boolean;             // Default false
  createdAt: Date;
  updatedAt: Date;
}
```

**Available Roles:**
```typescript
CUSTOMER      // End users booking services
BARBER        // Service providers
SALON_OWNER   // Business owners
SALON_STAFF   // Staff management (support)
ADMIN         // System administrators
SUPER_ADMIN   // Full system control
```

### Authorization Pattern for Phase 8
```
✅ Booking Creation:
   - CUSTOMER role can create own bookings
   - SALON_OWNER/ADMIN can create on behalf (management)

✅ Booking Viewing:
   - CUSTOMER views own bookings
   - BARBER views their bookings
   - SALON_OWNER views salon bookings
   - ADMIN/SUPER_ADMIN view all

✅ Booking Modification:
   - CUSTOMER can cancel/update own (if not started)
   - BARBER/SALON_STAFF can update status
   - SALON_OWNER manages all salon bookings
   - ADMIN/SUPER_ADMIN override all
```

---

## 3. SALON MODEL - OPENING HOURS & BOOKING RELEVANCE

### Opening Hours Structure (IOpeningHours)

```typescript
interface IOpeningHours {
  monday: { isOpen: boolean; openTime?: string; closeTime?: string };
  tuesday: { isOpen: boolean; openTime?: string; closeTime?: string };
  wednesday: { isOpen: boolean; openTime?: string; closeTime?: string };
  thursday: { isOpen: boolean; openTime?: string; closeTime?: string };
  friday: { isOpen: boolean; openTime?: string; closeTime?: string };
  saturday: { isOpen: boolean; openTime?: string; closeTime?: string };
  sunday: { isOpen: boolean; openTime?: string; closeTime?: string };
}
```

**Default Values:**
- Monday-Saturday: Open 09:00 - 21:00
- Sunday: Closed (isOpen: false)

### Booking Validation Use Cases
1. **Day Closed Validation**
   - Check if `day.isOpen === false` → Reject booking
   
2. **Operating Hours Validation**
   - Booking's `startTime` must be `>= openTime`
   - Booking's `endTime` must be `<= closeTime`
   
3. **Available Time Slots**
   - Calculate based on `openingHours[dayOfWeek]`
   - Generate 30-min slots between openTime and closeTime
   - Filter out booked slots by checking existing bookings

### Other Relevant Salon Fields
- `barbers[]`: List of barbers (needed for availability checks)
- `services[]`: List of services (needed for service validation)
- `address.city/state`: For location filtering
- `location`: GeoJSON Point for distance-based queries

---

## 4. BARBER MODEL - AVAILABILITY & WORKING HOURS

### Current Availability Structure

```typescript
interface IBarber extends Document {
  user: Types.ObjectId;            // Reference to User (BARBER role)
  salon: Types.ObjectId;           // Required - working salon
  name: string;
  slug: string;
  experienceYears: number;
  specializations: BarberSpecialization[];
  services?: Types.ObjectId[];     // Services they offer
  isAvailable: boolean;            // Binary availability flag
  offersHomeService: boolean;      // Can do home service bookings
  homeServiceRadius?: number;      // km radius for home service
  isActive: boolean;               // Soft delete flag
  isVerified: boolean;             // Admin verification
  createdAt: Date;
  updatedAt: Date;
}
```

### Missing for Phase 8
❌ **Not Present:**
- Working hours/shifts (different from salon hours)
- Leave/vacation dates
- Days off
- Break times
- Lunch hours
- Maximum concurrent bookings limit
- Buffer time between bookings

### Phase 8 Considerations

**Current Implementation Approach:**
- Use salon's opening hours as default barber hours
- Check `isAvailable: true` before booking
- Verify service is in barber's `services[]` array
- Count existing bookings for time slot conflicts

**Recommended Phase 8 Slot Check:**
```
For a requested booking (date, startTime, endTime):
1. Verify barber.isAvailable === true
2. Verify service in barber.services[]
3. Query existing bookings:
   SELECT * FROM bookings
   WHERE barber = barberId
   AND appointmentDate = date
   AND status NOT IN [CANCELLED]
   AND (
     (startTime < requestedEndTime AND endTime > requestedStartTime)
   )
4. If no conflicts → Slot available
5. If conflicts exist → Return available slots
```

---

## 5. SERVICE MODEL - PRICING & DURATION STRUCTURE

### Current State (src/models/Service.ts)

```typescript
interface IService extends Document {
  _id: Types.ObjectId;
  salon: Types.ObjectId;           // Required, indexed
  name: string;                    // 2-100 chars
  slug: string;                    // Lowercase, unique per salon
  description?: string;
  category: ServiceCategory;       // HAIRCUT|BEARD|HAIR_STYLING|etc.
  image?: string;
  duration: number;                // Minutes: min 15, max 480 (8 hrs)
  price: number;                   // In PAISE (₹100 = 10,000 paise)
  discountPrice?: number;          // In paise (optional)
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### Pricing System

**Paise-Based Storage (₹ × 100 for Precision)**
```
₹100 = 10,000 paise (stored as integer)
₹50.50 = 5,050 paise
₹0.01 = 1 paise (minimum)

Benefits:
- Avoids floating-point arithmetic errors
- Perfect precision for financial calculations
- Supports all Indian currency amounts
- Easy rounding (no fractional paise)
```

### Currency Utilities (src/utils/currency.ts)

```typescript
// Display formatting
formatCurrency(10000)                 // "₹100"
formatCurrencyWithDecimals(10050, 2)  // "₹100.50"

// Conversion
convertToPaise(100)                   // 10000
convertToINR(10000)                   // 100
```

### Phase 8 Booking Price Calculation

**Booking totalAmount Formula:**
```
totalAmount = servicePrice + taxAmount - discountAmount

Where:
- servicePrice: service.price (in paise)
- taxAmount: Optional tax (e.g., 5-18% GST, in paise)
- discountAmount: Optional coupon/offer (in paise)
```

**Validation:**
```
✅ service.price: min 1 paise, no negative
✅ discountPrice: must be < price (if provided)
✅ duration: 15-480 minutes (same as booking duration)
```

---

## 6. AUTHENTICATION & AUTHORIZATION (src/lib/auth.ts)

### Current Implementation

**Key Functions:**
```typescript
// Get authenticated user (returns null if not logged in)
async function getCurrentUser(): Promise<AuthUser | null>

// Require authentication (throws if not logged in)
async function requireAuth(): Promise<AuthUser>

// Require specific role(s)
async function requireRole(requiredRole: UserRole | UserRole[]): Promise<AuthUser>

// Check if user has role(s)
async function hasRole(requiredRole: UserRole | UserRole[]): Promise<boolean>

// Check if authenticated
async function isAuthenticated(): Promise<boolean>
```

### Auth Flow

1. **Session Token**
   - Cookie: `bookmynai-session`
   - Type: JWT (jose/jwtVerify)
   - Duration: 7 days
   - Secure: true in production, HttpOnly: true

2. **Token Payload (SessionPayload)**
   ```typescript
   {
     userId: string;      // User._id
     // ... other claims
   }
   ```

3. **Verification**
   - Extract JWT from cookie
   - Verify signature with AUTH_SECRET env var
   - Validate user still exists in DB
   - Check user.isActive === true
   - Return null if invalid/expired

### AuthUser Response Type

```typescript
interface AuthUser {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  avatar?: string;
  role: UserRole;
  isActive: boolean;
  isVerified: boolean;
}
```

### Phase 8 Authorization Pattern

**API Route Example:**
```typescript
export async function POST(request: NextRequest) {
  try {
    // 1. Require authentication
    const currentUser = await requireAuth();

    // 2. Validate request
    const validated = BookingCreateSchema.parse(await request.json());

    // 3. Call service with authorization context
    const booking = await createBooking(validated, currentUser);

    return NextResponse.json({ success: true, data: booking }, { status: 201 });
  } catch (error) {
    // Error handling below
  }
}
```

---

## 7. VALIDATION PATTERNS (src/validations directory)

### Schema Architecture

**Base Pattern:**
```typescript
import { z } from 'zod';

// Define schema with Zod
export const BookingCreateSchema = z.object({
  salonId: z.string().length(24),        // MongoDB ID validation
  barberId: z.string().length(24),
  serviceId: z.string().length(24),
  appointmentDate: z.string().datetime(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  bookingType: z.enum(['SALON', 'HOME_SERVICE']),
  customerNotes: z.string().optional(),
}).refine(/* cross-field validation */);

// Export types
export type BookingCreateInput = z.infer<typeof BookingCreateSchema>;
```

### Existing Validation Schemas

**auth.schema.ts**
- `SendOtpSchema`: Phone validation with normalization
- `VerifyOtpSchema`: Phone + OTP validation (6 digits)

**salon.schema.ts**
- `AddressSchema`: Full address with city/state required
- `LocationSchema`: GeoJSON Point (longitude, latitude)
- `OpeningHoursSchema`: Day-specific hours validation
- `ContactSchema`: Phone (required), email, website
- `SalonCreateSchema`: Full salon with nested objects
- `SalonUpdateSchema`: Partial updates (.partial())

**service.schema.ts**
- `ServiceCreateSchema`: Validates price/discount relationship (.refine())
- Cross-field validation: discountPrice < price
- Duration: 5-480 minutes (more flexible than booking)

**barber.schema.ts**
- `PortfolioItemSchema`: URL validation for images
- `BarberCreateSchema`: 24-char ID validation for references
- `BarberListSchema`: Query params with transforms (`.transform(Number)`)
- Enum validation: specializations, services

**booking.schema.ts** (Already exists)
```typescript
export const BookingCreateSchema = z.object({
  appointmentDate: z.string().datetime(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  duration: z.number().min(15).max(480),
  bookingType: z.enum(['SALON', 'HOME_SERVICE']),
  customerNotes: z.string().optional(),
});

export const BookingUpdateSchema = z.object({
  status: z.enum(BOOKING_STATUS_ARRAY).optional(),
  paymentStatus: z.enum(PAYMENT_STATUS_ARRAY).optional(),
  customerNotes: z.string().optional(),
  cancellationReason: z.string().optional(),
});
```

### Key Patterns for Phase 8

1. **Reference Validation**
   - ObjectId: `z.string().length(24)`
   - Must be uppercase for consistency

2. **Enum Validation**
   - Use `ARRAY` constants: `BOOKING_STATUS_ARRAY`
   - Type cast: `as [string, ...string[]]`

3. **Cross-Field Validation**
   - Use `.refine()` or `.superRefine()`
   - Example: endTime > startTime

4. **Transformation**
   - Query params: `z.string().transform(Number)`
   - Dates: `z.string().datetime()` or `z.coerce.date()`

5. **Partial Updates**
   - Use schema: `BaseSchema.partial()`
   - Makes all fields optional

---

## 8. SERVICE LAYER PATTERNS (src/services directory)

### Architecture Overview

**Existing Services:**
- `auth.service.ts`: OTP requests, verification, user creation
- `barber.service.ts`: CRUD, availability, slug generation (361 lines)
- `salon.service.ts`: CRUD, ownership verification (200+ lines)
- `service.service.ts`: CRUD with pricing, discounts (313 lines)

### Standard Service Function Signature

```typescript
/**
 * Function description
 * Authorization: Role requirement
 */
export async function functionName(
  input: InputType,
  currentUser: AuthUser
): Promise<ReturnType> {
  // 1. Connect to DB
  await connectDB();

  // 2. Verify authentication/role
  if (currentUser.role !== REQUIRED_ROLE) {
    throw new Error('FUNCTION_ACCESS_DENIED: Your role cannot...');
  }

  // 3. Validate user is active
  const user = await User.findById(currentUser._id);
  if (!user || !user.isActive) {
    throw new Error('USER_INACTIVE: Your account is inactive');
  }

  // 4. Validate referenced resources exist
  const resource = await Model.findById(input.resourceId);
  if (!resource) {
    throw new Error('RESOURCE_NOT_FOUND: Resource not found');
  }

  // 5. Verify ownership (if applicable)
  if (resource.owner.toString() !== currentUser._id) {
    throw new Error('ACCESS_DENIED: You do not own this resource');
  }

  // 6. Execute business logic
  const result = await Model.create(/* ... */);

  // 7. Return result
  return result;
}
```

### Error Convention

**Format:** `ERROR_CODE: Descriptive Message`

**Common Patterns:**
```
ACCESS_DENIED                    // Authorization failure
NOT_FOUND                        // Resource doesn't exist
INVALID_DATA                     // Validation failure
DUPLICATE                        // Unique constraint violation
INACTIVE                         // User/resource inactive
OWNER_MISMATCH                   // Ownership verification failed
TIME_CONFLICT                    // Schedule conflict
```

### Example: Barber Service Pattern

```typescript
export async function createBarber(
  input: BarberCreateInput,
  currentUser: AuthUser
): Promise<IBarber> {
  await connectDB();

  // Role check
  if (![SALON_OWNER, ADMIN].includes(currentUser.role)) {
    throw new Error('BARBER_ACCESS_DENIED: ...');
  }

  // User active check
  const creator = await User.findById(currentUser._id);
  if (!creator?.isActive) {
    throw new Error('USER_INACTIVE: ...');
  }

  // Salon exists
  const salon = await Salon.findById(input.salonId);
  if (!salon) {
    throw new Error('SALON_NOT_FOUND: ...');
  }

  // Ownership verification
  if (currentUser.role === SALON_OWNER && 
      salon.owner.toString() !== currentUser._id) {
    throw new Error('SALON_ACCESS_DENIED: ...');
  }

  // Generate unique slug
  const slug = await generateBarberSlug(input.name, input.salonId);

  // Create
  const barber = await Barber.create({
    ...input,
    slug,
  });

  return barber;
}
```

### Phase 8 Booking Service Functions

**Expected:**
```
✅ createBooking(input, currentUser) → IBooking
✅ getBookingById(bookingId, currentUser) → IBooking | null
✅ listBookings(query, currentUser) → Paginated list
✅ updateBooking(bookingId, input, currentUser) → IBooking
✅ cancelBooking(bookingId, reason, currentUser) → IBooking
✅ getAvailableSlots(salonId, barberId, date) → TimeSlot[]
✅ checkTimeConflict(barberId, date, startTime, endTime) → boolean
```

---

## 9. API ROUTE PATTERNS (src/app/api directory)

### Standard Route Structure

**File Organization:**
```
src/app/api/
├── resource/
│   ├── route.ts              # GET (list), POST (create)
│   ├── [id]/
│   │   ├── route.ts          # GET (detail), PATCH (update), DELETE (soft delete)
│   │   ├── status/
│   │   │   └── route.ts      # PATCH (toggle isActive)
│   │   └── verify/
│   │       └── route.ts      # PATCH (admin verification)
│   └── ...
```

### Standard Endpoint Pattern

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/auth';
import { SomeSchema } from '@/validations/some.schema';
import { someFuntion } from '@/services/some.service';
import { ZodError } from 'zod';

/**
 * POST /api/resource
 * Create a new resource
 * Authorization: ROLE1, ROLE2
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const currentUser = await requireAuth();

    // 2. Parse body
    const body = await request.json();

    // 3. Validate with Zod
    const validated = SomeSchema.parse(body);

    // 4. Call service
    const resource = await createSomething(validated, currentUser);

    // 5. Return success response
    return NextResponse.json(
      {
        success: true,
        data: resource,
      },
      { status: 201 }
    );
  } catch (error) {
    // Error handling below
  }
}

/**
 * GET /api/resource
 * List resources with pagination
 * Authorization: Public (or role-based filtering)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    
    // Validate pagination
    if (page < 1) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_PAGE', message: '...' },
        },
        { status: 400 }
      );
    }

    // Call service
    const { data, total } = await listResources(page, limit);

    // Return paginated response
    return NextResponse.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    // Error handling
  }
}
```

### Error Response Pattern

**Zod Validation Error:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": [
      {
        "code": "too_small",
        "minimum": 1,
        "type": "number",
        "path": ["duration"],
        "message": "Number must be greater than or equal to 1"
      }
    ]
  }
}
```

**Authorization Error:**
```json
{
  "success": false,
  "error": {
    "code": "BOOKING_ACCESS_DENIED",
    "message": "You do not have permission to create bookings"
  }
}
```
Status: 403

**Not Found Error:**
```json
{
  "success": false,
  "error": {
    "code": "BARBER_NOT_FOUND",
    "message": "Barber not found"
  }
}
```
Status: 404

**Conflict Error:**
```json
{
  "success": false,
  "error": {
    "code": "TIME_CONFLICT",
    "message": "This time slot is already booked"
  }
}
```
Status: 409

### Common Status Codes

```
201  Created
400  Bad Request (validation error)
403  Forbidden (authorization)
404  Not Found
409  Conflict (duplicate, time conflict)
429  Rate Limited
500  Internal Server Error
```

### Phase 8 Booking Endpoints

**Expected Structure:**
```
POST   /api/bookings                # Create booking
GET    /api/bookings                # List bookings (with filters)
GET    /api/bookings/[id]           # Get booking detail
PATCH  /api/bookings/[id]           # Update booking status
DELETE /api/bookings/[id]           # Cancel booking
PATCH  /api/bookings/[id]/status    # Toggle status
GET    /api/bookings/slots          # Get available slots
POST   /api/bookings/[id]/payment   # Process payment
```

---

## 10. UI COMPONENTS (src/components directory)

### Available Base Components (src/components/ui/)

**Button.tsx**
```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'link';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
  fullWidth?: boolean;
}
```
Usage: `<Button variant="primary" size="lg" isLoading={false}>Submit</Button>`

**Card.tsx**
- `Card`: Container with border/shadow
- `CardHeader`: Top section with border
- `CardTitle`: Heading
- `CardDescription`: Subtitle
- `CardContent`: Main content area
- `CardFooter`: Footer section

**Input.tsx**
```typescript
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: string;
  error?: string;
  required?: boolean;
  fullWidth?: boolean;
}
```
Usage: `<Input label="Date" type="date" error={error} fullWidth />`

**Dialog.tsx** - Modal/popup component
**Tabs.tsx** - Tab navigation
**Badge.tsx** - Status indicators (CONFIRMED, CANCELLED, etc.)
**Loading.tsx** - Loading spinner
**Tooltip.tsx** - Hover tooltips
**Avatar.tsx** - User profile images
**Separator.tsx** - Visual dividers
**Dropdown.tsx** - Select menus

### Component Structure Pattern

**Example: BookingForm.tsx (expected for Phase 8)**
```typescript
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { BookingCreateSchema } from '@/validations/booking.schema';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';

type BookingFormInput = z.infer<typeof BookingCreateSchema>;

interface BookingFormProps {
  onSubmit: (data: BookingFormInput) => Promise<void>;
  isLoading?: boolean;
  salons?: SalonResponse[];
  barbers?: BarberResponse[];
}

export default function BookingForm({ 
  onSubmit, 
  isLoading = false,
  salons = [],
  barbers = [],
}: BookingFormProps) {
  const { register, handleSubmit, formState: { errors } } = useForm<BookingFormInput>({
    resolver: zodResolver(BookingCreateSchema),
  });

  return (
    <Card>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Salon"
          {...register('salonId')}
          error={errors.salonId?.message}
          fullWidth
          required
        />
        
        <Input
          label="Appointment Date"
          type="date"
          {...register('appointmentDate')}
          error={errors.appointmentDate?.message}
          fullWidth
          required
        />

        <Button 
          type="submit" 
          isLoading={isLoading}
          fullWidth
        >
          Book Appointment
        </Button>
      </form>
    </Card>
  );
}
```

### Styling Approach

- **Framework:** Tailwind CSS
- **Color Scheme:**
  - Primary: `brand-pink` (defined in tailwind.config.ts)
  - Secondary: `brand-black`
  - Error: `error-500`, `error-600`
  - Neutral: `neutral-*` scale
- **Responsive:** Mobile-first with `sm:`, `md:`, `lg:` prefixes
- **Shadow:** `shadow-bookmynai-sm` for cards

### UI Patterns for Phase 8

**Expected Pages:**
```
1. src/app/booking/page.tsx
   - Search salon/barber
   - Date/time picker
   - Service selection
   - Booking creation form

2. src/app/customer/bookings/page.tsx
   - List customer's bookings
   - Filter by status (upcoming, past, cancelled)
   - Cancel booking button
   - View details modal

3. src/app/salon/bookings/page.tsx
   - Salon owner's booking dashboard
   - Calendar view
   - Barber schedules
   - Status updates
   - Customer details
```

---

## 11. CONSTANTS & UTILITIES

### Booking Constants (src/constants/booking.ts)

**Status Enums:**
```typescript
BOOKING_STATUS {
  PENDING: 'PENDING'          // Initial state
  CONFIRMED: 'CONFIRMED'      // Customer confirmed
  IN_PROGRESS: 'IN_PROGRESS'  // Service started
  COMPLETED: 'COMPLETED'      // Service finished
  CANCELLED: 'CANCELLED'      // Cancelled by customer/staff
  NO_SHOW: 'NO_SHOW'          // Customer didn't show up
}

BOOKING_TYPE {
  SALON: 'SALON'              // At salon location
  HOME_SERVICE: 'HOME_SERVICE' // Barber goes to customer
}

PAYMENT_STATUS {
  PENDING: 'PENDING'
  AUTHORIZED: 'AUTHORIZED'    // Payment authorized (pending capture)
  PAID: 'PAID'                # Payment completed
  FAILED: 'FAILED'            # Payment failed
  REFUNDED: 'REFUNDED'        # Full refund
  PARTIALLY_REFUNDED: 'PARTIALLY_REFUNDED'
}

PAYMENT_METHOD {
  UPI: 'UPI'
  CARD: 'CARD'
  NET_BANKING: 'NET_BANKING'
  CASH: 'CASH'                # On-location payment
}

PAYMENT_PROVIDER {
  RAZORPAY: 'RAZORPAY'        # Primary payment gateway
}

PAYMENT_CURRENCY {
  INR: 'INR'                  # Indian Rupees
}
```

### Currency Utilities (src/utils/currency.ts)

```typescript
// Display formatting (zero decimal places)
formatCurrency(10000)
→ "₹100"

// Display with decimals
formatCurrencyWithDecimals(10050, 2)
→ "₹100.50"

// Convert INR → Paise
convertToPaise(100)
→ 10000

// Convert Paise → INR
convertToINR(10000)
→ 100
```

### Phone Utilities (src/utils/phone.ts)

```typescript
normalizePhoneNumber('+91 9876543210')
→ '+919876543210'

// Used in validation schemas for consistency
```

### Slug Utilities (src/utils/slug.ts)

```typescript
generateUniqueSlug(name, existingSlugs)
→ Generates URL-safe slug with collision handling
→ Format: "lowercase-with-hyphens"
→ Adds counter suffix if duplicate
```

### Service Constants (src/constants/services.ts)

```typescript
SERVICE_CATEGORY {
  HAIRCUT, BEARD, HAIR_STYLING, HAIR_COLOR,
  FACIAL, GROOMING, KIDS, OTHER
}

BARBER_SPECIALIZATION {
  HAIRCUT, BEARD, HAIR_STYLING, HAIR_COLOR,
  FACIAL, GROOMING, KIDS_HAIRCUT, BRIDAL, OTHER
}

SALON_FACILITY {
  PARKING, AC, WIFI, CARD_PAYMENT, UPI,
  WAITING_AREA, WASHROOM, KIDS_FRIENDLY, HOME_SERVICE
}
```

---

## 12. RESPONSE & ERROR PATTERNS

### Standard API Response Structure

**Success Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "bookingNumber": "BK-20240115-001",
    "customer": "507f1f77bcf86cd799439012",
    "salon": "507f1f77bcf86cd799439013",
    "barber": "507f1f77bcf86cd799439014",
    "service": "507f1f77bcf86cd799439015",
    "appointmentDate": "2024-01-20T09:00:00.000Z",
    "startTime": "09:00",
    "endTime": "09:30",
    "duration": 30,
    "servicePrice": 50000,
    "taxAmount": 5000,
    "discountAmount": 0,
    "totalAmount": 55000,
    "status": "PENDING",
    "paymentStatus": "PENDING",
    "bookingType": "SALON",
    "createdAt": "2024-01-15T14:30:00.000Z",
    "updatedAt": "2024-01-15T14:30:00.000Z"
  }
}
```

**List Response (200 OK):**
```json
{
  "success": true,
  "data": [
    { /* booking object */ },
    { /* booking object */ }
  ],
  "pagination": {
    "total": 50,
    "page": 1,
    "limit": 10,
    "pages": 5
  }
}
```

**Error Response (400 Bad Request):**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": [
      {
        "code": "invalid_enum_value",
        "received": "INVALID_STATUS",
        "options": ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"],
        "path": ["status"],
        "message": "Invalid enum value. Expected 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'"
      }
    ]
  }
}
```

### Common Error Patterns

**By Category:**
```
VALIDATION_ERROR (400)
  - Invalid data format
  - Missing required fields
  - Failed Zod schema validation

AUTHORIZATION_ERROR (403)
  - Insufficient role/permissions
  - Ownership mismatch
  - Resource belongs to different user

NOT_FOUND (404)
  - Resource doesn't exist
  - Barber/Salon/Service not found

CONFLICT (409)
  - Time slot already booked
  - Duplicate booking for same slot
  - Resource already exists (unique constraint)

RATE_LIMIT (429)
  - Too many OTP requests
  - Too many API calls

SERVER_ERROR (500)
  - Database error
  - External service failure
```

---

## 13. PHASE 8 IMPLEMENTATION CHECKLIST

### Models & Schema
- ✅ IBooking interface complete
- ✅ Payment model exists
- ⚠️ Booking schema already created
- ⚠️ Payment schema already created
- ⚠️ Booking validation schema exists

### Database & Utilities
- ✅ Currency utilities ready (paise-based)
- ✅ Phone normalization ready
- ⚠️ Need booking number generation utility
- ⚠️ Need time slot calculation utilities
- ⚠️ Need conflict detection utilities

### Service Layer
- ❌ booking.service.ts - NEEDS CREATION
  - createBooking()
  - getBookingById()
  - listBookings()
  - updateBookingStatus()
  - cancelBooking()
  - getAvailableSlots()
  - checkTimeConflict()

- ❌ payment.service.ts - NEEDS CREATION (if separate from booking)
  - createPayment()
  - updatePaymentStatus()
  - processRefund()

### API Routes
- ❌ /api/bookings/route.ts (POST/GET)
- ❌ /api/bookings/[id]/route.ts (GET/PATCH/DELETE)
- ❌ /api/bookings/[id]/status/route.ts (PATCH)
- ❌ /api/bookings/slots/route.ts (GET available slots)
- ⚠️ /api/bookings/[id]/payment/route.ts (if payment integration)

### UI Components & Pages
- ❌ BookingForm.tsx component
- ❌ /booking/page.tsx - Create booking
- ❌ /customer/bookings/page.tsx - View my bookings
- ❌ /salon/bookings/page.tsx - Salon dashboard
- ❌ /barber/bookings/page.tsx - Barber view (optional)

### Documentation
- ❌ Phase 8 architecture documentation
- ❌ Booking API reference
- ❌ Integration examples

---

## 14. KEY RECOMMENDATIONS FOR PHASE 8

### 1. Booking Number Generation
**Implement utility:**
```typescript
// Generate: BK-YYYYMMDD-XXXXX
// Example: BK-20240115-00001
// Ensures uniqueness and readability
```

### 2. Time Slot Availability
**Algorithm:**
```
1. Get salon opening hours for date
2. Get all confirmed/in-progress bookings for barber that day
3. Generate 15/30-minute slots between opening hours
4. Remove booked slots + buffer (e.g., 5 min cleanup time)
5. Return available slots
```

### 3. Authorization Matrix
```
CUSTOMER:
  - Create own bookings
  - View own bookings
  - Cancel own bookings (not started)
  - Update own customerNotes

BARBER:
  - View own bookings (in assigned salon)
  - Update booking status (PENDING→IN_PROGRESS→COMPLETED)
  - Cannot create/delete

SALON_OWNER:
  - View all salon bookings
  - Create bookings on behalf
  - Update any booking status
  - Cancel bookings
  - Manage payments

ADMIN/SUPER_ADMIN:
  - Full access to all bookings
  - Override all restrictions
```

### 4. Payment Integration
**Two approaches:**
- **Option A:** Separate payment.service.ts for complex payment logic
- **Option B:** Integrate into booking.service.ts for simplicity

**Recommendation:** Start with Option B, refactor to A if payment logic grows

### 5. Status Transitions
```
Valid transitions:
  PENDING → CONFIRMED
  PENDING → CANCELLED
  CONFIRMED → IN_PROGRESS
  CONFIRMED → CANCELLED
  IN_PROGRESS → COMPLETED
  IN_PROGRESS → CANCELLED
  Any → NO_SHOW (admin only)
```

### 6. Rate Limiting
**Consider implementing for:**
- Booking creation (prevent spam)
- Slot queries (prevent enumeration attacks)
- Payment attempts (prevent brute force)

### 7. Caching Strategies
**Cache opportunities:**
- Available slots (5-min TTL)
- Salon opening hours (24-hour TTL)
- Barber services (1-hour TTL)
- Active bookings count (5-min TTL)

### 8. Testing Scenarios
```
✅ Happy path: Create → Confirm → Complete
✅ Cancellation: Create → Cancel
✅ Time conflicts: Overlapping bookings
✅ Availability: Closed days, after hours
✅ Authorization: Wrong role, different user
✅ Status transitions: Invalid transitions
✅ Pricing: Tax/discount calculations
✅ Payment: Success, failure, refund
```

---

## SUMMARY

| Aspect | Status | Readiness |
|--------|--------|-----------|
| Models | ✅ Complete | Ready |
| Validations | ⚠️ Partial | Ready (need booking-specific) |
| Database | ✅ Set up | Ready |
| Authentication | ✅ Complete | Ready |
| Currency System | ✅ Complete | Ready |
| Service Layer | ❌ Missing | Needs implementation |
| API Routes | ❌ Missing | Needs implementation |
| UI Components | ✅ Base Available | Ready for booking UI |
| Error Handling | ✅ Patterns Set | Ready |
| Utilities | ⚠️ Partial | Needs slot/conflict utilities |

**Overall:** Codebase architecture is solid and well-structured. Core booking infrastructure is in place. Phase 8 primarily needs service layer, API routes, and UI implementation.

---

**Generated:** December 2024  
**For:** BookMyNai Phase 8 Booking System Implementation
