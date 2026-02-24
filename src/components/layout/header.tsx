
"use client";

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, ListFilter, ArrowDownUp, CalendarDays, ThumbsUp, X, Bell } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PenSquare, LogIn, LogOut, UserCircle, Loader2, ShieldCheck, Mail, Bookmark } from 'lucide-react';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { PREDEFINED_FLAIRS } from '@/constants/flairs';
import { useAuth } from '@/hooks/use-auth';
import { Logo } from '@/components/shared/logo';
import { NotificationBell } from '@/components/notifications/notification-bell';

export function Header() {
  const { user, logout, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const [headerSearch, setHeaderSearch] = useState(searchParams.get('q') || '');
  const [selectedFlair, setSelectedFlair] = useState(searchParams.get('flair') || '');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'createdAt_desc');
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const mobileSearchRef = useRef<HTMLInputElement>(null);
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
    if (currentSearch) { qs.set('q', currentSearch); } else { qs.delete('q'); }
    if (flair) { qs.set('flair', flair); } else { qs.delete('flair'); }
    if (sort) { qs.set('sort', sort); } else { qs.delete('sort'); }
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

  useEffect(() => {
    if (mobileSearchOpen && mobileSearchRef.current) {
      mobileSearchRef.current.focus();
    }
  }, [mobileSearchOpen]);

  const sortLabel = sortBy === 'createdAt_desc' ? 'New' :
    sortBy === 'createdAt_asc' ? 'Old' :
    sortBy === 'likes_desc' ? 'Hot' : 'New';

  return (
    <header className="sticky top-0 z-50 w-full bg-card/95 backdrop-blur-md shadow-sm animate-fade-in-down">
      <div className="flex h-14 items-center px-3 md:px-5">

        {/* ===== LEFT: Logo ===== */}
        <div className={`flex-shrink-0 ${mobileSearchOpen ? 'hidden' : 'flex items-center'}`}>
          <Logo className="text-xl md:text-2xl" />
        </div>

        {/* ===== CENTER: Search + Filters ===== */}
        <div className="flex-1 flex items-center justify-center mx-3 md:mx-6">
          {/* Desktop search */}
          <div className="hidden md:flex items-center gap-2 w-full max-w-xl">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={headerSearch}
                onChange={(e) => setHeaderSearch(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search GuernseySpeaks..."
                className="pl-10 pr-4 h-10 bg-muted/40 hover:bg-muted/60 focus:bg-background border-transparent focus:border-primary/40 rounded-full text-sm transition-all"
              />
            </div>

            {/* Desktop filter chips */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 rounded-full border-border/60 text-xs gap-1.5 px-3">
                  <ListFilter className="h-3.5 w-3.5" />
                  {selectedFlair || 'All'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="max-h-72 overflow-y-auto">
                <DropdownMenuItem onClick={() => handleFlairChange('__ALL__')} className="cursor-pointer text-xs">
                  All Topics
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {PREDEFINED_FLAIRS.map(flair => (
                  <DropdownMenuItem key={flair} onClick={() => handleFlairChange(flair)} className="cursor-pointer text-xs">
                    {flair}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 rounded-full border-border/60 text-xs gap-1.5 px-3">
                  <ArrowDownUp className="h-3.5 w-3.5" />
                  {sortLabel}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleSortChange('likes_desc')} className="cursor-pointer text-xs">
                  <ThumbsUp className="mr-2 h-3.5 w-3.5" /> Hot
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSortChange('createdAt_desc')} className="cursor-pointer text-xs">
                  <CalendarDays className="mr-2 h-3.5 w-3.5" /> New
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSortChange('createdAt_asc')} className="cursor-pointer text-xs">
                  <CalendarDays className="mr-2 h-3.5 w-3.5" /> Old
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Mobile search */}
          {mobileSearchOpen ? (
            <div className="flex-1 flex items-center gap-2 md:hidden">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={mobileSearchRef}
                  value={headerSearch}
                  onChange={(e) => setHeaderSearch(e.target.value)}
                  onKeyDown={(e) => {
                    handleSearchKeyDown(e);
                    if (e.key === 'Enter') setMobileSearchOpen(false);
                  }}
                  placeholder="Search..."
                  className="pl-10 pr-4 h-10 bg-muted/40 border-transparent focus:border-primary/40 rounded-full text-sm"
                />
              </div>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={() => setMobileSearchOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex md:hidden items-center gap-1">
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={() => setMobileSearchOpen(true)}>
                <Search className="h-4 w-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                    <ListFilter className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="max-h-72 overflow-y-auto">
                  <DropdownMenuLabel className="text-xs font-semibold">Topic</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => handleFlairChange('__ALL__')} className="cursor-pointer text-xs">
                    All Topics
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {PREDEFINED_FLAIRS.map(flair => (
                    <DropdownMenuItem key={flair} onClick={() => handleFlairChange(flair)} className="cursor-pointer text-xs">
                      {flair}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                    <ArrowDownUp className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center">
                  <DropdownMenuLabel className="text-xs font-semibold">Sort By</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => handleSortChange('likes_desc')} className="cursor-pointer text-xs">
                    <ThumbsUp className="mr-2 h-3.5 w-3.5" /> Hot
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSortChange('createdAt_desc')} className="cursor-pointer text-xs">
                    <CalendarDays className="mr-2 h-3.5 w-3.5" /> New
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSortChange('createdAt_asc')} className="cursor-pointer text-xs">
                    <CalendarDays className="mr-2 h-3.5 w-3.5" /> Old
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        {/* ===== RIGHT: Actions + Profile/Login ===== */}
        <div className={`flex-shrink-0 flex items-center gap-1 md:gap-1.5 ${mobileSearchOpen ? 'hidden' : ''}`}>
          <ThemeToggle />

          {/* Authenticated actions */}
          {user && (
            <>
              <NotificationBell />

              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hidden md:inline-flex" asChild>
                <Link href="/messages">
                  <Mail className="h-4 w-4" />
                </Link>
              </Button>

              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hidden md:inline-flex" asChild>
                <Link href="/saved">
                  <Bookmark className="h-4 w-4" />
                </Link>
              </Button>

              <Button asChild size="sm" className="h-9 px-4 rounded-full text-xs font-medium hidden md:inline-flex hover:scale-105 active:scale-95 transition-transform">
                <Link href="/submit">
                  <PenSquare className="mr-1.5 h-3.5 w-3.5" />
                  Create Post
                </Link>
              </Button>
            </>
          )}

          {/* Divider */}
          <div className="hidden md:block w-px h-6 bg-border/60 mx-1" />

          {/* Profile / Login */}
          {authLoading ? (
            <div className="flex items-center justify-center h-9 w-9">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            </div>
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 rounded-full p-0.5 pl-0.5 pr-2 gap-2 hover:bg-muted/60">
                  <Avatar className="h-8 w-8 border-2 border-primary/20">
                    <AvatarImage src={user.avatarUrl || undefined} alt={userDisplayNameForMenu} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                      {userAvatarFallbackChar || <UserCircle />}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden lg:inline text-sm font-medium max-w-[100px] truncate">
                    {userDisplayNameForMenu}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <div className="px-3 py-2.5">
                  <p className="font-semibold text-sm">{userDisplayNameForMenu}</p>
                  {user.email && <p className="text-xs text-muted-foreground truncate">{user.email}</p>}
                  {user.role && (
                    <span className="inline-flex items-center gap-1 mt-1 text-xs text-primary font-medium">
                      <ShieldCheck className="h-3 w-3" />
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </span>
                  )}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link href="/profile">
                    <UserCircle className="mr-2 h-4 w-4" /> My Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link href="/saved">
                    <Bookmark className="mr-2 h-4 w-4" /> Saved Posts
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link href="/messages">
                    <Mail className="mr-2 h-4 w-4" /> Messages
                  </Link>
                </DropdownMenuItem>
                {canAccessAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild className="cursor-pointer">
                      <Link href="/admin">
                        <ShieldCheck className="mr-2 h-4 w-4" /> Admin Dashboard
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" /> Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild size="sm" className="h-9 px-5 rounded-full text-sm font-medium">
              <Link href="/auth">
                <LogIn className="mr-1.5 h-4 w-4" /> Log In
              </Link>
            </Button>
          )}
        </div>
      </div>
      <div className="h-[2px] bg-gradient-to-r from-primary/60 via-emerald-400/40 to-primary/60" />
    </header>
  );
}
