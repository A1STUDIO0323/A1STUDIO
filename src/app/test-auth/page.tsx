"use client";

import { useSession } from "@/lib/auth-client";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

export default function TestAuthPage() {
  const { data: session, status } = useSession();
  const [testResult, setTestResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testKakaoAuth = async () => {
    setLoading(true);
    try {
      const supabase = createClient(true);
      
      const redirectTo = `${window.location.origin}/auth/callback?next=/`;
      
      console.log("Testing Kakao OAuth...");
      console.log("Redirect URL:", redirectTo);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "kakao",
        options: { redirectTo },
      });
      
      setTestResult({
        success: !error,
        data: data,
        error: error?.message || null,
        url: data?.url || null,
      });
      
      console.log("Test result:", { data, error });
    } catch (err) {
      setTestResult({
        success: false,
        exception: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    const supabase = createClient(true);
    await supabase.auth.signOut();
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">인증 테스트 페이지</h1>
        
        {/* 현재 세션 상태 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">현재 세션 상태</h2>
          <div className="space-y-2">
            <p><strong>상태:</strong> {status}</p>
            <p><strong>사용자 ID:</strong> {session?.user?.id || "없음"}</p>
            <p><strong>이메일:</strong> {session?.user?.email || "없음"}</p>
            <p><strong>Provider:</strong> {session?.user?.provider || "없음"}</p>
          </div>
          {status === "authenticated" && (
            <button
              onClick={logout}
              className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              로그아웃
            </button>
          )}
        </div>

        {/* 환경 변수 확인 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">환경 변수</h2>
          <div className="space-y-2 text-sm font-mono">
            <p><strong>SUPABASE_URL:</strong> {process.env.NEXT_PUBLIC_SUPABASE_URL || "❌ 없음"}</p>
            <p><strong>SUPABASE_KEY 길이:</strong> {process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.length || "❌ 없음"}</p>
            <p><strong>KAKAO 설정:</strong> {process.env.NEXT_PUBLIC_KAKAO_CONFIGURED || "❌ 없음"}</p>
            <p><strong>GOOGLE 설정:</strong> {process.env.NEXT_PUBLIC_GOOGLE_CONFIGURED || "❌ 없음"}</p>
          </div>
        </div>

        {/* 카카오 OAuth 테스트 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">카카오 OAuth 테스트</h2>
          <button
            onClick={testKakaoAuth}
            disabled={loading}
            className="px-6 py-3 bg-yellow-400 text-black rounded font-semibold hover:bg-yellow-500 disabled:opacity-50"
          >
            {loading ? "테스트 중..." : "카카오 OAuth 테스트"}
          </button>
          
          {testResult && (
            <div className="mt-4 p-4 bg-gray-50 rounded">
              <pre className="text-xs overflow-auto">
                {JSON.stringify(testResult, null, 2)}
              </pre>
              
              {testResult.url && (
                <div className="mt-4">
                  <p className="font-semibold mb-2">✅ OAuth URL이 생성되었습니다:</p>
                  <a 
                    href={testResult.url}
                    className="text-blue-600 hover:underline break-all text-sm"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {testResult.url}
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        {/* localStorage 확인 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">브라우저 저장소</h2>
          <button
            onClick={() => {
              const supabaseKeys = Object.keys(localStorage).filter(k => k.includes('supabase'));
              alert('Supabase 관련 키:\n' + supabaseKeys.join('\n'));
            }}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            localStorage 확인
          </button>
          <button
            onClick={() => {
              if (confirm('localStorage의 모든 Supabase 관련 데이터를 삭제하시겠습니까?')) {
                Object.keys(localStorage).forEach(key => {
                  if (key.includes('supabase')) {
                    localStorage.removeItem(key);
                  }
                });
                alert('삭제 완료! 페이지를 새로고침합니다.');
                window.location.reload();
              }
            }}
            className="ml-2 px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
          >
            Supabase 데이터 초기화
          </button>
        </div>
      </div>
    </div>
  );
}
