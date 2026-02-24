"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, PenSquare, Mail, User, Compass } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

export function MobileNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  const navItems = [
    { href: '/', icon: Home, label: 'Home' },
    { href: '/submit', icon: PenSquare, label: 'Create', requiresAuth: true },
    { href: '/messages', icon: Mail, label: 'Messages', requiresAuth: true },
    { href: user ? '/profile' : '/auth', icon: User, label: user ? 'Profile' : 'Login' },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card">
      <div className="h-[2px] bg-gradient-to-r from-primary/60 via-emerald-400/40 to-primary/60" />
      <div className="flex items-center justify-around h-14">
        {navItems.map((item) => {
          if (item.requiresAuth && !user) return null;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-col items-center justify-center flex-1 h-full gap-0.5 text-xs transition-all ${
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <item.icon className={`h-5 w-5 transition-transform ${isActive ? 'text-primary scale-110' : ''}`} />
              <span>{item.label}</span>
              {isActive && (
                <span className="absolute bottom-1 h-1 w-1 rounded-full bg-primary animate-scale-in" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
