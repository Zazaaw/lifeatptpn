import type { Metadata } from "next";

import { ChatCircleIcon, ImagesSquareIcon } from "@phosphor-icons/react/ssr";

import BlurFade from "@/components/effects/blur-fade";
import { PageIntro } from "@/components/page-intro";
import { SpinWheelApp } from "@/components/spin-wheel/spin-wheel-app";
import { commentsPermissionMissing, getMeta, getQuizPosts } from "@/lib/data";
import { fmtInt } from "@/lib/format";

export const metadata: Metadata = { title: "Spin Wheel Kuis" };

export default async function SpinWheelPage() {
  const [posts, meta] = await Promise.all([getQuizPosts(), getMeta()]);
  const permissionMissing = commentsPermissionMissing(meta) && (meta.comments?.stored ?? 0) === 0;

  return (
    <BlurFade>
      <div className="flex flex-col gap-6">
        <PageIntro
          title="Spin Wheel Kuis"
          subtitle="Undi pemenang kuis dari komentar post Instagram atau dari daftar nama sendiri. Tidak ada data yang dikirim ke Instagram."
          stats={[
            { label: "Post bisa dipilih", value: fmtInt(posts.length), icon: ImagesSquareIcon },
            {
              label: "Komentar tersimpan",
              value: fmtInt(meta.comments?.stored ?? 0),
              icon: ChatCircleIcon,
              title: permissionMissing ? "Izin komentar belum aktif, pakai input manual" : undefined,
            },
          ]}
        />
        <SpinWheelApp posts={posts} permissionMissing={permissionMissing} ownUsername={meta.account?.username ?? "lifeatptpn"} />
      </div>
    </BlurFade>
  );
}

// Dibuat oleh Faiz Hazim Hawari · skill-ui-ux
