"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, Search, ArrowDownUp, CalendarDays } from "lucide-react";

export function PostListFilters() {
  // TODO: Implement actual filtering logic
  return (
    <Card className="mb-6 p-4 shadow">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
        <div>
          <Label htmlFor="search" className="text-sm font-medium">Search Posts</Label>
          <div className="relative mt-1">
            <Input id="search" type="text" placeholder="Keywords, title..." className="pl-10" />
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>
        
        <div>
          <Label htmlFor="flair-filter" className="text-sm font-medium">Filter by Flair/Tag</Label>
          <Select>
            <SelectTrigger id="flair-filter" className="mt-1">
              <SelectValue placeholder="All Flairs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="news">News</SelectItem>
              <SelectItem value="discussion">Discussion</SelectItem>
              <SelectItem value="events">Events</SelectItem>
              <SelectItem value="local">Local</SelectItem>
              {/* Add more flairs dynamically */}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="sort-by" className="text-sm font-medium">Sort By</Label>
          <Select>
            <SelectTrigger id="sort-by" className="mt-1">
              <SelectValue placeholder="Popularity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="popularity">
                <ArrowDownUp className="inline-block mr-2 h-4 w-4" /> Popularity
              </SelectItem>
              <SelectItem value="newest">
                <CalendarDays className="inline-block mr-2 h-4 w-4" /> Newest
              </SelectItem>
              <SelectItem value="oldest">
                <CalendarDays className="inline-block mr-2 h-4 w-4" /> Oldest
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Button className="w-full md:w-auto self-end bg-primary hover:bg-primary/90">
          <Filter className="mr-2 h-4 w-4" /> Apply Filters
        </Button>
      </div>
    </Card>
  );
}

// Add Card to imports if not already there
import { Card } from "@/components/ui/card";
