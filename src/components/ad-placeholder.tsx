import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Sparkles, MapPin } from 'lucide-react';
import Image from 'next/image';

export function AdPlaceholder() {
  return (
    <div className="space-y-4">
      {/* Featured Business Ad */}
      <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-primary/5 via-background to-accent/5 shadow-lg hover:shadow-xl transition-all duration-300">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <CardContent className="p-0">
          <div className="relative">
            <Image 
              src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=200&fit=crop&crop=center" 
              alt="Local Business Showcase" 
              width={400} 
              height={200} 
              className="w-full h-40 object-cover rounded-t-lg"
              data-ai-hint="local business storefront"
            />
            <Badge className="absolute top-2 left-2 bg-primary/90 text-primary-foreground border-0">
              <Sparkles className="w-3 h-3 mr-1" />
              Featured
            </Badge>
          </div>
          <div className="p-4">
            <h3 className="font-semibold text-sm mb-1">Discover Local Guernsey</h3>
            <p className="text-xs text-muted-foreground mb-2 flex items-center">
              <MapPin className="w-3 h-3 mr-1" />
              Support Island Businesses
            </p>
            <div className="flex justify-between items-center">
              <span className="text-xs text-primary font-medium">Your ad here</span>
              <ExternalLink className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compact Business Directory Ad */}
      <Card className="group bg-gradient-to-r from-accent/20 to-secondary/20 border-0 shadow-md hover:shadow-lg transition-all duration-300">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-sm">Business Directory</h4>
              <p className="text-xs text-muted-foreground">Connect with locals</p>
            </div>
            <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </CardContent>
      </Card>

      {/* Event Promotion Card */}
      <Card className="group border-dashed border-2 border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/40 transition-all duration-300">
        <CardContent className="p-4 text-center">
          <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-2">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <h4 className="font-medium text-sm mb-1">Promote Your Event</h4>
          <p className="text-xs text-muted-foreground mb-2">Reach the Guernsey community</p>
          <div className="text-xs text-primary font-medium">Get Started →</div>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="pt-2 border-t border-border/50">
        <p className="text-xs text-center text-muted-foreground leading-relaxed">
          <span className="inline-flex items-center">
            <Sparkles className="w-3 h-3 mr-1" />
            Ads support our community platform
          </span>
        </p>
      </div>
    </div>
  );
}
