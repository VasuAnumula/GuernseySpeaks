# GuernseySpeaks: AI Coding Agent Instructions

## Project Overview
**GuernseySpeaks** is a Reddit-style community forum for Guernsey residents built with Next.js 15, React 18, TypeScript, and Firebase. The platform enables threaded discussions, content moderation, local integrations (weather, news), and user management with role-based access control.

## Architecture Overview

### Three-Tier Stack
1. **Frontend**: Next.js 15 (App Router) with React, Tailwind CSS, shadcn/ui components
2. **Backend**: Firebase (Firestore for data, Authentication, Storage for media)
3. **AI Layer**: Google Genkit integration for potential content assistance (see `src/ai/`)

### Core Data Model
- **Posts**: Top-level discussion items with flairs, likes/dislikes, embedded AuthorInfo, images, and slugs
- **Comments**: Nested threaded replies with `parentId` field for threading (null = top-level)
- **Users**: Firebase Auth users extended with Firestore profiles (role, bio, avatar, savedPosts array)
- **AuthorInfo**: Embedded snapshot of author data (uid, displayName, avatarUrl, bio) denormalized in Posts/Comments

**Key Pattern**: Timestamps stored as Firebase Timestamps, converted to JS Dates client-side via `processDoc()` utility.

### Service Layer Architecture
Located in `src/services/`, each service encapsulates domain logic:
- `postService.ts`: Post CRUD, filtering, slug generation, image uploads, notifications
- `userService.ts`: User profiles, avatar uploads, role management
- `messageService.ts`: Direct messaging between users
- `notificationService.ts`: Event notifications (post likes, comments, replies)
- `reportService.ts`: Content moderation reports
- `bookmarkService.ts`: Save/bookmark management
- `advertisementService.ts`: Ad management for superusers
- `settingsService.ts`: Platform settings

**Important**: Services call Firebase directly; no additional backend API layer. All business logic is client-side or triggered via Next.js API routes.

### Context & State Management
- **AuthContext** (`src/contexts/auth-context.tsx`): Global auth state, multi-provider login (Email/Password, Google, Facebook)
- **NotificationContext**: Real-time notification handling
- **React Query**: Data fetching/caching for server state (via `@tanstack/react-query`)
- **React Hook Form**: Form state management with Zod validation

## Key Conventions & Patterns

### Component Structure
- **Page components**: Located in `src/app/[route]/page.tsx`, prefixed with `"use client"` for client-side rendering
- **UI Components**: shadcn/ui primitives in `src/components/ui/` (accordion, button, dialog, etc.)
- **Feature Components**: Organized by domain (posts/, auth/, layout/, messages/, reports/)
- **Naming**: PascalCase for components, kebab-case for files

### Data Fetching & Filtering
```typescript
// Example from page.tsx: Services return raw data; client-side filtering combines Firestore queries + in-memory filters
const firestoreFilters: GetPostsFilters = {
  sortBy: 'createdAt',
  sortOrder: 'desc',
  flair: selectedFlair,
  searchQuery: searchTerm
};
const posts = await getPosts(firestoreFilters);
```

### Timestamp Handling
- Firestore stores Timestamps; `processDoc()` in `src/lib/firestoreUtils.ts` recursively converts them to JS Dates
- Always call `processDoc()` after Firestore queries to normalize data

### Image Uploads
- Posts/comments store image URLs from Firebase Storage
- Services handle `uploadBytes()` + `getDownloadURL()` for media
- Next.config.ts allows remote patterns for Firestore Storage, Google avatars, Unsplash, WeatherAPI

### Form Validation
- Uses `react-hook-form` + `zod` for type-safe validation
- Validation schemas defined inline or in component files
- No dedicated validation layer; schemas are co-located with forms

### Role-Based Access Control
- User roles: `'user' | 'moderator' | 'superuser'`
- Admin checks done client-side (via `user.role` from AuthContext) or in service functions
- No explicit permission matrix; role checks scattered throughout services and components

## Development Workflow

### Key Scripts
```bash
npm run dev              # Start Next.js dev server (turbopack) on port 9002
npm run genkit:dev      # Start Google Genkit AI tooling
npm run genkit:watch    # Genkit with watch mode
npm run build           # Production build
npm run start           # Production server
npm run lint            # ESLint check
npm run typecheck       # TypeScript check without emit
```

### Environment Setup
- Firebase config in `src/lib/firebase/config.ts` (imported from env vars)
- `.env.local` for sensitive keys (Firebase credentials, API keys)
- `NEXT_PUBLIC_*` prefix for client-side env vars (auto-exposed by Next.js)

### Firebase/Firestore Collections
- `users/` → User profiles
- `posts/` → Post documents with nested comments subcollection
- `posts/{postId}/comments/` → Comment subcollection
- `conversations/`, `messages/`, `notifications/` → For messaging/notifications
- `advertisements/` → Ad documents for superusers

## Common Implementation Patterns

### Creating/Reading Posts
1. **Create**: Call `postService.createPost()` → generates slug, stores author snapshot, emits notifications
2. **Read**: Use `getPosts()` with filters → returns array of Posts with embedded author info
3. **Update**: `updatePost()` or specific functions like `likePost()`, `unlikePost()` → uses increments + array operations

### Threaded Comments
- `Comment.parentId = null` → top-level comment
- `Comment.parentId = commentId` → reply to that comment
- UI displays nested structure; sorting options: Best, Top, New, Controversial

### Authentication Flow
1. User signs up/logs in via AuthContext (email or OAuth)
2. AuthContext creates Firebase user + Firestore profile doc
3. `onAuthStateChanged()` syncs Firebase user state globally
4. Protected routes check `user && user.role` before rendering

### Optimistic UI Updates
- Used in likes/dislikes (update local state immediately, sync with Firestore after)
- Example in post-card component

## Important Files & Directories
- **Core Types**: `src/types/index.ts` (User, Post, Comment, AuthorInfo)
- **Firestore Utils**: `src/lib/firestoreUtils.ts` (Timestamp conversion)
- **Firebase Config**: `src/lib/firebase/config.ts` (initialization)
- **Main Layout**: `src/components/layout/main-layout.tsx` (page wrapper)
- **Post Service**: `src/services/postService.ts` (686 lines, main domain logic)
- **Auth Context**: `src/contexts/auth-context.tsx` (388 lines, global auth state)
- **Home Page**: `src/app/page.tsx` (post listing, filtering, search)

## Potential Pitfalls
1. **Timestamp Confusion**: Forget to call `processDoc()` → Timestamp objects returned instead of Dates
2. **Denormalized Author Data**: Author info is snapshots; updates to user profile don't auto-update old posts/comments
3. **Nested Subcollections**: Comments are in `posts/{postId}/comments/` → queries must traverse the structure
4. **Client-Side Role Checks**: No server-side permission validation; malicious clients can fake roles (add server-side checks for sensitive operations)
5. **Environment Vars**: Firebase keys must be in `.env.local`; missing vars cause silent failures

## Deployment
- Hosted on **Firebase App Hosting** (europe-west2)
- `next build` → `npm start` deployment pipeline
- Configuration in `apphosting.yaml`
- Storage rules in `storage.rules`

---

**Last Updated**: January 31, 2026  
**For questions on Firestore structure or service APIs, refer to service file headers or type definitions in `src/types/index.ts`.**
