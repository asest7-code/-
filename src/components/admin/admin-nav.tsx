import Link from "next/link";

export function AdminNav() {
  return (
    <aside className="hidden min-h-screen w-64 border-r border-slate-200 bg-white p-6 lg:block">
      <div className="text-lg font-bold text-brand-900">AdDash</div>
      <nav className="mt-8 space-y-2 text-sm font-semibold text-slate-600">
        <Link className="block rounded-md px-3 py-2 hover:bg-slate-100" href="/admin">
          관리자 홈
        </Link>
        <Link className="block rounded-md px-3 py-2 hover:bg-slate-100" href="/admin/clients">
          클라이언트
        </Link>
        <Link className="block rounded-md px-3 py-2 hover:bg-slate-100" href="/admin/upload">
          데이터 업로드
        </Link>
        <Link className="block rounded-md px-3 py-2 hover:bg-slate-100" href="/admin/reports">
          데이터 수정
        </Link>
      </nav>
    </aside>
  );
}
