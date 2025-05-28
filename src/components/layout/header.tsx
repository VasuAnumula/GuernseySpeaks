
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Home, PlusSquare, LogIn, LogOut, UserCircle, Settings, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Logo } from '@/components/shared/logo';

export function Header() {
  const { user, logout, loading: authLoading } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Logo />
        <nav className="flex items-center gap-4">
          <Button variant="ghost" asChild>
            <Link href="/">
              <Home className="mr-2 h-4 w-4" /> Home
            </Link>
          </Button>
          {user && (
            <Button variant="ghost" asChild>
              <Link href="/submit">
                <PlusSquare className="mr-2 h-4 w-4" /> Submit Post
              </Link>
            </Button>
          )}
        </nav>
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
                    <AvatarImage src={user.avatarUrl || undefined} alt={user.name || 'User'} data-ai-hint="profile avatar" />
                    <AvatarFallback>{user.name ? user.name.substring(0, 1).toUpperCase() : <UserCircle />}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{user.name || user.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile"><UserCircle className="mr-2 h-4 w-4" />Profile</Link>
                </DropdownMenuItem>
                {user.role === 'superuser' && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin"><Settings className="mr-2 h-4 w-4" />Admin</Link>
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
      </div>
    </header>
  );
}

