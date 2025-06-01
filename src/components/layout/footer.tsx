
import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t py-8 text-center text-sm text-muted-foreground">
      <div className="container space-y-2">
        <p>&copy; {new Date().getFullYear()} GuernseySpeaks. All rights reserved.</p>
        <nav className="flex justify-center gap-4">
          <Link href="/" className="hover:text-primary transition-colors">Home</Link>
          <Link href="/privacy-policy" className="hover:text-primary transition-colors">Privacy Policy</Link>
          {/* Add other footer links here, e.g., Terms of Service */}
        </nav>
        <p className="mt-2">Connect with your island community.</p>
      </div>
    </footer>
  );
}
