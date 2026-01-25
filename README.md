# GuernseySpeaks

A community forum web application designed specifically for Guernsey residents to connect, discuss local issues, share news, and engage with their community in an organized, moderated environment.

![Next.js](https://img.shields.io/badge/Next.js-15.4.4-black?logo=next.js)
![React](https://img.shields.io/badge/React-18.3.1-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Firebase](https://img.shields.io/badge/Firebase-11.8.1-orange?logo=firebase)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4.1-38B2AC?logo=tailwind-css)

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [Database Schema](#database-schema)
- [Authentication](#authentication)
- [API Routes](#api-routes)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

## Overview

GuernseySpeaks is a Reddit-style social platform that provides a centralized space for Guernsey residents to:
- Share local news, events, and discussions
- Engage in threaded conversations
- Stay updated with local weather and news
- Connect with fellow community members in a safe, moderated environment

The platform features a modern, responsive design with comprehensive moderation tools, user authentication, and integrated local services.

## Features

### Core Functionality

#### User Management
- Multi-provider authentication (Email/Password, Google, Facebook)
- User profiles with avatars, display names, and bios
- Role-based access control (User, Moderator, Superuser)
- Profile customization and avatar uploads

#### Posts & Discussions
- Create, edit, and delete posts with rich text content
- Image attachments for posts
- Predefined post flairs (Events, News, Discussion, Help, etc.)
- Like/dislike system with optimistic UI updates
- SEO-friendly URLs with slugs
- Advanced filtering and sorting:
  - By flair, date, likes, or comments
  - Keyword search (title, content, author)

#### Comment System
- Threaded/nested comment replies (Reddit-style)
- Image attachments in comments
- Like/dislike functionality
- Multiple sorting options (Best, Top, New, Controversial)
- Collapsible comment threads
- Edit and delete capabilities

#### Moderation Tools
- Admin dashboard for user management
- Content moderation (delete posts/comments)
- User role assignment
- Advertisement management
- Platform statistics and analytics

#### Local Integrations
- Live weather widget for Guernsey (WeatherAPI.com)
- Local news headlines from Island FM RSS feeds
- Community-focused content and design

#### Advertisement System
- Image-based advertisements with clickthrough links
- Superuser-managed ad creation and activation
- Active/inactive status control
- Firebase Storage integration

## Tech Stack

### Frontend
- **Framework**: Next.js 15.4.4 (App Router)
- **UI Library**: React 18.3.1
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 3.4.1
- **Components**: shadcn/ui (Radix UI primitives)
- **State Management**: @tanstack/react-query 5.66.0
- **Form Handling**: react-hook-form 7.54.2
- **Validation**: Zod 3.24.2
- **Icons**: lucide-react 0.475.0
- **Charts**: recharts 2.15.1

### Backend
- **Database**: Firebase Cloud Firestore
- **Authentication**: Firebase Authentication
- **Storage**: Firebase Storage
- **Hosting**: Firebase App Hosting (europe-west2)
- **AI**: Genkit 1.8.0 + Google Gemini 2.0 Flash

### Development Tools
- **Build Tool**: Turbopack
- **CSS Processing**: PostCSS
- **Type Checking**: TypeScript Compiler
- **Code Quality**: ESLint

## Project Structure

```
/src
├── /app                          # Next.js App Router
│   ├── /admin                   # Admin dashboard
│   ├── /api                     # API routes
│   │   └── /fetch-news         # News aggregation endpoint
│   ├── /auth                    # Authentication page
│   ├── /data-deletion          # Data deletion policy
│   ├── /post/[id]/[slug]       # Individual post view
│   ├── /privacy-policy         # Privacy policy
│   ├── /profile                # User profiles
│   ├── /submit                 # Post creation
│   ├── /terms                  # Terms of service
│   ├── globals.css             # Global styles
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Homepage feed
│
├── /components                  # React components
│   ├── /auth                   # Auth forms, password strength
│   ├── /layout                 # Header, footer, main layout
│   ├── /posts                  # Post components
│   ├── /shared                 # Shared components
│   └── /ui                     # shadcn/ui components (36+)
│
├── /services                    # Business logic
│   ├── postService.ts          # Posts & comments CRUD
│   ├── userService.ts          # User management
│   ├── advertisementService.ts # Ad management
│   └── siteContentService.ts   # Site content
│
├── /lib                         # Utilities
│   ├── /firebase               # Firebase config
│   ├── firestoreUtils.ts       # Firestore helpers
│   └── utils.ts                # General utilities
│
├── /hooks                       # Custom React hooks
│   ├── use-auth.ts
│   └── use-toast.ts
│
├── /contexts                    # React contexts
│   └── auth-context.tsx        # Auth state
│
├── /types                       # TypeScript definitions
│   ├── index.ts
│   └── news.ts
│
├── /constants                   # App constants
│   └── flairs.ts               # Post flairs
│
└── /ai                          # AI integration
    ├── genkit.ts               # Genkit config
    └── dev.ts                  # Dev entry
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Firebase project with:
  - Authentication enabled (Email, Google, Facebook providers)
  - Cloud Firestore database
  - Firebase Storage
  - Firebase Hosting (optional)
- WeatherAPI.com API key
- News API key (optional)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd GuernseySpeaks
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables (see [Configuration](#configuration))

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:9002](http://localhost:9002) in your browser

### Development Scripts

```bash
npm run dev          # Start development server (Turbopack, port 9002)
npm run build        # Build for production
npm start            # Start production server
npm run lint         # Run ESLint
npm run typecheck    # Run TypeScript type checking
npm run genkit:dev   # Start Genkit AI development server
npm run genkit:watch # Genkit with auto-reload
```

## Configuration

### Environment Variables

Create a `.env.local` file in the root directory:

```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Weather API
NEXT_PUBLIC_WEATHER_API_KEY=your_weather_api_key

# News API (optional)
NEXT_PUBLIC_NEWS_API_KEY=your_news_api_key
```

### Firebase Setup

1. **Authentication**: Enable Email/Password, Google, and Facebook providers
2. **Firestore**: Create a database with the following collections:
   - `users`
   - `posts`
   - `posts/{postId}/comments` (subcollection)
   - `advertisements`

3. **Storage**: Create storage buckets with the following structure:
```
/profile_pictures/{uid}/{timestamp}_{filename}
/post_images/{timestamp}_{filename}
/comment_images/{postId}/{timestamp}_{filename}
/advertisements/{timestamp}_{filename}
```

4. **Firestore Indexes**: Create composite indexes for:
   - Posts: `flairs (array-contains)` + `likes (desc)` + `createdAt (desc)`
   - Posts: `flairs (array-contains)` + `commentsCount (desc)`
   - Posts: `author.uid (==)` + `createdAt (desc)`
   - Comments (collectionGroup): `author.uid (==)` + `createdAt (desc)`

### Firebase Security Rules

Ensure proper security rules are configured for Firestore and Storage to protect user data and prevent unauthorized access.

## Database Schema

### Collections

#### `users`
```typescript
{
  uid: string              // Firebase UID
  name?: string           // Real name
  displayName?: string    // Public display name
  email?: string
  avatarUrl?: string      // Firebase Storage URL
  bio?: string
  role: 'user' | 'moderator' | 'superuser'
  createdAt: Timestamp
  updatedAt?: Timestamp
}
```

#### `posts`
```typescript
{
  id: string              // Document ID
  title: string
  content: string
  author: {               // Embedded author info
    uid: string
    displayName?: string
    avatarUrl?: string
  }
  flairs: string[]        // Array of flair names
  slug: string            // URL-friendly slug
  imageUrl?: string       // Firebase Storage URL
  likes: number
  likedBy: string[]       // Array of UIDs
  dislikes: number
  dislikedBy: string[]    // Array of UIDs
  commentsCount: number
  createdAt: Timestamp
  updatedAt?: Timestamp
}
```

#### `posts/{postId}/comments` (subcollection)
```typescript
{
  id: string
  postId: string
  author: {
    uid: string
    displayName?: string
    avatarUrl?: string
  }
  content: string
  parentId: string | null  // For threaded replies
  imageUrl?: string
  likes: number
  likedBy: string[]
  dislikes: number
  dislikedBy: string[]
  createdAt: Timestamp
  updatedAt?: Timestamp
}
```

#### `advertisements`
```typescript
{
  id: string
  title: string
  imageUrl: string        // Firebase Storage URL
  linkUrl: string
  isActive: boolean
  uploaderUid: string
  createdAt: Timestamp
  updatedAt?: Timestamp
}
```

## Authentication

### Supported Methods
- Email/Password (Firebase Auth)
- Google OAuth
- Facebook OAuth

### Authorization Levels

| Role | Permissions |
|------|-------------|
| **Unauthenticated** | View posts and comments (read-only) |
| **User** | Create/edit/delete own posts and comments, like/dislike |
| **Moderator** | All user permissions + delete any post/comment + access admin panel |
| **Superuser** | All moderator permissions + user role management + advertisement management |

### Security Features
- Server-side validation
- Role-based UI rendering
- Content ownership checks
- Firebase Security Rules enforcement

## API Routes

### `GET /api/fetch-news`
Fetches and aggregates RSS feeds from Island FM for Guernsey and Jersey news.

**Response:**
```typescript
{
  success: boolean
  articles: Array<{
    title: string
    link: string
    pubDate: string
    description?: string
    source: 'guernsey' | 'jersey'
  }>
}
```

## Deployment

### Firebase App Hosting

The application is configured for deployment on Firebase App Hosting:

```bash
# Build and deploy
npm run build
firebase deploy --only hosting
```

**Configuration** (`apphosting.yaml`):
- Region: `europe-west2` (London)
- Max Instances: 1 (configurable)
- Environment variables set in production

### Build Process

1. Next.js optimizes production bundles
2. TypeScript compilation and type checking
3. Tailwind CSS processing
4. Static asset optimization
5. API routes bundled as serverless functions

## Design System

### Color Palette (Guernsey-themed)
- **Primary**: Guernsey Grass Green (`hsl(125 25% 35%)`)
- **Background**: Pure White / Dark (`hsl(222 47% 11%)`)
- **Accent**: Guernsey Grass Green
- **Text**: Deep Slate (`hsl(215 25% 15%)`)
- **Border**: Cool Gray (`hsl(215 20% 88%)`)
- **Destructive**: Red (`hsl(0 70% 50%)`)

### Typography
- **UI Font**: Noto Sans
- **Code Font**: Geist Mono
- Optimized for readability with font-feature settings

### Layout
- **Reddit-inspired design**: Compact, information-dense
- **Responsive**: Mobile-first approach
- **Three-column layout**: Weather/News sidebar | Main feed | Ads sidebar
- **Sticky header**: Always accessible navigation

## Performance Optimizations

- Turbopack for faster development builds
- Next.js Image component for optimized images
- Lazy loading with Suspense boundaries
- Optimistic UI updates for likes/dislikes
- Staggered animations for smooth UX

## Accessibility

- Keyboard navigation support
- ARIA labels and roles
- Reduced motion support
- Screen reader-friendly markup

## Future Enhancements

- Reporting system for content moderation
- Platform settings configuration UI
- Saved posts and bookmarking
- Advanced search capabilities
- Real-time notifications
- Direct messaging between users

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is proprietary software. All rights reserved.

## Support

For issues, questions, or feature requests, please open an issue on the repository or contact the development team.

---

Built with care for the Guernsey community.
