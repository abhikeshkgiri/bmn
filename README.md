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

## Current Status

**Initial project setup completed.**

This is the foundation phase. The following features will be implemented in subsequent stages:

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
