
"use client";

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
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
import { useAuth } from '@/hooks/use-auth';
import { Logo } from '@/components/shared/logo';

export function Header() {
  const { user, logout, loading: authLoading } = useAuth();
  const [headerSearch, setHeaderSearch] = useState('');
  const router = useRouter();

  const canAccessAdmin = user && (user.role === 'superuser' || user.role === 'moderator');
  const userDisplayNameForMenu = user?.displayName || user?.name || user?.email || 'User';
  const userAvatarFallbackChar = userDisplayNameForMenu.substring(0, 1).toUpperCase();

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      router.push(`/?q=${encodeURIComponent(headerSearch)}`);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center gap-2 px-4 sm:px-6">
        <Logo />
        <div className="relative hidden sm:block ml-4 flex-1 max-w-xs">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={headerSearch}
            onChange={(e) => setHeaderSearch(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search..."
            className="pl-7"
          />
        </div>
        <nav className="ml-auto flex items-center gap-2 md:gap-4">
          {user && (
            <Button asChild size="sm" variant="ghost" className="px-2 md:px-3">
              <Link href="/submit">
                <PenSquare className="mr-0 h-4 w-4 md:mr-2" /> <span className="hidden md:inline">Create Post</span>
              </Link>
            </Button>
          )}
          <div>
          {authLoading ? (
            <div className="flex items-center justify-center h-10 w-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.avatarUrl || undefined} alt={userDisplayNameForMenu} data-ai-hint="profile avatar" />
                    <AvatarFallback>{userAvatarFallbackChar || <UserCircle />}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{userDisplayNameForMenu}</DropdownMenuLabel>
                {user.role && <DropdownMenuLabel className="text-xs text-muted-foreground -mt-2 capitalize">Role: {user.role}</DropdownMenuLabel>}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile"><UserCircle className="mr-2 h-4 w-4" />Profile</Link>
                </DropdownMenuItem>
                {canAccessAdmin && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin"><ShieldCheck className="mr-2 h-4 w-4" />Admin Panel</Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4" /> Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild>
              <Link href="/auth">
                <LogIn className="mr-2 h-4 w-4" /> Login
              </Link>
            </Button>
          )}
          </div>
        </nav>
      </div>
    </header>
  );
}
