import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useOutletContext } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Globe, Search, ExternalLink, Loader2 } from "lucide-react";
import ProductMetrics from "@/components/ProductMetrics";
import ProductCharts from "@/components/ProductCharts";
import PreviewModal from "@/components/PreviewModal";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

// --- Data interfaces ---
interface Source {
  domain: string;
  used_percentage: number;
  avg_citations: number;
  type: string;
  is_own_domain?: boolean;
}

interface Recommendation {
  id: string;
  title: string;
  description: string;
  category: "content" | "schema" | "technical" | "branding";
  impact: "high" | "medium" | "low";
  effort: "high" | "medium" | "low";
  pdp_url?: string;
  status: "pending" | "in_progress" | "completed" | "dismissed";
  created_at: string;
}

interface Suggestion {
  id: string;
  title: string;
  description: string;
  type: "content" | "schema" | "faq" | "description";
  estimatedImpact: "High" | "Medium" | "Low";
  status: "pending" | "applied" | "generating";
}

interface Product {
  id: string;
  title: string;
  handle: string;
  status: "active" | "draft" | "archived";
  created_at: string;
  visibility_score?: number;
  sentiment_score?: number;
  position_score?: number;
  visibilityHistory: { date: string; value: number }[];
  sentimentHistory: { date: string; value: number }[];
  positionHistory: { date: string; value: number }[];
  sources: Source[];
  recommendations?: Recommendation[];
  suggestions: Suggestion[];
  currentMetrics: {
    visibility: "High" | "Medium" | "Low";
    sentiment: "Positive" | "Neutral" | "Negative";
    position: number;
    visibilityScore: number;
    sentimentScore: number;
    positionScore: number;
  };
}

// --- Utility: generate history from scores ---
const generateScoreHistoryFromData = (
  scoresData: any[],
  scoreField: "visibility_score" | "sentiment_score" | "position_score",
) => {
  const data = [];
  const today = new Date();
  const scoreMap = new Map();
  scoresData.forEach((s) => scoreMap.set(new Date(s.created_at).toDateString(), s[scoreField] || 0));

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const key = date.toDateString();
    data.push({ date: date.toISOString().split("T")[0], value: scoreMap.get(key) || null });
  }
  return data;
};

// --- Utility: mock suggestions ---
const generateMockSuggestions = (productTitle: string): Suggestion[] => {
  return [
    {
      id: "s1",
      title: "Add Product Schema Markup",
      description: "Implement structured data markup to enhance visibility in search results",
      type: "schema",
      estimatedImpact: "High",
      status: "pending",
    },
    {
      id: "s2",
      title: "Generate FAQ Section",
      description: "Add product-specific FAQs to increase long-tail discoverability",
      type: "faq",
      estimatedImpact: "Medium",
      status: "pending",
    },
  ];
};

// --- Component ---
const ProductOverview = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { activeStore } = useOutletContext<{
    activeStore: { id: string; name: string; website: string; is_active: boolean } | null;
  }>();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewContent, setPreviewContent] = useState("");
  const [previewType, setPreviewType] = useState("");

  // --- Fetch product ---
  useEffect(() => {
    const fetchProduct = async () => {
      if (!productId) return;

      setLoading(true);
      try {
        const { data: userData } = await supabase.auth.getUser();
        const { data: productData } = await supabase
          .from("products")
          .select("*")
          .eq("id", productId)
          .eq("user_id", userData.user.id)
          .single();

        if (!productData) throw new Error("Product not found");

        // Fetch last 7 days of scores
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const { data: scoresData } = await supabase
          .from("product_scores")
          .select("*")
          .eq("product_id", productId)
          .gte("created_at", sevenDaysAgo.toISOString())
          .order("created_at", { ascending: true });

        const latestScore = scoresData?.[scoresData.length - 1];
        const visibilityScore = latestScore?.visibility_score || productData.visibility_score || 0;
        const sentimentScore = latestScore?.sentiment_score || productData.sentiment_score || 0;
        const positionScore = latestScore?.position_score || productData.position_score || 0;

        const getVisibilityLevel = (v: number) => (v >= 80 ? "High" : v >= 60 ? "Medium" : "Low");
        const getSentimentLevel = (v: number) => (v >= 70 ? "Positive" : v >= 30 ? "Neutral" : "Negative");

        const visibilityHistory = generateScoreHistoryFromData(scoresData || [], "visibility_score");
        const sentimentHistory = generateScoreHistoryFromData(scoresData || [], "sentiment_score");
        const positionHistory = generateScoreHistoryFromData(scoresData || [], "position_score");

        const { data: recsData } = await supabase
          .from("product_recommendations")
          .select("*")
          .eq("product_id", productId)
          .order("created_at", { ascending: false });

        const enhanced: Product = {
          ...productData,
          visibilityHistory,
          sentimentHistory,
          positionHistory,
          sources: [],
          suggestions: generateMockSuggestions(productData.title),
          recommendations: recsData || [],
          currentMetrics: {
            visibility: getVisibilityLevel(visibilityScore),
            sentiment: getSentimentLevel(sentimentScore),
            position: positionScore,
            visibilityScore,
            sentimentScore,
            positionScore,
          },
        };

        setProduct(enhanced);
        setMetricsLoading(!visibilityScore || !sentimentScore || !positionScore);
      } catch (err) {
        toast({ title: "Error", description: "Failed to fetch product", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [productId]);

  // --- Realtime subscriptions (auto-updates) ---
  useEffect(() => {
    if (!productId) return;

    const productsSub = supabase
      .channel(`products-${productId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "products", filter: `id=eq.${productId}` },
        (payload) => {
          const updated = payload.new;
          if (!updated) return;

          setMetricsLoading(false);
          setProduct((prev) =>
            prev
              ? {
                  ...prev,
                  visibility_score: updated.visibility_score,
                  sentiment_score: updated.sentiment_score,
                  position_score: updated.position_score,
                  currentMetrics: {
                    visibility:
                      updated.visibility_score >= 80 ? "High" : updated.visibility_score >= 60 ? "Medium" : "Low",
                    sentiment:
                      updated.sentiment_score >= 70
                        ? "Positive"
                        : updated.sentiment_score >= 30
                          ? "Neutral"
                          : "Negative",
                    position: updated.position_score,
                    visibilityScore: updated.visibility_score,
                    sentimentScore: updated.sentiment_score,
                    positionScore: updated.position_score,
                  },
                }
              : null,
          );
        },
      )
      .subscribe();

    const scoresSub = supabase
      .channel(`product-scores-${productId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "product_scores", filter: `product_id=eq.${productId}` },
        (payload) => {
          const s = payload.new;
          if (!s) return;
          setMetricsLoading(false);
          setProduct((prev) =>
            prev
              ? {
                  ...prev,
                  visibility_score: s.visibility_score,
                  sentiment_score: s.sentiment_score,
                  position_score: s.position_score,
                  currentMetrics: {
                    visibility: s.visibility_score >= 80 ? "High" : s.visibility_score >= 60 ? "Medium" : "Low",
                    sentiment: s.sentiment_score >= 70 ? "Positive" : s.sentiment_score >= 30 ? "Neutral" : "Negative",
                    position: s.position_score,
                    visibilityScore: s.visibility_score,
                    sentimentScore: s.sentiment_score,
                    positionScore: s.position_score,
                  },
                }
              : null,
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(productsSub);
      supabase.removeChannel(scoresSub);
    };
  }, [productId]);

  // --- Render ---
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-muted-foreground">
        Loading product details...
      </div>
    );
  }

  if (!product) {
    return <div className="flex items-center justify-center min-h-screen text-muted-foreground">Product not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard?tab=products-overview")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Products
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{product.title}</h1>
        <Badge className="capitalize">{product.status}</Badge>
      </div>

      {metricsLoading ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Calculating product metrics...</p>
          </CardContent>
        </Card>
      ) : (
        <ProductMetrics metrics={product.currentMetrics} />
      )}

      <ProductCharts
        visibilityData={product.visibilityHistory}
        sentimentData={product.sentimentHistory}
        positionData={product.positionHistory}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" /> AI Optimization Suggestions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recommendationsLoading ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p>Generating AI recommendations...</p>
            </div>
          ) : product.recommendations?.length ? (
            product.recommendations.map((rec) => (
              <div key={rec.id} className="p-4 border rounded-lg mb-3 hover:bg-accent/50">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold">{rec.title}</h3>
                  <Badge variant={rec.impact === "high" ? "default" : "secondary"}>{rec.impact} Impact</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{rec.description}</p>
                {rec.pdp_url && (
                  <a
                    href={rec.pdp_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary flex items-center gap-1 mt-1"
                  >
                    View product page <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            ))
          ) : (
            <p className="text-center text-muted-foreground py-8">No recommendations yet.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" /> Sources
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sourcesLoading ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p>Loading sources...</p>
            </div>
          ) : product.sources.length ? (
            <div className="flex flex-wrap gap-3">
              {product.sources.map((s, i) => (
                <div key={i} className="px-3 py-2 border rounded-lg bg-card text-sm">
                  {s.domain} ({s.used_percentage}%)
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No source data yet.</p>
          )}
        </CardContent>
      </Card>

      <PreviewModal
        open={showPreview}
        onOpenChange={setShowPreview}
        content={previewContent}
        type={previewType}
        onApply={() => setShowPreview(false)}
      />
    </div>
  );
};

export default ProductOverview;
