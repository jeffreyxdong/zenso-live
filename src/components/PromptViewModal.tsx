import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Calendar, Target, Bot } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface PromptViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  prompt: {
    id: string;
    content: string;
    brand_name?: string;
    created_at: string;
    product_id?: string;
  };
}

interface ProductScores {
  visibility_score: number | null;
  position_score: number | null;
  sentiment_score: number | null;
}

interface PromptResponse {
  id: string;
  model_name: string;
  response_text: string;
  sources: any;
  created_at: string;
}

export const PromptViewModal = ({ isOpen, onClose, prompt }: PromptViewModalProps) => {
  const [responses, setResponses] = useState<PromptResponse[]>([]);
  const [productScores, setProductScores] = useState<ProductScores>({
    visibility_score: null,
    position_score: null,
    sentiment_score: null
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && prompt.id) {
      fetchPromptData();
    }
  }, [isOpen, prompt.id]);

  const fetchPromptData = async () => {
    setIsLoading(true);
    try {
      // Fetch responses
      const { data: responsesData, error: responsesError } = await supabase
        .from('prompt_responses')
        .select('id, model_name, response_text, sources, created_at')
        .eq('prompt_id', prompt.id)
        .order('created_at', { ascending: false });

      if (responsesError) throw responsesError;

      // Fetch product scores if product_id exists
      if (prompt.product_id) {
        const { data: productData, error: productError } = await supabase
          .from('products')
          .select('visibility_score, position_score, sentiment_score')
          .eq('id', prompt.product_id)
          .single();

        if (productError) {
          console.warn('Could not fetch product scores:', productError);
        } else {
          setProductScores({
            visibility_score: productData?.visibility_score || null,
            position_score: productData?.position_score || null,
            sentiment_score: productData?.sentiment_score || null
          });
        }
      }

      setResponses(responsesData || []);
    } catch (error: any) {
      console.error('Error fetching prompt data:', error);
      toast({
        title: "Error",
        description: "Failed to load prompt data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getAllSources = () => {
    const allSources: Array<{ site_name: string; link: string }> = [];
    responses.forEach(response => {
      if (response.sources && Array.isArray(response.sources)) {
        allSources.push(...response.sources);
      }
    });
    // Remove duplicates based on site_name
    const uniqueSources = allSources.filter((source, index, self) =>
      index === self.findIndex(s => s.site_name === source.site_name)
    );
    return uniqueSources;
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Prompt Analysis
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Prompt Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Prompt Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm">{prompt.content}</p>
                {prompt.brand_name && (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Brand: {prompt.brand_name}</Badge>
                  </div>
                )}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  Created {format(new Date(prompt.created_at), 'PPP')}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Product Scores */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Visibility Score</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-16 flex items-center justify-center text-sm text-muted-foreground">
                    Loading...
                  </div>
                ) : productScores.visibility_score !== null ? (
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary mb-1">
                      {productScores.visibility_score}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Brand visibility
                    </p>
                  </div>
                ) : (
                  <div className="h-16 flex items-center justify-center text-sm text-muted-foreground">
                    No Data
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Position Score</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-16 flex items-center justify-center text-sm text-muted-foreground">
                    Loading...
                  </div>
                ) : productScores.position_score !== null ? (
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary mb-1">
                      {productScores.position_score}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Position ranking
                    </p>
                  </div>
                ) : (
                  <div className="h-16 flex items-center justify-center text-sm text-muted-foreground">
                    No Data
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Sentiment Score</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-16 flex items-center justify-center text-sm text-muted-foreground">
                    Loading...
                  </div>
                ) : productScores.sentiment_score !== null ? (
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary mb-1">
                      {productScores.sentiment_score}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Sentiment tone
                    </p>
                  </div>
                ) : (
                  <div className="h-16 flex items-center justify-center text-sm text-muted-foreground">
                    No Data
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Responses Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">AI Responses</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-sm text-muted-foreground">Loading responses...</div>
              ) : responses.length > 0 ? (
                <div className="space-y-4">
                  {responses.map((response) => (
                    <div key={response.id} className="border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Bot className="w-4 h-4" />
                        <Badge variant="outline" className="text-xs">
                          {response.model_name.toUpperCase()}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(response.created_at), 'PPp')}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{response.response_text}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No responses available</div>
              )}
            </CardContent>
          </Card>

          {/* Sources Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Sources</CardTitle>
              <p className="text-xs text-muted-foreground">
                Sites where your brand was mentioned in the responses
              </p>
            </CardHeader>
            <CardContent>
              {(() => {
                const sources = getAllSources();
                return sources.length > 0 ? (
                  <div className="space-y-3">
                    {sources.map((source, index) => (
                      <div key={index} className="flex items-center justify-between py-2 border-b last:border-b-0">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <ExternalLink className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{source.site_name}</p>
                            <p className="text-xs text-muted-foreground">50%</p>
                          </div>
                        </div>
                        <a
                          href={source.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline flex items-center gap-1"
                        >
                          Link
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">No sources available</div>
                );
              })()}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};