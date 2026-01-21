"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Lock, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        router.push("/");
        router.refresh();
      } else {
        setError(data.error || "로그인에 실패했습니다.");
      }
    } catch {
      setError("로그인 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 shadow-2xl">
          {/* 로고 */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-2xl mb-4">
              <Sparkles size={32} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
              AI 마케팅 허브
            </h1>
            <p className="text-sm text-slate-500 mt-2">
              접근하려면 비밀번호를 입력하세요
            </p>
          </div>

          {/* 로그인 폼 */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                비밀번호
              </label>
              <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호를 입력하세요"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  autoFocus
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !password}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 disabled:from-slate-700 disabled:to-slate-700 text-white rounded-xl font-bold transition-all flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Lock size={18} />
              )}
              <span>{isLoading ? "확인 중..." : "로그인"}</span>
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          비밀번호를 모르시면 관리자에게 문의하세요
        </p>
      </div>
    </div>
  );
}
