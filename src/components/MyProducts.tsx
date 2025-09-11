import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Store, Package, Download, Plus, Search, CheckCircle, AlertCircle, Image } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

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

const productSchema = z.object({
  title: z.string().min(1, "Product title is required"),
  handle: z.string().optional(),
  product_type: z.string().optional(),
  vendor: z.string().optional(),
  status: z.enum(["active", "draft", "archived"]),
  price: z.number().min(0, "Price must be positive"),
  compare_at_price: z.number().optional(),
  sku: z.string().optional(),
  inventory_quantity: z.number().int().min(0, "Inventory must be non-negative"),
  tags: z.string().optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

const MyProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddProductDialog, setShowAddProductDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      title: "",
      handle: "",
      product_type: "",
      vendor: "",
      status: "active",
      price: 0,
      compare_at_price: undefined,
      sku: "",
      inventory_quantity: 0,
      tags: "",
    },
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const generateHandle = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleAddProduct = async (data: ProductFormData) => {
    setIsSubmitting(true);
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      const handle = data.handle || generateHandle(data.title);
      const tags = data.tags ? data.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [];

      // Create product
      const { data: productData, error: productError } = await supabase
        .from("products")
        .insert({
          user_id: userData.user.id,
          shopify_id: `manual-${Date.now()}`,
          title: data.title,
          handle: handle,
          product_type: data.product_type || null,
          vendor: data.vendor || null,
          status: data.status,
          tags: tags.length > 0 ? tags : null,
        })
        .select()
        .single();

      if (productError) throw productError;

      // Create product variant
      const { error: variantError } = await supabase
        .from("product_variants")
        .insert({
          product_id: productData.id,
          shopify_variant_id: `manual-variant-${Date.now()}`,
          title: "Default Title",
          price: data.price,
          compare_at_price: data.compare_at_price || null,
          inventory_quantity: data.inventory_quantity,
          sku: data.sku || null,
        });

      if (variantError) throw variantError;

      toast({
        title: "Success",
        description: "Product added successfully",
      });

      form.reset();
      setShowAddProductDialog(false);
      await fetchProducts();

    } catch (error: any) {
      console.error("Error adding product:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add product",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectProduct = (productId: string, checked: boolean) => {
    if (checked) {
      setSelectedProducts([...selectedProducts, productId]);
    } else {
      setSelectedProducts(selectedProducts.filter(id => id !== productId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProducts(filteredProducts.map(p => p.id));
    } else {
      setSelectedProducts([]);
    }
  };

  const handleImportProducts = async () => {
    setImporting(true);
    
    try {
      // Get the current user session for the callback
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Please log in to import products');
      }

      console.log('Starting Shopify import process...');

      // Store user session for callback handling
      sessionStorage.setItem('shopify-import-session', session.access_token);

      // Generate OAuth parameters
      const scopes = 'read_products,read_inventory';
      const state = Math.random().toString(36).substring(7);
      
      // Store state for verification
      sessionStorage.setItem('shopify-oauth-state', state);

      // Use direct Shopify OAuth URL - let users enter their shop domain
      const shopDomain = prompt('Enter your Shopify shop domain (e.g., "mystore" for mystore.myshopify.com):');
      if (!shopDomain) {
        setImporting(false);
        return;
      }

      // Get API key from environment via a simple approach
      const { data: keyData, error: keyError } = await supabase.functions.invoke('shopify-oauth', {
        body: { action: 'get-api-key' },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (keyError || !keyData?.apiKey) {
        throw new Error('Shopify API key not configured. Please ensure SHOPIFY_API_KEY secret is set.');
      }

      const redirectUri = `${window.location.origin}/auth/shopify/callback`;
      console.log('Using redirect URI:', redirectUri);

      // Redirect to Shopify OAuth
      const authUrl = `https://${shopDomain}.myshopify.com/admin/oauth/authorize?` +
        `client_id=${keyData.apiKey}&` +
        `scope=${scopes}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `state=${state}`;

      console.log('Redirecting to:', authUrl);
      window.location.href = authUrl;

    } catch (error: any) {
      console.error('OAuth error:', error);
      toast({
        title: "Import Error",
        description: error.message || "Failed to start Shopify import",
        variant: "destructive",
      });
      setImporting(false);
    }
  };

  const getInventoryDisplay = (product: Product) => {
    if (!product.variants || product.variants.length === 0) {
      return "Inventory not tracked";
    }
    
    const totalInventory = product.variants.reduce((sum, variant) => sum + (variant.inventory_quantity || 0), 0);
    const variantCount = product.variants.length;
    
    if (totalInventory === 0) {
      return "0 in stock";
    }
    
    if (variantCount > 1) {
      return `${totalInventory} in stock for ${variantCount} variants`;
    }
    
    return `${totalInventory} in stock`;
  };

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
            variant="outline"
            className="flex items-center gap-2"
            onClick={handleImportProducts}
            disabled={loading || importing}
          >
            <Store className="w-4 h-4" />
            {importing ? "Importing..." : "Import Products"}
          </Button>
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

      {/* Products Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedProducts.length === filteredProducts.length && filteredProducts.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Inventory</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Vendor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.map((product) => (
              <TableRow key={product.id}>
                <TableCell>
                  <Checkbox
                    checked={selectedProducts.includes(product.id)}
                    onCheckedChange={(checked) => handleSelectProduct(product.id, !!checked)}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                      {product.images && product.images[0] ? (
                        <img
                          src={product.images[0].src}
                          alt={product.title}
                          className="w-10 h-10 object-cover rounded"
                        />
                      ) : (
                        <Package className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium">{product.title}</div>
                      <div className="text-sm text-muted-foreground">{product.handle}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      product.status === "active" 
                        ? "default" 
                        : product.status === "draft" 
                        ? "secondary" 
                        : "outline"
                    }
                  >
                    {product.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {getInventoryDisplay(product)}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">{product.product_type || "-"}</div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">{product.vendor || "-"}</div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Product</DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleAddProduct)} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Product Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter product title" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="handle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Handle (URL)</FormLabel>
                      <FormControl>
                        <Input placeholder="auto-generated-if-empty" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="archived">Archived</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="product_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product Type</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., T-Shirt, Snowboard" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="vendor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vendor</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Your Brand" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01"
                          placeholder="0.00" 
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="compare_at_price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Compare at Price (optional)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01"
                          placeholder="0.00" 
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="inventory_quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Inventory Quantity</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          placeholder="0" 
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sku"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SKU</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., TSH-001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tags"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Tags</FormLabel>
                      <FormControl>
                        <Input placeholder="tag1, tag2, tag3" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowAddProductDialog(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  {isSubmitting ? "Adding..." : "Add Product"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyProducts;