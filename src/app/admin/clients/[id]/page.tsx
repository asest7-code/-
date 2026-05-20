"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Props = { params: { id: string } };

export default function EditClientPage({ params }: Props) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    slug: "",
    logoUrl: "",
    isPasswordProtected: false,
    sharePassword: ""
  });
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/clients/${params.id}`)
      .then((response) => response.json())
      .then((data) => {
        if (!data.client) return;
        setForm({
          name: data.client.name ?? "",
          slug: data.client.slug ?? "",
          logoUrl: data.client.logoUrl ?? "",
          isPasswordProtected: Boolean(data.client.isPasswordProtected),
          sharePassword: ""
        });
      });
  }, [params.id]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const response = await fetch(`/api/clients/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });

    if (!response.ok) {
      setError("수정에 실패했습니다. slug 중복 여부와 입력값을 확인해 주세요.");
      return;
    }

    router.push("/admin/clients");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">클라이언트 수정</h1>
        <p className="mt-1 text-sm text-slate-500">공유 URL과 비밀번호 옵션을 변경할 수 있습니다.</p>
      </div>

      <form onSubmit={submit} className="panel space-y-5 p-6">
        <Field label="클라이언트명" value={form.name} onChange={(name) => setForm({ ...form, name })} />
        <Field label="slug" value={form.slug} onChange={(slug) => setForm({ ...form, slug: slug.toLowerCase() })} placeholder="progressmedia" />
        <Field label="로고 URL" value={form.logoUrl} onChange={(logoUrl) => setForm({ ...form, logoUrl })} />

        <label className="flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={form.isPasswordProtected}
            onChange={(event) => setForm({ ...form, isPasswordProtected: event.target.checked })}
          />
          공유 URL 비밀번호 사용
        </label>

        {form.isPasswordProtected ? (
          <Field label="공유 비밀번호 변경" value={form.sharePassword} onChange={(sharePassword) => setForm({ ...form, sharePassword })} />
        ) : null}

        {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p> : null}

        <button className="btn-primary">수정 저장</button>
      </form>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <input className="input mt-1" value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
