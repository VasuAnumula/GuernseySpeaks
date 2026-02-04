
"use client";
import { MainLayout } from '@/components/layout/main-layout';
import { WeatherWidget } from '@/components/weather-widget';
import { AdPlaceholder } from '@/components/ad-placeholder';
import { PostCard } from '@/components/posts/post-card';
import { PREDEFINED_FLAIRS } from '@/constants/flairs';
import type { Post } from '@/types';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PenSquare, Loader2, AlertTriangle } from 'lucide-react';
import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getPosts, type GetPostsFilters } from '@/services/postService';
import { useAuth } from '@/hooks/use-auth';
import type { OrderByDirection } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { AdvancedSearchFilters, type AdvancedFilters } from '@/components/search/advanced-search-filters';


function HomePageContent() {
  const [allFetchedPosts, setAllFetchedPosts] = useState<Post[]>([]);
  const [displayedPosts, setDisplayedPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Filter states
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
  const [selectedFlair, setSelectedFlair] = useState(searchParams.get('flair') || '');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'createdAt_desc');

  // Advanced filter states
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
    dateFrom: searchParams.get('dateFrom') || undefined,
    dateTo: searchParams.get('dateTo') || undefined,
    minLikes: searchParams.get('minLikes') ? parseInt(searchParams.get('minLikes')!) : undefined,
    hasImage: searchParams.get('hasImage') === 'true' ? true : searchParams.get('hasImage') === 'false' ? false : undefined,
  });

  // Check if user is a moderator or admin
  const isModerator = user?.role === 'moderator' || user?.role === 'superuser';

  const fetchAndFilterPosts = useCallback(async () => {
    setLoadingPosts(true);
    setError(null);

    const [sortField, sortOrder] = sortBy.split('_') as [GetPostsFilters['sortBy'], OrderByDirection];

    const firestoreFilters: GetPostsFilters = {
      sortBy: sortField || 'createdAt',
      sortOrder: sortOrder || 'desc',
      searchQuery: searchTerm || undefined,
      // Moderators and admins can see hidden posts
      includeHidden: isModerator,
    };

    if (selectedFlair) {
      firestoreFilters.flair = selectedFlair;
    }

    // Apply advanced filters
    if (advancedFilters.dateFrom) {
      firestoreFilters.dateFrom = new Date(advancedFilters.dateFrom);
    }
    if (advancedFilters.dateTo) {
      firestoreFilters.dateTo = new Date(advancedFilters.dateTo);
    }
    if (advancedFilters.minLikes !== undefined) {
      firestoreFilters.minLikes = advancedFilters.minLikes;
    }
    if (advancedFilters.hasImage !== undefined) {
      firestoreFilters.hasImage = advancedFilters.hasImage;
    }

    try {
      const fetchedPosts = await getPosts(firestoreFilters);
      setAllFetchedPosts(fetchedPosts);
      setDisplayedPosts(fetchedPosts);
    } catch (err: any) {
      console.error("Failed to fetch posts:", err);
      setError(err.message || "Could not load posts. Please try again later.");
      setAllFetchedPosts([]);
    } finally {
      setLoadingPosts(false);
    }
  }, [selectedFlair, sortBy, searchTerm, advancedFilters, isModerator]);

  useEffect(() => {
    fetchAndFilterPosts();
  }, [fetchAndFilterPosts]);

  useEffect(() => {
    setSearchTerm(searchParams.get('q') || '');
    setSelectedFlair(searchParams.get('flair') || '');
    setSortBy(searchParams.get('sort') || 'createdAt_desc');
    setAdvancedFilters({
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
      minLikes: searchParams.get('minLikes') ? parseInt(searchParams.get('minLikes')!) : undefined,
      hasImage: searchParams.get('hasImage') === 'true' ? true : searchParams.get('hasImage') === 'false' ? false : undefined,
    });
  }, [searchParams]);

  const handleApplyAdvancedFilters = () => {
    const params = new URLSearchParams(searchParams.toString());

    // Update URL with advanced filters
    if (advancedFilters.dateFrom) {
      params.set('dateFrom', advancedFilters.dateFrom);
    } else {
      params.delete('dateFrom');
    }
    if (advancedFilters.dateTo) {
      params.set('dateTo', advancedFilters.dateTo);
    } else {
      params.delete('dateTo');
    }
    if (advancedFilters.minLikes !== undefined) {
      params.set('minLikes', advancedFilters.minLikes.toString());
    } else {
      params.delete('minLikes');
    }
    if (advancedFilters.hasImage !== undefined) {
      params.set('hasImage', advancedFilters.hasImage.toString());
    } else {
      params.delete('hasImage');
    }

    router.push(`/?${params.toString()}`);
  };

  const handleClearAdvancedFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('dateFrom');
    params.delete('dateTo');
    params.delete('minLikes');
    params.delete('hasImage');
    router.push(`/?${params.toString()}`);
  };


  const handlePostDeleted = (deletedPostId: string) => {
    setAllFetchedPosts(prevPosts => prevPosts.filter(post => post.id !== deletedPostId));
  };

  
  return (
    <MainLayout
      weatherWidget={<WeatherWidget />}
      adsWidget={<AdPlaceholder />}
    >
      {/* Advanced Search Filters */}
      <div className="mb-4">
        <AdvancedSearchFilters
          filters={advancedFilters}
          onFiltersChange={setAdvancedFilters}
          onApply={handleApplyAdvancedFilters}
          onClear={handleClearAdvancedFilters}
        />
      </div>

      {loadingPosts && (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2 text-muted-foreground">Loading posts...</p>
        </div>
      )}
      {error && !loadingPosts && (
        <Card className="my-6">
          <CardContent className="p-6 text-center text-destructive">
            <AlertTriangle className="mx-auto h-12 w-12 mb-4" />
            <p className="font-semibold">Error loading posts</p>
            <p className="text-sm">{error}</p>
            {error.includes("index is likely missing") && 
              <p className="text-xs mt-2">You may need to create a composite index in Firestore. Check your Firebase console logs for a direct link to create it.</p>
            }
            <Button onClick={fetchAndFilterPosts} variant="outline" className="mt-4">
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}
      
      {!loadingPosts && !error && (
        <div className="space-y-6">
          {displayedPosts.length > 0 ? (
            displayedPosts.map((post, index) => (
              <PostCard
                key={post.id}
                post={post}
                onPostDeleted={handlePostDeleted}
                staggerIndex={index}
                className="w-full"
              />
            ))
          ) : (
             allFetchedPosts.length === 0 && !searchTerm.trim() && !selectedFlair ? (
                <p className="text-center text-muted-foreground py-10">No posts yet. Be the first to share something!</p>
             ) : (
                <p className="text-center text-muted-foreground py-10">No posts match your current filters or search term.</p>
             )
          )}
        </div>
      )}
    </MainLayout>
  );
}

export default function HomePage() {
  return (
    <Suspense>
      <HomePageContent />
    </Suspense>
  );
}
