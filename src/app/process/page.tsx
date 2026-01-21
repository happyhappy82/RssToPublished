"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, Sparkles, Copy, X, Loader2, Save, Settings, CheckSquare, Square, FileText, List, MessageSquare, Download } from "lucide-react";
import { useScrapedContents } from "@/hooks/useScrapedContent";
import { useCreateQueueItem } from "@/hooks/useQueue";
import { CONTENT_TYPE_LABELS, DEFAULT_PROMPTS } from "@/lib/constants";
import { parseContent } from "@/lib/utils/parseContent";
import type { ContentType, Platform } from "@/types";

const TARGET_PLATFORMS: Platform[] = ["threads", "linkedin", "twitter"];

function ProcessorContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const contentId = searchParams?.get("id") ?? null;

  const { data: scrapedData } = useScrapedContents({ limit: 100 });
  const scraped = scrapedData?.data || [];
  const createQueueItem = useCreateQueueItem();

  const [selectedContent, setSelectedContent] = useState<typeof scraped[0] | null>(null);
  const [contentType, setContentType] = useState<ContentType>("insight");
  const [aiResult, setAiResult] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isFetchingContent, setIsFetchingContent] = useState(false);
  const [targetPlatforms, setTargetPlatforms] = useState<Platform[]>(["threads", "linkedin"]);
  const [sourceTab, setSourceTab] = useState<"all" | "main" | "thread" | "comments">("all");
  const [showModelSettings, setShowModelSettings] = useState(false);

  // 모델 설정 (로컬 스토리지에서 불러오기)
  const [modelSettings, setModelSettings] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("model_settings");
      return saved ? JSON.parse(saved) : {
        model: "gemini-3-flash-preview",
        temperature: 0.8,
        maxTokens: 1024,
      };
    }
    return { model: "gemini-3-flash-preview", temperature: 0.8, maxTokens: 1024 };
  });

  // 유형별 프롬프트 맵 (로컬 스토리지에서 불러오기)
  const [promptsMap, setPromptsMap] = useState<Record<ContentType, string>>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("user_prompts");
      return saved ? JSON.parse(saved) : DEFAULT_PROMPTS;
    }
    return DEFAULT_PROMPTS;
  });
  const [currentPrompt, setCurrentPrompt] = useState<string>(promptsMap[contentType]);

  // URL에서 contentId가 있으면 해당 콘텐츠 선택
  useEffect(() => {
    if (contentId && scraped.length > 0) {
      const found = scraped.find((s) => s.id === contentId);
      if (found) setSelectedContent(found);
    }
  }, [contentId, scraped]);

  // 콘텐츠 타입 변경 시 프롬프트 업데이트
  useEffect(() => {
    setCurrentPrompt(promptsMap[contentType]);
  }, [contentType, promptsMap]);

  // 프롬프트 저장
  const savePrompt = () => {
    const newMap = { ...promptsMap, [contentType]: currentPrompt };
    setPromptsMap(newMap);
    localStorage.setItem("user_prompts", JSON.stringify(newMap));
    alert(`${CONTENT_TYPE_LABELS[contentType]} 유형의 프롬프트가 저장되었습니다.`);
  };

  // 본문만 가져오기 (Apify로 실제 콘텐츠 fetch)
  const handleFetchContent = async () => {
    if (!selectedContent) return;
    setIsFetchingContent(true);

    try {
      const response = await fetch("/api/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scraped_content_id: selectedContent.id,
          fetch_only: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "본문 가져오기 실패");
      }

      const data = await response.json();
      if (data.success && data.content) {
        // Update selectedContent with fetched content
        setSelectedContent({
          ...selectedContent,
          content: data.content,
          author: data.author || selectedContent.author,
        });
        if (data.fetched) {
          alert("본문을 성공적으로 가져왔습니다!");
        } else {
          alert("Apify에서 본문을 가져오지 못했습니다. 잠시 후 다시 시도해주세요.");
        }
      } else {
        alert("본문을 가져올 수 없습니다.");
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : "본문 가져오기에 실패했습니다.");
    } finally {
      setIsFetchingContent(false);
    }
  };

  const handleProcess = async () => {
    if (!selectedContent) return;
    setIsProcessing(true);

    try {
      const response = await fetch("/api/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scraped_content_id: selectedContent.id,
          content_type: contentType,
          prompt_used: currentPrompt,
          model_settings: modelSettings,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Processing failed");
      }

      const data = await response.json();
      setAiResult(data.data?.processed_content || "응답이 생성되지 않았습니다.");
    } catch (error) {
      alert(error instanceof Error ? error.message : "AI 처리에 실패했습니다.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(aiResult);
    alert("클립보드에 복사되었습니다.");
  };

  const togglePlatform = (p: Platform) => {
    if (targetPlatforms.includes(p)) {
      setTargetPlatforms(targetPlatforms.filter((item) => item !== p));
    } else {
      setTargetPlatforms([...targetPlatforms, p]);
    }
  };

  const handleAddToQueue = async () => {
    if (!aiResult) return;
    if (targetPlatforms.length === 0) {
      alert("최소 하나 이상의 플랫폼을 선택해주세요.");
      return;
    }

    try {
      await createQueueItem.mutateAsync({
        content: aiResult,
        target_platforms: targetPlatforms,
        processed_content_id: selectedContent?.id,
      });
      router.push("/queue");
    } catch {
      alert("대기열 추가에 실패했습니다");
    }
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">콘텐츠 AI 랩</h2>
        <button
          className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-2 px-4 rounded-xl flex items-center space-x-2 text-sm transition-all"
          onClick={() => setShowModelSettings(true)}
        >
          <Settings size={18} />
          <span>모델 설정</span>
        </button>
      </div>

      {!selectedContent ? (
        <div className="flex-1 border-2 border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center text-slate-500 space-y-4 min-h-[400px]">
          <Search size={48} />
          <p>수집된 콘텐츠를 선택하여 AI 마케팅 가공을 시작하세요.</p>

          {/* Content Selector */}
          <div className="w-full max-w-2xl px-8 mt-4">
            <select
              onChange={(e) => {
                const found = scraped.find((s) => s.id === e.target.value);
                if (found) setSelectedContent(found);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">스크랩된 콘텐츠 선택...</option>
              {scraped.map((item) => (
                <option key={item.id} value={item.id}>
                  [{item.platform}] {item.title || item.content.slice(0, 50)}...
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => router.push("/scraped")}
            className="text-emerald-500 underline"
          >
            콘텐츠 선택하기
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1 overflow-hidden pb-4">
          {/* 설정 영역 */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col space-y-6 overflow-y-auto">
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-xs font-semibold uppercase text-slate-500">원본 소스</h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleFetchContent}
                    disabled={isFetchingContent}
                    className="text-xs text-blue-500 hover:text-blue-400 flex items-center space-x-1 disabled:opacity-50"
                  >
                    {isFetchingContent ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Download size={12} />
                    )}
                    <span>{isFetchingContent ? "가져오는 중..." : "본문 가져오기"}</span>
                  </button>
                  <span className="text-slate-700">|</span>
                  <button
                    onClick={() => setSelectedContent(null)}
                    className="text-xs text-slate-500 hover:text-white flex items-center space-x-1"
                  >
                    <X size={12} />
                    <span>콘텐츠 변경</span>
                  </button>
                </div>
              </div>
              {/* RSS 원본 경고 */}
              {(selectedContent.content?.includes("<div") || selectedContent.content?.includes("<iframe")) && (
                <div className="mb-2 p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <p className="text-xs text-amber-400">
                    RSS 원본 데이터입니다. &quot;본문 가져오기&quot; 버튼을 눌러 실제 콘텐츠를 가져오세요.
                  </p>
                </div>
              )}
              {(() => {
                const parsed = parseContent(selectedContent.content);
                if (!parsed.hasStructure) {
                  return (
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 max-h-64 overflow-y-auto text-sm text-slate-300 whitespace-pre-wrap">
                      {selectedContent.content}
                    </div>
                  );
                }
                return (
                  <div className="space-y-2">
                    {/* Tabs */}
                    <div className="flex space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                      <button
                        onClick={() => setSourceTab("all")}
                        className={`flex-1 px-3 py-1.5 rounded text-xs font-medium transition-all flex items-center justify-center space-x-1 ${
                          sourceTab === "all"
                            ? "bg-blue-600/20 text-blue-400"
                            : "text-slate-500 hover:text-slate-300"
                        }`}
                      >
                        <span>전체</span>
                      </button>
                      <button
                        onClick={() => setSourceTab("main")}
                        className={`flex-1 px-3 py-1.5 rounded text-xs font-medium transition-all flex items-center justify-center space-x-1 ${
                          sourceTab === "main"
                            ? "bg-blue-600/20 text-blue-400"
                            : "text-slate-500 hover:text-slate-300"
                        }`}
                      >
                        <FileText size={12} />
                        <span>본문</span>
                      </button>
                      {parsed.threadPosts.length > 0 && (
                        <button
                          onClick={() => setSourceTab("thread")}
                          className={`flex-1 px-3 py-1.5 rounded text-xs font-medium transition-all flex items-center justify-center space-x-1 ${
                            sourceTab === "thread"
                              ? "bg-blue-600/20 text-blue-400"
                              : "text-slate-500 hover:text-slate-300"
                          }`}
                        >
                          <List size={12} />
                          <span>연속</span>
                        </button>
                      )}
                      {parsed.comments.length > 0 && (
                        <button
                          onClick={() => setSourceTab("comments")}
                          className={`flex-1 px-3 py-1.5 rounded text-xs font-medium transition-all flex items-center justify-center space-x-1 ${
                            sourceTab === "comments"
                              ? "bg-blue-600/20 text-blue-400"
                              : "text-slate-500 hover:text-slate-300"
                          }`}
                        >
                          <MessageSquare size={12} />
                          <span>댓글</span>
                        </button>
                      )}
                    </div>

                    {/* Content */}
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 max-h-64 overflow-y-auto text-sm text-slate-300 whitespace-pre-wrap">
                      {sourceTab === "all" && selectedContent.content}
                      {sourceTab === "main" && parsed.mainContent}
                      {sourceTab === "thread" && parsed.threadPosts.map((post, idx) => (
                        <div key={idx} className="mb-3 pb-3 border-b border-slate-800 last:border-0">
                          <div className="text-xs text-blue-500 font-bold mb-1">{idx + 1}번</div>
                          <div>{post}</div>
                        </div>
                      ))}
                      {sourceTab === "comments" && parsed.comments.map((comment, idx) => (
                        <div key={idx} className={`mb-1 ${comment.startsWith("└") ? "ml-4 text-slate-400" : ""}`}>
                          {comment}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">마케팅 콘텐츠 유형</label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(CONTENT_TYPE_LABELS) as ContentType[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => setContentType(type)}
                      className={`p-2 rounded-xl text-xs font-medium border transition-all ${
                        contentType === type
                          ? "bg-blue-600/20 border-blue-500 text-blue-400"
                          : "bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700"
                      }`}
                    >
                      {CONTENT_TYPE_LABELS[type]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block text-sm font-medium">유형별 커스텀 프롬프트</label>
                  <button
                    onClick={savePrompt}
                    className="text-xs text-emerald-500 hover:text-emerald-400 flex items-center space-x-1"
                  >
                    <Save size={14} />
                    <span>프롬프트 저장</span>
                  </button>
                </div>
                <textarea
                  rows={5}
                  value={currentPrompt}
                  onChange={(e) => setCurrentPrompt(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-light leading-relaxed"
                  placeholder={`${CONTENT_TYPE_LABELS[contentType]} 유형을 위한 지시사항을 입력하세요...`}
                />
              </div>

              <button
                onClick={handleProcess}
                disabled={isProcessing}
                className={`w-full py-4 rounded-xl font-bold flex items-center justify-center space-x-2 transition-all ${
                  isProcessing
                    ? "bg-slate-700 cursor-not-allowed text-slate-500"
                    : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-lg hover:shadow-blue-900/40"
                }`}
              >
                {isProcessing ? <Loader2 className="animate-spin" /> : <Sparkles size={20} />}
                <span>{isProcessing ? "AI가 마케팅 문구 작성 중..." : "마케팅 포스트 생성"}</span>
              </button>
            </div>
          </div>

          {/* 결과 및 대기열 전송 */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col space-y-4 overflow-hidden">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-semibold uppercase text-slate-500">가공 완료 결과</h3>
              <button
                onClick={handleCopy}
                className="p-2 text-slate-400 hover:bg-slate-800 rounded-lg transition-colors"
                disabled={!aiResult}
              >
                <Copy size={18} />
              </button>
            </div>
            <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-5 overflow-y-auto whitespace-pre-wrap text-slate-200 text-sm leading-relaxed scrollbar-hide min-h-[200px]">
              {aiResult ||
                "AI가 생성한 결과물이 여기에 표시됩니다. 왼쪽에서 설정을 마치고 '생성' 버튼을 눌러주세요."}
            </div>

            {aiResult && (
              <div className="p-4 bg-slate-950/50 border border-slate-800 rounded-xl space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-slate-500">게시 채널 선택</span>
                  <div className="flex space-x-4">
                    {TARGET_PLATFORMS.map((p) => (
                      <button
                        key={p}
                        onClick={() => togglePlatform(p)}
                        className="flex items-center space-x-2 text-xs transition-colors"
                      >
                        {targetPlatforms.includes(p) ? (
                          <CheckSquare size={16} className="text-blue-500" />
                        ) : (
                          <Square size={16} className="text-slate-600" />
                        )}
                        <span className={targetPlatforms.includes(p) ? "text-white" : "text-slate-500"}>
                          {p.charAt(0).toUpperCase() + p.slice(1)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={handleAddToQueue}
                  disabled={createQueueItem.isPending}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-900/20"
                >
                  {createQueueItem.isPending ? "추가 중..." : "업로드 대기열에 추가하기"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 모델 설정 모달 */}
      {showModelSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-xl font-bold flex items-center space-x-2">
                <Settings size={20} className="text-blue-500" />
                <span>AI 모델 설정</span>
              </h3>
              <button
                onClick={() => setShowModelSettings(false)}
                className="text-slate-500 hover:text-white p-1 hover:bg-slate-800 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">모델 선택</label>
                <select
                  value={modelSettings.model}
                  onChange={(e) => setModelSettings({ ...modelSettings, model: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="gemini-3-flash-preview">Gemini 3 Flash Preview (최신)</option>
                  <option value="gemini-2.0-flash-exp">Gemini 2.0 Flash Exp</option>
                  <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                  <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                  <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  창의성 (Temperature): {modelSettings.temperature}
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={modelSettings.temperature}
                  onChange={(e) => setModelSettings({ ...modelSettings, temperature: parseFloat(e.target.value) })}
                  className="w-full accent-blue-500"
                />
                <div className="flex justify-between text-xs text-slate-600 mt-1">
                  <span>정확함</span>
                  <span>창의적</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  최대 토큰 수: {modelSettings.maxTokens}
                </label>
                <input
                  type="range"
                  min="256"
                  max="4096"
                  step="256"
                  value={modelSettings.maxTokens}
                  onChange={(e) => setModelSettings({ ...modelSettings, maxTokens: parseInt(e.target.value) })}
                  className="w-full accent-blue-500"
                />
                <div className="flex justify-between text-xs text-slate-600 mt-1">
                  <span>짧게</span>
                  <span>길게</span>
                </div>
              </div>

              <button
                onClick={() => {
                  localStorage.setItem("model_settings", JSON.stringify(modelSettings));
                  setShowModelSettings(false);
                  alert("모델 설정이 저장되었습니다.");
                }}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProcessorPage() {
  return (
    <Suspense fallback={<div className="text-center text-slate-500 py-12">로딩 중...</div>}>
      <ProcessorContent />
    </Suspense>
  );
}
