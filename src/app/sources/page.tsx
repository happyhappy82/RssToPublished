"use client";

import { useState } from "react";
import { Plus, Trash2, RefreshCcw, X, CheckCircle2, Loader2, Youtube, Twitter, Linkedin, MessageCircle, Globe, Rss, Tag } from "lucide-react";
import { useSources, useCreateSource, useDeleteSource, useScrapeSource, useCategories } from "@/hooks/useSources";
import type { Platform } from "@/types";

const PlatformIcon = ({ platform, size = 14 }: { platform: Platform | "auto"; size?: number }) => {
  switch (platform) {
    case "youtube":
      return <Youtube size={size} />;
    case "twitter":
      return <Twitter size={size} />;
    case "linkedin":
      return <Linkedin size={size} />;
    case "threads":
      return <MessageCircle size={size} />;
    case "website":
      return <Globe size={size} />;
    case "auto":
      return <Rss size={size} />;
    default:
      return null;
  }
};


export default function SourcesPage() {
  const { data: sources, isLoading } = useSources();
  const { data: categories } = useCategories();
  const createSource = useCreateSource();
  const deleteSource = useDeleteSource();
  const scrapeSource = useScrapeSource();

  const [showAddModal, setShowAddModal] = useState(false);
  const [newSource, setNewSource] = useState({
    account_name: "",
    rss_url: "",
    category: "",
  });
  const [newCategory, setNewCategory] = useState("");
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const handleAddSource = async () => {
    if (!newSource.account_name || !newSource.rss_url) {
      alert("이름과 RSS URL을 입력해주세요");
      return;
    }

    // 새 카테고리 생성 중이면 새 카테고리 사용
    const categoryToUse = isCreatingCategory ? newCategory : newSource.category;

    try {
      // platform은 "website"로 기본 설정 (실제 플랫폼은 수집 시 개별 URL에서 자동 감지)
      const created = await createSource.mutateAsync({
        ...newSource,
        platform: "website",
        category: categoryToUse || undefined,
      });
      // 소스 생성 후 바로 수집 시작
      if (created?.id) {
        scrapeSource.mutate(created.id);
      }
      setShowAddModal(false);
      setNewSource({
        account_name: "",
        rss_url: "",
        category: "",
      });
      setNewCategory("");
      setIsCreatingCategory(false);
    } catch (error) {
      console.error("소스 추가 에러:", error);
      alert(`소스 추가에 실패했습니다: ${error instanceof Error ? error.message : "알 수 없는 오류"}`);
    }
  };

  // 필터링된 소스 목록
  const filteredSources = filterCategory === "all"
    ? sources
    : sources?.filter(s => s.category === filterCategory);

  const handleScrape = async (sourceId?: string) => {
    try {
      const result = await scrapeSource.mutateAsync(sourceId);
      if (result.totalScraped > 0) {
        alert(`${result.totalScraped}개의 콘텐츠를 수집했습니다!`);
      } else {
        const errors = result.results.flatMap(r => r.errors).filter(Boolean);
        if (errors.length > 0) {
          alert(`수집 실패: ${errors[0]}`);
        } else {
          alert("새로운 콘텐츠가 없습니다.");
        }
      }
    } catch {
      alert("수집에 실패했습니다");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("이 소스를 삭제하시겠습니까?")) {
      try {
        await deleteSource.mutateAsync(id);
      } catch {
        alert("소스 삭제에 실패했습니다");
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">해외 소스 관리</h2>
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
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl flex items-center space-x-2 transition-all shadow-lg shadow-blue-900/20"
          >
            <Plus size={18} />
            <span>계정 추가</span>
          </button>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-950/50 text-slate-400 text-xs uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">플랫폼</th>
              <th className="px-6 py-4">계정명</th>
              <th className="px-6 py-4">분야</th>
              <th className="px-6 py-4">상태</th>
              <th className="px-6 py-4">최근 수집</th>
              <th className="px-6 py-4 text-right">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                  로딩 중...
                </td>
              </tr>
            ) : filteredSources?.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                  {filterCategory === "all"
                    ? "아직 추가된 소스가 없습니다. \"계정 추가\"를 클릭하여 시작하세요."
                    : `"${filterCategory}" 분야의 소스가 없습니다.`}
                </td>
              </tr>
            ) : (
              filteredSources?.map((s) => (
                <tr key={s.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <span className="bg-slate-800 p-1.5 rounded-lg text-slate-300">
                        <PlatformIcon platform={s.platform} />
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 uppercase">
                        {s.platform}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-medium">
                    {s.nickname || s.account_name}
                  </td>
                  <td className="px-6 py-4">
                    {s.category ? (
                      <span className="px-2 py-1 bg-blue-500/10 text-blue-400 rounded-lg text-xs font-medium">
                        {s.category}
                      </span>
                    ) : (
                      <span className="text-slate-600 text-xs">미지정</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="flex items-center space-x-1.5 text-xs text-emerald-500">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span>{s.is_active ? "수집 중" : "비활성"}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {s.last_scraped_at
                      ? new Date(s.last_scraped_at).toLocaleString()
                      : "없음"}
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button
                      onClick={() => handleScrape(s.id)}
                      disabled={scrapeSource.isPending}
                      className="p-2 text-slate-400 hover:text-white bg-slate-950 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
                    >
                      <RefreshCcw size={16} className={scrapeSource.isPending ? "animate-spin" : ""} />
                    </button>
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="p-2 text-slate-400 hover:text-red-500 bg-slate-950 rounded-lg hover:bg-slate-800 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Source Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-xl font-bold flex items-center space-x-2">
                <Plus size={20} className="text-blue-500" />
                <span>새 마케팅 소스 추가</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-500 hover:text-white p-1 hover:bg-slate-800 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAddSource();
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5">
                  소스 이름
                </label>
                <input
                  type="text"
                  required
                  value={newSource.account_name}
                  onChange={(e) =>
                    setNewSource({ ...newSource, account_name: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="예: AI 스레더, 테크 유튜버"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5">
                  RSS URL
                </label>
                <input
                  type="url"
                  required
                  value={newSource.rss_url}
                  onChange={(e) =>
                    setNewSource({ ...newSource, rss_url: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="https://rss.app/feeds/xxx.xml"
                />
                <p className="text-xs text-slate-600 mt-1">
                  RSS.app에서 생성한 피드 URL을 입력하세요
                </p>
              </div>

              {/* 분야 선택/생성 */}
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5">
                  분야
                </label>
                {!isCreatingCategory ? (
                  <div className="space-y-2">
                    <select
                      value={newSource.category}
                      onChange={(e) => {
                        if (e.target.value === "__new__") {
                          setIsCreatingCategory(true);
                        } else {
                          setNewSource({ ...newSource, category: e.target.value });
                        }
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                      <option value="">분야 선택 (선택사항)</option>
                      {categories?.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                      <option value="__new__">+ 새 분야 만들기</option>
                    </select>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        placeholder="새 분야 이름 (예: AI, 경제, 마케팅)"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setIsCreatingCategory(false);
                          setNewCategory("");
                        }}
                        className="px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-400 text-sm"
                      >
                        취소
                      </button>
                    </div>
                    <p className="text-xs text-slate-600">
                      새 분야를 입력하면 자동으로 생성됩니다
                    </p>
                  </div>
                )}
              </div>

              {/* 플랫폼 자동 감지 안내 */}
              <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-3">
                <div className="flex items-center space-x-2">
                  <span className="bg-blue-500/20 p-1.5 rounded-lg text-blue-400">
                    <Rss size={14} />
                  </span>
                  <span className="text-xs text-slate-400">
                    플랫폼은 각 콘텐츠 URL에서 자동 감지됩니다
                  </span>
                </div>
                <p className="text-[10px] text-slate-600 mt-2 ml-8">
                  YouTube, Threads, Twitter, LinkedIn 등
                </p>
              </div>

              <button
                type="submit"
                disabled={createSource.isPending}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white py-3 rounded-xl font-bold flex items-center justify-center space-x-2 shadow-lg shadow-blue-900/20 transition-all"
              >
                {createSource.isPending ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={18} />
                )}
                <span>
                  {createSource.isPending ? "수집 중..." : "소스 등록"}
                </span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
