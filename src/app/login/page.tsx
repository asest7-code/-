"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("admin1234");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", { email, password, redirect: false });

    setLoading(false);

    if (result?.error) {
      setError("로그인에 실패했습니다. 계정 정보가 맞는지 확인하고, 계속 실패하면 데이터베이스 연결 상태를 점검해 주세요.");
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <form onSubmit={onSubmit} className="panel w-full max-w-md p-8">
        <div>
          <p className="text-sm font-semibold text-brand-700">Agency Dashboard MVP</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-950">관리자 로그인</h1>
          <p className="mt-2 text-sm text-slate-500">기본 계정은 admin@example.com / admin1234 입니다.</p>
        </div>

        <div className="mt-8 space-y-4">
          <label className="block">
            <span className="label">이메일</span>
            <input className="input mt-1" value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>

          <label className="block">
            <span className="label">비밀번호</span>
            <input className="input mt-1" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>

          {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p> : null}

          <button className="btn-primary w-full" disabled={loading}>
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </div>
      </form>
    </main>
  );
}
