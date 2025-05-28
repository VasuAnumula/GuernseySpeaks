import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';

export function AdPlaceholder() {
  return (
    <div className="space-y-6">
      <Card className="w-full shadow-md">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Advertisement</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center p-4">
          <Image 
            src="https://placehold.co/300x250.png" 
            alt="Ad Placeholder 1" 
            width={300} 
            height={250} 
            className="rounded-md object-cover"
            data-ai-hint="advertisement banner"
          />
          <p className="mt-2 text-xs text-muted-foreground">Your ad could be here! Contact us for rates.</p>
        </CardContent>
      </Card>
      <Card className="w-full shadow-md">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Sponsored Content</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center p-4">
          <Image 
            src="https://placehold.co/300x250.png" 
            alt="Ad Placeholder 2" 
            width={300} 
            height={250}
            className="rounded-md object-cover"
            data-ai-hint="product placement"
          />
           <p className="mt-2 text-xs text-muted-foreground">Support local businesses.</p>
        </CardContent>
      </Card>
      <p className="text-xs text-center text-muted-foreground">
        Ads on GuernseySpeaks are managed to ensure user safety and privacy.
      </p>
    </div>
  );
}
