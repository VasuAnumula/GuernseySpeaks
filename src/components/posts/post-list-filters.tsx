
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, Search, ArrowDownUp, CalendarDays, ListFilter } from "lucide-react"; // Added ListFilter for better flair icon
import { Card } from "@/components/ui/card";
import { useEffect, useState } from 'react';

interface PostListFiltersProps {
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
  selectedFlair: string;
  onFlairChange: (flair: string) => void;
  sortBy: string;
  onSortByChange: (sort: string) => void;
  onApplyFilters: () => void;
  availableFlairs: string[]; // Now expects this prop
}

export function PostListFilters({
  searchTerm,
  onSearchTermChange,
  selectedFlair,
  onFlairChange,
  sortBy,
  onSortByChange,
  onApplyFilters,
  availableFlairs // Using the passed prop now
}: PostListFiltersProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // Helper to convert flair display text (e.g., "Local Issue") to value (e.g., "local-issue")
  const getFlairValue = (displayText: string) => displayText.toLowerCase().replace(/\s+/g, '-');

  return (
    <Card
      className={`
        mb-6 p-4 shadow 
        transition-all duration-500 ease-out 
        hover:shadow-lg
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}
      `}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
        <div>
          <Label htmlFor="search" className="text-sm font-medium flex items-center">
            <Search className="mr-1.5 h-4 w-4 text-muted-foreground" /> Search Posts
          </Label>
          <div className="relative mt-1">
            <Input
              id="search"
              type="text"
              placeholder="Keywords, title, author..."
              className="pl-8" // Adjusted padding for icon inside
              value={searchTerm}
              onChange={(e) => onSearchTermChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') onApplyFilters(); }}
            />
             {/* Icon was here, moved to label for better alignment consistency */}
          </div>
        </div>

        <div>
          <Label htmlFor="flair-filter" className="text-sm font-medium flex items-center">
            <ListFilter className="mr-1.5 h-4 w-4 text-muted-foreground" /> Filter by Flair
          </Label>
          <Select value={selectedFlair} onValueChange={onFlairChange}>
            <SelectTrigger id="flair-filter" className="mt-1">
              <SelectValue placeholder="All Flairs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Flairs</SelectItem>
              {availableFlairs.map(flair => (
                <SelectItem key={flair} value={getFlairValue(flair)}>
                  {flair}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="sort-by" className="text-sm font-medium flex items-center">
            <ArrowDownUp className="mr-1.5 h-4 w-4 text-muted-foreground" /> Sort By
          </Label>
          <Select value={sortBy} onValueChange={onSortByChange}>
            <SelectTrigger id="sort-by" className="mt-1">
              <SelectValue placeholder="Relevance" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAt_desc">
                <CalendarDays className="inline-block mr-2 h-4 w-4" /> Newest
              </SelectItem>
              <SelectItem value="createdAt_asc">
                <CalendarDays className="inline-block mr-2 h-4 w-4" /> Oldest
              </SelectItem>
              <SelectItem value="likes_desc">
                <ThumbsUp className="inline-block mr-2 h-4 w-4" /> Popularity {/* Changed icon for likes */}
              </SelectItem>
              {/* Add more sort options here if needed, e.g., by commentsCount */}
              {/* <SelectItem value="commentsCount_desc">
                <MessageCircle className="inline-block mr-2 h-4 w-4" /> Most Comments
              </SelectItem> */}
            </SelectContent>
          </Select>
        </div>

        <Button onClick={onApplyFilters} className="w-full md:w-auto self-end bg-primary hover:bg-primary/90">
          <Filter className="mr-2 h-4 w-4" /> Apply Filters
        </Button>
      </div>
    </Card>
  );
}

// Added ThumbsUp and MessageCircle to import for potential future sort options
import { ThumbsUp, MessageCircle } from 'lucide-react';
