import { redirect } from "next/navigation";

// Alte Links (/t/…) führen auf die neue Seite unter /termin/…. Der Code bleibt derselbe.
export default async function AlterLink({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  redirect(`/termin/${encodeURIComponent(code)}`);
}
