import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, Store, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Store {
  id: string;
  name: string;
  website: string;
  is_active: boolean;
}

interface StoreSwitcherProps {
  onStoreChange?: (store: Store | null) => void;
  triggerRefresh?: number;
}

const StoreSwitcher = ({ onStoreChange, triggerRefresh }: StoreSwitcherProps) => {
  const [stores, setStores] = useState<Store[]>([]);
  const [activeStore, setActiveStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStores = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("stores")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (error) throw error;

      setStores(data || []);
      const active = data?.find(store => store.is_active) || null;
      setActiveStore(active);
      onStoreChange?.(active);
    } catch (error: any) {
      console.error("Error fetching stores:", error);
      toast({
        title: "Error",
        description: "Failed to load stores",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStores();
  }, [triggerRefresh]);

  const switchStore = async (storeId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Set the selected store as active
      const { error } = await supabase
        .from("stores")
        .update({ is_active: true })
        .eq("id", storeId)
        .eq("user_id", user.id);

      if (error) throw error;

      // Refresh stores to get updated state
      await fetchStores();

      toast({
        title: "Success",
        description: "Store switched successfully",
      });
    } catch (error: any) {
      console.error("Error switching store:", error);
      toast({
        title: "Error",
        description: "Failed to switch store",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <Store className="w-4 h-4" />
        <span className="text-sm">Loading...</span>
      </div>
    );
  }

  if (stores.length === 0) {
    return (
      <div className="flex items-center gap-2">
        <Store className="w-4 h-4" />
        <span className="text-sm text-muted-foreground">No stores</span>
      </div>
    );
  }

  if (stores.length === 1) {
    return (
      <div className="flex items-center gap-2">
        <Store className="w-4 h-4" />
        <span className="text-sm font-medium">{activeStore?.name || "Store"}</span>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Store className="w-4 h-4" />
          <span className="text-sm font-medium">
            {activeStore?.name || "Select Store"}
          </span>
          <ChevronDown className="w-3 h-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56 bg-popover">
        {stores.map((store) => (
          <DropdownMenuItem
            key={store.id}
            onClick={() => switchStore(store.id)}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex flex-col">
              <span className="font-medium">{store.name}</span>
              <span className="text-xs text-muted-foreground">{store.website}</span>
            </div>
            {store.is_active && <Check className="w-4 h-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default StoreSwitcher;