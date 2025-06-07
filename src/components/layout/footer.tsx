
import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t py-8 text-center text-sm text-muted-foreground">
      <div className="container mx-auto space-y-2 px-4 sm:px-6">
        <p>&copy; {new Date().getFullYear()} GuernseySpeaks. All rights reserved.</p>
        <nav className="flex flex-wrap justify-center gap-x-4 gap-y-2">
          <Link href="/" className="hover:text-primary transition-colors">Home</Link>
          <Link href="/privacy-policy" className="hover:text-primary transition-colors">Privacy Policy</Link>
          <Link href="/data-deletion" className="hover:text-primary transition-colors">Data Deletion</Link>
          {/* Add other footer links here, e.g., Terms of Service */}
        </nav>
        <p className="mt-2">Connect with your island community.</p>
      </div>
    </footer>
  );
}
