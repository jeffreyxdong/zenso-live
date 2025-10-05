import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Loader2, Bot, Eye, Trash2, MoreVertical, Search, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SavedPrompt {
  id: string;
  content: string;
  created_at: string;
  status: "active" | "suggested" | "inactive";
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
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState("");
  const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>([]);
  const [isLoadingSaved, setIsLoadingSaved] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPrompts, setSelectedPrompts] = useState<string[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [promptToDelete, setPromptToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddPromptDialog, setShowAddPromptDialog] = useState(false);
  const { toast } = useToast();

  /** Fetch AI responses from OpenAI + Gemini */
  const fetchAIResponses = async (prompt: string) => {
    const [openaiRes, geminiRes] = await Promise.allSettled([
      supabase.functions.invoke("chat-with-openai", { body: { prompt } }),
      supabase.functions.invoke("chat-with-gemini", { body: { prompt } }),
    ]);

    const responses: { model: string; content: string }[] = [];
    if (openaiRes.status === "fulfilled" && openaiRes.value.data?.result) {
      responses.push({ model: "openai", content: openaiRes.value.data.result });
    }
    if (geminiRes.status === "fulfilled" && geminiRes.value.data?.result) {
      responses.push({ model: "gemini", content: geminiRes.value.data.result });
    }
    return responses;
  };

  /** Call Supabase scoring functions — they handle the GPT prompt logic */
  const scoreResponses = async (responses: { model: string; content: string }[], brandName: string) => {
    // Combine all responses into a single content for ChatGPT to score
    const combinedContent = responses.map(r => `${r.model.toUpperCase()} Response: ${r.content}`).join('\n\n');
    
    console.log(`Scoring combined content with brand "${brandName}"`);
    console.log(`Combined content preview: ${combinedContent.substring(0, 200)}...`);
    
    const [visibilityRes, sentimentRes] = await Promise.allSettled([
      supabase.functions.invoke("score-brand-visibility", {
        body: { content: combinedContent, brandName },
      }),
      supabase.functions.invoke("score-brand-sentiment", {
        body: { content: combinedContent, brandName },
      }),
    ]);

    console.log('Visibility result:', visibilityRes);
    console.log('Sentiment result:', sentimentRes);

    const visibility = visibilityRes.status === "fulfilled" && visibilityRes.value.data?.score !== undefined 
      ? visibilityRes.value.data.score 
      : 0;
    
    const sentiment = sentimentRes.status === "fulfilled" && sentimentRes.value.data?.score !== undefined 
      ? sentimentRes.value.data.score 
      : 0;

    console.log(`Final scores - Visibility: ${visibility}, Sentiment: ${sentiment}`);

    return {
      avgVisibility: visibility,
      avgSentiment: sentiment,
    };
  };

  const handleSubmit = async () => {
    if (!prompt.trim()) {
      toast({ title: "Error", description: "Please enter a prompt", variant: "destructive" });
      return;
    }
    if (!activeStore?.name) {
      toast({ title: "Error", description: "No store selected. Please select a store.", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    try {
      // Get company name for brand references
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("User not authenticated");

      const { data: profileData } = await supabase
        .from("profiles")
        .select("company_name")
        .eq("user_id", userData.user.id)
        .single();

      const brandName = profileData?.company_name || activeStore.name;

      const responses = await fetchAIResponses(prompt);
      if (responses.length === 0) throw new Error("No AI responses received.");

      const { avgVisibility, avgSentiment } = await scoreResponses(responses, brandName);
      await savePromptWithScores(avgVisibility, avgSentiment, responses, brandName);

      toast({
        title: "Success",
        description: `Visibility: ${avgVisibility}/100, Sentiment: ${avgSentiment}/100`,
      });

      setPrompt("");
      setShowAddPromptDialog(false);
    } catch (err: any) {
      console.error("Error processing prompt:", err);
      toast({ title: "Error", description: err.message || "Failed to process prompt", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const savePromptWithScores = async (visibilityScore: number, sentimentScore: number, responses: any[], brandName: string) => {
    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData?.user) throw new Error("Not signed in");
      if (!activeStore?.id) throw new Error("No store selected");

      const { data: promptData, error } = await supabase
        .from("user_generated_prompts")
        .insert({
          user_id: userData.user.id,
          store_id: activeStore.id,
          content: prompt.trim(),
          brand_name: brandName,
          status: "active",
        })
        .select()
        .single();

      if (error) throw error;

      if (responses.length > 0 && promptData) {
        await supabase.from("user_generated_prompt_responses").insert(
          responses.map((r) => ({
            prompt_id: promptData.id,
            model_name: r.model,
            response_text: r.content,
          }))
        );

        // Save initial daily score
        const today = new Date().toISOString().split('T')[0];
        await (supabase.from("user_generated_prompt_daily_scores" as any).insert({
          prompt_id: promptData.id,
          date: today,
          visibility_score: visibilityScore,
          sentiment_score: sentimentScore,
        }) as any);
      }

      fetchSavedPrompts();
    } catch (err: any) {
      console.error("Error saving prompt:", err);
      toast({ title: "Error", description: err.message || "Failed to save prompt", variant: "destructive" });
    }
  };

  const fetchSavedPrompts = async () => {
    try {
      setIsLoadingSaved(true);
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user || !activeStore?.id) {
        setSavedPrompts([]);
        return;
      }

      const { data, error } = await supabase
        .from("user_generated_prompts")
        .select("id, content, created_at, status, brand_name, product_id")
        .eq("user_id", userData.user.id)
        .eq("store_id", activeStore.id)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch most recent daily scores for each prompt
      const promptsWithScores = await Promise.all(
        (data ?? []).map(async (prompt) => {
          try {
            const { data: dailyScores, error: scoresError } = await supabase
              .from("user_generated_prompt_daily_scores" as any)
              .select("visibility_score, sentiment_score")
              .eq("prompt_id", prompt.id)
              .order("date", { ascending: false })
              .limit(1)
              .maybeSingle() as { 
                data: { visibility_score: number | null; sentiment_score: number | null } | null; 
                error: any 
              };

            if (scoresError) {
              console.warn(`Error fetching scores for prompt ${prompt.id}:`, scoresError);
            }

            console.log(`Scores for prompt ${prompt.id}:`, dailyScores);

            return {
              ...prompt,
              visibility_score: dailyScores?.visibility_score ?? undefined,
              sentiment_score: dailyScores?.sentiment_score ?? undefined,
            };
          } catch (err) {
            console.error(`Failed to fetch scores for prompt ${prompt.id}:`, err);
            return {
              ...prompt,
              visibility_score: undefined,
              sentiment_score: undefined,
            };
          }
        })
      );

      setSavedPrompts(promptsWithScores as SavedPrompt[]);
    } catch (err) {
      console.error("Error fetching prompts:", err);
      toast({ title: "Error", description: "Failed to load saved prompts", variant: "destructive" });
    } finally {
      setIsLoadingSaved(false);
    }
  };

  const handleSelectPrompt = (promptId: string, checked: boolean) => {
    if (checked) {
      setSelectedPrompts([...selectedPrompts, promptId]);
    } else {
      setSelectedPrompts(selectedPrompts.filter(id => id !== promptId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedPrompts(filteredPrompts.map(p => p.id));
    } else {
      setSelectedPrompts([]);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedPrompts.length > 0) {
      setPromptToDelete(null);
      setShowDeleteDialog(true);
    }
  };

  const handleDeleteSingle = (promptId: string) => {
    setPromptToDelete(promptId);
    setShowDeleteDialog(true);
  };

  const deletePrompts = async (promptIds: string[]) => {
    setIsDeleting(true);
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      // Delete prompts
      const { error: promptError } = await supabase
        .from("user_generated_prompts")
        .delete()
        .in("id", promptIds)
        .eq("user_id", userData.user.id);

      if (promptError) throw promptError;

      toast({
        title: "Success",
        description: `${promptIds.length} prompt(s) deleted successfully`,
      });

      // Reset selection and refresh
      setSelectedPrompts([]);
      setPromptToDelete(null);
      setShowDeleteDialog(false);
      fetchSavedPrompts();

    } catch (error: any) {
      console.error("Error deleting prompts:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete prompts",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const confirmDelete = () => {
    const idsToDelete = promptToDelete ? [promptToDelete] : selectedPrompts;
    deletePrompts(idsToDelete);
  };

  useEffect(() => {
    fetchSavedPrompts();
  }, [activeStore]);

  const getScoreDisplay = (score: number | undefined, type: "visibility" | "sentiment") => {
    if (score == null) {
      return <span className="text-xs text-muted-foreground px-2 py-1 rounded bg-muted/50">No Data</span>;
    }
    if (score === 0) {
      return <span className="text-sm font-semibold px-3 py-1.5 rounded-md border text-muted-foreground bg-muted/50 border-muted">Not Mentioned</span>;
    }
    const colorClass =
      type === "visibility"
        ? score >= 80
          ? "text-green-700 bg-green-50 border-green-200"
          : score >= 60
          ? "text-yellow-700 bg-yellow-50 border-yellow-200"
          : "text-red-700 bg-red-50 border-red-200"
        : score >= 70
        ? "text-green-700 bg-green-50 border-green-200"
        : score >= 30
        ? "text-yellow-700 bg-yellow-50 border-yellow-200"
        : "text-red-700 bg-red-50 border-red-200";

    return <span className={`text-sm font-semibold px-3 py-1.5 rounded-md border ${colorClass}`}>{score}/100</span>;
  };

  const filteredPrompts = savedPrompts.filter(prompt =>
    prompt.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header with title, count, and actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">My Prompts</h2>
          <p className="text-sm text-muted-foreground">
            {savedPrompts.length} prompts
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            className="flex items-center gap-2"
            onClick={() => setShowAddPromptDialog(true)}
          >
            <Plus className="w-4 h-4" />
            Add Prompt
          </Button>
        </div>
      </div>

      {/* Search and Bulk Actions */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search prompts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        {selectedPrompts.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleDeleteSelected}
            className="flex items-center gap-2 text-destructive hover:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
            Delete Selected ({selectedPrompts.length})
          </Button>
        )}
      </div>

      {/* Prompts Table */}
      <div className="border rounded-lg">
        {isLoadingSaved ? (
          <div className="flex items-center gap-2 text-sm py-8 justify-center">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading prompts...
          </div>
        ) : filteredPrompts.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">
              {savedPrompts.length === 0 ? "No prompts yet." : "No prompts match your search."}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedPrompts.length === filteredPrompts.length && filteredPrompts.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Prompt</TableHead>
                <TableHead className="text-center">Visibility</TableHead>
                <TableHead className="text-center">Sentiment</TableHead>
                <TableHead className="text-center">Created</TableHead>
                <TableHead className="w-12 text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPrompts.map((p) => (
                <TableRow key={p.id}>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedPrompts.includes(p.id)}
                      onCheckedChange={(checked) => handleSelectPrompt(p.id, !!checked)}
                    />
                  </TableCell>
                  <TableCell onClick={() => navigate(`/prompt/${p.id}`)} className="cursor-pointer">
                    <div className="flex items-center gap-2 p-2 rounded-md border border-transparent hover:border-border hover:bg-accent/50 transition-all duration-200 group">
                      <Eye className="w-4 h-4 text-muted-foreground group-hover:text-primary opacity-60 group-hover:opacity-100" />
                      <p className="text-sm text-foreground/80 group-hover:text-foreground truncate font-medium">
                        {p.content}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">{getScoreDisplay(p.visibility_score, "visibility")}</TableCell>
                  <TableCell className="text-center">{getScoreDisplay(p.sentiment_score, "sentiment")}</TableCell>
                  <TableCell className="text-sm text-muted-foreground text-center">
                    {new Date(p.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()} className="text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/prompt/${p.id}`)}>
                          <Eye className="w-4 h-4 mr-2" /> View
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteSingle(p.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Add Prompt Dialog */}
      <Dialog open={showAddPromptDialog} onOpenChange={setShowAddPromptDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5" /> Add New Prompt
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              id="prompt"
              placeholder="Ask anything you'd like to test across AI platforms..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (!isProcessing && prompt.trim() && activeStore) handleSubmit();
                }
              }}
              className="min-h-[100px]"
            />
            {activeStore && (
              <p className="text-sm text-muted-foreground">
                Prompts will be scored for: <strong>{activeStore.name}</strong>
              </p>
            )}
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowAddPromptDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={isProcessing || !prompt.trim() || !activeStore} 
                className="flex-1"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Process & Score Prompt"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Prompt{(promptToDelete ? '' : 's')}</AlertDialogTitle>
            <AlertDialogDescription>
              {promptToDelete 
                ? "Are you sure you want to delete this prompt? This action cannot be undone."
                : `Are you sure you want to delete ${selectedPrompts.length} selected prompt${selectedPrompts.length === 1 ? '' : 's'}? This action cannot be undone.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                `Delete ${promptToDelete ? '' : `${selectedPrompts.length} `}Prompt${promptToDelete ? '' : 's'}`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
