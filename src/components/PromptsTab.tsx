import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Bot, BookmarkPlus, Target, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SavedPrompt {
  id: string;
  content: string;
  created_at: string;
  visibility_score?: number;
  status: 'active' | 'suggested' | 'inactive';
}

export const PromptsTab = () => {
  const [prompt, setPrompt] = useState("");
  const [brandName, setBrandName] = useState("");
  const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingSaved, setIsLoadingSaved] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState("active");
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

    if (!brandName.trim()) {
      toast({
        title: "Error", 
        description: "Please enter a brand name for visibility scoring",
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

      // Process responses for scoring without showing to user
      const responses = [];
      
      if (openaiPromise.status === 'fulfilled' && openaiPromise.value.data) {
        responses.push(openaiPromise.value.data.result);
      }
      
      if (geminiPromise.status === 'fulfilled' && geminiPromise.value.data) {
        responses.push(geminiPromise.value.data.result);
      }

      // Score brand visibility for responses
      for (const response of responses) {
        try {
          const { data: scoreData } = await supabase.functions.invoke('score-brand-visibility', {
            body: { content: response, brandName: brandName.trim() }
          });

          if (scoreData?.score !== undefined) {
            totalScore += scoreData.score;
            validResponses++;
          }
        } catch (error) {
          console.error('Error scoring response:', error);
        }
      }

      const averageScore = validResponses > 0 ? Math.round(totalScore / validResponses) : 0;

      // Save prompt with visibility score
      await savePromptWithScore(averageScore);

      toast({
        title: "Success",
        description: `Prompt processed and saved with visibility score: ${averageScore}/100`,
      });

      // Clear form
      setPrompt("");
      setBrandName("");

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

  const savePromptWithScore = async (visibilityScore: number) => {
    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      if (!userData?.user) {
        toast({ title: 'Not signed in', description: 'Please sign in to save prompts', variant: 'destructive' });
        return;
      }

      const { error } = await (supabase as any)
        .from('prompts')
        .insert({ 
          user_id: userData.user.id, 
          content: prompt.trim(),
          visibility_score: visibilityScore,
          status: 'active'
        });

      if (error) throw error;
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
        .select('id, content, created_at, visibility_score, status')
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

  const handleSavePrompt = async () => {
    if (!prompt.trim()) {
      toast({ title: 'Error', description: 'Please enter a prompt', variant: 'destructive' });
      return;
    }
    setIsSaving(true);
    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      if (!userData?.user) {
        toast({ title: 'Not signed in', description: 'Please sign in to save prompts', variant: 'destructive' });
        return;
      }

      const { error } = await (supabase as any)
        .from('prompts')
        .insert({ 
          user_id: userData.user.id, 
          content: prompt.trim(),
          status: 'suggested'
        });

      if (error) throw error;

      toast({ title: 'Saved', description: 'Prompt saved to your library' });
      fetchSavedPrompts();
    } catch (e: any) {
      console.error('Error saving prompt', e);
      toast({ title: 'Error', description: e.message || 'Failed to save prompt', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default">Active</Badge>;
      case 'suggested':
        return <Badge variant="secondary">Suggested</Badge>;
      case 'inactive':
        return <Badge variant="outline">Inactive</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
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
            <Label htmlFor="brandName" className="block">Brand name (for visibility scoring)</Label>
            <Input
              id="brandName"
              placeholder="e.g., Tesla, Apple, Microsoft"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
            />
            <Label htmlFor="prompt" className="block">Enter your prompt</Label>
            <Textarea
              id="prompt"
              placeholder="Ask anything you'd like to test across AI platforms..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="secondary"
              onClick={handleSavePrompt}
              disabled={isSaving || !prompt.trim()}
              className="sm:w-1/3"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <BookmarkPlus className="w-4 h-4 mr-2" />
                  Save as Draft
                </>
              )}
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={isProcessing || !prompt.trim() || !brandName.trim()}
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
          </div>
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
                  <TableHead>Status</TableHead>
                  <TableHead>Visibility</TableHead>
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
                      {getStatusBadge(prompt.status)}
                    </TableCell>
                    <TableCell>
                      {prompt.visibility_score !== undefined ? (
                        <div className="flex items-center gap-2">
                          <Target className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{prompt.visibility_score}%</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
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
                          setPrompt(prompt.content);
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
    </div>
  );
};
