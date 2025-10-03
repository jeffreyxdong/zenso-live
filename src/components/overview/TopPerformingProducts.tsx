import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface TopProduct {
  id: string;
  handle: string;
  title: string;
  visibility_score: number;
  mention_count: number;
}

interface TopPerformingProductsProps {
  storeId: string;
}

const TopPerformingProducts = ({ storeId }: TopPerformingProductsProps) => {
  const [products, setProducts] = useState<TopProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (storeId) {
      fetchTopProducts();
    }
  }, [storeId]);

  const fetchTopProducts = async () => {
    try {
      setIsLoading(true);
      
      // Get products for this store with their latest visibility scores
      const { data: products, error } = await supabase
        .from('products')
        .select('id, handle, title, visibility_score')
        .eq('store_id', storeId)
        .eq('status', 'active')
        .not('visibility_score', 'is', null)
        .order('visibility_score', { ascending: false })
        .limit(5);

      if (error) throw error;

      // For each product, count AI mentions from prompt responses
      const productsWithMentions = await Promise.all(
        (products || []).map(async (product) => {
          const { count } = await supabase
            .from('prompt_responses_with_prompts')
            .select('*', { count: 'exact', head: true })
            .eq('product_id', product.id);

          return {
            ...product,
            mention_count: count || 0
          };
        })
      );

      setProducts(productsWithMentions);
    } catch (error) {
      console.error('Error fetching top products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Top Performing Products
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px]">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Top Performing Products
        </CardTitle>
      </CardHeader>
      <CardContent>
        {products.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No product data available yet
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Product Name</TableHead>
                <TableHead className="text-right">Visibility Score</TableHead>
                <TableHead className="text-right">AI Mentions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.handle}</TableCell>
                  <TableCell>{product.title}</TableCell>
                  <TableCell className="text-right">
                    <span className="font-semibold text-primary">
                      {product.visibility_score}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">{product.mention_count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default TopPerformingProducts;
