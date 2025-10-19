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
import { toZonedTime, format as formatTz } from "date-fns-tz";

// Interfaces
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
  shopify_id: string;
  product_type?: string;
  vendor?: string;
  created_at: string;
  visibility_score?: number;
  sentiment_score?: number;
  position_score?: number;
  visibilityHistory: { date: string; value: number }[];
  sentimentHistory: { date: string; value: number }[];
  positionHistory: { date: string; value: number }[];
  suggestions: Suggestion[];
  sources: Source[];
  recommendations?: Recommendation[];
  currentMetrics: {
    visibility: "High" | "Medium" | "Low";
    sentiment: "Positive" | "Neutral" | "Negative";
    position: number;
    visibilityScore: number;
    sentimentScore: number;
    positionScore: number;
  };
}

// Helper to convert UTC date to user's local date string
const getLocalDateString = (utcDate: Date, userTimeZone: string): string => {
  const zonedDate = toZonedTime(utcDate, userTimeZone);
  return formatTz(zonedDate, "yyyy-MM-dd", { timeZone: userTimeZone });
};

const generateScoreHistoryFromData = (
  scores: any[],
  field: "visibility_score" | "sentiment_score" | "position_score",
  productCreatedAt: string,
) => {
  // Get user's timezone
  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  // Convert to user's local timezone
  const today = new Date();
  const localToday = toZonedTime(today, userTimeZone);
  localToday.setHours(0, 0, 0, 0);
  
  const productCreationDateUTC = new Date(productCreatedAt);
  const productCreationDate = toZonedTime(productCreationDateUTC, userTimeZone);
  productCreationDate.setHours(0, 0, 0, 0);
  
  // Calculate the end of the initial 7-day window (creation date + 6 days)
  const initialWindowEnd = new Date(productCreationDate);
  initialWindowEnd.setDate(productCreationDate.getDate() + 6);
  const initialWindowEndStr = formatTz(initialWindowEnd, "yyyy-MM-dd", { timeZone: userTimeZone });
  
  // Sort scores by date
  const sorted = [...(scores || [])].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  
  // Find the latest date in the available data
  let latestDataDate = "";
  sorted.forEach(score => {
    if (score[field] != null) {
      const utcDate = new Date(score.created_at);
      const dateKey = getLocalDateString(utcDate, userTimeZone);
      if (dateKey > latestDataDate) {
        latestDataDate = dateKey;
      }
    }
  });
  
  const result = [];
  
  // If we have data beyond the initial 7-day window, show rolling window
  // Otherwise, show creation date + 6 future days
  if (latestDataDate > initialWindowEndStr) {
    // Show from product creation date + 6 future days in user's timezone
    // Create a map of local date -> score for quick lookup
    const scoreMap = new Map<string, number>();
    sorted.forEach(score => {
      const utcDate = new Date(score.created_at);
      const dateKey = getLocalDateString(utcDate, userTimeZone);
      if (score[field] != null) {
        scoreMap.set(dateKey, score[field]);
      }
    });
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(productCreationDate);
      date.setDate(productCreationDate.getDate() + i);
      const dateKey = formatTz(date, "yyyy-MM-dd", { timeZone: userTimeZone });
      
      result.push({
        date: dateKey,
        value: scoreMap.get(dateKey) ?? null,
      });
    }
  } else {
    // Show most recent 7 days of actual data (rolling window)
    // Group scores by date and take the most recent score for each day
    const scoresByDate = new Map<string, number>();
    
    sorted.forEach(score => {
      if (score[field] != null) {
        const utcDate = new Date(score.created_at);
        const dateKey = getLocalDateString(utcDate, userTimeZone);
        // Keep the most recent score for each date (later scores overwrite)
        scoresByDate.set(dateKey, score[field]);
      }
    });
    
    // Get all dates sorted, then take the most recent 7
    const allDates = Array.from(scoresByDate.keys()).sort();
    const recentDates = allDates.slice(-7);
    
    recentDates.forEach(dateKey => {
      result.push({
        date: dateKey,
        value: scoresByDate.get(dateKey) ?? null,
      });
    });
  }
  
  return result;
};

const ProductOverview = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { activeStore } = useOutletContext<{
    activeStore: { id: string; name: string; website: string; is_active: boolean } | null;
  }>();

  // State
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [visibilityScoreLoading, setVisibilityScoreLoading] = useState(true);
  const [sentimentScoreLoading, setSentimentScoreLoading] = useState(true);
  const [positionScoreLoading, setPositionScoreLoading] = useState(true);
  const [visibilityTrendLoading, setVisibilityTrendLoading] = useState(true);
  const [sentimentTrendLoading, setSentimentTrendLoading] = useState(true);
  const [positionTrendLoading, setPositionTrendLoading] = useState(true);
  const [recommendationsLoading, setRecommendationsLoading] = useState(true);
  const [sourcesLoading, setSourcesLoading] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [previewContent, setPreviewContent] = useState("");
  const [previewType, setPreviewType] = useState<string>("");

  // --- Initial Fetch ---
  useEffect(() => {
    if (!productId) return;

    let mounted = true;

    const fetchInitialData = async () => {
      setLoading(true);

      try {
        const { data: productData, error: productError } = await supabase
          .from("products")
          .select("*")
          .eq("id", productId)
          .maybeSingle();

        if (productError || !productData) throw productError;

        const { data: scores } = await supabase
          .from("product_scores")
          .select("*")
          .eq("product_id", productId)
          .order("created_at", { ascending: true });

        const { data: recs } = await supabase
          .from("product_recommendations")
          .select("*")
          .eq("product_id", productId)
          .order("created_at", { ascending: false });

        const { data: prompts } = await supabase.from("prompts").select("id").eq("product_id", productId).limit(1);

        let sources: Source[] = [];
        if (prompts?.length) {
          const { data: responses } = await supabase
            .from("prompt_responses")
            .select("sources_final")
            .eq("prompt_id", prompts[0].id)
            .order("created_at", { ascending: false })
            .limit(1);

        if (responses?.[0]?.sources_final) {
            const raw = responses[0].sources_final as any[];
            const counts = new Map<string, number>();
            raw.forEach((r: any) => {
              const domain = typeof r === "string" ? r : r.domain || "Unknown";
              counts.set(domain, (counts.get(domain) || 0) + 1);
            });
            const total = raw.length;
            sources = Array.from(counts.entries()).map(([domain, count]) => ({
              domain,
              used_percentage: Math.round((count / total) * 100),
              avg_citations: count,
              type: "Other",
              is_own_domain: false,
            }));
          }
        }

        if (!mounted) return;

        const latest = scores?.[scores.length - 1];
        const visibilityScore = latest?.visibility_score ?? 0;
        const sentimentScore = latest?.sentiment_score ?? 0;
        const positionScore = latest?.position_score ?? 0;

        const getVisibilityLevel = (s: number) => (s >= 80 ? "High" : s >= 60 ? "Medium" : "Low");
        const getSentimentLevel = (s: number) => (s >= 70 ? "Positive" : s >= 30 ? "Neutral" : "Negative");

        const updatedProduct: Product = {
          ...(productData as any),
          visibilityHistory: generateScoreHistoryFromData(scores || [], "visibility_score", productData.created_at),
          sentimentHistory: generateScoreHistoryFromData(scores || [], "sentiment_score", productData.created_at),
          positionHistory: generateScoreHistoryFromData(scores || [], "position_score", productData.created_at),
          suggestions: [],
          sources,
          recommendations: (recs || []) as Recommendation[],
          currentMetrics: {
            visibility: getVisibilityLevel(visibilityScore),
            sentiment: getSentimentLevel(sentimentScore),
            position: positionScore ?? 0,
            visibilityScore,
            sentimentScore,
            positionScore: positionScore ?? 0,
          },
        };

        setProduct(updatedProduct);
        
        // Keep loading states true if scores are 0 or null until real data arrives
        const visLoading = visibilityScore == null || visibilityScore === 0;
        const sentLoading = sentimentScore == null || sentimentScore === 0;
        const posLoading = positionScore == null || positionScore === 0;
        const visHistLoading = !scores?.length || scores.every(s => s.visibility_score == null || s.visibility_score === 0);
        const sentHistLoading = !scores?.length || scores.every(s => s.sentiment_score == null || s.sentiment_score === 0);
        const posHistLoading = !scores?.length || scores.every(s => s.position_score == null || s.position_score === 0);
        
        console.log('📊 Initial loading states:', {
          visibilityScore,
          sentimentScore,
          positionScore,
          scoresCount: scores?.length || 0,
          visLoading,
          sentLoading,
          posLoading,
          visHistLoading,
          sentHistLoading,
          posHistLoading
        });
        
        setVisibilityScoreLoading(visLoading);
        setSentimentScoreLoading(sentLoading);
        setPositionScoreLoading(posLoading);
        setVisibilityTrendLoading(visHistLoading);
        setSentimentTrendLoading(sentHistLoading);
        setPositionTrendLoading(posHistLoading);
        setRecommendationsLoading(!recs?.length);
        setSourcesLoading(!sources?.length);
      } catch (e) {
        console.error(e);
        toast({
          title: "Error loading product",
          description: "Failed to fetch product data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();

    // --- Realtime updates ---
    const scoreSub = supabase
      .channel(`scores-${productId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "product_scores", filter: `product_id=eq.${productId}` },
        async (payload) => {
          const newScore = payload.new as any;
          if (!newScore) return;
          
          // Refetch all scores to update the charts
          const { data: updatedScores } = await supabase
            .from("product_scores")
            .select("*")
            .eq("product_id", productId)
            .order("created_at", { ascending: true });
          
          console.log('🔄 Realtime score update received:', {
            visibility: newScore.visibility_score,
            sentiment: newScore.sentiment_score,
            position: newScore.position_score,
            scoresCount: updatedScores?.length || 0
          });
          
          setProduct((prev) =>
            prev
              ? {
                  ...prev,
                  visibility_score: newScore.visibility_score,
                  sentiment_score: newScore.sentiment_score,
                  position_score: newScore.position_score,
                  visibilityHistory: generateScoreHistoryFromData(updatedScores || [], "visibility_score", prev.created_at),
                  sentimentHistory: generateScoreHistoryFromData(updatedScores || [], "sentiment_score", prev.created_at),
                  positionHistory: generateScoreHistoryFromData(updatedScores || [], "position_score", prev.created_at),
                  currentMetrics: {
                    ...prev.currentMetrics,
                    visibilityScore: newScore.visibility_score,
                    sentimentScore: newScore.sentiment_score,
                    positionScore: newScore.position_score,
                  },
                }
              : prev,
          );
          
          // Only stop loading if we have real scores (not null or 0)
          if (newScore.visibility_score != null && newScore.visibility_score > 0) {
            console.log('✅ Stopping visibility loading (score:', newScore.visibility_score, ')');
            setVisibilityScoreLoading(false);
            setVisibilityTrendLoading(false);
          } else {
            console.log('⏳ Keeping visibility loading (score:', newScore.visibility_score, ')');
          }
          
          if (newScore.sentiment_score != null && newScore.sentiment_score > 0) {
            console.log('✅ Stopping sentiment loading (score:', newScore.sentiment_score, ')');
            setSentimentScoreLoading(false);
            setSentimentTrendLoading(false);
          } else {
            console.log('⏳ Keeping sentiment loading (score:', newScore.sentiment_score, ')');
          }
          
          if (newScore.position_score != null && newScore.position_score > 0) {
            console.log('✅ Stopping position loading (score:', newScore.position_score, ')');
            setPositionScoreLoading(false);
            setPositionTrendLoading(false);
          } else {
            console.log('⏳ Keeping position loading (score:', newScore.position_score, ')');
          }
        },
      )
      .subscribe();

    const recSub = supabase
      .channel(`recs-${productId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "product_recommendations", filter: `product_id=eq.${productId}` },
        async () => {
          const { data: recs } = await supabase
            .from("product_recommendations")
            .select("*")
            .eq("product_id", productId)
            .order("created_at", { ascending: false });
          console.log('📝 Recommendations updated:', recs?.length || 0, 'recommendations');
          setProduct((p) => (p ? { ...p, recommendations: (recs || []) as Recommendation[] } : p));
          if (recs && recs.length > 0) {
            console.log('✅ Stopping recommendations loading');
            setRecommendationsLoading(false);
          }
        },
      )
      .subscribe();

    const sourceSub = supabase
      .channel(`sources-${productId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "prompt_responses" }, async () => {
        const { data: prompts } = await supabase.from("prompts").select("id").eq("product_id", productId).limit(1);
        if (!prompts?.length) return;
        const { data: responses } = await supabase
          .from("prompt_responses")
          .select("sources_final")
          .eq("prompt_id", prompts[0].id)
          .order("created_at", { ascending: false })
          .limit(1);

        if (responses?.[0]?.sources_final) {
          const raw = responses[0].sources_final as any[];
          const counts = new Map<string, number>();
          raw.forEach((r: any) => {
            const domain = typeof r === "string" ? r : r.domain || "Unknown";
            counts.set(domain, (counts.get(domain) || 0) + 1);
          });
          const total = raw.length;
          const sources = Array.from(counts.entries()).map(([domain, count]) => ({
            domain,
            used_percentage: Math.round((count / total) * 100),
            avg_citations: count,
            type: "Other",
            is_own_domain: false,
          }));

          setProduct((p) => (p ? { ...p, sources } : p));
          setSourcesLoading(false);
        }
      })
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(scoreSub);
      supabase.removeChannel(recSub);
      supabase.removeChannel(sourceSub);
    };
  }, [productId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading product details...</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Product not found</div>
      </div>
    );
  }

  // === UI (unchanged) ===
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/dashboard?tab=products-overview")}
          className="hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Products
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{product.title}</h1>
        </div>
        <Badge variant={product.status === "active" ? "default" : "secondary"} className="capitalize">
          {product.status}
        </Badge>
      </div>

      <ProductMetrics
        metrics={product.currentMetrics}
        visibilityLoading={visibilityScoreLoading}
        sentimentLoading={sentimentScoreLoading}
        positionLoading={positionScoreLoading}
      />

      <ProductCharts
        visibilityData={product.visibilityHistory}
        sentimentData={product.sentimentHistory}
        positionData={product.positionHistory}
        visibilityLoading={visibilityTrendLoading}
        sentimentLoading={sentimentTrendLoading}
        positionLoading={positionTrendLoading}
      />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" />
              AI Optimization Suggestions
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {recommendationsLoading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              <div className="text-center space-y-2">
                <p className="font-medium">Generating AI Optimization Suggestions...</p>
                <p className="text-sm text-muted-foreground">This may take a moment</p>
              </div>
            </div>
          ) : product.recommendations && product.recommendations.length > 0 && product.recommendations[0].title === "Error" ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                Product page could not be found or accessed. Please ensure your product has a valid public URL.
              </p>
            </div>
          ) : product.recommendations && product.recommendations.length > 0 ? (
            <div className="space-y-4">
              {product.recommendations.map((rec) => (
                <div key={rec.id} className="p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{rec.title}</h3>
                        <Badge
                          variant={
                            rec.impact === "high" ? "default" : rec.impact === "medium" ? "secondary" : "outline"
                          }
                          className="capitalize"
                        >
                          {rec.impact} Impact
                        </Badge>
                        <Badge variant="outline" className="capitalize">
                          {rec.effort} Effort
                        </Badge>
                        <Badge variant="outline" className="capitalize">
                          {rec.category}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{rec.description}</p>
                      {rec.pdp_url && (
                        <a
                          href={rec.pdp_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline flex items-center gap-1"
                        >
                          View product page
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                No AI optimization recommendations yet. Generate recommendations to improve your product's visibility in
                AI-powered search.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Sources
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sourcesLoading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              <div className="text-center space-y-2">
                <p className="font-medium">Loading Source Data...</p>
                <p className="text-sm text-muted-foreground">This may take a moment</p>
              </div>
            </div>
          ) : product.sources && product.sources.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {product.sources.map((source, i) => {
                const name = source.domain.replace(/\.(com|org|net|io|co|edu|gov)$/i, "");
                return (
                  <div
                    key={i}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border bg-card hover:bg-accent transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                      <img
                        src={`https://www.google.com/s2/favicons?domain=${source.domain}&sz=32`}
                        alt={source.domain}
                        className="w-5 h-5"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = "none";
                          const parent = target.parentElement;
                          if (parent) {
                            parent.innerHTML = `<span class='text-sm font-semibold text-primary'>${name.charAt(0).toUpperCase()}</span>`;
                          }
                        }}
                      />
                    </div>
                    <span className="font-medium text-sm capitalize">{name}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">No source data available yet</div>
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
