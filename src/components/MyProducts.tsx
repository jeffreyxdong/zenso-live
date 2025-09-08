import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Store, ShoppingCart, Package, Download, Plus, Search, AlertCircle, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

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
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [connectedShop, setConnectedShop] = useState<string | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      const { data: productsData, error } = await supabase
        .from('products')
        .select(`
          *,
          variants:product_variants(*)
        `)
        .eq('user_id', userData.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts((productsData || []).map(product => ({
        ...product,
        images: Array.isArray(product.images) ? product.images : []
      })));
    } catch (error: any) {
      console.error('Error fetching products:', error);
      toast({
        title: "Error",
        description: "Failed to fetch products",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConnectShopify = () => {
    const shopName = prompt("Enter your shop name (without .myshopify.com):");
    if (shopName) {
      // Open integration app for OAuth
      const integrationHost = "https://your-integration-host.com"; // Replace with actual host
      const authUrl = `${integrationHost}/auth/login?shop=${shopName}.myshopify.com`;
      window.open(authUrl, '_blank', 'width=600,height=700');
      
      // Listen for connection success
      const handleMessage = (event: MessageEvent) => {
        if (event.data.type === 'shopify_connected' && event.data.shop) {
          setConnectedShop(event.data.shop);
          toast({
            title: "Connected!",
            description: `Successfully connected to ${event.data.shop}`,
          });
          window.removeEventListener('message', handleMessage);
        }
      };
      
      window.addEventListener('message', handleMessage);
    }
  };

  const handleImportFromShopify = async () => {
    if (!connectedShop) {
      toast({
        title: "Not Connected",
        description: "Please connect to Shopify first",
        variant: "destructive"
      });
      return;
    }

    setImporting(true);
    try {
      // Call integration app to trigger import
      const integrationHost = "https://your-integration-host.com"; // Replace with actual host
      const response = await fetch(`${integrationHost}/api/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Key': 'your-shared-secret' // Replace with actual secret
        },
        body: JSON.stringify({
          shop: connectedShop
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Import failed');
      }

      toast({
        title: "Import Complete",
        description: `Successfully imported ${result.imported} products`
      });

      setShowImportDialog(false);
      
      // Refresh products list
      setTimeout(() => {
        fetchProducts();
      }, 2000);

    } catch (error: any) {
      console.error('Import error:', error);
      toast({
        title: "Import Failed", 
        description: error.message || "Failed to import products from Shopify",
        variant: "destructive"
      });
    } finally {
      setImporting(false);
    }
  };

  const filteredProducts = products.filter(product =>
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

  if (products.length === 0) {
    return (
      <div className="space-y-6">
        {/* Header with Import Button */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">My Products</h2>
            <p className="text-sm text-muted-foreground">Manage your product catalog</p>
          </div>
          <div className="flex gap-2">
            {!connectedShop ? (
              <Button 
                variant="outline" 
                className="flex items-center gap-2"
                onClick={handleConnectShopify}
              >
                <Store className="w-4 h-4" />
                Connect Shopify
              </Button>
            ) : (
              <>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Connected to {connectedShop}
                </div>
                <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="flex items-center gap-2">
                      <Download className="w-4 h-4" />
                      Import Products
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Store className="w-5 h-5" />
                        Import Products from Shopify
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        <div>
                          <p className="font-medium">Connected to {connectedShop}</p>
                          <p className="text-sm text-muted-foreground">
                            Ready to import all active and published products
                          </p>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setShowImportDialog(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleImportFromShopify}
                          disabled={importing}
                        >
                          {importing ? (
                            <>
                              <Download className="w-4 h-4 mr-2 animate-spin" />
                              Importing...
                            </>
                          ) : (
                            <>
                              <Download className="w-4 h-4 mr-2" />
                              Start Import
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </>
            )}
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Product
            </Button>
          </div>
        </div>

        {/* Empty State */}
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Store className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No Products Yet</h3>
            <p className="text-muted-foreground mb-6">You don't have any products. Import from Shopify or add manually.</p>
            <div className="flex gap-2">
              {!connectedShop ? (
                <Button
                  variant="outline"
                  onClick={handleConnectShopify}
                  className="flex items-center gap-2"
                >
                  <Store className="w-4 h-4" />
                  Connect Shopify
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => setShowImportDialog(true)}
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Import Products
                </Button>
              )}
              <Button className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add Product
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">My Products</h2>
          <p className="text-sm text-muted-foreground">{products.length} products</p>
        </div>
        <div className="flex gap-2">
          {!connectedShop ? (
            <Button 
              variant="outline" 
              className="flex items-center gap-2"
              onClick={handleConnectShopify}
            >
              <Store className="w-4 h-4" />
              Connect Shopify
            </Button>
          ) : (
            <>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Connected to {connectedShop}
              </div>
              <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    Import Products
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Store className="w-5 h-5" />
                      Import Products from Shopify
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <div>
                        <p className="font-medium">Connected to {connectedShop}</p>
                        <p className="text-sm text-muted-foreground">
                          Ready to import all active and published products
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setShowImportDialog(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleImportFromShopify}
                        disabled={importing}
                      >
                        {importing ? (
                          <>
                            <Download className="w-4 h-4 mr-2 animate-spin" />
                            Importing...
                          </>
                        ) : (
                          <>
                            <Download className="w-4 h-4 mr-2" />
                            Start Import
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </>
          )}
          <Button className="flex items-center gap-2">
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
                variant={product.status === 'active' ? 'default' : 'secondary'}
                className="absolute top-2 right-2"
              >
                {product.status}
              </Badge>
            </div>
            <CardContent className="p-4">
              <h3 className="font-semibold text-foreground mb-2 line-clamp-2">
                {product.title}
              </h3>
              <div className="space-y-2">
                {product.vendor && (
                  <p className="text-sm text-muted-foreground">{product.vendor}</p>
                )}
                {product.product_type && (
                  <Badge variant="outline" className="text-xs">
                    {product.product_type}
                  </Badge>
                )}
                {product.variants && product.variants.length > 0 && (
                  <div className="text-sm">
                    <span className="font-medium">
                      ${product.variants[0].price}
                    </span>
                    {product.variants.length > 1 && (
                      <span className="text-muted-foreground">
                        {" "}({product.variants.length} variants)
                      </span>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredProducts.length === 0 && searchQuery && (
        <div className="text-center py-8">
          <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">No products found matching "{searchQuery}"</p>
        </div>
      )}
    </div>
  );
};

export default MyProducts;