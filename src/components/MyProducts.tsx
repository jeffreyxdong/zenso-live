import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Store, Package, Download, Plus, Search, CheckCircle, AlertCircle, Image, Trash2, MoreVertical, Eye, TrendingUp, MapPin, Heart } from "lucide-react";
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
  visibility_score?: number;
  sentiment_score?: number;
  position_score?: number;
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

interface Store {
  id: string;
  name: string;
  website: string;
  is_active: boolean;
}

interface MyProductsProps {
  activeStore: Store | null;
  onProductClick?: (productId: string) => void;
}

const productSchema = z.object({
  title: z.string().min(1, "Product title is required"),
  handle: z.string().optional(),
  tags: z.string().optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

const MyProducts = ({ activeStore, onProductClick }: MyProductsProps) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddProductDialog, setShowAddProductDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showProductDetail, setShowProductDetail] = useState(false);

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      title: "",
      handle: "",
      tags: "",
    },
  });

  useEffect(() => {
    fetchProducts();
  }, [activeStore]);

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
        if (!activeStore?.id) {
          throw new Error('No active store selected');
        }

        const handle = data.handle || generateHandle(data.title);
        const tags = data.tags ? data.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [];

        // Create product
        const { data: productData, error: productError } = await supabase
          .from("products")
          .insert({
            user_id: userData.user.id,
            store_id: activeStore.id,
            shopify_id: `manual-${Date.now()}`,
            title: data.title,
            handle: handle,
            product_type: null,
            vendor: null,
            status: "active",
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
          price: 0,
          compare_at_price: null,
          inventory_quantity: 0,
          sku: null,
        });

      if (variantError) throw variantError;

      // Generate buyer-intent prompts and responses for the new product
      try {
        const { data: session } = await supabase.auth.getSession();
        if (session?.session) {
          const authHeaders = {
            Authorization: `Bearer ${session.session.access_token}`,
          };

          // Step 1: Generate buyer-intent prompts
          console.log('Generating buyer-intent prompts...');
          await supabase.functions.invoke('generate-buyer-intent-prompts', {
            body: {
              productId: productData.id,
              storeId: activeStore.id,
              productTitle: data.title,
              productType: null,
              vendor: null,
              tags: tags
            },
            headers: authHeaders,
          });

          // Step 2: Generate responses for the prompts
          console.log('Generating responses for prompts...');
          await supabase.functions.invoke('generate-buyer-intent-outputs', {
            body: {
              productId: productData.id,
            },
            headers: authHeaders,
          });

          // Step 3: Score the responses
          console.log('Scoring the generated responses...');
          await supabase.functions.invoke('score-buyer-intent-outputs', {
            body: {
              productId: productData.id,
              productTitle: data.title,
            },
            headers: authHeaders,
          });

          console.log('Buyer-intent analysis pipeline completed successfully');
        }
      } catch (promptError) {
        console.error('Error in buyer-intent analysis pipeline:', promptError);
        // Don't block product creation if analysis pipeline fails
      }

      toast({
        title: "Success",
        description: "Product added successfully with buyer-intent prompts generated",
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
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Please log in to import products');
      }

      console.log('Starting Shopify import process...');
      
      // First check if user has existing shop connection
      const { data: existingShopData, error: shopCheckError } = await supabase.functions.invoke('shopify-oauth', {
        body: { action: 'check-existing-shop' },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (shopCheckError) {
        throw new Error(`Failed to check existing shop: ${shopCheckError.message}`);
      }

      // If user has existing shop, use stored token to import
      if (existingShopData.hasExistingShop) {
        console.log('Using existing shop connection...');
        const { data: importResult, error: importError } = await supabase.functions.invoke('shopify-oauth', {
          body: { action: 'import-with-existing-token' },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (importError) {
          throw new Error(`Import failed: ${importError.message}`);
        }

        // Refresh products and show success
        fetchProducts();
        setImporting(false);
        
        toast({
          title: "Success",
          description: `✅ Products imported successfully! Imported: ${importResult.imported}, Skipped: ${importResult.skipped}`,
        });
        return;
      }

      // Get active store from Supabase instead of prompting user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data: activeStore, error: storeError } = await supabase
        .from('stores')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (storeError) {
        throw new Error(`Failed to get active store: ${storeError.message}`);
      }

      if (!activeStore) {
        throw new Error('No active store found. Please add a store first.');
      }

      // Extract shop domain from website URL
      let shopDomain = '';
      try {
        const websiteUrl = activeStore.website;
        if (websiteUrl.includes('myshopify.com')) {
          // Extract domain from myshopify.com URL
          const match = websiteUrl.match(/https?:\/\/([^.]+)\.myshopify\.com/);
          if (match) {
            shopDomain = match[1];
          }
        } else {
          // For custom domains, use the store name as fallback
          shopDomain = activeStore.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        }
      } catch (error) {
        console.error('Error parsing store website:', error);
        shopDomain = activeStore.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      }

      if (!shopDomain) {
        throw new Error(`Could not determine shop domain from store website: ${activeStore.website}. Please ensure your store website is a valid Shopify URL.`);
      }

      console.log('Using shop domain from active store:', shopDomain);

      // Get API key from backend
      const { data: keyData, error: keyError } = await supabase.functions.invoke('shopify-oauth', {
        body: { action: 'get-api-key' },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      console.log('API key response:', { keyData, keyError });

      if (keyError || !keyData?.apiKey) {
        throw new Error('Shopify API key not configured. Please ensure SHOPIFY_API_KEY secret is set.');
      }

      // Generate CSRF state token for security
      const state = Math.random().toString(36).substring(2, 15) + 
                   Math.random().toString(36).substring(2, 15);
      
      console.log('Generated state:', state);
      
      // Store state and session for verification
      sessionStorage.setItem('shopify_oauth_state', state);
      sessionStorage.setItem('shopify_session_token', session.access_token);

      // Use the correct preview URL format for redirect
      const redirectUri = `https://id-preview--e8261a88-908d-4b6a-b764-a02dcc966558.lovable.app/auth/shopify/callback`;
      const scopes = 'read_products,read_inventory';

      // Build OAuth URL
      const authUrl = `https://${shopDomain}.myshopify.com/admin/oauth/authorize?` +
        `client_id=${keyData.apiKey}&` +
        `scope=${scopes}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `state=${state}`;

      console.log('OAuth URL:', authUrl);
      console.log('Redirect URI:', redirectUri);

      console.log('Opening Shopify OAuth popup...');

      // Open popup window for OAuth
      const popup = window.open(
        authUrl,
        'shopify-oauth',
        'width=600,height=700,scrollbars=yes,resizable=yes,status=yes'
      );

      console.log('Popup opened:', !!popup);

      if (!popup) {
        throw new Error('Popup blocked. Please allow popups for this site and try again.');
      }

      // Listen for success message from popup
      const messageHandler = (event: MessageEvent) => {
        if (event.data?.type === 'shopify-import-complete') {
          console.log('Received import complete message', event.data);
          popup?.close();
          window.removeEventListener('message', messageHandler);
          
          // Refresh the products list
          fetchProducts();
          setImporting(false);
          
          toast({
            title: "Success",
            description: `✅ Products imported successfully! Imported: ${event.data.imported}, Skipped: ${event.data.skipped}`,
          });
        } else if (event.data?.type === 'shopify-import-error') {
          console.log('Received import error message', event.data);
          popup?.close();
          window.removeEventListener('message', messageHandler);
          setImporting(false);
          
          toast({
            title: "Import Error", 
            description: "❌ Import failed.",
            variant: "destructive",
          });
        }
      };

      window.addEventListener('message', messageHandler);

      // Check if popup was closed manually
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          window.removeEventListener('message', messageHandler);
          setImporting(false);
        }
      }, 1000);

    } catch (error: any) {
      console.error('Import error:', error);
      toast({
        title: "Import Error",
        description: error.message,
        variant: "destructive",
      });
      setImporting(false);
    }
  };

  const handleDeleteProducts = async (productIds: string[]) => {
    setIsDeleting(true);
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      // Delete variants first (due to foreign key constraint)
      const { error: variantError } = await supabase
        .from("product_variants")
        .delete()
        .in("product_id", productIds);

      if (variantError) throw variantError;

      // Delete products
      const { error: productError } = await supabase
        .from("products")
        .delete()
        .in("id", productIds)
        .eq("user_id", userData.user.id);

      if (productError) throw productError;

      toast({
        title: "Success",
        description: `${productIds.length} product(s) deleted successfully`,
      });

      // Reset selection and refresh
      setSelectedProducts([]);
      setProductToDelete(null);
      setShowDeleteDialog(false);
      await fetchProducts();

    } catch (error: any) {
      console.error("Error deleting products:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete products",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteSingle = (productId: string) => {
    setProductToDelete(productId);
    setShowDeleteDialog(true);
  };

  const handleDeleteSelected = () => {
    if (selectedProducts.length > 0) {
      setProductToDelete(null);
      setShowDeleteDialog(true);
    }
  };

  const confirmDelete = () => {
    const idsToDelete = productToDelete ? [productToDelete] : selectedProducts;
    handleDeleteProducts(idsToDelete);
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

  const getVisibilityBadge = (score?: number) => {
    if (!score) return <Badge variant="outline">No Data</Badge>;
    if (score >= 80) return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">High</Badge>;
    if (score >= 60) return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Medium</Badge>;
    return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Low</Badge>;
  };

  const getSentimentBadge = (score?: number) => {
    if (!score) return <Badge variant="outline">No Data</Badge>;
    if (score >= 70) return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Positive</Badge>;
    if (score >= 30) return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Neutral</Badge>;
    return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Negative</Badge>;
  };

  const handleProductClick = (product: Product) => {
    if (onProductClick) {
      onProductClick(product.id);
    } else {
      setSelectedProduct(product);
      setShowProductDetail(true);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!activeStore?.id) {
        setProducts([]);
        setLoading(false);
        return;
      }

      const { data: productsData, error } = await supabase
        .from("products")
        .select(`
          *,
          variants:product_variants(*)
        `)
        .eq("user_id", userData.user.id)
        .eq("store_id", activeStore.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch the latest scores for each product from product_scores table
      const productsWithScores = await Promise.all((productsData || []).map(async (product) => {
        const { data: latestScore } = await supabase
          .from("product_scores")
          .select("visibility_score, sentiment_score, position_score")
          .eq("product_id", product.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        return {
          ...product,
          visibility_score: latestScore?.visibility_score || product.visibility_score,
          sentiment_score: latestScore?.sentiment_score || product.sentiment_score,
          position_score: latestScore?.position_score || product.position_score,
        };
      }));

      setProducts(productsWithScores);
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

      {/* Search and Bulk Actions */}
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
        {selectedProducts.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleDeleteSelected}
            className="flex items-center gap-2 text-destructive hover:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
            Delete Selected ({selectedProducts.length})
          </Button>
        )}
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
              <TableHead>
                <div className="flex items-center gap-2">
                  Product
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Eye className="w-3 h-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Click any product row to view detailed analytics</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Visibility</TableHead>
              <TableHead>Sentiment</TableHead>
              <TableHead>Position</TableHead>
              <TableHead className="w-12">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.map((product) => (
              <TooltipProvider key={product.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <TableRow 
                      className="cursor-pointer hover:bg-muted/50 hover:shadow-md transition-all duration-200 group"
                      onClick={() => handleProductClick(product)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
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
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{product.title}</span>
                              <Eye className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
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
                        {getVisibilityBadge(product.visibility_score)}
                      </TableCell>
                      <TableCell>
                        {getSentimentBadge(product.sentiment_score)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            {product.position_score ? `#${product.position_score}` : 'No Data'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleDeleteSingle(product.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Product
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>Click to view detailed analytics and performance metrics</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Products</AlertDialogTitle>
            <AlertDialogDescription>
              {productToDelete 
                ? "Are you sure you want to delete this product? This action cannot be undone."
                : `Are you sure you want to delete ${selectedProducts.length} selected products? This action cannot be undone.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Product Detail Dialog */}
      <Dialog open={showProductDetail} onOpenChange={setShowProductDetail}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Product Details
            </DialogTitle>
          </DialogHeader>
          
          {selectedProduct && (
            <div className="space-y-6">
              {/* Product Info */}
              <div className="flex gap-4">
                <div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center">
                  {selectedProduct.images && selectedProduct.images[0] ? (
                    <img
                      src={selectedProduct.images[0].src}
                      alt={selectedProduct.title}
                      className="w-20 h-20 object-cover rounded-lg"
                    />
                  ) : (
                    <Package className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold">{selectedProduct.title}</h3>
                  <p className="text-muted-foreground">{selectedProduct.handle}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge
                      variant={
                        selectedProduct.status === "active" 
                          ? "default" 
                          : selectedProduct.status === "draft" 
                          ? "secondary" 
                          : "outline"
                      }
                    >
                      {selectedProduct.status}
                    </Badge>
                    {selectedProduct.product_type && (
                      <Badge variant="outline">{selectedProduct.product_type}</Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Eye className="w-4 h-4 text-blue-600" />
                      <span className="font-medium">Visibility</span>
                    </div>
                    <div className="text-2xl font-bold mb-1">
                      {selectedProduct.visibility_score || 'N/A'}%
                    </div>
                    {getVisibilityBadge(selectedProduct.visibility_score)}
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Heart className="w-4 h-4 text-pink-600" />
                      <span className="font-medium">Sentiment</span>
                    </div>
                    <div className="text-2xl font-bold mb-1">
                      {selectedProduct.sentiment_score || 'N/A'}%
                    </div>
                    {getSentimentBadge(selectedProduct.sentiment_score)}
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="w-4 h-4 text-green-600" />
                      <span className="font-medium">Position</span>
                    </div>
                    <div className="text-2xl font-bold mb-1">
                      #{selectedProduct.position_score || 'N/A'}
                    </div>
                    <Badge variant="outline">Search Ranking</Badge>
                  </CardContent>
                </Card>
              </div>

              {/* Product Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3">Product Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">SKU:</span>
                      <span>{selectedProduct.variants?.[0]?.sku || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Price:</span>
                      <span>${selectedProduct.variants?.[0]?.price || '0.00'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Inventory:</span>
                      <span>{getInventoryDisplay(selectedProduct)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Vendor:</span>
                      <span>{selectedProduct.vendor || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Created:</span>
                      <span>{new Date(selectedProduct.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Performance Metrics</h4>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Brand Visibility</span>
                        <span>{selectedProduct.visibility_score}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${selectedProduct.visibility_score || 0}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Sentiment Score</span>
                        <span>{selectedProduct.sentiment_score}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-pink-600 h-2 rounded-full" 
                          style={{ width: `${selectedProduct.sentiment_score || 0}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tags */}
              {selectedProduct.tags && selectedProduct.tags.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedProduct.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyProducts;