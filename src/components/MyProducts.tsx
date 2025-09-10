import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Store, Package, Download, Plus, Search, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Product {
  id: string;
  shopify_id: string;
  title: string;
  handle: string;
  status: string;
  product_type?: string;
  vendor?: string;
  tags?: string[];
  images?: any;
  created_at: string;
  variants?: ProductVariant[];
}

interface ProductVariant {
  id: string;
  shopify_variant_id: string;
  title: string;
  sku?: string;
  price: number;
  compare_at_price?: number;
  inventory_quantity: number;
}

const MyProducts = () => {
  console.log(">>> MyProducts mounted!");

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [connectedShop, setConnectedShop] = useState<string | null>(null);
  const [showAddProductDialog, setShowAddProductDialog] = useState(false);

  // Debug: log whenever dialog state changes
  useEffect(() => {
    console.log("showAddProductDialog:", showAddProductDialog);
  }, [showAddProductDialog]);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      const { data: productsData, error } = await supabase
        .from("products")
        .select(`
          *,
          variants:product_variants(*)
        `)
        .eq("user_id", userData.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProducts(productsData || []);
    } catch (error: any) {
      console.error("Error fetching products:", error);
      toast({
        title: "Error",
        description: "Failed to fetch products",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(
    (product) =>
      product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.vendor?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.product_type?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <Package className="w-8 h-8 text-muted-foreground mx-auto mb-2 animate-spin" />
          <p className="text-muted-foreground">Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">My Products</h2>
          <p className="text-sm text-muted-foreground">
            {products.length} products
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            className="flex items-center gap-2"
            onClick={() => {
              console.log("Add Product button clicked!");
              setShowAddProductDialog(true);
            }}
          >
            <Plus className="w-4 h-4" />
            Add Product
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map((product) => (
          <Card key={product.id} className="overflow-hidden">
            <div className="aspect-square bg-muted relative">
              {product.images && product.images[0] ? (
                <img
                  src={product.images[0].src}
                  alt={product.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-12 h-12 text-muted-foreground" />
                </div>
              )}
              <Badge
                variant={product.status === "active" ? "default" : "secondary"}
                className="absolute top-2 right-2"
              >
                {product.status}
              </Badge>
            </div>
            <CardContent className="p-4">
              <h3 className="font-semibold text-foreground mb-2 line-clamp-2">
                {product.title}
              </h3>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredProducts.length === 0 && searchQuery && (
        <div className="text-center py-8">
          <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">
            No products found matching "{searchQuery}"
          </p>
        </div>
      )}

      {/* Add Product Dialog */}
      <Dialog open={showAddProductDialog} onOpenChange={setShowAddProductDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Product (Debug)</DialogTitle>
          </DialogHeader>
          <p>This dialog proves the modal opens.</p>
          <Button onClick={() => setShowAddProductDialog(false)}>Close</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyProducts;
