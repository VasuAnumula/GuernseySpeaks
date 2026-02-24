# GuernseySpeaks

A Reddit-style community forum for Guernsey (Channel Islands) residents, built with Next.js 16 and Firebase.

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack dev server on port 9002)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 3.4 + shadcn/ui (Radix primitives)
- **Backend/DB**: Firebase (Firestore, Auth, Storage)
- **State**: React Context (AuthContext, NotificationContext) + local state
- **AI**: Google Genkit (configured but minimal usage)
- **Other**: react-hook-form, zod, recharts, date-fns, xml2js (RSS parsing)

## Commands

- `npm run dev` - Start dev server (port 9002, Turbopack)
- `npm run build` - Production build
- `npm run lint` - ESLint
- `npm run typecheck` - TypeScript check (`tsc --noEmit`)

## Project Structure

```
src/
  app/                    # Next.js App Router pages
    page.tsx              # Home page (post feed with filters)
    layout.tsx            # Root layout (AuthProvider, NotificationProvider)
    auth/page.tsx         # Login/Register page
    submit/page.tsx       # Create post page
    profile/page.tsx      # Current user profile
    profile/[id]/page.tsx # Public user profile
    post/[id]/[slug]/page.tsx      # Post detail + comments
    post/[id]/[slug]/edit/page.tsx # Edit post
    messages/page.tsx     # Conversations list
    messages/[conversationId]/page.tsx # Chat view
    saved/page.tsx        # Saved/bookmarked posts
    notifications/page.tsx # Notifications page
    admin/page.tsx        # Admin dashboard (users, ads, settings, audit logs)
    admin/reports/page.tsx # Content moderation reports
    privacy-policy/       # Legal pages
    terms/
    data-deletion/
    api/fetch-news/route.ts # API route for RSS news fetching
  components/
    layout/
      main-layout.tsx     # 3-column layout (left sidebar, content, right sidebar)
      header.tsx          # Top nav with search, filters, user menu
      footer.tsx          # Sticky bottom footer
      announcement-banner.tsx # Dismissible announcement bar
    posts/
      post-card.tsx       # Post card with voting, sharing, saving
      post-form.tsx       # Create/edit post form
      post-list-filters.tsx # Search & filter controls
    auth/
      auth-form.tsx       # Login/register tabs with social auth
      password-strength.tsx
    messages/
      new-conversation-dialog.tsx
    notifications/
      notification-bell.tsx
    reports/
      report-dialog.tsx
    admin/
      platform-settings-form.tsx
    search/
      advanced-search-filters.tsx
    shared/
      logo.tsx
      theme-toggle.tsx
    weather-widget.tsx    # Weather from WeatherAPI
    news-headlines-widget.tsx # RSS news headlines
    ad-placeholder.tsx    # Ad placeholder cards
    ui/                   # shadcn/ui components
  services/               # Firebase service layer
    postService.ts        # CRUD posts, comments, voting
    userService.ts        # User management, roles, banning
    bookmarkService.ts    # Save/unsave posts
    messageService.ts     # Private messaging
    notificationService.ts # Push notifications
    reportService.ts      # Content reporting
    advertisementService.ts # Ad CRUD + tracking
    settingsService.ts    # Platform settings
    auditLogService.ts    # Admin activity logging
    siteContentService.ts # Site content management
  contexts/
    auth-context.tsx      # Firebase Auth + Firestore user sync
    notification-context.tsx
  types/
    index.ts              # All TypeScript interfaces
    news.ts               # News article type
  lib/
    firebase/config.ts    # Firebase initialization
    firestoreUtils.ts     # Firestore doc processing
    utils.ts              # Utility functions (cn, capitalizeSentences)
  constants/
    flairs.ts             # Predefined post topics/categories
  hooks/
    use-auth.ts           # Auth context hook
    use-mobile.tsx        # Mobile detection hook
    use-toast.ts          # Toast notifications hook
```

## Key Architecture

- **Layout**: Reddit-style 3-column layout. Left sidebar (weather + news, hidden on mobile), main content (posts), right sidebar (ads, hidden on mobile). Fixed footer at bottom.
- **Auth**: Firebase Auth with email/password, Google, Facebook. User profiles synced to Firestore `users` collection.
- **Roles**: `user`, `moderator`, `superuser`. Moderators can hide posts. Superusers can manage users, ads, settings.
- **Posts**: Stored in Firestore `posts` collection. Support voting (like/dislike), comments (threaded), image uploads (Firebase Storage), flairs/topics.
- **Comments**: Subcollection under posts (`posts/{postId}/comments`). Support threading via `parentId`.
- **Theme**: Light/dark mode with CSS variables. Green primary color (Guernsey themed).
- **Ad System**: `advertisementService.ts` marked `'use server'` but uses client-side Firebase SDK (type mismatch issue).

## Environment Variables

- `NEXT_PUBLIC_FIREBASE_*` - Firebase config
- `NEXT_PUBLIC_WEATHER_API_KEY` - WeatherAPI key
- `GOOGLE_GENAI_API_KEY` - Google AI key
- Firebase config in `.env.local` and `.env.production`

## Known Issues

- `advertisementService.ts` has `'use server'` directive but calls `atob()` (browser API) and uses client Firebase SDK - type mismatch between ArrayBuffer passed from admin page and string expected by service
- Footer is fixed at bottom, content needs `pb-14` to avoid overlap
- Mobile: sidebars hidden but no mobile nav for weather/news/filters
- Scrollbars are completely hidden (may affect usability)
- Post form toolbar buttons (Bold, Italic, etc.) are visual only - not functional
- `AdPlaceholder` shows static placeholder content, not real ads from Firebase
