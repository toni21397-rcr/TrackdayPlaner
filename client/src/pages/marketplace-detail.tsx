import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, MapPin, Calendar, Mail, Phone, Package, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import type { MarketplaceListing } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { MarketplaceListingDialog } from "@/components/marketplace-listing-dialog";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

const CATEGORIES = {
  bike: "Complete Bike",
  parts_engine: "Engine Parts",
  parts_suspension: "Suspension",
  parts_brakes: "Brakes",
  parts_bodywork: "Bodywork",
  parts_electronics: "Electronics",
  gear_helmet: "Helmet",
  gear_suit: "Riding Suit",
  gear_gloves: "Gloves",
  gear_boots: "Boots",
  accessories: "Accessories",
  wanted: "Wanted / Looking For",
};

const CONDITIONS = {
  new: "New",
  like_new: "Like New",
  good: "Good",
  fair: "Fair",
  parts_only: "For Parts",
};

export default function MarketplaceDetail() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const { data: listing, isLoading } = useQuery<MarketplaceListing>({
    queryKey: ["/api/marketplace/listings", id],
    queryFn: async () => {
      const response = await fetch(`/api/marketplace/listings/${id}`);
      if (!response.ok) throw new Error("Failed to fetch listing");
      return response.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("DELETE", `/api/marketplace/listings/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace/listings"] });
      toast({
        title: "Success",
        description: "Listing deleted successfully",
      });
      navigate("/marketplace");
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const markAsSoldMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("PATCH", `/api/marketplace/listings/${id}`, { status: "sold" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace/listings", id] });
      toast({
        title: "Success",
        description: "Listing marked as sold",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const formatPrice = (priceCents: number, currency: string) => {
    return `${(priceCents / 100).toFixed(0)} ${currency}`;
  };

  const isOwner = user && listing && user.id === listing.sellerUserId;

  if (isLoading) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-6 md:p-8 space-y-6">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-6 md:p-8">
          <p className="text-muted-foreground">Listing not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-4xl mx-auto p-6 md:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/marketplace")} data-testid="button-back">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-semibold">{listing.title}</h1>
          </div>
          {isOwner && (
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={() => setIsEditDialogOpen(true)} data-testid="button-edit">
                <Edit className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  if (confirm("Are you sure you want to delete this listing?")) {
                    deleteMutation.mutate();
                  }
                }}
                data-testid="button-delete"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Status & Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary">
            {CONDITIONS[listing.condition as keyof typeof CONDITIONS]}
          </Badge>
          <Badge variant="outline">
            {CATEGORIES[listing.category as keyof typeof CATEGORIES]}
          </Badge>
          {listing.status === "sold" && (
            <Badge variant="destructive">Sold</Badge>
          )}
        </div>

        {/* Price Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-4xl font-bold">
              {formatPrice(listing.priceCents, listing.currency)}
            </CardTitle>
          </CardHeader>
        </Card>

        {/* Images */}
        {listing.images.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {listing.images.map((image, index) => (
              <div key={index} className="aspect-video rounded-lg overflow-hidden bg-muted">
                <img 
                  src={image} 
                  alt={`${listing.title} - Image ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="aspect-video rounded-lg bg-muted flex items-center justify-center">
            <Package className="w-24 h-24 text-muted-foreground" />
          </div>
        )}

        {/* Description */}
        <Card>
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-muted-foreground">
              {listing.description || "No description provided"}
            </p>
          </CardContent>
        </Card>

        {/* Location & Date */}
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span>
                {listing.locationCity && listing.locationCountry
                  ? `${listing.locationCity}, ${listing.locationCountry}`
                  : listing.locationCity || listing.locationCountry || "Location not specified"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span>Listed {format(new Date(listing.createdAt), "MMMM d, yyyy")}</span>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Seller</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <a href={`mailto:${listing.contactEmail}`} className="text-primary hover:underline" data-testid="link-email">
                {listing.contactEmail}
              </a>
            </div>
            {listing.contactPhone && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <a href={`tel:${listing.contactPhone}`} className="text-primary hover:underline" data-testid="link-phone">
                  {listing.contactPhone}
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Owner Actions */}
        {isOwner && listing.status === "active" && (
          <Card>
            <CardHeader>
              <CardTitle>Manage Listing</CardTitle>
            </CardHeader>
            <CardContent>
              <Button onClick={() => markAsSoldMutation.mutate()} disabled={markAsSoldMutation.isPending} data-testid="button-mark-sold">
                {markAsSoldMutation.isPending ? "Updating..." : "Mark as Sold"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Edit Dialog */}
        {isOwner && (
          <MarketplaceListingDialog
            open={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
            listing={listing}
          />
        )}
      </div>
    </div>
  );
}
