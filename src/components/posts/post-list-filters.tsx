
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, Search, ArrowDownUp, CalendarDays, ListFilter, ThumbsUp } from "lucide-react"; // Removed MessageCircle as it's not used for sorting here now
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
  availableFlairs: string[];
}

const ALL_FLAIRS_VALUE = "__ALL_FLAIRS_SENTINEL__"; // Special non-empty value

export function PostListFilters({
  searchTerm,
  onSearchTermChange,
  selectedFlair,
  onFlairChange,
  sortBy,
  onSortByChange,
  onApplyFilters,
  availableFlairs
}: PostListFiltersProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const handleFlairSelectionChange = (valueFromSelect: string) => {
    if (valueFromSelect === ALL_FLAIRS_VALUE) {
      onFlairChange(""); // Translate sentinel to empty string for parent's state
    } else {
      onFlairChange(valueFromSelect);
    }
  };

  // Filter out empty or whitespace-only flairs before rendering SelectItems
  const validAvailableFlairs = availableFlairs.filter(f => f && f.trim() !== "");

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
              className="pl-8" // Adjusted for potential icon, though Search icon is in Label
              value={searchTerm}
              onChange={(e) => onSearchTermChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') onApplyFilters(); }}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="flair-filter" className="text-sm font-medium flex items-center">
            <ListFilter className="mr-1.5 h-4 w-4 text-muted-foreground" /> Filter by Flair
          </Label>
          <Select
            value={selectedFlair || ALL_FLAIRS_VALUE} 
            onValueChange={handleFlairSelectionChange}
          >
            <SelectTrigger id="flair-filter" className="mt-1">
              <SelectValue placeholder="All Flairs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_FLAIRS_VALUE}>All Flairs</SelectItem>
              {validAvailableFlairs.map(flair => (
                <SelectItem key={flair} value={flair}> 
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
                <ThumbsUp className="inline-block mr-2 h-4 w-4" /> Popularity
              </SelectItem>
              {/* commentsCount_desc sort option removed as per previous state if it wasn't fully working/indexed */}
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
