"use client";

import { useState } from "react";
import { ExternalLink, Sparkles, Youtube, Twitter, Linkedin, MessageCircle, Eye, Trash2, Download, Loader2, Check, Circle } from "lucide-react";
import { useScrapedContents, useDeleteContent, useDeleteAllContents, useToggleUsed } from "@/hooks/useScrapedContent";
import { useCategories } from "@/hooks/useSources";
import { useProcessStore } from "@/store";
import ContentDetailModal from "@/components/ContentDetailModal";
import AIProcessModal from "@/components/AIProcessModal";
import type { Platform, ScrapedContent } from "@/types";

const PlatformIcon = ({ platform, size = 12 }: { platform: Platform; size?: number }) => {
  switch (platform) {
    case "youtube":
      return <Youtube size={size} />;
    case "twitter":
      return <Twitter size={size} />;
    case "linkedin":
      return <Linkedin size={size} />;
    case "threads":
      return <MessageCircle size={size} />;
    default:
      return null;
  }
};

export default function ScrapedPage() {
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const { data: categories } = useCategories();
  const { data: scrapedData, isLoading, refetch } = useScrapedContents({
    limit: 50,
    category: filterCategory === "all" ? undefined : filterCategory,
  });
  const scrapedRaw = scrapedData?.data || [];

  // 글로벌 상태에서 처리 중인 작업들 가져오기 (정렬에서 사용하므로 먼저 선언)
  const { processingJobs } = useProcessStore();

  // 정렬: 완료된 것 > 처리 중 > 일반 > 사용됨(가려진 것)
  const scraped = [...scrapedRaw].sort((a, b) => {
    const aCompleted = processingJobs[a.id]?.status === "completed";
    const bCompleted = processingJobs[b.id]?.status === "completed";
    const aProcessing = processingJobs[a.id]?.status === "processing";
    const bProcessing = processingJobs[b.id]?.status === "processing";
    const aUsed = a.is_used;
    const bUsed = b.is_used;

    // 사용됨(가려진 것)은 맨 아래로
    if (aUsed && !bUsed) return 1;
    if (!aUsed && bUsed) return -1;

    // 완료된 것 먼저, 그 다음 처리 중, 나머지
    if (aCompleted && !bCompleted) return -1;
    if (!aCompleted && bCompleted) return 1;
    if (aProcessing && !bProcessing) return -1;
    if (!aProcessing && bProcessing) return 1;
    return 0;
  });
  const [selectedContent, setSelectedContent] = useState<(typeof scraped)[0] | null>(null);
  const [aiProcessContent, setAiProcessContent] = useState<ScrapedContent | null>(null);
  const [fetchingIds, setFetchingIds] = useState<Set<string>>(new Set());
  // YouTube 댓글 포함 여부 (아이템별로 관리)
  const [includeCommentsMap, setIncludeCommentsMap] = useState<Record<string, boolean>>({});
  const deleteContent = useDeleteContent();
  const deleteAllContents = useDeleteAllContents();
  const toggleUsed = useToggleUsed();

  // 본문 가져오기 (Apify로 실제 콘텐츠 fetch)
  const handleFetchContent = async (id: string, includeComments?: boolean) => {
    setFetchingIds(prev => new Set(prev).add(id));
    try {
      const response = await fetch("/api/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scraped_content_id: id,
          fetch_only: true,
          include_comments: includeComments || false,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "본문 가져오기 실패");
      }

      if (data.success) {
        // Refetch to update the list
        await refetch();
        if (!data.fetched) {
          alert("Apify에서 본문을 가져오지 못했습니다. 잠시 후 다시 시도해주세요.");
        }
      } else {
        alert("본문을 가져올 수 없습니다.");
      }
    } catch (error) {
      console.error("Fetch content error:", error);
      alert(error instanceof Error ? error.message : "본문 가져오기에 실패했습니다.");
    } finally {
      setFetchingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`"${title || '제목 없음'}" 콘텐츠를 삭제하시겠습니까?`)) {
      return;
    }
    try {
      await deleteContent.mutateAsync(id);
    } catch {
      alert("콘텐츠 삭제에 실패했습니다");
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm(`⚠️ 수집된 모든 콘텐츠(${scraped.length}개)를 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`)) {
      return;
    }
    try {
      await deleteAllContents.mutateAsync();
    } catch {
      alert("전체 삭제에 실패했습니다");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">수집된 콘텐츠 목록</h2>
        <div className="flex items-center space-x-3">
          {/* 분야 필터 */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">모든 분야</option>
            {categories?.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          {scraped.length > 0 && (
            <button
              onClick={handleDeleteAll}
              disabled={deleteAllContents.isPending}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl font-medium transition-all flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 size={18} />
              <span>{deleteAllContents.isPending ? "삭제 중..." : "전체 삭제"}</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {isLoading ? (
          <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 p-12 rounded-2xl text-center text-slate-400">
            로딩 중...
          </div>
        ) : scraped.length === 0 ? (
          <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 p-12 rounded-2xl text-center text-slate-400">
            {filterCategory === "all"
              ? "아직 스크랩된 콘텐츠가 없습니다. 소스를 추가하고 스크래퍼가 실행될 때까지 기다려주세요."
              : `"${filterCategory}" 분야의 콘텐츠가 없습니다.`}
          </div>
        ) : (
          scraped.map((item) => (
            <div
              key={item.id}
              className={`bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 p-6 rounded-2xl hover:border-slate-500/50 transition-all flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0 shadow-lg ${
                item.is_used ? "opacity-40" : ""
              }`}
            >
              <div className="space-y-1 max-w-2xl">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="p-1 bg-slate-950 rounded text-slate-400">
                    <PlatformIcon platform={item.platform} />
                  </div>
                  <span className="text-xs font-bold text-blue-500 uppercase">
                    {item.platform}
                  </span>
                  <span className="text-xs text-slate-500">•</span>
                  <span className="text-xs text-slate-500">
                    {item.source?.account_name || item.author || "알 수 없음"}
                  </span>
                  <span className="text-xs text-slate-500">•</span>
                  <span className="text-xs text-slate-500">
                    {new Date(item.created_at).toLocaleDateString()}
                  </span>
                  {(item.category || item.source?.category) && (
                    <>
                      <span className="text-xs text-slate-500">•</span>
                      <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded text-xs font-medium">
                        {item.category || item.source?.category}
                      </span>
                    </>
                  )}
                </div>
                <h4 className="text-lg font-bold">{item.title || "제목 없음"}</h4>
                <p className="text-sm text-slate-400 line-clamp-2 leading-relaxed">
                  {item.content?.includes("<div") || item.content?.includes("<iframe") || item.content?.length < 100
                    ? "본문을 가져와주세요"
                    : item.content}
                </p>
              </div>
              <div className="flex items-center space-x-3 w-full md:w-auto">
                {/* 사용 여부 토글 */}
                <button
                  onClick={() => toggleUsed.mutate({ id: item.id, isUsed: !item.is_used })}
                  className={`p-3 rounded-xl transition-all ${
                    item.is_used
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                  }`}
                  title={item.is_used ? "사용 취소" : "사용함 표시"}
                >
                  {item.is_used ? <Check size={18} /> : <Circle size={18} />}
                </button>
                {item.original_url && (
                  <a
                    href={item.original_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 transition-colors"
                    title="원본 보기"
                  >
                    <ExternalLink size={18} />
                  </a>
                )}
                <button
                  onClick={() => setSelectedContent(item)}
                  className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 transition-colors"
                  title="자세히보기"
                >
                  <Eye size={18} />
                </button>
                <button
                  onClick={() => handleDelete(item.id, item.title || '')}
                  className="p-3 bg-slate-800 hover:bg-red-600 rounded-xl text-slate-300 hover:text-white transition-all"
                  title="삭제"
                  disabled={deleteContent.isPending}
                >
                  <Trash2 size={18} />
                </button>
                {/* YouTube인 경우 댓글 포함 체크박스 */}
                {item.platform === "youtube" && (
                  <label className="flex items-center space-x-1 text-xs text-slate-400 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={includeCommentsMap[item.id] || false}
                      onChange={(e) => setIncludeCommentsMap(prev => ({ ...prev, [item.id]: e.target.checked }))}
                      className="w-3.5 h-3.5 rounded border-slate-600 bg-slate-900 text-yellow-500 focus:ring-yellow-500 focus:ring-offset-slate-900"
                    />
                    <span>댓글</span>
                  </label>
                )}
                <button
                  onClick={() => handleFetchContent(item.id, includeCommentsMap[item.id])}
                  disabled={fetchingIds.has(item.id)}
                  className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white px-5 py-3 rounded-xl flex items-center justify-center space-x-2 font-medium transition-all"
                  title="본문 가져오기"
                >
                  {fetchingIds.has(item.id) ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Download size={18} />
                  )}
                  <span className="hidden sm:inline">{fetchingIds.has(item.id) ? "가져오는 중..." : "본문"}</span>
                </button>
                <button
                  onClick={() => setAiProcessContent(item as ScrapedContent)}
                  disabled={processingJobs[item.id]?.status === "processing"}
                  className={`flex-1 md:flex-none text-white px-6 py-3 rounded-xl flex items-center justify-center space-x-2 font-medium transition-all ${
                    processingJobs[item.id]?.status === "completed"
                      ? "bg-blue-600 hover:bg-blue-500"
                      : processingJobs[item.id]?.status === "processing"
                      ? "bg-slate-700 cursor-not-allowed"
                      : "bg-emerald-600 hover:bg-emerald-500"
                  }`}
                >
                  {processingJobs[item.id]?.status === "processing" ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : processingJobs[item.id]?.status === "completed" ? (
                    <Check size={18} />
                  ) : (
                    <Sparkles size={18} />
                  )}
                  <span>
                    {processingJobs[item.id]?.status === "processing"
                      ? "생성 중..."
                      : processingJobs[item.id]?.status === "completed"
                      ? "생성 완료!"
                      : "AI로 가공"}
                  </span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 상세보기 모달 */}
      {selectedContent && (
        <ContentDetailModal
          isOpen={!!selectedContent}
          onClose={() => setSelectedContent(null)}
          content={selectedContent.content}
          title={selectedContent.title || undefined}
          author={selectedContent.author || selectedContent.source?.account_name || undefined}
          platform={selectedContent.platform}
          isProcessed={selectedContent.is_processed}
          contentId={selectedContent.id}
          onFetchContent={async (id) => {
            await handleFetchContent(id);
          }}
        />
      )}

      {/* AI 가공 모달 */}
      {aiProcessContent && (
        <AIProcessModal
          isOpen={!!aiProcessContent}
          onClose={() => setAiProcessContent(null)}
          content={aiProcessContent}
          onSuccess={() => refetch()}
        />
      )}
    </div>
  );
}
