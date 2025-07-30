
"use client";

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, ListFilter, ArrowDownUp, CalendarDays, ThumbsUp } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PenSquare, LogIn, LogOut, UserCircle, Loader2, ShieldCheck } from 'lucide-react';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { PREDEFINED_FLAIRS } from '@/constants/flairs';
import { useAuth } from '@/hooks/use-auth';
import { Logo } from '@/components/shared/logo';

export function Header() {
  const { user, logout, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const [headerSearch, setHeaderSearch] = useState(searchParams.get('q') || '');
  const [selectedFlair, setSelectedFlair] = useState(searchParams.get('flair') || '');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'createdAt_desc');
  const router = useRouter();

  useEffect(() => {
    setHeaderSearch(searchParams.get('q') || '');
    setSelectedFlair(searchParams.get('flair') || '');
    setSortBy(searchParams.get('sort') || 'createdAt_desc');
  }, [searchParams]);

  const canAccessAdmin = user && (user.role === 'superuser' || user.role === 'moderator');
  const userDisplayNameForMenu = user?.displayName || user?.name || user?.email || 'User';
  const userAvatarFallbackChar = userDisplayNameForMenu.substring(0, 1).toUpperCase();

  const buildQuery = (
    qs: URLSearchParams,
    currentSearch = headerSearch,
    flair = selectedFlair,
    sort = sortBy
  ) => {
    if (currentSearch) {
      qs.set('q', currentSearch);
    } else {
      qs.delete('q');
    }
    if (flair) {
      qs.set('flair', flair);
    } else {
      qs.delete('flair');
    }
    if (sort) {
      qs.set('sort', sort);
    } else {
      qs.delete('sort');
    }
    return qs.toString();
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const qs = new URLSearchParams(searchParams.toString());
      router.push(`/?${buildQuery(qs)}`);
    }
  };

  const handleFlairChange = (flairValue: string) => {
    const normalized = flairValue === '__ALL__' ? '' : flairValue;
    setSelectedFlair(normalized);
    const qs = new URLSearchParams(searchParams.toString());
    router.push(`/?${buildQuery(qs, headerSearch, normalized, sortBy)}`);
  };

  const handleSortChange = (sortValue: string) => {
    setSortBy(sortValue);
    const qs = new URLSearchParams(searchParams.toString());
    router.push(`/?${buildQuery(qs, headerSearch, selectedFlair, sortValue)}`);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card shadow-sm">
      <div className="flex h-12 items-center gap-3 px-4 max-w-none">
        <Logo />
        
        {/* Reddit-style search bar - more prominent */}
        <div className="flex-1 max-w-2xl mx-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={headerSearch}
              onChange={(e) => setHeaderSearch(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search GuernseySpeaks"
              className="pl-10 pr-4 h-9 bg-background border border-border rounded-full text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
            />
          </div>
        </div>
        
        {/* Compact filters */}
        <div className="hidden md:flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="text-xs h-8">
                <ListFilter className="h-3 w-3 mr-1" />
                {selectedFlair || 'All'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleFlairChange('__ALL__')} className="cursor-pointer text-xs">
                All Topics
              </DropdownMenuItem>
              {PREDEFINED_FLAIRS.map(flair => (
                <DropdownMenuItem key={flair} onClick={() => handleFlairChange(flair)} className="cursor-pointer text-xs">
                  {flair}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="text-xs h-8">
                <ArrowDownUp className="h-3 w-3 mr-1" />
                {sortBy === 'createdAt_desc' ? 'New' : 
                 sortBy === 'createdAt_asc' ? 'Old' : 
                 sortBy === 'likes_desc' ? 'Hot' : 'New'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleSortChange('likes_desc')} className="cursor-pointer text-xs">
                <ThumbsUp className="mr-2 h-3 w-3" /> Hot
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSortChange('createdAt_desc')} className="cursor-pointer text-xs">
                <CalendarDays className="mr-2 h-3 w-3" /> New
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSortChange('createdAt_asc')} className="cursor-pointer text-xs">
                <CalendarDays className="mr-2 h-3 w-3" /> Old
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <nav className="flex items-center gap-2">
          <ThemeToggle />
          {user && (
            <Button asChild size="sm" className="h-8 px-3 text-xs font-medium">
              <Link href="/submit">
                <PenSquare className="mr-1 h-3 w-3" /> 
                <span className="hidden sm:inline">Create</span>
              </Link>
            </Button>
          )}
          {authLoading ? (
            <div className="flex items-center justify-center h-8 w-8">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            </div>
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full p-0">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatarUrl || undefined} alt={userDisplayNameForMenu} />
                    <AvatarFallback className="bg-primary/10 text-primary font-medium text-xs">{userAvatarFallbackChar || <UserCircle />}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="font-medium text-sm">{userDisplayNameForMenu}</DropdownMenuLabel>
                {user.role && <DropdownMenuLabel className="text-xs text-muted-foreground -mt-1">Role: {user.role}</DropdownMenuLabel>}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="cursor-pointer text-sm">
                  <Link href="/profile"><UserCircle className="mr-2 h-3 w-3" />Profile</Link>
                </DropdownMenuItem>
                {canAccessAdmin && (
                  <DropdownMenuItem asChild className="cursor-pointer text-sm">
                    <Link href="/admin"><ShieldCheck className="mr-2 h-3 w-3" />Admin</Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:text-destructive text-sm">
                  <LogOut className="mr-2 h-3 w-3" /> Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild size="sm" className="h-8 px-3 text-xs">
              <Link href="/auth">
                <LogIn className="mr-1 h-3 w-3" /> Login
              </Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
