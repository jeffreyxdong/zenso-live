import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface AddStoreModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStoreAdded?: () => void;
}

const AddStoreModal = ({ open, onOpenChange, onStoreAdded }: AddStoreModalProps) => {
  const [formData, setFormData] = useState({
    storeName: "",
    website: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.storeName.trim() || !formData.website.trim()) {
      toast({
        title: "Error",
        description: "Please fill in both store name and website",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Error",
          description: "User not authenticated",
          variant: "destructive",
        });
        return;
      }

      // Check if this is the user's first store
      const { data: existingStores } = await supabase
        .from("stores")
        .select("id")
        .eq("user_id", user.id);

      const isFirstStore = !existingStores || existingStores.length === 0;

      // Create new store
      const { error } = await supabase
        .from("stores")
        .insert({
          user_id: user.id,
          name: formData.storeName.trim(),
          website: formData.website.trim(),
          is_active: isFirstStore, // First store is automatically active
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Store added successfully",
      });

      // Reset form and close modal
      setFormData({ storeName: "", website: "" });
      onOpenChange(false);
      onStoreAdded?.();

    } catch (error: any) {
      console.error("Error saving store:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add store",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Store Information</DialogTitle>
          <DialogDescription>
            Enter your store details to get started with tracking.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="storeName">Store Name</Label>
            <Input
              id="storeName"
              placeholder="Enter your store name"
              value={formData.storeName}
              onChange={(e) => handleInputChange("storeName", e.target.value)}
              disabled={loading}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="website">Website URL</Label>
            <Input
              id="website"
              type="url"
              placeholder="https://your-store.com"
              value={formData.website}
              onChange={(e) => handleInputChange("website", e.target.value)}
              disabled={loading}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Store"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddStoreModal;