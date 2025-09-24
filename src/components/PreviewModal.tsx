import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Copy, CheckCircle, FileText, HelpCircle, Code, Edit } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface PreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: string;
  type: string;
  onApply: () => void;
}

const PreviewModal = ({ open, onOpenChange, content, type, onApply }: PreviewModalProps) => {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case "description": return <Edit className="h-4 w-4" />;
      case "faq": return <HelpCircle className="h-4 w-4" />;
      case "schema": return <Code className="h-4 w-4" />;
      case "content": return <FileText className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "description": return "Product Description";
      case "faq": return "FAQ Section";
      case "schema": return "Schema Markup";
      case "content": return "Content Enhancement";
      default: return "Generated Content";
    }
  };

  const handleCopyContent = async () => {
    try {
      await navigator.clipboard.writeText(content);
      toast({
        title: "Copied!",
        description: "Content copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy content",
        variant: "destructive",
      });
    }
  };

  const handleApply = () => {
    onApply();
    toast({
      title: "Applied!",
      description: "Content has been applied to your store",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getTypeIcon(type)}
            Preview: {getTypeLabel(type)}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="capitalize">
              {type}
            </Badge>
            <Badge className="bg-primary text-primary-foreground">
              AI Generated
            </Badge>
          </div>

          <ScrollArea className="h-[400px] w-full rounded-md border p-4">
            <div className="whitespace-pre-wrap text-sm">
              {type === "schema" ? (
                <pre className="bg-muted p-4 rounded-md overflow-x-auto">
                  <code>{content}</code>
                </pre>
              ) : (
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  {content.split('\n').map((line, index) => {
                    if (line.startsWith('# ')) {
                      return <h1 key={index} className="text-lg font-bold mt-4 mb-2">{line.substring(2)}</h1>;
                    }
                    if (line.startsWith('## ')) {
                      return <h2 key={index} className="text-base font-semibold mt-3 mb-2">{line.substring(3)}</h2>;
                    }
                    if (line.startsWith('• ')) {
                      return <li key={index} className="ml-4">{line.substring(2)}</li>;
                    }
                    if (line.startsWith('**') && line.endsWith('**')) {
                      return <p key={index} className="font-semibold mt-2">{line.slice(2, -2)}</p>;
                    }
                    if (line.trim() === '') {
                      return <br key={index} />;
                    }
                    return <p key={index} className="mt-1">{line}</p>;
                  })}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={handleCopyContent} className="flex items-center gap-2">
            <Copy className="h-4 w-4" />
            Copy Content
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleApply} className="bg-success hover:bg-success/90 text-success-foreground">
              <CheckCircle className="h-4 w-4 mr-2" />
              Apply to Store
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PreviewModal;