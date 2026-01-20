"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Users, Rss, ListOrdered, Sparkles, Clock, Youtube, Twitter, Linkedin, MessageCircle } from "lucide-react";
import { useSources } from "@/hooks/useSources";
import { useScrapedContents } from "@/hooks/useScrapedContent";
import { useQueue } from "@/hooks/useQueue";
import type { Platform } from "@/types";

const PlatformIcon = ({ platform, size = 16 }: { platform: Platform; size?: number }) => {
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

export default function DashboardPage() {
  const router = useRouter();
  const { data: sources } = useSources();
  const { data: scrapedData } = useScrapedContents({ limit: 5 });
  const { data: queue } = useQueue();

  const scraped = scrapedData?.data || [];

  // 플랫폼별 통계 계산
  const platformBreakdown = sources?.reduce((acc, curr) => {
    acc[curr.platform] = (acc[curr.platform] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  // 오늘 수집된 콘텐츠 수
  const todayScrapedCount = scraped.filter(
    (s) => new Date(s.created_at).toDateString() === new Date().toDateString()
  ).length;

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">대시보드</h2>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 활성 소스 카드 */}
        <div
          onClick={() => router.push("/sources")}
          className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between hover:border-blue-500/50 hover:bg-slate-800/50 transition-all cursor-pointer group"
        >
          <div className="flex items-center space-x-4">
            <div className="p-3 rounded-xl bg-slate-950 text-blue-500 group-hover:scale-110 transition-transform">
              <Users size={24} />
            </div>
            <div>
              <p className="text-slate-400 text-sm font-medium">활성 소스</p>
              <p className="text-3xl font-bold">{sources?.length || 0}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {Object.entries(platformBreakdown).map(([platform, count]) => (
              <span
                key={platform}
                className="text-[10px] bg-slate-950 px-2 py-1 rounded-md text-slate-400 border border-slate-800"
              >
                {platform}: {count}
              </span>
            ))}
          </div>
        </div>

        {/* 수집 콘텐츠 카드 */}
        <div
          onClick={() => router.push("/scraped")}
          className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between hover:border-emerald-500/50 hover:bg-slate-800/50 transition-all cursor-pointer group"
        >
          <div className="flex items-center space-x-4">
            <div className="p-3 rounded-xl bg-slate-950 text-emerald-500 group-hover:scale-110 transition-transform">
              <Rss size={24} />
            </div>
            <div>
              <p className="text-slate-400 text-sm font-medium">수집된 콘텐츠</p>
              <p className="text-3xl font-bold">{scrapedData?.total || 0}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs text-slate-500">
            <Clock size={12} className="mr-1" />
            <span>오늘 총 {todayScrapedCount}건 수집됨</span>
          </div>
        </div>

        {/* 대기열 항목 카드 */}
        <div
          onClick={() => router.push("/queue")}
          className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between hover:border-purple-500/50 hover:bg-slate-800/50 transition-all cursor-pointer group"
        >
          <div className="flex items-center space-x-4">
            <div className="p-3 rounded-xl bg-slate-950 text-purple-500 group-hover:scale-110 transition-transform">
              <ListOrdered size={24} />
            </div>
            <div>
              <p className="text-slate-400 text-sm font-medium">업로드 대기열</p>
              <p className="text-3xl font-bold">{queue?.length || 0}</p>
            </div>
          </div>
          <div className="mt-4">
            <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-purple-500 h-full transition-all"
                style={{ width: `${Math.min(((queue?.length || 0) / 12) * 100, 100)}%` }}
              ></div>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              오늘의 업로드 할당량 ({queue?.length || 0}/12)
            </p>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center">
          <h3 className="font-semibold">최근 수집 피드</h3>
          <Link
            href="/scraped"
            className="text-sm text-slate-400 hover:text-white"
          >
            전체 보기
          </Link>
        </div>
        <div className="divide-y divide-slate-800">
          {scraped.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              아직 스크랩된 콘텐츠가 없습니다. 소스를 추가하여 스크랩을 시작하세요.
            </div>
          ) : (
            scraped.map((item) => (
              <div
                key={item.id}
                className="p-4 flex justify-between items-center hover:bg-slate-800/50 transition-colors group"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-slate-950 rounded-lg flex items-center justify-center text-slate-400 group-hover:text-blue-400">
                    <PlatformIcon platform={item.platform} size={16} />
                  </div>
                  <div>
                    <p className="font-medium text-sm line-clamp-1">
                      {item.title || "제목 없음"}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {item.source?.account_name || item.author} • {new Date(item.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                <Link
                  href={`/process?id=${item.id}`}
                  className="p-2 bg-slate-950 hover:bg-emerald-600/20 rounded-lg text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="AI 마케팅 가공"
                >
                  <Sparkles size={16} />
                </Link>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
