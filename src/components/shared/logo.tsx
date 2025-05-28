import Link from 'next/link';
import { MessageSquareText } from 'lucide-react';

interface LogoProps {
  className?: string;
}

export function Logo({ className }: LogoProps) {
  return (
    <Link href="/" className={`flex items-center gap-2 text-2xl font-bold text-primary ${className}`}>
      <MessageSquareText className="h-8 w-8" />
      <span>GuernseySpeaks</span>
    </Link>
  );
}
