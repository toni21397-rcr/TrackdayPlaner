import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Globe, Mail, Phone, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Organizer, InsertOrganizer } from "@shared/schema";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { insertOrganizerSchema } from "@shared/schema";

export default function Organizers() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOrganizer, setEditingOrganizer] = useState<Organizer | null>(null);
  const { toast } = useToast();

  const { data: organizers, isLoading } = useQuery<Organizer[]>({
    queryKey: ["/api/organizers"],
  });

  const form = useForm<InsertOrganizer>({
    resolver: zodResolver(insertOrganizerSchema),
    defaultValues: {
      name: "",
      website: "",
      contactEmail: "",
      contactPhone: "",
      description: "",
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: InsertOrganizer) => {
      if (editingOrganizer) {
        const response = await apiRequest("PATCH", `/api/organizers/${editingOrganizer.id}`, data);
        return await response.json();
      } else {
        const response = await apiRequest("POST", "/api/organizers", data);
        return await response.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organizers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tracks"] });
      toast({
        title: editingOrganizer ? "Organizer updated" : "Organizer created",
        description: `Successfully ${editingOrganizer ? "updated" : "created"} organizer.`,
      });
      setDialogOpen(false);
      setEditingOrganizer(null);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/organizers/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organizers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tracks"] });
      toast({
        title: "Organizer deleted",
        description: "Successfully deleted organizer.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting organizer",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEdit = (organizer: Organizer) => {
    setEditingOrganizer(organizer);
    form.reset({
      name: organizer.name,
      website: organizer.website,
      contactEmail: organizer.contactEmail,
      contactPhone: organizer.contactPhone,
      description: organizer.description,
    });
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this organizer?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingOrganizer(null);
      form.reset();
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-6 space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-40" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Organizers</h1>
            <p className="text-muted-foreground">
              Manage track day organizers and booking contacts
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-organizer">
                <Plus className="w-4 h-4 mr-2" />
                Add Organizer
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingOrganizer ? "Edit Organizer" : "New Organizer"}
                </DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit((data) => saveMutation.mutate(data))} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Organizer Name *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Trackday Promotions Ltd" data-testid="input-organizer-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website</FormLabel>
                        <FormControl>
                          <Input {...field} type="url" placeholder="https://example.com" data-testid="input-organizer-website" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contactEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Email</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" placeholder="booking@example.com" data-testid="input-organizer-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contactPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Phone</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="+41 XX XXX XX XX" data-testid="input-organizer-phone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Additional information about the organizer..." rows={3} data-testid="textarea-organizer-description" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-2 justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleDialogClose(false)}
                      data-testid="button-cancel-organizer"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={saveMutation.isPending} data-testid="button-save-organizer">
                      {saveMutation.isPending ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {!organizers || organizers.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No organizers yet"
            description="Add your first trackday organizer to start managing booking contacts."
            actionLabel="Add Organizer"
            onAction={() => setDialogOpen(true)}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {organizers.map((organizer) => (
              <Card key={organizer.id} data-testid={`card-organizer-${organizer.id}`}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="truncate">{organizer.name}</span>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleEdit(organizer)}
                        data-testid={`button-edit-organizer-${organizer.id}`}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(organizer.id)}
                        data-testid={`button-delete-organizer-${organizer.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {organizer.website && (
                    <div className="flex items-start gap-2 text-sm">
                      <Globe className="w-4 h-4 mt-0.5 text-muted-foreground" />
                      <a
                        href={organizer.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline truncate"
                        data-testid={`link-organizer-website-${organizer.id}`}
                      >
                        {organizer.website.replace(/^https?:\/\//, '')}
                      </a>
                    </div>
                  )}
                  {organizer.contactEmail && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <a href={`mailto:${organizer.contactEmail}`} className="text-primary hover:underline truncate">
                        {organizer.contactEmail}
                      </a>
                    </div>
                  )}
                  {organizer.contactPhone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <a href={`tel:${organizer.contactPhone}`} className="text-primary hover:underline">
                        {organizer.contactPhone}
                      </a>
                    </div>
                  )}
                  {organizer.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {organizer.description}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
