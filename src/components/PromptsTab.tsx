import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Loader2, Bot, Eye, Trash2, MoreVertical } from "lucide-react";
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

      // Second round: Score visibility and sentiment for each response
      let totalVisibilityScore = 0;
      let totalSentimentScore = 0;
      validResponses = responses.length;

      for (const response of responses) {
        try {
          // Create visibility and sentiment prompts
          const visibilityPrompt = `Rate the visibility of the brand "${activeStore.name}" in the following text on a scale of 0–100.
0 = not mentioned at all, 100 = the brand is the main focus.
Return ONLY a number.

Text:
${response.content}`;

          const sentimentPrompt = `Rate the sentiment toward the brand "${activeStore.name}" in the following text on a scale of 0–100.
0 = very negative, 50 = completely neutral, 100 = very positive.
Return ONLY a number.

Text:
${response.content}`;

          // Score with both OpenAI and Gemini for each response
          const [openaiVisibility, openaiSentiment, geminiVisibility, geminiSentiment] = await Promise.allSettled([
            supabase.functions.invoke('chat-with-openai', { body: { prompt: visibilityPrompt } }),
            supabase.functions.invoke('chat-with-openai', { body: { prompt: sentimentPrompt } }),
            supabase.functions.invoke('chat-with-gemini', { body: { prompt: visibilityPrompt } }),
            supabase.functions.invoke('chat-with-gemini', { body: { prompt: sentimentPrompt } })
          ]);

          // Parse and average visibility scores
          let visibilityScores = [];
          if (openaiVisibility.status === 'fulfilled' && openaiVisibility.value.data?.result) {
            const score = parseInt(openaiVisibility.value.data.result.trim()) || 0;
            console.log('OpenAI visibility score:', score, 'Raw:', openaiVisibility.value.data.result);
            visibilityScores.push(score);
          }
          if (geminiVisibility.status === 'fulfilled' && geminiVisibility.value.data?.result) {
            const score = parseInt(geminiVisibility.value.data.result.trim()) || 0;
            console.log('Gemini visibility score:', score, 'Raw:', geminiVisibility.value.data.result);
            visibilityScores.push(score);
          }

          // Parse and average sentiment scores  
          let sentimentScores = [];
          if (openaiSentiment.status === 'fulfilled' && openaiSentiment.value.data?.result) {
            const score = parseInt(openaiSentiment.value.data.result.trim()) || 0;
            console.log('OpenAI sentiment score:', score, 'Raw:', openaiSentiment.value.data.result);
            sentimentScores.push(score);
          }
          if (geminiSentiment.status === 'fulfilled' && geminiSentiment.value.data?.result) {
            const score = parseInt(geminiSentiment.value.data.result.trim()) || 0;
            console.log('Gemini sentiment score:', score, 'Raw:', geminiSentiment.value.data.result);
            sentimentScores.push(score);
          }

          // Add averaged scores for this response
          if (visibilityScores.length > 0) {
            totalVisibilityScore += Math.round(visibilityScores.reduce((a, b) => a + b, 0) / visibilityScores.length);
          }
          if (sentimentScores.length > 0) {
            totalSentimentScore += Math.round(sentimentScores.reduce((a, b) => a + b, 0) / sentimentScores.length);
          }
        } catch (error) {
          console.error('Error scoring response:', error);
        }
      }

      const averageVisibilityScore = validResponses > 0 ? Math.round(totalVisibilityScore / validResponses) : 0;
      const averageSentimentScore = validResponses > 0 ? Math.round(totalSentimentScore / validResponses) : 0;

      // Save prompt with scores and responses
      await savePromptWithScores(averageVisibilityScore, averageSentimentScore, responses);

      toast({
        title: "Success",
        description: `Prompt processed and saved with scores - Visibility: ${averageVisibilityScore}/100, Sentiment: ${averageSentimentScore}/100`,
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

  const savePromptWithScores = async (visibilityScore: number, sentimentScore: number, responses: any[] = []) => {
    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      if (!userData?.user) {
        toast({ title: 'Not signed in', description: 'Please sign in to save prompts', variant: 'destructive' });
        return;
      }
      if (!activeStore?.id) {
        toast({ title: 'No store selected', description: 'Please select a store to save prompts', variant: 'destructive' });
        return;
      }

      const { data: promptData, error } = await (supabase as any)
        .from('prompts')
        .insert({ 
          user_id: userData.user.id, 
          store_id: activeStore.id,
          content: prompt.trim(),
          brand_name: activeStore?.name || '',
          status: 'active',
          visibility_score: visibilityScore,
          sentiment_score: sentimentScore
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
      if (!userData?.user || !activeStore?.id) {
        setSavedPrompts([]);
        setIsLoadingSaved(false);
        return;
      }

      const { data, error } = await (supabase as any)
        .from('prompts')
        .select('id, content, created_at, status, brand_name, product_id, visibility_score, sentiment_score')
        .eq('user_id', userData.user.id)
        .eq('store_id', activeStore.id)
        .eq('status', 'active')
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

  const deletePrompt = async (promptId: string) => {
    try {
      const { error } = await supabase
        .from('prompts')
        .delete()
        .eq('id', promptId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Prompt deleted successfully",
      });

      fetchSavedPrompts();
    } catch (error) {
      console.error('Error deleting prompt:', error);
      toast({
        title: "Error",
        description: "Failed to delete prompt",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchSavedPrompts();
  }, [activeStore]);


  const getScoreDisplay = (score: number | undefined, type: 'visibility' | 'sentiment') => {
    if (!score && score !== 0) {
      return (
        <div className="flex items-center justify-center">
          <span className="text-xs text-muted-foreground px-2 py-1 rounded bg-muted/50">
            No Data
          </span>
        </div>
      );
    }

    let colorClass = '';
    let bgClass = '';
    
    if (type === 'visibility') {
      if (score >= 80) {
        colorClass = 'text-green-700';
        bgClass = 'bg-green-50 border-green-200';
      } else if (score >= 60) {
        colorClass = 'text-yellow-700';
        bgClass = 'bg-yellow-50 border-yellow-200';
      } else {
        colorClass = 'text-red-700';
        bgClass = 'bg-red-50 border-red-200';
      }
    } else {
      if (score >= 70) {
        colorClass = 'text-green-700';
        bgClass = 'bg-green-50 border-green-200';
      } else if (score >= 30) {
        colorClass = 'text-yellow-700';
        bgClass = 'bg-yellow-50 border-yellow-200';
      } else {
        colorClass = 'text-red-700';
        bgClass = 'bg-red-50 border-red-200';
      }
    }

    return (
      <div className="flex items-center justify-center">
        <span className={`text-sm font-semibold px-3 py-1.5 rounded-md border ${colorClass} ${bgClass}`}>
          {score}/100
        </span>
      </div>
    );
  };

  const filteredPrompts = savedPrompts;

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
          {isLoadingSaved ? (
            <div className="flex items-center gap-2 text-sm py-8">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading your prompts...
            </div>
          ) : filteredPrompts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No prompts yet. Create one above to get started.
            </p>
          ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Prompt</TableHead>
                    <TableHead className="text-center">Visibility</TableHead>
                    <TableHead className="text-center">Sentiment</TableHead>
                    <TableHead className="text-center">Created</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
              <TableBody>
                  {filteredPrompts.map((prompt) => (
                    <TableRow key={prompt.id}>
                      <TableCell>
                        <div 
                          className="max-w-md cursor-pointer hover:bg-muted/50 rounded px-2 py-1 transition-colors"
                          onClick={() => {
                            setSelectedPrompt(prompt);
                            setIsViewModalOpen(true);
                          }}
                        >
                          <p className="text-sm text-muted-foreground truncate">{prompt.content}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {getScoreDisplay(prompt.visibility_score, 'visibility')}
                      </TableCell>
                      <TableCell className="text-center">
                        {getScoreDisplay(prompt.sentiment_score, 'sentiment')}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-sm text-muted-foreground">
                          {new Date(prompt.created_at).toLocaleDateString()}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedPrompt(prompt);
                                setIsViewModalOpen(true);
                              }}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => deletePrompt(prompt.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
