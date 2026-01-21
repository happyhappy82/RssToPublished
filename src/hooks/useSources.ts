"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Source, Platform } from "@/types";

interface CreateSourceInput {
  platform: Platform;
  account_name: string;
  rss_url: string;
  account_url?: string;
  nickname?: string;
  category?: string;
}

interface SourcesResponse {
  data: Source[];
}

async function fetchSources(): Promise<Source[]> {
  const response = await fetch("/api/sources");
  if (!response.ok) {
    throw new Error("Failed to fetch sources");
  }
  const result: SourcesResponse = await response.json();
  return result.data || [];
}

async function createSource(input: CreateSourceInput): Promise<Source> {
  const response = await fetch("/api/sources", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error("Failed to create source");
  }
  const result = await response.json();
  return result.data;
}

async function deleteSource(id: string): Promise<void> {
  const response = await fetch(`/api/sources?id=${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error("Failed to delete source");
  }
}

interface ScrapeResult {
  success: boolean;
  totalScraped: number;
  results: { sourceId: string; platform: string; scraped: number; errors: string[] }[];
}

async function scrapeSource(sourceId?: string): Promise<ScrapeResult> {
  const response = await fetch("/api/scrape", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sourceId ? { source_id: sourceId } : {}),
  });
  if (!response.ok) {
    throw new Error("Failed to scrape");
  }
  return response.json();
}

export function useSources() {
  return useQuery({
    queryKey: ["sources"],
    queryFn: fetchSources,
  });
}

export function useSourcesByPlatform(platform?: Platform) {
  const { data: sources, ...rest } = useSources();

  const filteredSources = platform
    ? sources?.filter((s) => s.platform === platform)
    : sources;

  return { data: filteredSources, ...rest };
}

export function useCreateSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createSource,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sources"] });
    },
  });
}

export function useDeleteSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteSource,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sources"] });
    },
  });
}

export function useScrapeSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: scrapeSource,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sources"] });
      queryClient.invalidateQueries({ queryKey: ["scrapedContents"] });
    },
  });
}

// 카테고리 목록 가져오기
async function fetchCategories(): Promise<string[]> {
  const response = await fetch("/api/sources?categories_only=true");
  if (!response.ok) {
    throw new Error("Failed to fetch categories");
  }
  const result = await response.json();
  return result.data || [];
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });
}

export function useSourcesByCategory(category?: string) {
  const { data: sources, ...rest } = useSources();

  const filteredSources = category && category !== "all"
    ? sources?.filter((s) => s.category === category)
    : sources;

  return { data: filteredSources, ...rest };
}
