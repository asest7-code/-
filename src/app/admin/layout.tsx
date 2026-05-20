import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { AdminNav } from "@/components/admin/admin-nav";
import { authOptions } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");
  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      <AdminNav />
      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  );
}
