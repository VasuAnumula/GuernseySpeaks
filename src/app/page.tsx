
"use client";
import { MainLayout } from '@/components/layout/main-layout';
import { WeatherWidget } from '@/components/weather-widget';
import { AdPlaceholder } from '@/components/ad-placeholder';
import { PostCard } from '@/components/posts/post-card';
import { PostListFilters } from '@/components/posts/post-list-filters';
import type { Post } from '@/types';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PenSquare, Loader2, AlertTriangle } from 'lucide-react';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { getPosts, type GetPostsFilters } from '@/services/postService';
import { useAuth } from '@/hooks/use-auth';
import type { OrderByDirection } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card'; // Added for error display

export default function HomePage() {
  const [allFetchedPosts, setAllFetchedPosts] = useState<Post[]>([]);
  const [displayedPosts, setDisplayedPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, loading: authLoading } = useAuth();

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFlair, setSelectedFlair] = useState(''); // Empty string means 'All Flairs'
  const [sortBy, setSortBy] = useState('createdAt_desc'); // Default sort: newest

  const fetchAndFilterPosts = useCallback(async () => {
    setLoadingPosts(true);
    setError(null);

    const [sortField, sortOrder] = sortBy.split('_') as [GetPostsFilters['sortBy'], OrderByDirection];
    
    const firestoreFilters: GetPostsFilters = {
      sortBy: sortField || 'createdAt',
      sortOrder: sortOrder || 'desc',
    };
    if (selectedFlair) {
      firestoreFilters.flair = selectedFlair;
    }

    try {
      const fetchedPosts = await getPosts(firestoreFilters);
      setAllFetchedPosts(fetchedPosts);
    } catch (err: any) {
      console.error("Failed to fetch posts:", err);
      setError(err.message || "Could not load posts. Please try again later.");
      setAllFetchedPosts([]); // Clear posts on error
    } finally {
      setLoadingPosts(false);
    }
  }, [selectedFlair, sortBy]);

  useEffect(() => {
    fetchAndFilterPosts();
  }, [fetchAndFilterPosts]);
  
  // Client-side search logic, applied after posts are fetched and sorted by Firestore
  useEffect(() => {
    if (!searchTerm.trim()) {
      setDisplayedPosts(allFetchedPosts);
      return;
    }
    const lowerSearchTerm = searchTerm.toLowerCase();
    const filtered = allFetchedPosts.filter(post => 
      post.title.toLowerCase().includes(lowerSearchTerm) ||
      post.content.toLowerCase().includes(lowerSearchTerm) ||
      (post.author?.displayName && post.author.displayName.toLowerCase().includes(lowerSearchTerm))
    );
    setDisplayedPosts(filtered);
  }, [searchTerm, allFetchedPosts]);


  const handlePostDeleted = (deletedPostId: string) => {
    setAllFetchedPosts(prevPosts => prevPosts.filter(post => post.id !== deletedPostId));
    // displayedPosts will update automatically via the useEffect dependency on allFetchedPosts
  };

  const handleApplyFilters = () => {
    // This will trigger the useEffect for fetchAndFilterPosts due to state changes in selectedFlair or sortBy,
    // or simply re-fetch with current filters if they haven't changed.
    fetchAndFilterPosts();
  };
  
  // Memoize available flairs (currently static in PostListFilters)
  // If you want dynamic flairs from posts, you'd calculate it here based on allFetchedPosts
  const availableFlairs = useMemo(() => {
    // Example: if you want dynamic flairs (not used by PostListFilters by default yet)
    // const flairsSet = new Set<string>();
    // allFetchedPosts.forEach(post => {
    //   if (post.flairs) {
    //     post.flairs.forEach(flair => flairsSet.add(flair));
    //   }
    // });
    // return Array.from(flairsSet).map(f => f.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '));
    return ["News", "Discussion", "Events", "Local Issue", "Question", "Recommendation", "Miscellaneous"]; // Default static flairs for now
  }, []);


  return (
    <MainLayout
      weatherWidget={<WeatherWidget />}
      adsWidget={<AdPlaceholder />}
    >
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Community Feed</h1>
        {!authLoading && user && (
          <Button asChild>
            <Link href="/submit">
              <PenSquare className="mr-2 h-5 w-5" /> Create Post
            </Link>
          </Button>
        )}
      </div>
      
      <PostListFilters
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
        selectedFlair={selectedFlair}
        onFlairChange={setSelectedFlair}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        onApplyFilters={handleApplyFilters}
        availableFlairs={availableFlairs} // Pass static or dynamic flairs
      />

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
              />
            ))
          ) : (
             allFetchedPosts.length === 0 && !searchTerm.trim() && !selectedFlair ? ( // Check if any filters applied
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
