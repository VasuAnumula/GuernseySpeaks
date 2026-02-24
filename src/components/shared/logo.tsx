
import Link from 'next/link';
import { MessageSquareText } from 'lucide-react';

interface LogoProps {
  className?: string;
}

export function Logo({ className }: LogoProps) {
  return (
    <Link
      href="/"
      className={`
        flex items-center gap-2 font-bold text-primary
        hover:opacity-90 transition-opacity
        ${className ?? 'text-2xl'}
      `}
    >
      <MessageSquareText className="h-7 w-7 md:h-8 md:w-8" />
      <span className="hidden sm:inline tracking-tight">GuernseySpeaks</span>
      <span className="sm:hidden tracking-tight">GS</span>
    </Link>
  );
}
