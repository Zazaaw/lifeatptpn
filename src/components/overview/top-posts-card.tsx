import Link from "next/link";

import { CornerLink } from "./corner-link";
import { PostThumb } from "@/components/post-thumb";
import { fmtCompact, fmtDate } from "@/lib/format";
import { KIND_LABEL } from "@/lib/kinds";
import type { TopPost } from "@/lib/data";

/** Konten teratas pada kartu gelap (arah desain "Onboarding Task" referensi). */
export function TopPostsCard({
  posts,
  totalPosts,
  query,
}: {
  posts: TopPost[];
  totalPosts: number;
  query: string;
}) {
  return (
    <div className="flex min-h-72 flex-col rounded-card bg-ink p-5 text-ink-foreground shadow-[0_24px_48px_-28px_hsl(var(--foreground)/0.55)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lead font-bold tracking-tight">Konten teratas</h2>
          <p className="text-caption text-ink-muted">urut views</p>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-h4 font-bold tabular-nums">
            {posts.length}
            <span className="text-ink-muted">/{totalPosts}</span>
          </p>
          <CornerLink href={`/konten?${query}`} label="Lihat semua konten" tone="ink" />
        </div>
      </div>
      {posts.length ? (
        <ol className="mt-4 flex flex-col gap-2.5">
          {posts.map((post) => (
            <li key={post.id}>
              <Link
                href={`/konten/${post.id}?${query}`}
                className="grid grid-cols-[2.75rem_1fr_auto] items-center gap-3 rounded-tile p-1.5 transition-colors hover:bg-white/5 outline-hidden focus-visible:ring-2 focus-visible:ring-brand-green"
              >
                <PostThumb src={post.thumb_url} alt="" className="size-11 rounded-full" />
                <span className="min-w-0">
                  <span className="line-clamp-1 text-body-sm">{post.caption?.trim() || "Tanpa caption"}</span>
                  <span className="text-caption text-ink-muted">
                    {KIND_LABEL[post.content_kind]}, {fmtDate(post.posted_at)}
                  </span>
                </span>
                <span className="text-body-sm font-semibold tabular-nums">{fmtCompact(post.views)}</span>
              </Link>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-4 text-body-sm text-ink-muted">Belum ada post pada rentang ini.</p>
      )}
    </div>
  );
}

// Dibuat oleh Faiz Hazim Hawari · skill-ui-ux
