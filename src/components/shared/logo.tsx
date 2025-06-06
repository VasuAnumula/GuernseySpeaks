
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
        flex items-center gap-2 text-2xl font-bold text-primary 
        transition-transform duration-200 ease-in-out hover:scale-105 active:scale-100
        ${className}
      `}
    >
      <MessageSquareText className="h-8 w-8" />
      <span>GuernseySpeaks</span>
    </Link>
  );
}

    