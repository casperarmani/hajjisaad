# Materials Testing Shop - App Overview

## Introduction

This application is a workflow management system for a materials testing shop. It tracks materials (such as cement, steel, sand, bricks) through various stages of testing, quality control, and approval processes. The system uses QR codes for material tracking and implements role-based access control to ensure different staff members can access only the relevant parts of the workflow.

## Tech Stack

- **Frontend Framework**: Next.js with App Router
- **TypeScript**: For type safety
- **Styling**: Tailwind CSS
- **Authentication**: Supabase Auth
- **Database**: Supabase (PostgreSQL)
- **QR Codes**: qrcode.react (generation), html5-qrcode (scanning)
- **Forms**: react-hook-form
- **PDF Generation**: jspdf

## Project Structure

- `/src/app`: Next.js app router pages
  - `/dashboard`: Main dashboard for viewing materials
  - `/login`: Authentication page
  - `/material`: Material-specific pages
    - `/[id]`: Individual material details
    - `/[id]/test`: Test submission page
    - `/[id]/review`: Test review page
    - `/[id]/qc`: Quality control inspection page
    - `/[id]/accounting`: Quote generation page
    - `/[id]/approve`: Final approval page
    - `/[id]/complete`: Mark as completed page
    - `/new`: New material registration page
- `/src/components`: Reusable UI components
  - `Navbar.tsx`: Application navigation
  - `ProtectedRoute.tsx`: Authentication wrapper
  - `QrScanner.tsx`: QR code scanner
- `/src/lib`: Utilities and services
  - `auth-context.tsx`: Authentication context provider
  - `supabase.ts`: Supabase client and types

## Authentication & Authorization

The application uses Supabase for authentication and role-based access control:

1. **Authentication**: Email/password login via Supabase Auth
2. **User Roles**: Stored in Supabase user metadata
   - `secretary`: Manages received/completed materials
   - `tester`: Runs tests on received materials
   - `manager`: Reviews test results
   - `qc`: Inspects reviewed materials
   - `accounting`: Generates quotes for QC-approved materials
   - `uncle`: Full access to all stages (for administration)

## Workflow Stages

Materials move through these stages:

1. **Received**: Initial material registration by Secretary
2. **Testing**: Test submission by Tester
3. **Review**: Test result review by Manager
4. **QC**: Quality control inspection
5. **Accounting**: Quote generation
6. **Final Approval**: Final approval by Uncle
7. **Completed**: Material processing completed

## Database Structure

The application uses the following Supabase tables:

- `materials`: Core materials being tested
- `tests`: Test results for materials
- `test_types`: Types of tests for different materials
- `qc_inspections`: Quality control inspection records
- `quotes`: Price quotes for tested materials
- `final_approvals`: Final approval records
- `payments`: Payment records for completed materials

## Key Features

1. **Material Tracking**: Track materials from reception to completion
2. **QR Code Integration**: Generate and scan QR codes for material identification
3. **Role-Based Access**: Different views and actions based on user roles
4. **Real-time Updates**: Live updates using Supabase subscriptions
5. **Stage Transitions**: Guided workflow through predefined stages
6. **Responsive UI**: Mobile-friendly interface using Tailwind CSS

## Getting Started

1. Create a `.env.local` file with Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Run the development server:
   ```
   npm run dev
   ```

4. Access the application at http://localhost:3000

## Development Notes

- The application implements client-side authentication using Supabase and custom React context
- Protected routes use the `ProtectedRoute` component to verify authentication
- User roles are retrieved from Supabase user metadata
- The dashboard filters materials based on the user's role
- Real-time updates are implemented using Supabase subscriptions