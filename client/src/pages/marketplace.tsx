import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, Package, DollarSign, MapPin, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { format } from "date-fns";
import type { MarketplaceListing } from "@shared/schema";
import { MarketplaceListingDialog } from "@/components/marketplace-listing-dialog";

const CATEGORIES = [
  { value: "all", label: "All Categories" },
  { value: "bike", label: "Complete Bikes" },
  { value: "parts_engine", label: "Engine Parts" },
  { value: "parts_suspension", label: "Suspension" },
  { value: "parts_brakes", label: "Brakes" },
  { value: "parts_bodywork", label: "Bodywork" },
  { value: "parts_electronics", label: "Electronics" },
  { value: "gear_helmet", label: "Helmets" },
  { value: "gear_suit", label: "Suits" },
  { value: "gear_gloves", label: "Gloves" },
  { value: "gear_boots", label: "Boots" },
  { value: "accessories", label: "Accessories" },
  { value: "wanted", label: "Wanted" },
];

const CONDITIONS = {
  new: "New",
  like_new: "Like New",
  good: "Good",
  fair: "Fair",
  for_parts: "For Parts",
};

export default function Marketplace() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [sort, setSort] = useState<string>("newest");
  const [page, setPage] = useState(1);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const { data, isLoading } = useQuery<{
    items: MarketplaceListing[];
    total: number;
    nextCursor?: string | null;
  }>({
    queryKey: ["/api/marketplace/listings", category, sort, page, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (category && category !== "all") params.append("category", category);
      if (sort) params.append("sort", sort);
      if (search) params.append("search", search);
      params.append("page", page.toString());
      params.append("pageSize", "12");
      
      const response = await fetch(`/api/marketplace/listings?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch listings");
      return response.json();
    },
  });

  const formatPrice = (priceCents: number, currency: string) => {
    return `${(priceCents / 100).toFixed(0)} ${currency}`;
  };

  const listings = data?.items || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 12);

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-semibold">Marketplace</h1>
            <p className="text-muted-foreground">
              Buy and sell motorcycle parts, bikes, and gear
            </p>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-listing">
            <Plus className="w-4 h-4 mr-2" />
            Create Listing
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search listings..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                  data-testid="input-search"
                />
              </div>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-[180px]" data-testid="select-category">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sort} onValueChange={setSort}>
                <SelectTrigger className="w-[150px]" data-testid="select-sort">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="price_asc">Price: Low to High</SelectItem>
                  <SelectItem value="price_desc">Price: High to Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-48 w-full mb-4" />
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && listings.length === 0 && (
          <EmptyState
            icon={Package}
            title="No listings found"
            description="Be the first to create a listing or try adjusting your filters."
            actionLabel="Create Listing"
            onAction={() => setIsCreateDialogOpen(true)}
          />
        )}

        {/* Listings Grid */}
        {!isLoading && listings.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {listings.map((listing) => (
                <Link key={listing.id} href={`/marketplace/${listing.id}`}>
                  <Card className="hover-elevate active-elevate-2 cursor-pointer h-full" data-testid={`card-listing-${listing.id}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-lg line-clamp-2">{listing.title}</CardTitle>
                        <Badge variant="secondary" className="shrink-0">
                          {CONDITIONS[listing.condition as keyof typeof CONDITIONS]}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {/* Image Placeholder */}
                        {listing.images.length > 0 ? (
                          <div className="aspect-video rounded-md bg-muted flex items-center justify-center overflow-hidden">
                            <img 
                              src={listing.images[0]} 
                              alt={listing.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="aspect-video rounded-md bg-muted flex items-center justify-center">
                            <Package className="w-12 h-12 text-muted-foreground" />
                          </div>
                        )}

                        {/* Price */}
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-muted-foreground" />
                          <span className="text-2xl font-semibold">
                            {formatPrice(listing.priceCents, listing.currency)}
                          </span>
                        </div>

                        {/* Description */}
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {listing.description || "No description provided"}
                        </p>

                        {/* Location & Date */}
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            <span className="line-clamp-1">
                              {listing.locationCity || "Location not specified"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>{format(new Date(listing.createdAt), "MMM d")}</span>
                          </div>
                        </div>

                        {/* Category Badge */}
                        <Badge variant="outline" className="w-fit">
                          {CATEGORIES.find(c => c.value === listing.category)?.label || listing.category}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  data-testid="button-prev-page"
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  data-testid="button-next-page"
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}

        {/* Create Listing Dialog */}
        <MarketplaceListingDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
        />
      </div>
    </div>
  );
}
