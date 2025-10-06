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
  onStoreAdded?: (newStore: { id: string; name: string; website: string; is_active: boolean }) => void;
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

      // First, deactivate all existing stores for this user
      await supabase
        .from("stores")
        .update({ is_active: false })
        .eq("user_id", user.id);

      // Create new store (always set as active)
      const { data: newStore, error } = await supabase
        .from("stores")
        .insert({
          user_id: user.id,
          name: formData.storeName.trim(),
          website: formData.website.trim(),
          is_active: true, // New store is always set as active
        })
        .select()
        .single();

      if (error) throw error;

      // Trigger all AI processes in parallel
      const aiProcesses = [
        // Generate brand recommendations
        supabase.functions.invoke('generate-brand-recommendations', {
          body: { storeId: newStore.id }
        }),
        // Generate competitor analytics
        supabase.functions.invoke('analyze-competitors', {
          body: { storeId: newStore.id }
        }),
        // Generate brand visibility score
        supabase.functions.invoke('score-brand-visibility', {
          body: { storeId: newStore.id }
        })
      ];

      // Fire and forget all AI processes
      Promise.all(aiProcesses)
        .then(() => {
          console.log('All AI processes started successfully');
        })
        .catch(err => console.error('Failed to start AI processes:', err));

      toast({
        title: "Success",
        description: "Store added successfully. AI recommendations are being generated...",
      });

      // Reset form and close modal
      setFormData({ storeName: "", website: "" });
      onOpenChange(false);
      onStoreAdded?.(newStore);

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
              type="text"
              placeholder="honda.com"
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