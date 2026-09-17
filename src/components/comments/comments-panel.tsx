import Link from "next/link";
import { ChatCircleTextIcon, HeartIcon, LockKeyIcon, MagnifyingGlassIcon } from "@phosphor-icons/react/ssr";

import { buttonVariants } from "@/components/ui/button-variants";
import { EmptyState } from "@/components/notice";
import { fmtDateTime, fmtInt, fmtRelative } from "@/lib/format";
import type { CommentItem, MediaComments } from "@/lib/data";
import { cn } from "@/lib/utils";

/** Monogram dari username (bukan avatar palsu): huruf pertama di lingkaran netral. */
function Monogram({ username }: { username: string | null }) {
  const letter = (username ?? "?").replace(/[^a-z0-9]/gi, "").charAt(0).toUpperCase() || "?";
  return (
    <span
      className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-green-soft text-body-sm font-semibold text-brand-green-strong"
      aria-hidden
    >
      {letter}
    </span>
  );
}

function CommentRow({ c, isReply }: { c: CommentItem; isReply?: boolean }) {
  return (
    <div className={cn("flex gap-3", isReply && "pl-2")}>
      <Monogram username={c.username} />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-baseline gap-x-2 text-body-sm">
          {c.username ? (
            <a
              href={`https://www.instagram.com/${c.username}/`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold hover:underline"
            >
              @{c.username}
            </a>
          ) : (
            <span className="font-semibold text-muted-foreground">Akun tidak diketahui</span>
          )}
          <time dateTime={c.commented_at} title={fmtDateTime(c.commented_at)} className="text-caption text-muted-foreground">
            {fmtRelative(c.commented_at)}
          </time>
        </p>
        <p className="mt-0.5 whitespace-pre-line break-words text-body-sm">{c.text ?? ""}</p>
        {c.like_count ? (
          <p className="mt-1 inline-flex items-center gap-1 text-caption text-muted-foreground tabular-nums">
            <HeartIcon className="size-3.5" aria-hidden /> {fmtInt(c.like_count)} suka
          </p>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Komentar satu post, dikelompokkan per akun di bagian "paling aktif" dan
 * ditampilkan urut waktu. Pencarian & paging lewat query string (tanpa JS).
 */
export function CommentsPanel({
  data,
  basePath,
  baseQuery,
  search,
  permissionMissing,
}: {
  data: MediaComments;
  basePath: string;
  baseQuery: Record<string, string>;
  search: string;
  permissionMissing: boolean;
}) {
  const apiCount = data.media?.comments_count ?? null;
  const href = (extra: Record<string, string | undefined>) => {
    const q = new URLSearchParams(baseQuery);
    for (const [k, v] of Object.entries(extra)) if (v) q.set(k, v);
    return `${basePath}?${q.toString()}#komentar`;
  };
  const page = Math.floor(data.offset / data.limit) + 1;
  const pages = Math.max(1, Math.ceil(data.matched / data.limit));

  return (
    <section
      id="komentar"
      aria-labelledby="komentar-title"
      className="scroll-mt-24 rounded-card border border-border/70 bg-card/85 p-5 shadow-card md:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id="komentar-title" className="flex items-center gap-2 text-lead font-bold tracking-tight">
            <ChatCircleTextIcon className="size-5" aria-hidden /> Komentar
          </h2>
          <p className="mt-1 text-body-sm text-muted-foreground">
            {fmtInt(data.stored)} tersimpan dari {apiCount === null ? "jumlah yang belum diketahui" : `${fmtInt(apiCount)} menurut Instagram`}
            {data.stored ? `, dari ${fmtInt(data.unique_accounts)} akun` : ""}.
            {data.media?.comments_synced_at ? ` Disinkronkan ${fmtRelative(data.media.comments_synced_at)}.` : ""}
          </p>
        </div>
        {data.stored > 0 ? (
          <form action={basePath} method="get" className="flex w-full items-center gap-2 sm:w-auto" role="search">
            {Object.entries(baseQuery).map(([k, v]) => (
              <input key={k} type="hidden" name={k} value={v} />
            ))}
            <label htmlFor="q" className="sr-only">
              Cari komentar atau username
            </label>
            <div className="relative w-full sm:w-72">
              <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <input
                id="q"
                name="q"
                defaultValue={search}
                maxLength={80}
                placeholder="Cari kata atau @username"
                className="h-10 w-full rounded-full border border-input bg-card pr-4 pl-10 text-body md:text-body-sm outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <button type="submit" className={buttonVariants({ variant: "default" })}>
              Cari
            </button>
          </form>
        ) : null}
      </div>

      {data.stored === 0 && (apiCount ?? 0) > 0 && permissionMissing ? (
        <div className="mt-5 flex gap-3 rounded-tile border border-brand-orange/40 bg-brand-orange-soft p-4 text-body-sm">
          <LockKeyIcon className="mt-0.5 size-5 shrink-0 text-brand-orange" aria-hidden />
          <div className="flex flex-col gap-2">
            <p className="font-semibold">Komentar belum bisa diambil dari Instagram</p>
            <p className="text-muted-foreground">
              Post ini punya {fmtInt(apiCount)} komentar, tetapi API mengembalikan daftar kosong. Artinya token belum
              punya izin <code className="rounded bg-card px-1">instagram_business_manage_comments</code> atau app Meta
              masih mode Development. Setelah token baru dengan izin itu dimasukkan ke Vault, komentar tersinkron
              otomatis pada jam berikutnya. Langkahnya ada di README bagian Komentar.
            </p>
          </div>
        </div>
      ) : data.stored === 0 ? (
        <EmptyState title={(apiCount ?? 0) > 0 ? "Komentar sedang menunggu sinkron" : "Belum ada komentar"} className="mt-5">
          {(apiCount ?? 0) > 0
            ? "Komentar post ini akan diambil pada sinkron berikutnya."
            : "Post ini belum punya komentar."}
        </EmptyState>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_16rem]">
          <div className="flex flex-col gap-4">
            {search ? (
              <p className="text-body-sm text-muted-foreground">
                {fmtInt(data.matched)} komentar cocok dengan “{search}”.{" "}
                <Link href={href({})} className="font-medium text-foreground underline underline-offset-4">
                  Hapus pencarian
                </Link>
              </p>
            ) : null}
            {data.rows.length ? (
              <ol className="flex flex-col gap-4">
                {data.rows.map((c) => (
                  <li key={c.id} className="flex flex-col gap-3 rounded-tile border border-border/60 bg-card p-4">
                    <CommentRow c={c} />
                    {c.replies.length ? (
                      <ol className="ml-4 flex flex-col gap-3 border-l-2 border-brand-green-soft pl-3" aria-label="Balasan">
                        {c.replies.map((r) => (
                          <li key={r.id}>
                            <CommentRow c={r} isReply />
                          </li>
                        ))}
                      </ol>
                    ) : null}
                  </li>
                ))}
              </ol>
            ) : (
              <EmptyState title="Tidak ada komentar yang cocok">Coba kata lain.</EmptyState>
            )}
            {pages > 1 ? (
              <nav aria-label="Halaman komentar" className="flex items-center justify-between gap-3">
                <span className="text-body-sm text-muted-foreground tabular-nums">
                  Halaman {page} dari {pages}
                </span>
                <div className="flex gap-2">
                  {page > 1 ? (
                    <Link href={href({ q: search || undefined, cpage: String(page - 1) })} className={buttonVariants({ variant: "outline", size: "sm" })}>
                      Sebelumnya
                    </Link>
                  ) : null}
                  {page < pages ? (
                    <Link href={href({ q: search || undefined, cpage: String(page + 1) })} className={buttonVariants({ variant: "outline", size: "sm" })}>
                      Berikutnya
                    </Link>
                  ) : null}
                </div>
              </nav>
            ) : null}
          </div>
          <aside className="ink-glow h-fit rounded-tile p-5 text-ink-foreground">
            <h3 className="text-body font-bold">Akun paling aktif</h3>
            <ol className="mt-3 flex flex-col gap-2">
              {data.top_accounts.map((a, i) => (
                <li key={a.username} className="flex items-center justify-between gap-2 text-body-sm">
                  <Link
                    href={href({ q: a.username })}
                    className="min-w-0 break-all hover:underline"
                    title={`Tampilkan komentar @${a.username}`}
                  >
                    {i + 1}. @{a.username}
                  </Link>
                  <span className="shrink-0 text-ink-muted tabular-nums">{fmtInt(a.n)}</span>
                </li>
              ))}
            </ol>
          </aside>
        </div>
      )}
    </section>
  );
}

// Dibuat oleh Faiz Hazim Hawari · skill-ui-ux
