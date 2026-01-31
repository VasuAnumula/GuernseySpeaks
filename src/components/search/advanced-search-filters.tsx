
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, Filter, X, Search } from 'lucide-react';
import { format } from 'date-fns';

export interface AdvancedFilters {
  dateFrom?: string;
  dateTo?: string;
  minLikes?: number;
  hasImage?: boolean;
}

interface AdvancedSearchFiltersProps {
  filters: AdvancedFilters;
  onFiltersChange: (filters: AdvancedFilters) => void;
  onApply: () => void;
  onClear: () => void;
}

export function AdvancedSearchFilters({
  filters,
  onFiltersChange,
  onApply,
  onClear,
}: AdvancedSearchFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  const hasActiveFilters = filters.dateFrom || filters.dateTo || filters.minLikes || filters.hasImage !== undefined;

  const handleClear = () => {
    onFiltersChange({});
    onClear();
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="flex items-center gap-2 mb-2">
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm" className="text-xs h-8">
            <Filter className="h-3 w-3 mr-1" />
            Advanced
            {hasActiveFilters && (
              <span className="ml-1 bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 text-[10px]">
                {Object.values(filters).filter(v => v !== undefined && v !== '').length}
              </span>
            )}
            {isOpen ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
          </Button>
        </CollapsibleTrigger>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" className="text-xs h-8" onClick={handleClear}>
            <X className="h-3 w-3 mr-1" />
            Clear
          </Button>
        )}
      </div>

      <CollapsibleContent>
        <div className="bg-card border border-border rounded-lg p-4 mb-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Date From */}
            <div className="space-y-2">
              <Label htmlFor="date-from" className="text-xs font-medium">From Date</Label>
              <Input
                id="date-from"
                type="date"
                value={filters.dateFrom || ''}
                onChange={(e) => onFiltersChange({ ...filters, dateFrom: e.target.value || undefined })}
                className="h-9 text-sm"
                max={filters.dateTo || format(new Date(), 'yyyy-MM-dd')}
              />
            </div>

            {/* Date To */}
            <div className="space-y-2">
              <Label htmlFor="date-to" className="text-xs font-medium">To Date</Label>
              <Input
                id="date-to"
                type="date"
                value={filters.dateTo || ''}
                onChange={(e) => onFiltersChange({ ...filters, dateTo: e.target.value || undefined })}
                className="h-9 text-sm"
                min={filters.dateFrom || undefined}
                max={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>

            {/* Min Likes */}
            <div className="space-y-2">
              <Label htmlFor="min-likes" className="text-xs font-medium">Minimum Likes</Label>
              <Input
                id="min-likes"
                type="number"
                min={0}
                value={filters.minLikes || ''}
                onChange={(e) => onFiltersChange({ ...filters, minLikes: e.target.value ? parseInt(e.target.value) : undefined })}
                placeholder="0"
                className="h-9 text-sm"
              />
            </div>

            {/* Has Image */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Has Image</Label>
              <div className="flex items-center gap-4 h-9">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="hasImage"
                    checked={filters.hasImage === undefined}
                    onChange={() => onFiltersChange({ ...filters, hasImage: undefined })}
                    className="h-4 w-4"
                  />
                  <span className="text-sm">Any</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="hasImage"
                    checked={filters.hasImage === true}
                    onChange={() => onFiltersChange({ ...filters, hasImage: true })}
                    className="h-4 w-4"
                  />
                  <span className="text-sm">Yes</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="hasImage"
                    checked={filters.hasImage === false}
                    onChange={() => onFiltersChange({ ...filters, hasImage: false })}
                    className="h-4 w-4"
                  />
                  <span className="text-sm">No</span>
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" size="sm" onClick={handleClear}>
              Clear All
            </Button>
            <Button size="sm" onClick={onApply}>
              <Search className="h-3 w-3 mr-1" />
              Apply Filters
            </Button>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
