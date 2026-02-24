'use client';

import { Footer as ModernFooter } from "@/components/ui/footer";
import { MapPin, Mail, Shield, FileText, Home } from "lucide-react";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <ModernFooter
      logo={<MapPin className="h-6 w-6 text-primary" />}
      brandName="GuernseySpeaks"
      socialLinks={[
        {
          icon: <Mail className="h-4 w-4" />,
          href: "mailto:hello@guernseyspeaks.com",
          label: "Contact Us"
        }
      ]}
      mainLinks={[]}
      legalLinks={[
        {
          href: "/privacy-policy",
          label: "Privacy Policy"
        },
        {
          href: "/terms",
          label: "Terms & Conditions"
        },
        {
          href: "/data-deletion",
          label: "Data Deletion"
        }
      ]}
      copyright={{
        text: `© ${currentYear} GuernseySpeaks. All rights reserved.`,
        license: "Made with ❤️ for the Guernsey community"
      }}
    />
  );
}
