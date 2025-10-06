import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Store, Plus, Check, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [storeToDelete, setStoreToDelete] = useState<Store | null>(null);

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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // First deactivate all stores for this user
      await supabase
        .from("stores")
        .update({ is_active: false })
        .eq("user_id", user.id);

      // Then activate the selected store
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

  const handleDeleteClick = (store: Store, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (stores.length <= 1) {
      toast({
        title: "Cannot delete store",
        description: "You must have at least one store",
        variant: "destructive",
      });
      return;
    }

    if (store.is_active) {
      toast({
        title: "Cannot delete active store",
        description: "Please switch to another store first",
        variant: "destructive",
      });
      return;
    }

    setStoreToDelete(store);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!storeToDelete) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("stores")
        .delete()
        .eq("id", storeToDelete.id)
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Store "${storeToDelete.name}" deleted successfully`,
      });

      await loadStores();
    } catch (error: any) {
      console.error("Error deleting store:", error);
      toast({
        title: "Error",
        description: "Failed to delete store",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setStoreToDelete(null);
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
            className="group flex items-center justify-between cursor-pointer"
          >
            <div className="flex flex-col gap-1">
              <div className="font-medium">{store.name}</div>
              <div className="text-xs text-muted-foreground truncate">
                {store.website}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {store.is_active && <Check className="w-4 h-4 text-primary" />}
              {stores.length > 1 && !store.is_active && (
                <button
                  onClick={(e) => handleDeleteClick(store, e)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-destructive/10 rounded-sm"
                  title="Delete store"
                >
                  <Trash2 className="w-3 h-3 text-destructive" />
                </button>
              )}
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
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Store</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{storeToDelete?.name}"? This action cannot be undone and will delete all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DropdownMenu>
  );
};

export default StoreSelector;