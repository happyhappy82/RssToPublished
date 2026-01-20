"use client";

import { X, FileText, MessageSquare, List } from "lucide-react";
import { parseContent, type ParsedContent } from "@/lib/utils/parseContent";
import { useEffect, useState } from "react";

interface ContentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: string;
  title?: string;
  author?: string;
  platform?: string;
  isProcessed?: boolean;
}

export default function ContentDetailModal({
  isOpen,
  onClose,
  content,
  title,
  author,
  platform,
  isProcessed,
}: ContentDetailModalProps) {
  const [parsed, setParsed] = useState<ParsedContent | null>(null);
  const [activeTab, setActiveTab] = useState<"main" | "thread" | "comments">("main");

  // HTML 태그가 많으면 RSS 원본일 가능성 높음
  const isRawHtml = content?.includes("<div") || content?.includes("<iframe");

  useEffect(() => {
    if (isOpen && content) {
      const parsedContent = parseContent(content);
      setParsed(parsedContent);

      // 자동으로 활성 탭 설정
      if (parsedContent.hasStructure) {
        setActiveTab("main");
      }
    }
  }, [isOpen, content]);

  if (!isOpen || !parsed) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex justify-between items-start">
          <div className="space-y-1 flex-1">
            <div className="flex items-center space-x-2">
              {platform && (
                <span className="text-xs font-bold text-blue-500 uppercase px-2 py-1 bg-blue-500/10 rounded">
                  {platform}
                </span>
              )}
              {author && <span className="text-xs text-slate-500">• {author}</span>}
            </div>
            <h3 className="text-xl font-bold">{title || "콘텐츠 상세보기"}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs - 구조화된 콘텐츠인 경우에만 표시 */}
        {parsed.hasStructure && (
          <div className="flex border-b border-slate-800 px-6">
            <button
              onClick={() => setActiveTab("main")}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center space-x-2 ${
                activeTab === "main"
                  ? "border-blue-500 text-blue-500"
                  : "border-transparent text-slate-500 hover:text-slate-300"
              }`}
            >
              <FileText size={16} />
              <span>본문</span>
            </button>
            {parsed.threadPosts.length > 0 && (
              <button
                onClick={() => setActiveTab("thread")}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center space-x-2 ${
                  activeTab === "thread"
                    ? "border-blue-500 text-blue-500"
                    : "border-transparent text-slate-500 hover:text-slate-300"
                }`}
              >
                <List size={16} />
                <span>연속 포스트 ({parsed.threadPosts.length})</span>
              </button>
            )}
            {parsed.comments.length > 0 && (
              <button
                onClick={() => setActiveTab("comments")}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center space-x-2 ${
                  activeTab === "comments"
                    ? "border-blue-500 text-blue-500"
                    : "border-transparent text-slate-500 hover:text-slate-300"
                }`}
              >
                <MessageSquare size={16} />
                <span>댓글 ({parsed.comments.length})</span>
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* RSS 원본 경고 */}
          {isRawHtml && !isProcessed && (
            <div className="mb-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
              <p className="text-sm text-amber-400">
                ⚠️ RSS 원본 데이터입니다. <strong>&quot;AI로 가공&quot;</strong> 버튼을 눌러야 실제 본문(자막, 포스트 내용)을 가져옵니다.
              </p>
            </div>
          )}

          {activeTab === "main" && (
            <div className="prose prose-invert max-w-none">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
                {parsed.mainContent || "본문 없음"}
              </div>
            </div>
          )}

          {activeTab === "thread" && (
            <div className="space-y-4">
              {parsed.threadPosts.length > 0 ? (
                parsed.threadPosts.map((post, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-2"
                  >
                    <div className="text-xs font-bold text-blue-500 mb-2">{idx + 1}번 포스트</div>
                    <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
                      {post}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-slate-500 py-12">연속 포스트가 없습니다</div>
              )}
            </div>
          )}

          {activeTab === "comments" && (
            <div className="space-y-2">
              {parsed.comments.length > 0 ? (
                parsed.comments.map((comment, idx) => (
                  <div
                    key={idx}
                    className={`border border-slate-800 rounded-lg p-4 text-sm text-slate-300 ${
                      comment.startsWith("└")
                        ? "ml-8 bg-slate-950/50"
                        : "bg-slate-950"
                    }`}
                  >
                    {comment}
                  </div>
                ))
              ) : (
                <div className="text-center text-slate-500 py-12">댓글이 없습니다</div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-medium transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
