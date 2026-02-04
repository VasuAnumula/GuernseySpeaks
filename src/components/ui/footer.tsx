import { Button } from "@/components/ui/button"

interface FooterProps {
  logo: React.ReactNode
  brandName: string
  socialLinks: Array<{
    icon: React.ReactNode
    href: string
    label: string
  }>
  mainLinks: Array<{
    href: string
    label: string
  }>
  legalLinks: Array<{
    href: string
    label: string
  }>
  copyright: {
    text: string
    license?: string
  }
}

export function Footer({
  logo,
  brandName,
  socialLinks,
  mainLinks,
  legalLinks,
  copyright,
}: FooterProps) {
  return (
    <footer className="py-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t border-border/40">
      <div className="px-4 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Left: Brand and Copyright */}
          <div className="flex items-center gap-4">
            <a
              href="/"
              className="flex items-center gap-x-1.5"
              aria-label={brandName}
            >
              {logo}
              <span className="font-semibold text-sm hidden sm:inline">{brandName}</span>
            </a>
            <span className="text-xs text-muted-foreground hidden md:inline">
              {copyright.text}
            </span>
          </div>

          {/* Center: Legal Links */}
          <nav className="flex items-center gap-3">
            {legalLinks.map((link, i) => (
              <a
                key={i}
                href={link.href}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Right: Social Links */}
          <div className="flex items-center gap-2">
            {copyright.license && (
              <span className="text-xs text-muted-foreground hidden lg:inline">
                {copyright.license}
              </span>
            )}
            {socialLinks.map((link, i) => (
              <Button
                key={i}
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                asChild
              >
                <a href={link.href} aria-label={link.label}>
                  {link.icon}
                </a>
              </Button>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
