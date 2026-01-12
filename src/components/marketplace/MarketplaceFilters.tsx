import React from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface MarketplaceFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  sortBy: string;
  onSortChange: (value: string) => void;
  filterType: string;
  onFilterTypeChange: (value: string) => void;
  showListedOnly: boolean;
  onShowListedOnlyChange: (value: boolean) => void;
  onClearFilters: () => void;
}

export const MarketplaceFilters: React.FC<MarketplaceFiltersProps> = ({
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  filterType,
  onFilterTypeChange,
  showListedOnly,
  onShowListedOnlyChange,
  onClearFilters,
}) => {
  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by caption or address..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 bg-card/50 border-border/50"
        />
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Sort */}
        <Select value={sortBy} onValueChange={onSortChange}>
          <SelectTrigger className="w-[180px] bg-card/50 border-border/50">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="oldest">Oldest First</SelectItem>
            <SelectItem value="price-low">Price: Low to High</SelectItem>
            <SelectItem value="price-high">Price: High to Low</SelectItem>
            <SelectItem value="most-liked">Most Liked</SelectItem>
            <SelectItem value="most-viewed">Most Viewed</SelectItem>
          </SelectContent>
        </Select>

        {/* Campaign Type Filter */}
        <Select value={filterType} onValueChange={onFilterTypeChange}>
          <SelectTrigger className="w-[180px] bg-card/50 border-border/50">
            <SelectValue placeholder="Campaign Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="product-launch">Product Launch</SelectItem>
            <SelectItem value="community-event">Community Event</SelectItem>
            <SelectItem value="educational">Educational</SelectItem>
            <SelectItem value="meme-campaign">Meme Campaign</SelectItem>
            <SelectItem value="defi-promotion">DeFi Promotion</SelectItem>
          </SelectContent>
        </Select>

        {/* Listed Only Toggle */}
        <div className="flex items-center gap-2">
          <Switch
            id="listed-only"
            checked={showListedOnly}
            onCheckedChange={onShowListedOnlyChange}
          />
          <Label htmlFor="listed-only" className="text-sm text-muted-foreground">
            Listed Only
          </Label>
        </div>

        {/* Clear Filters */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearFilters}
          className="text-muted-foreground hover:text-foreground"
        >
          <SlidersHorizontal className="w-4 h-4 mr-2" />
          Clear Filters
        </Button>
      </div>
    </div>
  );
};
