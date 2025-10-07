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

// ---- Types ----
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

// ---- Utils ----
const generateScoreHistoryFromData = (
  scoresData: any[],
  scoreField: "visibility_score" | "sentiment_score" | "position_score",
) => {
  const data = [];
  const today = new Date();
  const scoreMap = new Map();
  scoresData.forEach((score) => {
    const dateKey = new Date(score.created_at).toDateString();
    scoreMap.set(dateKey, score[scoreField] || 0);
  });

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateKey = date.toDateString();
    const value =
      scoreMap.get(dateKey) ||
      (i === 0 && scoresData.length > 0 ? scoresData[scoresData.length - 1][scoreField] : null);
    data.push({ date: date.toISOString().split("T")[0], value });
  }
  return data;
};

const parseSources = (sourcesFinal: any[]): Source[] => {
  const domainCounts = new Map<string, number>();
  sourcesFinal.forEach((item: any) => {
    const domain = typeof item === "string" ? item : item.domain || item.name || "Unknown";
    domainCounts.set(domain, (domainCounts.get(domain) || 0) + 1);
  });
  const total = sourcesFinal.length;
  return Array.from(domainCounts.entries()).map(([domain, count]) => ({
    domain,
    used_percentage: Math.round((count / total) * 100),
    avg_citations: count,
    type: "Other",
    is_own_domain: false,
  }));
};

// ---- Component ----
const ProductOverview = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { activeStore } = useOutletContext<{
    activeStore: { id: string; name: string; website: string; is_active: boolean } | null;
  }>();

  const [product, setProduct] = useState<Product | null>(null);

  // Loading states per section
  const [loading, setLoading] = useState(true);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [recommendationsLoading, setRecommendationsLoading] = useState(true);
  const [sourcesLoading, setSourcesLoading] = useState(true);

  const [showPreview, setShowPreview] = useState(false);
  const [previewContent, setPreviewContent] = useState("");
  const [previewType, setPreviewType] = useState("");

  useEffect(() => {
    if (!productId) return;
    let mounted = true;

    // --- Step 1: Initial Load ---
    const loadProduct = async () => {
      try {
        const { data: base } = await supabase.from("products").select("*").eq("id", productId).maybeSingle();

        if (!mounted || !base) return;

        setProduct({
          ...base,
          visibilityHistory: [],
          sentimentHistory: [],
          positionHistory: [],
          sources: [],
          recommendations: [],
          suggestions: [],
          currentMetrics: {
            visibility: "Low",
            sentiment: "Neutral",
            position: 10,
            visibilityScore: 0,
            sentimentScore: 0,
            positionScore: 0,
          },
        });
      } catch (e) {
        toast({ title: "Error", description: "Failed to fetch product", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    loadProduct();

    // --- Step 2: Scores / Metrics ---
    const loadScores = async () => {
      const { data } = await supabase
        .from("product_scores")
        .select("*")
        .eq("product_id", productId)
        .order("created_at", { ascending: true });

      if (!mounted) return;

      if (data?.length) {
        const latest = data[data.length - 1];
        setProduct(
          (prev) =>
            prev && {
              ...prev,
              visibility_score: latest.visibility_score,
              sentiment_score: latest.sentiment_score,
              position_score: latest.position_score,
              visibilityHistory: generateScoreHistoryFromData(data, "visibility_score"),
              sentimentHistory: generateScoreHistoryFromData(data, "sentiment_score"),
              positionHistory: generateScoreHistoryFromData(data, "position_score"),
              currentMetrics: {
                visibility: latest.visibility_score >= 80 ? "High" : latest.visibility_score >= 60 ? "Medium" : "Low",
                sentiment:
                  latest.sentiment_score >= 70 ? "Positive" : latest.sentiment_score >= 30 ? "Neutral" : "Negative",
                position: latest.position_score,
                visibilityScore: latest.visibility_score,
                sentimentScore: latest.sentiment_score,
                positionScore: latest.position_score,
              },
            },
        );
      }

      setMetricsLoading(false);
    };

    loadScores();

    // --- Step 3: Recommendations ---
    const loadRecs = async () => {
      const { data } = await supabase
        .from("product_recommendations")
        .select("*")
        .eq("product_id", productId)
        .order("created_at", { ascending: false });

      if (!mounted) return;
      setProduct((prev) => prev && { ...prev, recommendations: data || [] });
      setRecommendationsLoading(false);
    };

    loadRecs();

    // --- Step 4: Sources ---
    const loadSources = async () => {
      const { data: prompts } = await supabase.from("prompts").select("id").eq("product_id", productId).limit(1);

      if (prompts?.length) {
        const { data: responses } = await supabase
          .from("prompt_responses")
          .select("sources_final")
          .eq("prompt_id", prompts[0].id)
          .order("created_at", { ascending: false })
          .limit(1);

        if (responses?.length && responses[0].sources_final) {
          const parsed = parseSources(responses[0].sources_final);
          setProduct((prev) => prev && { ...prev, sources: parsed });
        }
      }

      setSourcesLoading(false);
    };

    loadSources();

    // --- Step 5: Realtime Subscriptions ---
    const scoreSub = supabase
      .channel(`product-scores-${productId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "product_scores", filter: `product_id=eq.${productId}` },
        (payload) => {
          const newScore = payload.new;
          setMetricsLoading(false);
          setProduct(
            (prev) =>
              prev && {
                ...prev,
                visibility_score: newScore.visibility_score,
                sentiment_score: newScore.sentiment_score,
                position_score: newScore.position_score,
                currentMetrics: {
                  visibility:
                    newScore.visibility_score >= 80 ? "High" : newScore.visibility_score >= 60 ? "Medium" : "Low",
                  sentiment:
                    newScore.sentiment_score >= 70
                      ? "Positive"
                      : newScore.sentiment_score >= 30
                        ? "Neutral"
                        : "Negative",
                  position: newScore.position_score,
                  visibilityScore: newScore.visibility_score,
                  sentimentScore: newScore.sentiment_score,
                  positionScore: newScore.position_score,
                },
              },
          );
        },
      )
      .subscribe();

    const recSub = supabase
      .channel(`product-recs-${productId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "product_recommendations", filter: `product_id=eq.${productId}` },
        () => loadRecs(),
      )
      .subscribe();

    const sourceSub = supabase
      .channel(`prompt-responses-${productId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "prompt_responses" }, () => loadSources())
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(scoreSub);
      supabase.removeChannel(recSub);
      supabase.removeChannel(sourceSub);
    };
  }, [productId]);

  // ---- Render ----
  if (loading || !product) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading product details...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/dashboard?tab=products-overview")}
          className="hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Products
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">{product.title}</h1>
        <Badge variant={product.status === "active" ? "default" : "secondary"} className="capitalize">
          {product.status}
        </Badge>
      </div>

      {/* Metrics */}
      <ProductMetrics
        metrics={product.currentMetrics}
        visibilityLoading={metricsLoading}
        sentimentLoading={metricsLoading}
        positionLoading={metricsLoading}
      />

      {/* Charts */}
      <ProductCharts
        visibilityData={product.visibilityHistory}
        sentimentData={product.sentimentHistory}
        positionData={product.positionHistory}
        visibilityLoading={metricsLoading}
        sentimentLoading={metricsLoading}
        positionLoading={metricsLoading}
      />

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" /> AI Optimization Suggestions
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {recommendationsLoading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p>Generating AI optimization suggestions...</p>
            </div>
          ) : product.recommendations?.length ? (
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
                          View product page <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">No AI optimization recommendations yet.</div>
          )}
        </CardContent>
      </Card>

      {/* Sources */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" /> Sources
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sourcesLoading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p>Loading source data...</p>
            </div>
          ) : product.sources?.length ? (
            <div className="flex flex-wrap gap-3">
              {product.sources.map((source, index) => {
                const displayName = source.domain.replace(
                  /\.(com|org|net|io|co|edu|gov|uk|us|ca|au|de|fr|jp|cn|in)$/i,
                  "",
                );
                return (
                  <div
                    key={index}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border bg-card hover:bg-accent transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                      <img
                        src={`https://www.google.com/s2/favicons?domain=${source.domain}&sz=32`}
                        alt={`${source.domain} icon`}
                        className="w-5 h-5"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = "none";
                          const parent = target.parentElement;
                          if (parent) {
                            parent.innerHTML = `<span class="text-sm font-semibold text-primary">${displayName.charAt(0).toUpperCase()}</span>`;
                          }
                        }}
                      />
                    </div>
                    <span className="font-medium text-sm capitalize">{displayName}</span>
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
