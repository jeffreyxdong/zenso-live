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
  recommendations?: Recommendat
