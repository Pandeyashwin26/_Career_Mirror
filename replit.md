# Career Mirror - AI-Powered Career Guidance Platform

## Overview

Career Mirror is a comprehensive career guidance platform that leverages AI to provide personalized career advice, skill gap analysis, and professional development recommendations. The application uses machine learning to match users with "career doppelgangers" - professionals with similar backgrounds who have achieved career success - and provides actionable insights for career progression.

The platform combines career profile analysis, skill assessment, educational resource recommendations, and AI-powered guidance to help users make informed career decisions and plan their professional development journey.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Library**: shadcn/ui components built on Radix UI primitives
- **Styling**: TailwindCSS with custom design tokens and CSS variables
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express server
- **Language**: TypeScript with ES modules
- **Authentication**: Replit Auth integration with OpenID Connect
- **Session Management**: Express sessions with PostgreSQL store
- **API Design**: RESTful endpoints with structured error handling
- **File Uploads**: Multer middleware for resume/CV processing

### Database Design
- **Primary Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon serverless PostgreSQL
- **Schema Management**: Drizzle Kit for migrations and schema updates
- **Key Tables**:
  - Users and profiles with career information
  - Skills tracking with proficiency levels
  - Career paths and progression timelines
  - Educational classes and enrollments
  - AI guidance history and chat messages
  - Vector embeddings for similarity matching

### AI and Machine Learning
- **AI Provider**: OpenAI GPT models for career guidance and content generation
- **Model Selection**: Uses GPT-5 as the latest available model
- **Vector Search**: Profile similarity matching using embeddings
- **Use Cases**:
  - Resume parsing and profile extraction
  - Career path recommendations
  - Skill gap analysis
  - Personalized career guidance
  - Chat-based career counseling

### Authentication and Security
- **Auth Provider**: Replit Auth with OIDC integration
- **Session Storage**: PostgreSQL-backed sessions with automatic cleanup
- **Security Features**: HTTPS enforcement, secure cookies, CSRF protection
- **Authorization**: Route-level authentication middleware

### File Processing
- **File Types**: PDF, DOC, DOCX, and TXT resume uploads
- **Storage**: In-memory processing with size limits (5MB)
- **Processing**: AI-powered text extraction and profile parsing

## External Dependencies

### Core Infrastructure
- **Neon Database**: Serverless PostgreSQL hosting with connection pooling
- **Replit Auth**: Authentication service with OpenID Connect support
- **Replit Platform**: Development and hosting environment

### AI and Machine Learning
- **OpenAI API**: GPT models for text generation and embeddings
- **Vector Database**: Profile similarity search and matching capabilities

### Frontend Libraries
- **Radix UI**: Headless component primitives for accessibility
- **TailwindCSS**: Utility-first CSS framework
- **Lucide Icons**: Icon library for UI elements
- **TanStack Query**: Server state management and caching

### Development Tools
- **TypeScript**: Type safety across frontend and backend
- **Vite**: Fast build tool with HMR support
- **Drizzle ORM**: Type-safe database operations
- **ESBuild**: Production bundling for server code

### Planned Integrations
- **Career Data Sources**: O*NET, ESCO, LinkedIn APIs for job market data
- **Learning Platforms**: Coursera, Udemy, LinkedIn Learning APIs
- **Salary Data**: Glassdoor API for compensation insights
- **Analytics**: PostHog or Mixpanel for user behavior tracking

The application follows a modular architecture with clear separation between client and server code, shared type definitions, and a comprehensive database schema designed to support complex career tracking and analysis features.