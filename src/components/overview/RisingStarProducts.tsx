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
import { Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface RisingProduct {
  id: string;
  title: string;
  current_score: number;
  change_percent: number;
}

interface RisingStarProductsProps {
  storeId: string;
}

const RisingStarProducts = ({ storeId }: RisingStarProductsProps) => {
  const [products, setProducts] = useState<RisingProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (storeId) {
      fetchRisingProducts();
    }
  }, [storeId]);

  const fetchRisingProducts = async () => {
    try {
      setIsLoading(true);
      
      // Get all products for this store
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, title')
        .eq('store_id', storeId)
        .eq('status', 'active');

      if (productsError) throw productsError;

      if (!products || products.length === 0) {
        setProducts([]);
        setIsLoading(false);
        return;
      }

      // Calculate changes for each product
      const productsWithChanges = await Promise.all(
        products.map(async (product) => {
          // Get the last 2 days of scores
          const { data: scores, error: scoresError } = await supabase
            .from('product_scores')
            .select('visibility_score, created_at')
            .eq('product_id', product.id)
            .not('visibility_score', 'is', null)
            .order('created_at', { ascending: false })
            .limit(2);

          if (scoresError || !scores || scores.length < 2) {
            return null;
          }

          const currentScore = scores[0].visibility_score;
          const previousScore = scores[1].visibility_score;
          
          if (!currentScore || !previousScore || previousScore === 0) {
            return null;
          }

          const changePercent = ((currentScore - previousScore) / previousScore) * 100;

          // Only include products with positive growth
          if (changePercent > 0) {
            return {
              id: product.id,
              title: product.title,
              current_score: currentScore,
              change_percent: changePercent
            };
          }

          return null;
        })
      );

      // Filter out nulls and sort by change percentage
      const risingProducts = productsWithChanges
        .filter((p): p is RisingProduct => p !== null)
        .sort((a, b) => b.change_percent - a.change_percent)
        .slice(0, 5);

      setProducts(risingProducts);
    } catch (error) {
      console.error('Error fetching rising products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="min-h-[280px]">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Rising Star Products
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
    <Card className="min-h-[280px]">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Rising Star Products
        </CardTitle>
      </CardHeader>
      <CardContent>
        {products.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No rising products detected yet
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product Name</TableHead>
                <TableHead className="text-right">% Change</TableHead>
                <TableHead className="text-right">Current Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.title}</TableCell>
                  <TableCell className="text-right">
                    <span className="text-success font-semibold">
                      +{product.change_percent.toFixed(1)}%
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {product.current_score}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default RisingStarProducts;
