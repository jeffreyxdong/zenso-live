import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Bot, Eye, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PromptViewModal } from "./PromptViewModal";

interface SavedPrompt {
  id: string;
  content: string;
  created_at: string;
  status: 'active' | 'suggested' | 'inactive';
  brand_name?: string;
  product_id?: string;
  visibility_score?: number;
  sentiment_score?: number;
  position_score?: number;
}

interface Store {
  id: string;
  name: string;
  website: string;
  is_active: boolean;
}

interface PromptsTabProps {
  activeStore: Store | null;
}

export const PromptsTab = ({ activeStore }: PromptsTabProps) => {
  const [prompt, setPrompt] = useState("");
  const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>([]);
  const [isLoadingSaved, setIsLoadingSaved] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState("active");
  const [selectedPrompt, setSelectedPrompt] = useState<SavedPrompt | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Error",
        description: "Please enter a prompt",
        variant: "destructive",
      });
      return;
    }

    if (!activeStore?.name) {
      toast({
        title: "Error", 
        description: "No store selected. Please select a store to process prompts.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Call both APIs in parallel but don't show results to user
      const [openaiPromise, geminiPromise] = await Promise.allSettled([
        supabase.functions.invoke('chat-with-openai', {
          body: { prompt }
        }),
        supabase.functions.invoke('chat-with-gemini', {
          body: { prompt }
        })
      ]);

      let totalScore = 0;
      let validResponses = 0;

      // Process and store responses
      const responses = [];
      
      if (openaiPromise.status === 'fulfilled' && openaiPromise.value.data) {
        responses.push({
          model: 'openai',
          content: openaiPromise.value.data.result
        });
      }
      
      if (geminiPromise.status === 'fulfilled' && geminiPromise.value.data) {
        responses.push({
          model: 'gemini', 
          content: geminiPromise.value.data.result
        });
      }

      // Score all metrics for responses
      let totalVisibilityScore = 0;
      let totalSentimentScore = 0;
      let totalPositionScore = 0;

      for (const response of responses) {
        try {
          // Score all metrics in parallel
          const [visibilityResult, sentimentResult, positionResult] = await Promise.allSettled([
            supabase.functions.invoke('score-brand-visibility', {
              body: { content: response.content, brandName: activeStore.name }
            }),
            supabase.functions.invoke('score-sentiment', {
              body: { content: response.content, brandName: activeStore.name }
            }),
            supabase.functions.invoke('score-position', {
              body: { content: response.content, brandName: activeStore.name }
            })
          ]);

          if (visibilityResult.status === 'fulfilled' && visibilityResult.value.data?.score !== undefined) {
            totalVisibilityScore += visibilityResult.value.data.score;
          }
          if (sentimentResult.status === 'fulfilled' && sentimentResult.value.data?.score !== undefined) {
            totalSentimentScore += sentimentResult.value.data.score;
          }
          if (positionResult.status === 'fulfilled' && positionResult.value.data?.score !== undefined) {
            totalPositionScore += positionResult.value.data.score;
          }
        } catch (error) {
          console.error('Error scoring response:', error);
        }
      }

      const averageVisibilityScore = validResponses > 0 ? Math.round(totalVisibilityScore / validResponses) : 0;
      const averageSentimentScore = validResponses > 0 ? Math.round(totalSentimentScore / validResponses) : 0;
      const averagePositionScore = validResponses > 0 ? Math.round(totalPositionScore / validResponses) : 0;

      // Save prompt with all scores and responses
      await savePromptWithScores(averageVisibilityScore, averageSentimentScore, averagePositionScore, responses);

      toast({
        title: "Success",
        description: `Prompt processed and saved with scores - Visibility: ${averageVisibilityScore}/100, Sentiment: ${averageSentimentScore}/100, Position: ${averagePositionScore || 'N/A'}`,
      });

      // Clear form
      setPrompt("");

    } catch (error) {
      console.error('Error processing prompt:', error);
      toast({
        title: "Error",
        description: "Failed to process prompt",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const savePromptWithScores = async (visibilityScore: number, sentimentScore: number, positionScore: number, responses: any[] = []) => {
    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      if (!userData?.user) {
        toast({ title: 'Not signed in', description: 'Please sign in to save prompts', variant: 'destructive' });
        return;
      }

      const { data: promptData, error } = await (supabase as any)
        .from('prompts')
        .insert({ 
          user_id: userData.user.id, 
          content: prompt.trim(),
          brand_name: activeStore?.name || '',
          status: 'active',
          visibility_score: visibilityScore,
          sentiment_score: sentimentScore,
          position_score: positionScore
        })
        .select()
        .single();

      if (error) throw error;

      // Save AI responses if we have any
      if (responses.length > 0 && promptData) {
        const responseInserts = responses.map(response => ({
          prompt_id: promptData.id,
          model_name: response.model,
          response_text: response.content,
          sources: null // Will be populated by future features
        }));

        const { error: responseError } = await (supabase as any)
          .from('prompt_responses')
          .insert(responseInserts);

        if (responseError) {
          console.error('Error saving responses:', responseError);
        }
      }

      fetchSavedPrompts();
    } catch (e: any) {
      console.error('Error saving prompt', e);
      toast({ title: 'Error', description: e.message || 'Failed to save prompt', variant: 'destructive' });
    }
  };

  const fetchSavedPrompts = async () => {
    try {
      setIsLoadingSaved(true);
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      if (!userData?.user) {
        setSavedPrompts([]);
        setIsLoadingSaved(false);
        return;
      }

      const { data, error } = await (supabase as any)
        .from('prompts')
        .select('id, content, created_at, status, brand_name, product_id, visibility_score, sentiment_score, position_score')
        .eq('user_id', userData.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSavedPrompts(data ?? []);
    } catch (e: any) {
      console.error('Error fetching prompts', e);
      toast({ title: 'Error', description: 'Failed to load saved prompts', variant: 'destructive' });
    } finally {
      setIsLoadingSaved(false);
    }
  };

  useEffect(() => {
    fetchSavedPrompts();
  }, []);


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

  const filteredPrompts = savedPrompts.filter(prompt => 
    activeTab === 'all' || prompt.status === activeTab
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5" />
            Add New Prompt
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <label htmlFor="prompt" className="block text-sm font-medium">Enter your prompt</label>
            <Textarea
              id="prompt"
              placeholder="Ask anything you'd like to test across AI platforms..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[100px]"
            />
            {activeStore && (
              <p className="text-sm text-muted-foreground">
                Prompts will be scored for brand visibility of: <strong>{activeStore.name}</strong>
              </p>
            )}
          </div>
          <Button 
            onClick={handleSubmit} 
            disabled={isProcessing || !prompt.trim() || !activeStore}
            className="w-full"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              "Process & Score Prompt"
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Your Prompts</span>
            <Badge variant="outline">{filteredPrompts.length} Prompts</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
            <TabsList>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="suggested">Suggested</TabsTrigger>
              <TabsTrigger value="inactive">Inactive</TabsTrigger>
            </TabsList>
          </Tabs>

          {isLoadingSaved ? (
            <div className="flex items-center gap-2 text-sm py-8">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading your prompts...
            </div>
          ) : filteredPrompts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No {activeTab} prompts yet. Create one above to get started.
            </p>
          ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Prompt</TableHead>
                    <TableHead>Visibility</TableHead>
                    <TableHead>Sentiment</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
              <TableBody>
                  {filteredPrompts.map((prompt) => (
                    <TableRow key={prompt.id}>
                      <TableCell>
                        <div className="max-w-md">
                          <p className="text-sm text-muted-foreground truncate">{prompt.content}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getVisibilityBadge(prompt.visibility_score)}
                      </TableCell>
                      <TableCell>
                        {getSentimentBadge(prompt.sentiment_score)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            {prompt.position_score ? `#${prompt.position_score}` : 'No Data'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {new Date(prompt.created_at).toLocaleDateString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => {
                            setSelectedPrompt(prompt);
                            setIsViewModalOpen(true);
                          }}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* View Modal */}
      {selectedPrompt && (
        <PromptViewModal
          isOpen={isViewModalOpen}
          onClose={() => {
            setIsViewModalOpen(false);
            setSelectedPrompt(null);
          }}
          prompt={selectedPrompt}
        />
      )}
    </div>
  );
};
