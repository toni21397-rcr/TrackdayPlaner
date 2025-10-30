import { useState, useEffect } from "react";
import QRCode from "qrcode";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Check, Smartphone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ShareRouteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  googleMapsUrl: string;
  trackName: string;
}

export function ShareRouteDialog({
  open,
  onOpenChange,
  googleMapsUrl,
  trackName,
}: ShareRouteDialogProps) {
  const { toast } = useToast();
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open && googleMapsUrl) {
      QRCode.toDataURL(googleMapsUrl, {
        width: 256,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
      })
        .then(setQrCodeUrl)
        .catch((err) => console.error("QR code generation error:", err));
    }
  }, [open, googleMapsUrl]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(googleMapsUrl);
      setCopied(true);
      toast({
        title: "Link copied!",
        description: "The Google Maps link has been copied to your clipboard.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please copy the link manually.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md z-[9999]">
        <DialogHeader>
          <DialogTitle>Share Route to {trackName}</DialogTitle>
          <DialogDescription>
            Get this route on your phone for navigation
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* QR Code Section */}
          <div className="flex flex-col items-center space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Smartphone className="w-4 h-4" />
              <span>Scan with your phone</span>
            </div>
            {qrCodeUrl && (
              <div className="p-4 bg-white rounded-lg border">
                <img src={qrCodeUrl} alt="Route QR Code" className="w-64 h-64" />
              </div>
            )}
            <p className="text-xs text-center text-muted-foreground max-w-xs">
              Open your phone's camera app and point it at the QR code. Tap the notification to open in Google Maps.
            </p>
          </div>

          {/* Copy Link Section */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Or copy the link</label>
            <div className="flex gap-2">
              <Input
                value={googleMapsUrl}
                readOnly
                className="font-mono text-xs"
                data-testid="input-share-url"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={copyToClipboard}
                data-testid="button-copy-link"
              >
                {copied ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Text or email this link to yourself, then open it on your phone.
            </p>
          </div>

          {/* Direct Open Button */}
          <Button
            variant="default"
            className="w-full"
            asChild
            data-testid="button-open-now"
          >
            <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer">
              Open in Google Maps Now
            </a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
