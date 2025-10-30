import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Download, Upload, Database } from "lucide-react";
import { queryClient } from "@/lib/queryClient";

interface DataEntity {
  id: string;
  name: string;
  description: string;
  exportEndpoint: string;
  importEndpoint: string;
}

const dataEntities: DataEntity[] = [
  {
    id: "motorcycle-models",
    name: "Motorcycle Models",
    description: "List of predefined motorcycle models for vehicle selection",
    exportEndpoint: "/api/admin/reference-data/motorcycle-models/export",
    importEndpoint: "/api/admin/reference-data/motorcycle-models/import",
  },
  {
    id: "tracks",
    name: "Tracks",
    description: "Racing tracks with locations and organizer details",
    exportEndpoint: "/api/admin/reference-data/tracks/export",
    importEndpoint: "/api/admin/reference-data/tracks/import",
  },
  {
    id: "organizers",
    name: "Organizers",
    description: "Track day organizers with contact information",
    exportEndpoint: "/api/admin/reference-data/organizers/export",
    importEndpoint: "/api/admin/reference-data/organizers/import",
  },
];

export default function AdminDataManagement() {
  const { toast } = useToast();
  const [uploadingEntity, setUploadingEntity] = useState<string | null>(null);

  const { data: user } = useQuery<any>({
    queryKey: ["/api/auth/user"],
  });

  const handleDownload = async (entity: DataEntity) => {
    try {
      const response = await fetch(entity.exportEndpoint, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${entity.id}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Download successful",
        description: `${entity.name} CSV file downloaded`,
      });
    } catch (error: any) {
      toast({
        title: "Download failed",
        description: error.message || "Failed to download CSV file",
        variant: "destructive",
      });
    }
  };

  const importMutation = useMutation({
    mutationFn: async ({ entity, file }: { entity: DataEntity; file: File }) => {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(entity.importEndpoint, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Import failed: ${response.statusText}`);
      }

      return response.json();
    },
    onSuccess: (data, { entity }) => {
      toast({
        title: "Import successful",
        description: `Successfully imported ${data.imported} ${entity.name.toLowerCase()}`,
      });
      setUploadingEntity(null);
      
      queryClient.invalidateQueries({ queryKey: ["/api/tracks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/organizers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/motorcycle-models"] });
    },
    onError: (error: any, { entity }) => {
      toast({
        title: "Import failed",
        description: error.message || `Failed to import ${entity.name}`,
        variant: "destructive",
      });
      setUploadingEntity(null);
    },
  });

  const handleFileUpload = (entity: DataEntity, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      toast({
        title: "Invalid file",
        description: "Please upload a CSV file",
        variant: "destructive",
      });
      return;
    }

    setUploadingEntity(entity.id);
    importMutation.mutate({ entity, file });
    event.target.value = "";
  };

  if (!user?.isAdmin) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You need admin privileges to access this page
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Data Management</h1>
        <p className="text-muted-foreground">
          Download, edit, and re-upload reference data as CSV files
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-1">
        {dataEntities.map((entity) => (
          <Card key={entity.id} data-testid={`card-entity-${entity.id}`}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Database className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">{entity.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {entity.description}
                    </CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3 flex-wrap">
                <Button
                  variant="outline"
                  onClick={() => handleDownload(entity)}
                  data-testid={`button-download-${entity.id}`}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download CSV
                </Button>

                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept=".csv"
                    onChange={(e) => handleFileUpload(entity, e)}
                    className="hidden"
                    id={`upload-${entity.id}`}
                    data-testid={`input-upload-${entity.id}`}
                  />
                  <Label htmlFor={`upload-${entity.id}`} className="cursor-pointer">
                    <Button
                      variant="default"
                      asChild
                      disabled={uploadingEntity === entity.id}
                      data-testid={`button-upload-${entity.id}`}
                    >
                      <span>
                        <Upload className="h-4 w-4 mr-2" />
                        {uploadingEntity === entity.id ? "Uploading..." : "Upload CSV"}
                      </span>
                    </Button>
                  </Label>
                </div>
              </div>

              <div className="mt-4 p-3 rounded-md bg-muted text-sm">
                <p className="font-medium mb-1">CSV Format:</p>
                <p className="text-muted-foreground">
                  {entity.id === "motorcycle-models" && "name, isActive, displayOrder"}
                  {entity.id === "tracks" && "name, country, lat, lng, organizerName, organizerWebsite"}
                  {entity.id === "organizers" && "name, website, contactEmail, contactPhone, description"}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-8 border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900">
        <CardHeader>
          <CardTitle className="text-amber-900 dark:text-amber-100">Warning</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside space-y-2 text-sm text-amber-800 dark:text-amber-200">
            <li>Uploading a CSV will <strong>replace all existing data</strong> for that entity</li>
            <li>Make sure your CSV file has the correct headers and formatting</li>
            <li>Download the current data first to use as a template</li>
            <li>Validation errors will prevent the upload from completing</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
