import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useOutletContext } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Globe, Search, ExternalLink, Loader2, FileText, List, Code } from "lucide-react";
import ProductMetrics from "@/components/ProductMetrics";
import ProductCharts from "@/components/ProductCharts";
import SuggestionsList from "@/components/SuggestionsList";
import PreviewModal from "@/components/PreviewModal";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

// Data types
interface Source {
  domain: string;
  used_percentage: number;
  avg_citations: number;
  type: string;
  is_own_domain?: boolean;
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

interface PDPContent {
  url: string;
  title: string;
  metaDescription: string;
  description: string;
  bullets: string[];
  schema: any;
  images: string[];
  price: string;
  extractedAt: string;
}

// Generate historical data from actual product scores database records
const generateScoreHistoryFromData = (scoresData: any[], scoreField: 'visibility_score' | 'sentiment_score' | 'position_score') => {
  const data = [];
  const today = new Date();
  
  // Create a map of dates to scores for easy lookup
  const scoreMap = new Map();
  scoresData.forEach(score => {
    const dateKey = new Date(score.created_at).toDateString();
    scoreMap.set(dateKey, score[scoreField] || 0);
  });
  
  // Generate 7 days of data
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateKey = date.toDateString();
    
    const value = scoreMap.get(dateKey) || (i === 0 && scoresData.length > 0 ? scoresData[scoresData.length - 1][scoreField] : null);
    
    data.push({
      date: date.toISOString().split('T')[0],
      value: value
    });
  }
  
  return data;
};

// Generate historical data based on actual scores
const generateHistoricalData = (currentScore: number | null, type: 'visibility' | 'sentiment' | 'position', createdAt: string) => {
  const data = [];
  const today = new Date();
  const createdDate = new Date(createdAt);
  const daysSinceCreated = Math.floor((today.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
  
  // Always generate 7 days of x-axis data
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    let value: number | null = null;
    
    // If product was created within the last 2 days, show rise from 0
    if (daysSinceCreated <= 2) {
      const actualScore = currentScore || 0;
      let finalValue: number;
      
      // Apply constraints based on type to get the final target value
      if (type === 'visibility') {
        finalValue = Math.max(0, Math.min(100, actualScore));
      } else if (type === 'sentiment') {
        finalValue = Math.max(0, Math.min(10, actualScore));
      } else if (type === 'position') {
        finalValue = Math.max(1, Math.min(20, actualScore || 5));
      } else {
        finalValue = actualScore;
      }
      
      // Calculate how many days ago the product was created relative to current loop date
      const daysSinceCreatedFromCurrentDate = Math.floor((date.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysSinceCreatedFromCurrentDate < -1) {
        // Days before the day prior to creation - no data
        value = null;
      } else if (daysSinceCreatedFromCurrentDate === -1) {
        // Day before creation - start from 0 (or baseline for position)
        if (type === 'position') {
          value = 20; // High baseline for position since lower is better
        } else {
          value = 0;
        }
      } else if (daysSinceCreatedFromCurrentDate >= 0) {
        // Creation day onwards - show actual score
        value = finalValue;
      }
    } else {
      // For older products, generate historical data
      let baseValue = currentScore || 0;
      if (!currentScore) {
        baseValue = type === 'visibility' ? 50 : type === 'sentiment' ? 5 : 5;
      }
      
      let variance = type === 'visibility' ? 15 : type === 'sentiment' ? 1 : 2;
      
      if (i === 0) {
        // Use actual score for today
        value = baseValue;
      } else {
        // Generate realistic historical variation
        const variation = (Math.random() - 0.5) * variance;
        value = baseValue + variation;
      }
      
      // Apply constraints based on type
      if (type === 'visibility') {
        value = Math.max(0, Math.min(100, Math.round(value)));
      } else if (type === 'sentiment') {
        value = Math.max(0, Math.min(10, Math.round(value * 10) / 10));
      } else if (type === 'position') {
        value = Math.max(1, Math.min(20, Math.round(value)));
      }
    }
    
    data.push({
      date: date.toISOString().split('T')[0],
      value: value
    });
  }
  
  return data;
};

// Mock suggestions generator
const generateMockSuggestions = (productTitle: string): Suggestion[] => {
  const baseTitle = productTitle.toLowerCase();
  const suggestions: Suggestion[] = [];
  
  if (baseTitle.includes('headphones') || baseTitle.includes('audio')) {
    suggestions.push({
      id: "s1",
      title: "Highlight Audio Features",
      description: "Add technical specifications like frequency response, driver size, and audio codec support",
      type: "description",
      estimatedImpact: "High",
      status: "pending"
    });
  }
  
  if (baseTitle.includes('organic') || baseTitle.includes('eco') || baseTitle.includes('sustainable')) {
    suggestions.push({
      id: "s2",
      title: "Add Sustainability Certifications",
      description: "Include eco-certifications and sustainable material information",
      type: "description",
      estimatedImpact: "High",
      status: "pending"
    });
  }
  
  suggestions.push(
    {
      id: "s3",
      title: "Generate FAQ Section",
      description: "Create comprehensive FAQ covering shipping, warranty, and compatibility questions",
      type: "faq",
      estimatedImpact: "Medium",
      status: "pending"
    },
    {
      id: "s4",
      title: "Add Product Schema Markup",
      description: "Implement structured data markup to enhance visibility in search results",
      type: "schema",
      estimatedImpact: "High",
      status: "pending"
    }
  );
  
  return suggestions;
};

const ProductOverview = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { activeStore } = useOutletContext<{ activeStore: { id: string; name: string; website: string; is_active: boolean } | null }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewContent, setPreviewContent] = useState("");
  const [previewType, setPreviewType] = useState<string>("");
  const [pdpUrl, setPdpUrl] = useState<string | null>(null);
  const [pdpContent, setPdpContent] = useState<PDPContent | null>(null);
  const [pdpLoading, setPdpLoading] = useState(false);
  const [pdpFetching, setPdpFetching] = useState(false);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [sourcesLoading, setSourcesLoading] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!productId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;

        // Fetch the actual product from Supabase
        const { data: productData, error: productError } = await supabase
          .from("products")
          .select("*")
          .eq("id", productId)
          .eq("user_id", userData.user.id)
          .single();

        if (productError) throw productError;

        // Fetch the most recent 7 days of product scores
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { data: scoresData, error: scoresError } = await supabase
          .from("product_scores")
          .select("*")
          .eq("product_id", productId)
          .gte("created_at", sevenDaysAgo.toISOString())
          .order("created_at", { ascending: true });

        if (scoresError) {
          console.error("Error fetching scores:", scoresError);
        }

        // Fetch prompts for this product to get their responses
        const { data: promptsData, error: promptsError } = await supabase
          .from("prompts")
          .select("id")
          .eq("product_id", productId)
          .limit(1);

        if (promptsError) {
          console.error("Error fetching prompts:", promptsError);
        }

        // Fetch recommendations for this product
        const { data: recommendationsData, error: recommendationsError } = await supabase
          .from("product_recommendations")
          .select("*")
          .eq("product_id", productId)
          .order("created_at", { ascending: false });

        if (recommendationsError) {
          console.error("Error fetching recommendations:", recommendationsError);
        }

        // Fetch prompt responses to get sources_final using the prompt ID
        let promptResponsesData = null;
        if (promptsData && promptsData.length > 0) {
          const { data, error: promptResponsesError } = await supabase
            .from("prompt_responses")
            .select("sources_final")
            .eq("prompt_id", promptsData[0].id)
            .order("created_at", { ascending: false })
            .limit(1);

          if (promptResponsesError) {
            console.error("Error fetching prompt responses:", promptResponsesError);
          } else {
            promptResponsesData = data;
          }
        }

        // Parse sources from sources_final
        let sources: Source[] = [];
        if (promptResponsesData && promptResponsesData.length > 0 && promptResponsesData[0].sources_final) {
          const sourcesFinal = promptResponsesData[0].sources_final as any;
          if (Array.isArray(sourcesFinal)) {
            // sources_final is an array of domain strings
            const domainCounts = new Map<string, number>();
            sourcesFinal.forEach((item: any) => {
              const domain = typeof item === 'string' ? item : (item.domain || item.name || "Unknown");
              domainCounts.set(domain, (domainCounts.get(domain) || 0) + 1);
            });
            
            const totalSources = sourcesFinal.length;
            sources = Array.from(domainCounts.entries()).map(([domain, count]) => ({
              domain: domain,
              used_percentage: Math.round((count / totalSources) * 100),
              avg_citations: count,
              type: "Other",
              is_own_domain: false
            }));
          }
        }

        // Check if sources are loading (no sources yet)
        if (sources.length === 0) {
          setSourcesLoading(true);
        } else {
          setSourcesLoading(false);
        }

        // Check if recommendations are loading (no recommendations yet)
        if (!recommendationsData || recommendationsData.length === 0) {
          setRecommendationsLoading(true);
        } else {
          setRecommendationsLoading(false);
        }

        // Use the latest scores or fallback to product table scores
        const latestScore = scoresData && scoresData.length > 0 ? scoresData[scoresData.length - 1] : null;
        const visibilityScore = latestScore?.visibility_score || productData.visibility_score || 0;
        const sentimentScore = latestScore?.sentiment_score || productData.sentiment_score || 0;
        const positionScore = latestScore?.position_score || productData.position_score || 0;
        
        // Convert scores to display formats using consistent thresholds
        const getVisibilityLevel = (score: number): "High" | "Medium" | "Low" => {
          if (score >= 80) return "High";
          if (score >= 60) return "Medium";
          return "Low";
        };
        
        const getSentimentLevel = (score: number): "Positive" | "Neutral" | "Negative" => {
          if (score >= 70) return "Positive";
          if (score >= 30) return "Neutral";
          return "Negative";
        };

        // For newly created products (within 2 days), always show progression from 0
        const createdDate = new Date(productData.created_at);
        const today = new Date();
        const daysSinceCreated = Math.floor((today.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
        const isNewProduct = daysSinceCreated <= 2;

        // Generate history data - for new products, show progression even with real data
        const visibilityHistory = isNewProduct 
          ? generateHistoricalData(visibilityScore, 'visibility', productData.created_at)
          : (scoresData && scoresData.length > 0 
              ? generateScoreHistoryFromData(scoresData, 'visibility_score')
              : generateHistoricalData(visibilityScore, 'visibility', productData.created_at));
          
        const sentimentHistory = isNewProduct
          ? generateHistoricalData(sentimentScore, 'sentiment', productData.created_at) 
          : (scoresData && scoresData.length > 0
              ? generateScoreHistoryFromData(scoresData, 'sentiment_score') 
              : generateHistoricalData(sentimentScore, 'sentiment', productData.created_at));
          
        const positionHistory = isNewProduct
          ? generateHistoricalData(positionScore, 'position', productData.created_at)
          : (scoresData && scoresData.length > 0
              ? generateScoreHistoryFromData(scoresData, 'position_score')
              : generateHistoricalData(positionScore, 'position', productData.created_at));
        
        const enhancedProduct: Product = {
          ...productData,
          status: (productData.status as "active" | "draft" | "archived") || "active",
          visibilityHistory,
          sentimentHistory, 
          positionHistory,
          suggestions: generateMockSuggestions(productData.title),
          sources,
          recommendations: (recommendationsData as Recommendation[]) || [],
          currentMetrics: {
            visibility: getVisibilityLevel(visibilityScore),
            sentiment: getSentimentLevel(sentimentScore),
            position: positionScore || 5,
            visibilityScore: visibilityScore,
            sentimentScore: sentimentScore,
            positionScore: positionScore || 5
          }
        };

        setProduct(enhancedProduct);
        
        // Check if metrics are still loading (null scores indicate processing)
        if (visibilityScore === 0 || sentimentScore === 0 || positionScore === 0) {
          setMetricsLoading(true);
        }

        // Set up polling fallback for metrics (every 3 seconds while loading)
        const metricsInterval = setInterval(async () => {
          if (metricsLoading) {
            const { data: updatedProductData } = await supabase
              .from("products")
              .select("*")
              .eq("id", productId)
              .single();
            
            if (updatedProductData && 
                updatedProductData.visibility_score !== null &&
                updatedProductData.sentiment_score !== null &&
                updatedProductData.position_score !== null) {
              setMetricsLoading(false);
              clearInterval(metricsInterval);
            }
          }
        }, 3000);

        // Set up real-time subscription to listen for score updates
        const scoresSubscription = supabase
          .channel('product-scores-changes')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'product_scores',
              filter: `product_id=eq.${productId}`
            },
            async (payload) => {
              console.log('Product scores updated:', payload);
              // Refetch product data
              const { data: updatedProductData } = await supabase
                .from("products")
                .select("*")
                .eq("id", productId)
                .single();
              
              if (updatedProductData && 
                  updatedProductData.visibility_score !== null &&
                  updatedProductData.sentiment_score !== null &&
                  updatedProductData.position_score !== null) {
                setMetricsLoading(false);
                // Update product with new scores
                setProduct(prev => prev ? {
                  ...prev,
                  visibility_score: updatedProductData.visibility_score,
                  sentiment_score: updatedProductData.sentiment_score,
                  position_score: updatedProductData.position_score,
                  currentMetrics: {
                    ...prev.currentMetrics,
                    visibilityScore: updatedProductData.visibility_score || 0,
                    sentimentScore: updatedProductData.sentiment_score || 0,
                    positionScore: updatedProductData.position_score || 0
                  }
                } : null);
              }
            }
          )
          .subscribe();

        // Set up polling fallback for recommendations (every 3 seconds while loading)
        const recsInterval = setInterval(async () => {
          if (recommendationsLoading) {
            const { data: updatedRecs } = await supabase
              .from("product_recommendations")
              .select("*")
              .eq("product_id", productId)
              .order("created_at", { ascending: false });
            
            if (updatedRecs && updatedRecs.length > 0) {
              setRecommendationsLoading(false);
              clearInterval(recsInterval);
              setProduct(prev => prev ? {
                ...prev,
                recommendations: updatedRecs as Recommendation[]
              } : null);
            }
          }
        }, 3000);

        // Set up polling fallback for sources (every 3 seconds while loading)
        const sourcesInterval = setInterval(async () => {
          if (sourcesLoading) {
            const { data: promptsData } = await supabase
              .from("prompts")
              .select("id")
              .eq("product_id", productId)
              .limit(1);

            if (promptsData && promptsData.length > 0) {
              const { data, error: promptResponsesError } = await supabase
                .from("prompt_responses")
                .select("sources_final")
                .eq("prompt_id", promptsData[0].id)
                .order("created_at", { ascending: false })
                .limit(1);

              if (!promptResponsesError && data && data.length > 0 && data[0].sources_final) {
                const sourcesFinal = data[0].sources_final as any;
                if (Array.isArray(sourcesFinal) && sourcesFinal.length > 0) {
                  setSourcesLoading(false);
                  clearInterval(sourcesInterval);
                  
                  // Parse and update sources
                  const domainCounts = new Map<string, number>();
                  sourcesFinal.forEach((item: any) => {
                    const domain = typeof item === 'string' ? item : (item.domain || item.name || "Unknown");
                    domainCounts.set(domain, (domainCounts.get(domain) || 0) + 1);
                  });
                  
                  const totalSources = sourcesFinal.length;
                  const parsedSources = Array.from(domainCounts.entries()).map(([domain, count]) => ({
                    domain: domain,
                    used_percentage: Math.round((count / totalSources) * 100),
                    avg_citations: count,
                    type: "Other",
                    is_own_domain: false
                  }));

                  setProduct(prev => prev ? {
                    ...prev,
                    sources: parsedSources
                  } : null);
                }
              }
            }
          }
        }, 3000);

        // Set up real-time subscription for recommendations
        const recommendationsSubscription = supabase
          .channel('product-recommendations-changes')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'product_recommendations',
              filter: `product_id=eq.${productId}`
            },
            async (payload) => {
              console.log('Recommendations updated:', payload);
              setRecommendationsLoading(false);
              // Refetch recommendations
              const { data: updatedRecs } = await supabase
                .from("product_recommendations")
                .select("*")
                .eq("product_id", productId)
                .order("created_at", { ascending: false });
              
              if (updatedRecs) {
                setProduct(prev => prev ? {
                  ...prev,
                  recommendations: updatedRecs as Recommendation[]
                } : null);
              }
            }
          )
          .subscribe();

        // Cleanup subscriptions and intervals on unmount
        return () => {
          clearInterval(metricsInterval);
          clearInterval(recsInterval);
          clearInterval(sourcesInterval);
          scoresSubscription.unsubscribe();
          recommendationsSubscription.unsubscribe();
        };
      } catch (error: any) {
        console.error("Error fetching product:", error);
        toast({
          title: "Error",
          description: "Failed to fetch product data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [productId]);

  const handleGenerateContent = async (suggestion: Suggestion) => {
    // Mock AI content generation
    const mockContent = {
      description: `
# Enhanced Product Description

## Key Features
• **Premium Sound Quality**: Advanced 40mm drivers deliver rich, detailed audio
• **30-Hour Battery Life**: All-day listening with quick charge capability
• **Active Noise Cancellation**: Block out distractions for immersive audio
• **Comfort Fit**: Soft ear cushions and adjustable headband for extended wear
• **Universal Compatibility**: Works with all Bluetooth-enabled devices

## Perfect For
- Music enthusiasts seeking studio-quality sound
- Travelers needing noise cancellation
- Professionals working from home
- Gamers wanting immersive audio experiences
      `,
      faq: `
# Frequently Asked Questions

**Q: What's the battery life?**
A: Up to 30 hours of playback time, with quick charge providing 3 hours of use in 10 minutes.

**Q: Are these compatible with my device?**
A: Yes, these headphones work with any Bluetooth-enabled device including phones, tablets, and computers.

**Q: What's included in the box?**
A: Headphones, USB-C charging cable, 3.5mm audio cable, carrying case, and user manual.

**Q: What's the warranty?**
A: 2-year manufacturer warranty covering defects and normal wear.
      `,
      schema: `
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Wireless Bluetooth Headphones - Premium Sound Quality",
  "description": "Premium wireless headphones with active noise cancellation",
  "brand": {
    "@type": "Brand", 
    "name": "Your Brand"
  },
  "offers": {
    "@type": "Offer",
    "price": "199.99",
    "priceCurrency": "USD",
    "availability": "https://schema.org/InStock"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.5",
    "reviewCount": "127"
  }
}
      `,
      content: `
# Use Case Scenarios

## For Music Lovers
Experience your favorite tracks like never before with studio-grade sound quality that brings out every detail in your music.

## For Travelers  
Block out airplane noise and crying babies with our advanced active noise cancellation technology.

## For Gamers
Immerse yourself in your games with precise audio positioning and crystal-clear communication.

## For Remote Workers
Stay focused during calls with noise cancellation and enjoy music during breaks without disturbing others.
      `
    };

    setPreviewContent(mockContent[suggestion.type as keyof typeof mockContent]);
    setPreviewType(suggestion.type);
    setShowPreview(true);
  };

  const handleApplyContent = (suggestionId: string) => {
    if (product) {
      const updatedSuggestions = product.suggestions.map(s => 
        s.id === suggestionId ? { ...s, status: "applied" as const } : s
      );
      setProduct({ ...product, suggestions: updatedSuggestions });
    }
    setShowPreview(false);
    console.log("Applied content to store for suggestion:", suggestionId);
  };

  const handleGenerateRecommendations = async () => {
    if (!product) return;

    setRecommendationsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-pdp-recommendations', {
        body: { productId: product.id }
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Recommendations Generated",
          description: `Generated ${data.recommendationsCount} AI optimization recommendations`,
        });
        
        // Refresh product data to show new recommendations
        window.location.reload();
      } else {
        toast({
          title: "No Recommendations",
          description: data?.message || "Could not generate recommendations",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error generating recommendations:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate recommendations",
        variant: "destructive",
      });
    } finally {
      setRecommendationsLoading(false);
    }
  };

  const handleUpdateRecommendationStatus = async (recommendationId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("product_recommendations")
        .update({ status: newStatus })
        .eq("id", recommendationId);

      if (error) throw error;

      // Update local state
      if (product) {
        const updatedRecommendations = product.recommendations?.map(rec =>
          rec.id === recommendationId ? { ...rec, status: newStatus as any } : rec
        );
        setProduct({ ...product, recommendations: updatedRecommendations });
      }

      toast({
        title: "Status Updated",
        description: "Recommendation status updated successfully",
      });
    } catch (error: any) {
      console.error("Error updating recommendation:", error);
      toast({
        title: "Error",
        description: "Failed to update recommendation status",
        variant: "destructive",
      });
    }
  };

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
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Products
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{product.title}</h1>
        </div>
        <Badge 
          variant={product.status === "active" ? "default" : "secondary"}
          className="capitalize"
        >
          {product.status}
        </Badge>
      </div>

      {/* Metrics Cards */}
      {metricsLoading ? (
        <Card>
          <CardContent className="p-12">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              <div className="text-center space-y-2">
                <p className="font-medium">Calculating product metrics...</p>
                <p className="text-sm text-muted-foreground">This may take a moment</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <ProductMetrics metrics={product.currentMetrics} />
      )}

      {/* Charts */}
      {metricsLoading ? (
        <Card>
          <CardContent className="p-12">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              <div className="text-center space-y-2">
                <p className="font-medium">Loading performance trends...</p>
                <p className="text-sm text-muted-foreground">This may take a moment</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <ProductCharts 
          visibilityData={product.visibilityHistory}
          sentimentData={product.sentimentHistory}
          positionData={product.positionHistory}
        />
      )}

      {/* AI Optimization - Recommendations */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" />
              AI Optimization Suggestions
            </CardTitle>
            {(!product.recommendations || product.recommendations.length === 0) && (
              <Button
                onClick={handleGenerateRecommendations}
                disabled={recommendationsLoading}
                size="sm"
              >
                {recommendationsLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Generate Recommendations
                  </>
                )}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {recommendationsLoading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              <div className="text-center space-y-2">
                <p className="font-medium">Generating AI optimization suggestions...</p>
                <p className="text-sm text-muted-foreground">This may take a moment</p>
              </div>
            </div>
          ) : product.recommendations && product.recommendations.length > 0 ? (
            <div className="space-y-4">
              {product.recommendations.map((rec) => (
                <div
                  key={rec.id}
                  className="p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{rec.title}</h3>
                        <Badge variant={rec.impact === "high" ? "default" : rec.impact === "medium" ? "secondary" : "outline"} className="capitalize">
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
                No AI optimization recommendations yet. Generate recommendations to improve your product's visibility in AI-powered search.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sources Section */}
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
                <p className="font-medium">Loading source data...</p>
                <p className="text-sm text-muted-foreground">This may take a moment</p>
              </div>
            </div>
          ) : product.sources && product.sources.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {product.sources.map((source, index) => {
                // Remove common domain extensions
                const displayName = source.domain
                  .replace(/\.(com|org|net|io|co|edu|gov|uk|us|ca|au|de|fr|jp|cn|in)$/i, '');
                
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
                          // Fallback to first letter if favicon fails to load
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
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
            <div className="text-center py-8 text-muted-foreground">
              No source data available yet
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Modal */}
      <PreviewModal 
        open={showPreview}
        onOpenChange={setShowPreview}
        content={previewContent}
        type={previewType}
        onApply={() => {
          const suggestion = product.suggestions.find(s => s.type === previewType);
          if (suggestion) {
            handleApplyContent(suggestion.id);
          }
        }}
      />
    </div>
  );
};

export default ProductOverview;