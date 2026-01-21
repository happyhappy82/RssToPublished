"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ScrapedContent, Platform } from "@/types";

interface FetchContentsParams {
  platform?: Platform;
  sourceId?: string;
  category?: string;
  page?: number;
  limit?: number;
}

interface ContentsResponse {
  data: ScrapedContent[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface ContentsResult {
  data: ScrapedContent[];
  total: number;
  page: number;
  limit: number;
}

async function fetchContents(params: FetchContentsParams): Promise<ContentsResult> {
  const searchParams = new URLSearchParams();

  if (params.platform) searchParams.set("platform", params.platform);
  if (params.sourceId) searchParams.set("source_id", params.sourceId);
  if (params.category) searchParams.set("category", params.category);
  if (params.page) searchParams.set("page", params.page.toString());
  if (params.limit) searchParams.set("limit", params.limit.toString());

  const response = await fetch(`/api/contents?${searchParams.toString()}`);
  if (!response.ok) {
    throw new Error("Failed to fetch contents");
  }

  const result: ContentsResponse = await response.json();

  return {
    data: result.data || [],
    total: result.pagination?.total || 0,
    page: result.pagination?.page || 1,
    limit: result.pagination?.limit || 20,
  };
}

export function useScrapedContents(params: FetchContentsParams = {}) {
  return useQuery({
    queryKey: ["scrapedContents", params],
    queryFn: () => fetchContents(params),
  });
}

export function useScrapedContentsByPlatform(platform?: Platform) {
  return useScrapedContents({ platform });
}

async function deleteContent(id: string): Promise<void> {
  const response = await fetch(`/api/contents?id=${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error("Failed to delete content");
  }
}

export function useDeleteContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteContent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scrapedContents"] });
    },
  });
}

async function deleteAllContents(): Promise<void> {
  const response = await fetch(`/api/contents?all=true`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error("Failed to delete all contents");
  }
}

async function toggleUsed(id: string, isUsed: boolean): Promise<ScrapedContent> {
  const response = await fetch("/api/contents", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, is_used: isUsed }),
  });
  if (!response.ok) {
    throw new Error("Failed to toggle used status");
  }
  const result = await response.json();
  return result.data;
}

export function useDeleteAllContents() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteAllContents,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scrapedContents"] });
    },
  });
}

export function useToggleUsed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isUsed }: { id: string; isUsed: boolean }) => toggleUsed(id, isUsed),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scrapedContents"] });
    },
  });
}
