import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Target, Bot } from "lucide-react";
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
    visibility_score?: number;
    sentiment_score?: number;
  };
}

interface PromptScores {
  visibility_score: number | null;
  position_score: number | null;
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
  const [promptScores, setPromptScores] = useState<PromptScores>({
    visibility_score: null,
    position_score: null,
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

      // Fetch prompt scores from the prompts table
      const { data: promptData, error: promptError } = await supabase
        .from('prompts')
        .select('visibility_score, position_score')
        .eq('id', prompt.id)
        .single();

      if (promptError) {
        console.warn('Could not fetch prompt scores:', promptError);
      } else {
        setPromptScores({
          visibility_score: promptData?.visibility_score || null,
          position_score: promptData?.position_score || null,
        });
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
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium">Brand:</span> {prompt.brand_name}
                  </p>
                )}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  Created {format(new Date(prompt.created_at), 'PPP')}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Prompt Scores */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Visibility Score</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-16 flex items-center justify-center text-sm text-muted-foreground">
                    Loading...
                  </div>
                ) : promptScores.visibility_score !== null ? (
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary mb-1">
                      {promptScores.visibility_score}
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
                ) : promptScores.position_score !== null ? (
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary mb-1">
                      {promptScores.position_score}
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

        </div>
      </DialogContent>
    </Dialog>
  );
};