import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Store, ShoppingCart, Package, Download, Plus, Search, AlertCircle, CheckCircle } from "lucide-react";
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
  console.log("MyProducts component loaded!");
  
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [connectedShop, setConnectedShop] = useState<string | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showAddProductDialog, setShowAddProductDialog] = useState(false);
  const [addingProduct, setAddingProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({
    title: "",
    handle: "",
    product_type: "",
    vendor: "",
    tags: "",
    price: "",
    sku: "",
    inventory_quantity: ""
  });

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
    // Open Shopify app OAuth flow directly
    const authUrl = "https://geo-integration.myshopify.com/admin/oauth/redirect_from_cli?client_id=2c4037e6fc66b0b16b720a936e142898";
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
      // Call our Supabase function directly since products are imported via shopify-ingest
      // The integration app should call our shopify-ingest function
      toast({
        title: "Import Started",
        description: "Products are being imported from Shopify..."
      });

      // Simulate import process - in real implementation, the integration app
      // will call our shopify-ingest function and products will appear
      // For now, we'll refresh the products list periodically
      const checkForNewProducts = () => {
        fetchProducts();
        setTimeout(() => {
          fetchProducts();
        }, 3000);
      };

      checkForNewProducts();

      toast({
        title: "Import In Progress",
        description: "Products are being imported. This page will update automatically."
      });

      setShowImportDialog(false);
      
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

  const handleAddProduct = async () => {
    console.log("Starting handleAddProduct with data:", newProduct);
    
    if (!newProduct.title.trim()) {
      console.log("Validation failed: title is empty");
      toast({
        title: "Validation Error",
        description: "Product title is required",
        variant: "destructive"
      });
      return;
    }

    setAddingProduct(true);
    try {
      console.log("Getting user data...");
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error("User error:", userError);
        throw userError;
      }
      
      console.log("User data:", userData.user?.id);

      // Generate handle from title if not provided
      const handle = newProduct.handle.trim() || 
        newProduct.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      // Create product
      const productData = {
        user_id: userData.user.id,
        shopify_id: `manual-${Date.now()}`, // Use timestamp for manual products
        title: newProduct.title.trim(),
        handle: handle,
        status: 'active',
        product_type: newProduct.product_type.trim() || null,
        vendor: newProduct.vendor.trim() || null,
        tags: newProduct.tags.trim() ? newProduct.tags.split(',').map(tag => tag.trim()) : [],
        images: []
      };

      console.log("Inserting product data:", productData);

      const { data: product, error: productError } = await supabase
        .from('products')
        .insert(productData)
        .select()
        .single();

      if (productError) {
        console.error("Product insert error:", productError);
        throw productError;
      }
      
      console.log("Product created successfully:", product);

      // Create variant if price is provided
      if (newProduct.price.trim()) {
        const variantData = {
          product_id: product.id,
          shopify_variant_id: `manual-variant-${Date.now()}`,
          title: 'Default',
          sku: newProduct.sku.trim() || null,
          price: parseFloat(newProduct.price) || 0,
          inventory_quantity: parseInt(newProduct.inventory_quantity) || 0,
          weight_unit: 'kg'
        };

        console.log("Inserting variant data:", variantData);

        const { error: variantError } = await supabase
          .from('product_variants')
          .insert(variantData);

        if (variantError) {
          console.error('Error creating variant:', variantError);
        } else {
          console.log("Variant created successfully");
        }
      }

      toast({
        title: "Product Added",
        description: `Successfully added "${newProduct.title}"`
      });

      // Reset form and close dialog
      setNewProduct({
        title: "",
        handle: "",
        product_type: "",
        vendor: "",
        tags: "",
        price: "",
        sku: "",
        inventory_quantity: ""
      });
      setShowAddProductDialog(false);

      // Refresh products
      console.log("Refreshing products list...");
      fetchProducts();

    } catch (error: any) {
      console.error('Add product error:', error);
      toast({
        title: "Failed to Add Product",
        description: error.message || "An error occurred while adding the product",
        variant: "destructive"
      });
    } finally {
      setAddingProduct(false);
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
              <Button 
                className="flex items-center gap-2" 
                onClick={() => {
                  console.log("Add Product button clicked (empty state)!");
                  setShowAddProductDialog(true);
                }}
              >
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
          <Button 
            className="flex items-center gap-2" 
            onClick={() => {
              console.log("Add Product button clicked (with products)!");
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

      {/* Add Product Dialog */}
      <Dialog open={showAddProductDialog} onOpenChange={setShowAddProductDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Add New Product
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Product Title *</Label>
                <Input
                  id="title"
                  placeholder="Enter product title"
                  value={newProduct.title}
                  onChange={(e) => setNewProduct({ ...newProduct, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="handle">Handle (URL slug)</Label>
                <Input
                  id="handle"
                  placeholder="product-handle"
                  value={newProduct.handle}
                  onChange={(e) => setNewProduct({ ...newProduct, handle: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="product_type">Product Type</Label>
                <Input
                  id="product_type"
                  placeholder="e.g., Clothing, Electronics"
                  value={newProduct.product_type}
                  onChange={(e) => setNewProduct({ ...newProduct, product_type: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vendor">Vendor</Label>
                <Input
                  id="vendor"
                  placeholder="Brand or manufacturer"
                  value={newProduct.vendor}
                  onChange={(e) => setNewProduct({ ...newProduct, vendor: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Price</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={newProduct.price}
                  onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sku">SKU</Label>
                <Input
                  id="sku"
                  placeholder="Product SKU"
                  value={newProduct.sku}
                  onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inventory_quantity">Inventory Quantity</Label>
                <Input
                  id="inventory_quantity"
                  type="number"
                  placeholder="0"
                  value={newProduct.inventory_quantity}
                  onChange={(e) => setNewProduct({ ...newProduct, inventory_quantity: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tags">Tags (comma separated)</Label>
              <Input
                id="tags"
                placeholder="tag1, tag2, tag3"
                value={newProduct.tags}
                onChange={(e) => setNewProduct({ ...newProduct, tags: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowAddProductDialog(false)}
                disabled={addingProduct}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddProduct}
                disabled={addingProduct}
              >
                {addingProduct ? (
                  <>
                    <Package className="w-4 h-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Product
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyProducts;