"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { animate, AnimatePresence, motion, useMotionValue, useReducedMotion } from "motion/react";
import {
  ArrowSquareOutIcon,
  ChatCircleIcon,
  CheckIcon,
  ConfettiIcon,
  CopyIcon,
  DownloadSimpleIcon,
  LockKeyIcon,
  MagnifyingGlassIcon,
  ShuffleIcon,
  TrashIcon,
  TrophyIcon,
  UsersIcon,
  XIcon,
} from "@phosphor-icons/react";

import PillTabs from "@/components/ui/pill-tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PostThumb } from "@/components/post-thumb";
import { Wheel } from "./wheel";
import { buildSegments, finalRotation, landingAngle, parseManualNames, pickWinner, randomInt, type WheelEntry } from "@/lib/wheel";
import { fmtDate, fmtDateTime, fmtInt } from "@/lib/format";
import { KIND_LABEL } from "@/lib/kinds";
import { cn } from "@/lib/utils";

type QuizPost = {
  id: string;
  content_kind: keyof typeof KIND_LABEL;
  caption: string | null;
  permalink: string | null;
  thumb_url: string | null;
  posted_at: string;
  comments_count: number | null;
  comments_synced_at: string | null;
  stored_comments: number;
};

type EntriesResponse = {
  comments_considered: number;
  comments_matched: number;
  entries: { username: string; n: number; first_at: string; sample: string | null }[];
};

type Winner = { label: string; at: string; source: string; href?: string; detail?: string };

const STORAGE_KEY = "lifeatptpn-insight:spin-winners";
const EMPTY: Set<string> = new Set();

/** Tombol sekunder di panggung gelap (varian outline kit terlalu terang di atas ink). */
const STAGE_BTN =
  "inline-flex h-9 items-center gap-1.5 rounded-full bg-white/10 px-3.5 text-caption font-medium transition-colors outline-hidden hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white/60 active:scale-[0.98] disabled:opacity-50";

function loadWinners(): Winner[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Winner[]).slice(0, 200) : [];
  } catch {
    return [];
  }
}

function saveWinners(w: Winner[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(w));
  } catch {
    /* penyimpanan browser tidak tersedia: riwayat tetap ada selama halaman terbuka */
  }
}

/** Acak urutan (Fisher-Yates dengan CSPRNG) supaya posisi di roda tidak mengikuti urutan waktu komentar. */
function shuffled<T>(arr: T[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function SpinWheelApp({
  posts,
  permissionMissing,
  ownUsername,
}: {
  posts: QuizPost[];
  permissionMissing: boolean;
  ownUsername: string;
}) {
  const reduce = useReducedMotion();
  const [source, setSource] = useState<"comments" | "manual">(permissionMissing ? "manual" : "comments");

  // --- sumber: komentar ---
  const [postQuery, setPostQuery] = useState("");
  const [postId, setPostId] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");
  const [until, setUntil] = useState("");
  const [exclude, setExclude] = useState(ownUsername);
  const [includeReplies, setIncludeReplies] = useState(false);
  const [weighted, setWeighted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [result, setResult] = useState<EntriesResponse | null>(null);

  // --- sumber: manual ---
  const [manualText, setManualText] = useState("");
  const [dedupe, setDedupe] = useState(true);

  // --- roda ---
  const [shuffleNonce, setShuffleNonce] = useState(0);
  const [removedState, setRemovedState] = useState<{ source: WheelEntry[] | null; set: Set<string> }>({
    source: null,
    set: new Set(),
  });
  const [removeWinner, setRemoveWinner] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState<WheelEntry | null>(null);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);
  const rotation = useMotionValue(0);
  const abortRef = useRef<AbortController | null>(null);

  // Riwayat dibaca setelah mount: localStorage tidak ada di server, membaca saat
  // render awal akan membuat HTML server dan client berbeda (hydration mismatch).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWinners(loadWinners());
    setMounted(true);
  }, []);

  const selectedPost = posts.find((p) => p.id === postId) ?? null;
  const filteredPosts = useMemo(() => {
    const q = postQuery.trim().toLowerCase();
    return q ? posts.filter((p) => (p.caption ?? "").toLowerCase().includes(q)) : posts;
  }, [posts, postQuery]);

  const baseEntries: WheelEntry[] = useMemo(() => {
    if (source === "manual") {
      return parseManualNames(manualText, dedupe).map((label) => ({ label, weight: 1 }));
    }
    return (result?.entries ?? []).map((e) => ({
      label: e.username,
      weight: weighted ? Math.max(1, e.n) : 1,
      detail: e.sample ?? undefined,
      href: `https://www.instagram.com/${e.username}/`,
    }));
  }, [source, manualText, dedupe, result, weighted]);

  // Urutan di roda diacak ulang setiap daftar peserta berubah atau tombol "Acak posisi" ditekan.
  const order = useMemo(
    () => shuffled(baseEntries),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [baseEntries, shuffleNonce]
  );
  // Pemenang yang dikeluarkan hanya berlaku untuk daftar peserta yang sama.
  const removed = removedState.source === baseEntries ? removedState.set : EMPTY;
  const setRemoved = (next: Set<string>) => setRemovedState({ source: baseEntries, set: next });

  const active = useMemo(() => order.filter((e) => !removed.has(e.label.toLowerCase())), [order, removed]);
  const segments = useMemo(() => buildSegments(active), [active]);

  const loadEntries = useCallback(async () => {
    if (!postId) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    setLoadError(null);
    const q = new URLSearchParams({ media: postId });
    if (keyword.trim()) q.set("keyword", keyword.trim());
    if (until) q.set("until", `${until}:00+07:00`);
    if (exclude.trim()) q.set("exclude", exclude);
    if (includeReplies) q.set("replies", "1");
    try {
      const res = await fetch(`/api/quiz/entries?${q.toString()}`, { signal: ctrl.signal });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Peserta gagal dimuat.");
      setResult(body as EntriesResponse);
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setResult(null);
      setLoadError((e as Error).message || "Peserta gagal dimuat.");
    } finally {
      if (abortRef.current === ctrl) setLoading(false);
    }
  }, [postId, keyword, until, exclude, includeReplies]);

  function spin() {
    if (spinning || segments.length === 0) return;
    const idx = pickWinner(segments);
    const target = finalRotation(rotation.get(), landingAngle(segments[idx]), reduce ? 1 : 7);
    setSpinning(true);
    setWinner(null);
    animate(rotation, target, {
      duration: reduce ? 0.3 : 6,
      ease: [0.12, 0.8, 0.12, 1],
      onComplete: () => {
        rotation.set(target % 360); // jaga angka rotasi tetap kecil antar putaran
        setSpinning(false);
        setWinner(segments[idx]);
      },
    });
  }

  function confirmWinner() {
    if (!winner) return;
    const entry: Winner = {
      label: winner.label,
      at: new Date().toISOString(),
      source:
        source === "manual"
          ? "Input manual"
          : selectedPost
            ? `Komentar post ${fmtDate(selectedPost.posted_at)}`
            : "Komentar",
      href: winner.href,
      detail: winner.detail,
    };
    const next = [entry, ...winners];
    setWinners(next);
    saveWinners(next);
    if (removeWinner) setRemoved(new Set(removed).add(winner.label.toLowerCase()));
    setWinner(null);
  }

  function clearWinners() {
    if (!window.confirm("Hapus semua riwayat pemenang di browser ini?")) return;
    setWinners([]);
    saveWinners([]);
  }

  async function copyWinners() {
    const text = winners
      .slice()
      .reverse()
      .map((w, i) => `${i + 1}. @${w.label}`)
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt("Salin daftar pemenang:", text);
    }
  }

  function downloadCsv() {
    const rows = [["urutan", "username", "waktu_wib", "sumber", "komentar"]].concat(
      winners
        .slice()
        .reverse()
        .map((w, i) => [String(i + 1), w.label, fmtDateTime(w.at), w.source, w.detail ?? ""])
    );
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `pemenang-kuis-lifeatptpn-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const needsPermission = source === "comments" && selectedPost && selectedPost.stored_comments === 0 && (selectedPost.comments_count ?? 0) > 0;

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,23rem)_minmax(0,1fr)] 2xl:grid-cols-[minmax(0,24rem)_minmax(0,1fr)_minmax(0,21rem)]">
      {/* Panel sumber peserta */}
      <section aria-label="Peserta" className="flex flex-col gap-4 self-start rounded-card border border-border/70 bg-card/85 p-5 shadow-card xl:row-span-2 2xl:row-span-1">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lead font-bold tracking-tight">Peserta</h2>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-green-soft px-3 py-1 text-caption font-semibold text-brand-green-strong tabular-nums">
            <UsersIcon className="size-4" aria-hidden /> {fmtInt(active.length)} di roda
          </span>
        </div>

        <PillTabs
          tabs={[
            { value: "comments", label: "Dari komentar" },
            { value: "manual", label: "Input manual" },
          ]}
          value={source}
          onChange={(v) => setSource(v as "comments" | "manual")}
          aria-label="Sumber peserta"
        />

        {source === "comments" ? (
          <div className="flex flex-col gap-4">
            {permissionMissing ? (
              <div className="flex gap-2.5 rounded-tile border border-brand-orange/40 bg-brand-orange-soft p-3 text-body-sm">
                <LockKeyIcon className="mt-0.5 size-4 shrink-0 text-brand-orange" aria-hidden />
                <p>
                  Komentar belum bisa diambil: token Instagram belum punya izin membaca komentar. Pakai{" "}
                  <button type="button" onClick={() => setSource("manual")} className="font-semibold underline underline-offset-2">
                    input manual
                  </button>{" "}
                  dulu, atau aktifkan izin (lihat README).
                </p>
              </div>
            ) : null}

            <div className="flex flex-col gap-2">
              <label htmlFor="post-search" className="text-body-sm font-medium">
                Pilih post kuis
              </label>
              <div className="relative">
                <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input id="post-search" value={postQuery} onChange={(e) => setPostQuery(e.target.value)} placeholder="Cari caption, mis. QUIZ" className="pl-10" />
              </div>
              <div role="radiogroup" aria-label="Post" className="flex max-h-72 flex-col gap-1.5 overflow-y-auto pr-1">
                {filteredPosts.length === 0 ? (
                  <p className="p-2 text-body-sm text-muted-foreground">Tidak ada post yang cocok.</p>
                ) : (
                  filteredPosts.map((p) => {
                    const checked = p.id === postId;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        role="radio"
                        aria-checked={checked}
                        onClick={() => {
                          setPostId(p.id);
                          setResult(null);
                        }}
                        className={cn(
                          "grid grid-cols-[2.75rem_1fr] items-center gap-3 rounded-tile border p-2 text-left transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-ring",
                          checked ? "border-brand-green-strong bg-brand-green-soft" : "border-transparent hover:bg-accent"
                        )}
                      >
                        <PostThumb src={p.thumb_url} alt="" className="size-11 rounded-xl" />
                        <span className="min-w-0">
                          <span className="line-clamp-1 text-body-sm font-medium">{p.caption?.trim() || "Tanpa caption"}</span>
                          <span className="flex flex-wrap items-center gap-x-2 text-caption text-muted-foreground">
                            {KIND_LABEL[p.content_kind]}, {fmtDate(p.posted_at)}
                            <span className="inline-flex items-center gap-1 tabular-nums">
                              <ChatCircleIcon className="size-3.5" aria-hidden />
                              {fmtInt(p.comments_count ?? 0)}
                            </span>
                          </span>
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {selectedPost ? (
              <div className="flex flex-col gap-3 rounded-tile bg-muted/60 p-3">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="kw" className="text-body-sm font-medium">
                    Kata kunci jawaban
                  </label>
                  <Input id="kw" value={keyword} maxLength={60} onChange={(e) => setKeyword(e.target.value)} placeholder="Kosongkan untuk semua komentar" />
                  <p className="text-caption text-muted-foreground">Hanya komentar yang memuat kata ini yang ikut.</p>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="until" className="text-body-sm font-medium">
                    Batas waktu komentar (WIB)
                  </label>
                  <Input id="until" type="datetime-local" value={until} onChange={(e) => setUntil(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="exclude" className="text-body-sm font-medium">
                    Kecualikan akun
                  </label>
                  <Input id="exclude" value={exclude} onChange={(e) => setExclude(e.target.value)} placeholder="pisahkan dengan koma" />
                  <p className="text-caption text-muted-foreground">Mis. akun sendiri dan panitia.</p>
                </div>
                <label className="flex items-center gap-2 text-body-sm">
                  <input type="checkbox" checked={includeReplies} onChange={(e) => setIncludeReplies(e.target.checked)} className="size-4 accent-[hsl(var(--brand-green-strong))]" />
                  Ikutkan balasan komentar
                </label>
                <label className="flex items-center gap-2 text-body-sm">
                  <input type="checkbox" checked={weighted} onChange={(e) => setWeighted(e.target.checked)} className="size-4 accent-[hsl(var(--brand-green-strong))]" />
                  Tiap komentar menambah peluang
                </label>
                <p className="-mt-2 pl-6 text-caption text-muted-foreground">Mati: satu akun satu kesempatan.</p>
                <Button onClick={loadEntries} disabled={loading}>
                  {loading ? "Memuat peserta…" : "Muat peserta"}
                </Button>
                {loadError ? (
                  <p className="text-body-sm text-destructive" role="alert">
                    {loadError}
                  </p>
                ) : null}
                {needsPermission ? (
                  <p className="text-body-sm text-muted-foreground">
                    Post ini punya {fmtInt(selectedPost.comments_count)} komentar di Instagram, tetapi belum ada yang tersimpan.
                  </p>
                ) : null}
                {result ? (
                  <p className="text-body-sm" role="status">
                    <strong className="font-semibold">{fmtInt(result.entries.length)} akun</strong> dari {fmtInt(result.comments_matched)} komentar
                    yang lolos filter ({fmtInt(result.comments_considered)} komentar diperiksa).
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <label htmlFor="manual" className="text-body-sm font-medium">
              Nama atau username peserta
            </label>
            <textarea
              id="manual"
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              rows={10}
              placeholder={"satu per baris, atau pisahkan dengan koma\nbudi.santoso\n@siti_rahma"}
              className="min-h-48 rounded-tile border border-input bg-card px-4 py-3 text-body md:text-body-sm outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
            />
            <label className="flex items-center gap-2 text-body-sm">
              <input type="checkbox" checked={dedupe} onChange={(e) => setDedupe(e.target.checked)} className="size-4 accent-[hsl(var(--brand-green-strong))]" />
              Hapus nama ganda (tidak peka huruf besar/kecil)
            </label>
          </div>
        )}
      </section>

      {/* Panggung roda */}
      <section aria-label="Roda undian" className="ink-glow relative flex flex-col gap-6 overflow-hidden rounded-card p-5 text-ink-foreground shadow-ink md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-lead font-bold tracking-tight">Roda undian</h2>
            <p className="mt-1 max-w-[46ch] text-caption text-ink-muted">
              Pemenang diacak dengan crypto.getRandomValues sebelum roda berhenti. Animasi hanya menampilkan hasilnya.
            </p>
          </div>
          <div className="text-right">
            <p className="text-kpi leading-none font-bold tracking-tight tabular-nums">{fmtInt(active.length)}</p>
            <p className="text-caption text-ink-muted">peserta di roda</p>
          </div>
        </div>

        <Wheel segments={segments} rotation={rotation} onSpin={spin} disabled={spinning || segments.length === 0} spinning={spinning} />

        <div className="flex flex-wrap items-center justify-center gap-2">
          <button type="button" onClick={() => setShuffleNonce((n) => n + 1)} disabled={spinning || active.length < 2} className={STAGE_BTN}>
            <ShuffleIcon className="size-4" aria-hidden /> Acak posisi
          </button>
          {removed.size ? (
            <button type="button" onClick={() => setRemoved(new Set())} disabled={spinning} className={STAGE_BTN}>
              Kembalikan {removed.size} pemenang ke roda
            </button>
          ) : null}
          <label className="inline-flex h-9 items-center gap-2 rounded-full bg-white/10 px-3.5 text-caption font-medium">
            <input type="checkbox" checked={removeWinner} onChange={(e) => setRemoveWinner(e.target.checked)} className="size-4 accent-[#FF9100]" />
            Keluarkan pemenang setelah disimpan
          </label>
        </div>
      </section>

      <section aria-label="Pemenang" className="flex flex-col gap-4 self-start rounded-card border border-border/70 bg-card/85 p-5 shadow-card xl:col-start-2 2xl:col-start-auto">
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-lead font-bold tracking-tight">
            <span className="inline-flex size-9 items-center justify-center rounded-full bg-brand-orange-soft">
              <TrophyIcon className="size-5 text-brand-orange" weight="fill" aria-hidden />
            </span>
            Pemenang
          </h2>
          <p className="text-h4 leading-none font-bold tabular-nums">{winners.length}</p>
        </div>
        {winners.length ? (
          <>
            <ol className="flex max-h-[28rem] flex-col gap-2 overflow-y-auto pr-1">
              {winners.map((w, i) => (
                <li key={`${w.label}-${w.at}`} className="flex items-center gap-3 rounded-tile bg-muted/60 p-2.5">
                  <span
                    className={cn(
                      "inline-flex size-9 shrink-0 items-center justify-center rounded-full text-caption font-bold tabular-nums",
                      i === 0 ? "bg-brand-orange text-[#172019]" : "bg-card"
                    )}
                  >
                    {winners.length - i}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-body-sm font-bold break-all">@{w.label}</span>
                    <span className="text-caption text-muted-foreground">
                      {fmtDateTime(w.at)}, {w.source}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={copyWinners}>
                {copied ? <CheckIcon aria-hidden /> : <CopyIcon aria-hidden />}
                {copied ? "Tersalin" : "Salin"}
              </Button>
              <Button variant="outline" size="sm" onClick={downloadCsv}>
                <DownloadSimpleIcon aria-hidden /> CSV
              </Button>
              <Button variant="outline" size="sm" onClick={clearWinners}>
                <TrashIcon aria-hidden /> Hapus
              </Button>
            </div>
            <p className="text-caption text-muted-foreground">Riwayat hanya tersimpan di browser ini.</p>
          </>
        ) : (
          <div className="flex flex-col items-start gap-2 rounded-tile border border-dashed border-border p-5">
            <p className="text-body font-bold">Belum ada pemenang</p>
            <p className="text-body-sm text-muted-foreground">Putar roda, lalu simpan hasilnya. Daftar ini bisa disalin atau diunduh sebagai CSV.</p>
          </div>
        )}
      </section>

      {/* Kartu pemenang. Lewat portal ke <body>: pembungkus halaman (BlurFade) memakai
          transform, dan elemen fixed di dalam elemen ber-transform ikut terkurung. */}
      {mounted ? createPortal(
      <AnimatePresence>
        {winner ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="winner-title">
            <motion.div className="absolute inset-0 bg-foreground/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setWinner(null)} />
            <motion.div
              className="relative w-full max-w-md overflow-hidden rounded-card bg-card text-center shadow-2xl"
              initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.85, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
            >
              <div className="ink-glow flex flex-col items-center gap-3 px-6 pt-8 pb-6 text-ink-foreground">
                <button
                  type="button"
                  onClick={() => setWinner(null)}
                  aria-label="Tutup"
                  className="absolute top-4 right-4 inline-flex size-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
                >
                  <XIcon className="size-4" aria-hidden />
                </button>
                <span className="inline-flex size-16 items-center justify-center rounded-full bg-brand-orange shadow-lg">
                  <TrophyIcon className="size-8 text-[#172019]" weight="fill" aria-hidden />
                </span>
                <p className="text-body-sm text-ink-muted">Selamat kepada</p>
                <h3 id="winner-title" className="text-h4 leading-tight font-bold tracking-tight break-all">
                  @{winner.label}
                </h3>
              </div>
              <div className="flex flex-col gap-5 p-6">
                {winner.detail ? <p className="mx-auto max-w-[40ch] rounded-tile bg-muted/60 p-3 text-body-sm">“{winner.detail}”</p> : null}
                <div className="flex flex-wrap justify-center gap-2">
                  {winner.href ? (
                    <a href={winner.href} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-full border px-4 text-body-sm font-medium hover:bg-accent">
                      Lihat profil <ArrowSquareOutIcon className="size-4" aria-hidden />
                      <span className="sr-only">(tab baru)</span>
                    </a>
                  ) : null}
                  <Button onClick={confirmWinner} autoFocus>
                    <ConfettiIcon aria-hidden /> Simpan pemenang
                  </Button>
                </div>
              </div>
            </motion.div>
            {reduce ? null : <ConfettiBurst />}
          </div>
        ) : null}
      </AnimatePresence>,
      document.body
      ) : null}
    </div>
  );
}

/** Warna konfeti dari palet logo (dekor perayaan, bukan encoding data). */
const CONFETTI = ["#70AE6D", "#4CA7DD", "#FF9100", "#FFE7C7", "#EEF3EB"];

/** Angka semu deterministik per indeks: render tetap murni dan sama di setiap render. */
function seeded(i: number, salt: number) {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Ledakan konfeti satu kali saat pemenang muncul (umpan balik, skill-ui-ux §5
 * "motion must be motivated"). Tidak dirender sama sekali bila pengguna memilih
 * kurangi animasi. Hanya transform + opacity yang dianimasikan.
 */
function ConfettiBurst() {
  const pieces = Array.from({ length: 44 }, (_, i) => {
    const angle = (i / 44) * Math.PI * 2 + seeded(i, 1) * 0.5;
    const dist = 180 + seeded(i, 2) * 220;
    return {
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist * 0.8 - 40,
      rotate: seeded(i, 3) * 720 - 360,
      color: CONFETTI[i % CONFETTI.length],
      w: 6 + Math.round(seeded(i, 4) * 6),
      h: 10 + Math.round(seeded(i, 5) * 8),
      round: i % 3 === 0,
    };
  });
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden" aria-hidden>
      {pieces.map((p, i) => (
        <motion.span
          key={i}
          className="absolute block"
          style={{ width: p.w, height: p.round ? p.w : p.h, backgroundColor: p.color, borderRadius: p.round ? 999 : 2 }}
          initial={{ x: 0, y: 0, rotate: 0, opacity: 1, scale: 0.6 }}
          animate={{ x: p.x, y: [0, p.y, p.y + 160], rotate: p.rotate, opacity: [1, 1, 0], scale: 1 }}
          transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1], times: [0, 0.55, 1] }}
        />
      ))}
    </div>
  );
}

// Dibuat oleh Faiz Hazim Hawari · skill-ui-ux
