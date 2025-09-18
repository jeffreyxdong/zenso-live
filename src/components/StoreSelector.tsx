import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Store, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Store {
  id: string;
  name: string;
  website: string;
  is_active: boolean;
}

interface StoreSelectorProps {
  onStoreChange?: (store: Store) => void;
  onAddStore?: () => void;
}

const StoreSelector = ({ onStoreChange, onAddStore }: StoreSelectorProps) => {
  const [stores, setStores] = useState<Store[]>([]);
  const [activeStore, setActiveStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStores = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("stores")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const storeList = data || [];
      setStores(storeList);
      
      // Find active store or set first store as active
      let active = storeList.find(store => store.is_active);
      if (!active && storeList.length > 0) {
        active = storeList[0];
        // Set first store as active
        await supabase
          .from("stores")
          .update({ is_active: true })
          .eq("id", active.id);
        active.is_active = true;
      }
      
      setActiveStore(active || null);
      if (active && onStoreChange) {
        onStoreChange(active);
      }
    } catch (error: any) {
      console.error("Error loading stores:", error);
      toast({
        title: "Error",
        description: "Failed to load stores",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const switchToStore = async (store: Store) => {
    try {
      // Update active store in database
      await supabase
        .from("stores")
        .update({ is_active: true })
        .eq("id", store.id);

      // Update local state
      const updatedStores = stores.map(s => ({
        ...s,
        is_active: s.id === store.id
      }));
      setStores(updatedStores);
      setActiveStore({ ...store, is_active: true });
      
      if (onStoreChange) {
        onStoreChange({ ...store, is_active: true });
      }

      toast({
        title: "Store switched",
        description: `Now viewing ${store.name}`,
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

  useEffect(() => {
    loadStores();
  }, []);

  // Refresh stores when component mounts or when new stores are added
  useEffect(() => {
    const channel = supabase
      .channel('stores-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stores'
        },
        () => {
          loadStores();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Store className="w-4 h-4" />
        Loading...
      </div>
    );
  }

  if (stores.length === 0) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <Store className="w-4 h-4" />
            No stores added
            <ChevronDown className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 bg-popover border shadow-lg z-50">
          {onAddStore && (
            <DropdownMenuItem
              onClick={onAddStore}
              className="cursor-pointer flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Store</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  if (stores.length === 1) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <Store className="w-4 h-4" />
            {activeStore?.name || stores[0].name}
            <ChevronDown className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 bg-popover border shadow-lg z-50">
          <DropdownMenuItem
            onClick={() => switchToStore(stores[0])}
            className={`cursor-pointer ${
              stores[0].is_active ? "bg-muted" : ""
            }`}
          >
            <div className="flex flex-col gap-1 w-full">
              <div className="font-medium">{stores[0].name}</div>
              <div className="text-xs text-muted-foreground truncate">
                {stores[0].website}
              </div>
            </div>
          </DropdownMenuItem>
          {onAddStore && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onAddStore}
                className="cursor-pointer flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add Store</span>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Store className="w-4 h-4" />
          {activeStore?.name || "Select Store"}
          <ChevronDown className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 bg-popover border shadow-lg z-50">
        {stores.map((store) => (
          <DropdownMenuItem
            key={store.id}
            onClick={() => switchToStore(store)}
            className={`cursor-pointer ${
              store.is_active ? "bg-muted" : ""
            }`}
          >
            <div className="flex flex-col gap-1 w-full">
              <div className="font-medium">{store.name}</div>
              <div className="text-xs text-muted-foreground truncate">
                {store.website}
              </div>
            </div>
          </DropdownMenuItem>
        ))}
        {onAddStore && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onAddStore}
              className="cursor-pointer flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Store</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default StoreSelector;