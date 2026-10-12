import type { Metadata } from "next";

import BlurFade from "@/components/effects/blur-fade";
import { PageIntro } from "@/components/page-intro";

export const metadata: Metadata = {
  title: "Kebijakan Privasi",
  description: "Kebijakan privasi dasbor Life at PTPN Insight untuk akun Instagram @lifeatptpn.",
};

/*
 * Kebijakan privasi untuk Meta App Settings > Basic (Privacy Policy URL) dan
 * petunjuk hapus data (#hapus-data, untuk kolom User data deletion).
 *
 * SEMUA pernyataan di halaman ini harus cocok dengan cara kerja aplikasi yang
 * sebenarnya. Bila kode berubah (data baru diambil, cookie baru, penyimpanan
 * baru), halaman ini wajib ikut diubah. Fakta per 12 Okt 2026:
 * - sumber: Instagram API with Instagram Login, hanya akun @lifeatptpn
 * - database + Storage: Supabase ap-southeast-1 (Singapura); hosting: Vercel
 * - tanpa analytics/pelacak; cookie hanya `rencana_edit` (mode edit PIN, 12 jam)
 * - localStorage: `theme` (next-themes) dan `lifeatptpn-insight:spin-winners`
 * - komentar yang hilang dari Instagram ditandai removed_at, tidak dihapus
 *   otomatis; permintaan hapus ditangani manual (lihat README)
 */
const OWNER = "Tim pengelola akun Instagram @lifeatptpn";
const CONTACT = "cultureptpn@gmail.com";
const EFFECTIVE = "12 Oktober 2026";
const DELETE_DAYS = 30;

const SECTIONS = [
  { id: "pengelola", title: "Siapa kami" },
  { id: "data", title: "Data yang kami ambil" },
  { id: "tujuan", title: "Untuk apa data dipakai" },
  { id: "spin-wheel", title: "Kuis dan Spin Wheel" },
  { id: "penyimpanan", title: "Tempat penyimpanan dan pihak ketiga" },
  { id: "akses", title: "Siapa yang bisa melihat" },
  { id: "retensi", title: "Berapa lama disimpan" },
  { id: "cookie", title: "Cookie dan penyimpanan di browser" },
  { id: "hapus-data", title: "Hak Anda dan cara menghapus data" },
  { id: "perubahan", title: "Perubahan kebijakan" },
  { id: "english", title: "English summary" },
] as const;

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-judul`} className="scroll-mt-6 border-t border-border/60 pt-6 first:border-0 first:pt-0">
      <h2 id={`${id}-judul`} className="text-lead font-bold tracking-tight">
        {title}
      </h2>
      <div className="mt-3 flex max-w-[65ch] flex-col gap-3 text-body text-pretty">{children}</div>
    </section>
  );
}

function List({ children }: { children: React.ReactNode }) {
  return <ul className="flex list-disc flex-col gap-2 pl-5 marker:text-muted-foreground">{children}</ul>;
}

const Mail = () => (
  <a href={`mailto:${CONTACT}`} className="font-semibold underline underline-offset-2">
    {CONTACT}
  </a>
);

export default function PrivacyPage() {
  return (
    <BlurFade>
      <div className="flex flex-col gap-6">
        <PageIntro
          title="Kebijakan Privasi"
          subtitle={`Dasbor Life at PTPN Insight untuk akun Instagram @lifeatptpn. Berlaku sejak ${EFFECTIVE}.`}
        />

        <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
          <article className="flex flex-col gap-6 rounded-card border border-border/70 bg-card/85 p-5 shadow-card md:p-8">
            <div className="max-w-[65ch] rounded-tile bg-brand-green-soft p-4 text-body-sm md:p-5">
              <p className="font-semibold">Ringkasnya</p>
              <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5">
                <li>Kami hanya membaca data akun @lifeatptpn milik kami sendiri, termasuk komentar publik di post kami.</li>
                <li>Data dipakai untuk laporan kinerja, perencanaan konten, dan mengundi pemenang kuis.</li>
                <li>Kami tidak menjual data, tidak memakai data untuk iklan, dan tidak memasang pelacak.</li>
                <li>
                  Minta hapus data lewat <Mail />. Kami tindak lanjuti paling lambat {DELETE_DAYS} hari.
                </li>
              </ul>
            </div>

            <Section id="pengelola" title="Siapa kami">
              <p>
                Dasbor ini dikelola oleh <strong>{OWNER}</strong>. Dasbor dipakai oleh tim internal untuk melihat kinerja akun,
                menyusun laporan berkala, merencanakan konten, dan menjalankan kuis untuk pengikut.
              </p>
              <p>
                Pertanyaan tentang kebijakan ini dapat dikirim ke <Mail />.
              </p>
            </Section>

            <Section id="data" title="Data yang kami ambil">
              <p>
                Data diambil melalui Instagram API with Instagram Login, khusus untuk akun bisnis @lifeatptpn yang kami kelola sendiri.
                Kami tidak mengakses akun Instagram lain.
              </p>
              <List>
                <li>
                  <strong>Profil akun @lifeatptpn:</strong> nama pengguna, nama, jenis akun, jumlah pengikut, jumlah yang diikuti, jumlah post,
                  dan foto profil.
                </li>
                <li>
                  <strong>Konten kami:</strong> caption, tautan post, jenis konten, waktu terbit, jumlah suka dan komentar, serta gambar thumbnail.
                  Thumbnail disalin ke penyimpanan kami agar tetap tampil setelah tautan gambar Instagram kedaluwarsa.
                </li>
                <li>
                  <strong>Statistik konten dan akun:</strong> tayangan, jangkauan, interaksi, jumlah simpan, bagikan, dan kunjungan profil.
                </li>
                <li>
                  <strong>Statistik audiens gabungan:</strong> sebaran kota, negara, usia, dan jenis kelamin pengikut, serta jam ketika pengikut
                  aktif. Angka ini disediakan Meta dalam bentuk gabungan, bukan data per orang.
                </li>
                <li>
                  <strong>Komentar pada post @lifeatptpn:</strong> nama pengguna dan ID akun Instagram pemberi komentar, isi komentar dan balasannya,
                  waktu komentar, serta jumlah suka pada komentar itu.
                </li>
              </List>
              <p>
                Kami <strong>tidak</strong> mengambil pesan langsung (DM), kata sandi, email, nomor telepon, atau data dari akun lain di luar
                komentar yang ditulis di post kami.
              </p>
            </Section>

            <Section id="tujuan" title="Untuk apa data dipakai">
              <List>
                <li>Menampilkan kinerja akun dan konten di dasbor, termasuk konten yang paling banyak ditonton dan waktu posting terbaik.</li>
                <li>Menyusun laporan berkala untuk perusahaan dalam bentuk halaman web dan file Excel.</li>
                <li>Merencanakan konten dan mencocokkan rencana dengan post yang benar-benar terbit.</li>
                <li>Menampilkan komentar per post agar tim dapat membaca masukan pengikut.</li>
                <li>Mengundi pemenang kuis secara acak dari komentar (lihat bagian berikut).</li>
              </List>
              <p>
                Data tidak dijual, tidak dibagikan untuk iklan, dan tidak dipakai untuk membuat profil pengguna. Dasbor ini juga tidak
                mengirim apa pun ke Instagram: tidak memposting, tidak membalas, dan tidak menghapus komentar.
              </p>
            </Section>

            <Section id="spin-wheel" title="Kuis dan Spin Wheel">
              <p>
                Saat kuis, peserta diambil dari komentar publik pada post kuis, dengan filter yang dipilih tim (misalnya kata kunci dan batas
                waktu). Pemenang dipilih secara acak oleh komputer sebelum animasi roda berhenti, sehingga setiap peserta yang memenuhi syarat
                punya peluang yang sama.
              </p>
              <p>
                Riwayat pemenang hanya tersimpan di browser perangkat yang dipakai untuk mengundi, tidak di database kami. Pengumuman pemenang
                dilakukan tim secara terpisah.
              </p>
            </Section>

            <Section id="penyimpanan" title="Tempat penyimpanan dan pihak ketiga">
              <p>Kami memakai penyedia layanan berikut untuk menjalankan dasbor:</p>
              <List>
                <li>
                  <strong>Supabase</strong> untuk database dan penyimpanan file (gambar thumbnail), di server wilayah Singapura.
                </li>
                <li>
                  <strong>Vercel</strong> untuk menjalankan halaman dasbor.
                </li>
                <li>
                  <strong>Meta (Instagram)</strong> sebagai sumber data.
                </li>
              </List>
              <p>Selain penyedia di atas, data tidak dibagikan kepada pihak lain.</p>
            </Section>

            <Section id="akses" title="Siapa yang bisa melihat">
              <p>
                Dasbor ditujukan untuk tim internal. Dasbor tidak memakai akun login: tautannya hanya dibagikan kepada tim, dan halamannya
                diberi tanda agar tidak diindeks mesin pencari. Komentar yang ditampilkan adalah komentar yang sudah publik di Instagram.
              </p>
              <p>
                Mengubah rencana konten memerlukan PIN tim. Data Instagram tidak dapat diubah dari dasbor.
              </p>
            </Section>

            <Section id="retensi" title="Berapa lama disimpan">
              <p>
                Data disimpan selama dasbor dipakai untuk pelaporan. Komentar yang dihapus pemiliknya di Instagram akan ditandai sebagai
                dihapus dan tidak ditampilkan lagi setelah sinkronisasi berikutnya. Sinkronisasi berjalan otomatis setiap jam.
              </p>
              <p>
                Bila akses aplikasi ke akun @lifeatptpn dicabut, pengambilan data baru berhenti. Data yang sudah tersimpan dapat dihapus atas
                permintaan melalui <Mail />.
              </p>
            </Section>

            <Section id="cookie" title="Cookie dan penyimpanan di browser">
              <List>
                <li>
                  <strong>Cookie mode edit</strong> (<code className="font-mono text-body-sm">rencana_edit</code>): hanya dibuat setelah anggota
                  tim memasukkan PIN untuk mengubah rencana konten. Isinya sidik PIN, bukan PIN itu sendiri, dan berlaku 12 jam.
                </li>
                <li>
                  <strong>Penyimpanan browser:</strong> pilihan tema terang atau gelap, dan riwayat pemenang Spin Wheel di perangkat yang
                  dipakai mengundi.
                </li>
              </List>
              <p>Kami tidak memakai cookie analitik, cookie iklan, atau pelacak pihak ketiga.</p>
            </Section>

            <Section id="hapus-data" title="Hak Anda dan cara menghapus data">
              <p>Bila Anda pernah berkomentar di post @lifeatptpn, Anda dapat:</p>
              <List>
                <li>
                  <strong>Menghapus komentar di Instagram.</strong> Komentar itu ditandai sebagai dihapus dan tidak lagi tampil di dasbor setelah
                  sinkronisasi berikutnya.
                </li>
                <li>
                  <strong>Meminta kami menghapus data Anda.</strong> Kirim email ke <Mail /> dengan judul <strong>Hapus data</strong> dan sebutkan
                  nama pengguna Instagram Anda. Kami menghapus data komentar yang terkait dengan nama pengguna itu dari database kami, lalu
                  mengonfirmasi lewat email paling lambat {DELETE_DAYS} hari setelah permintaan diterima.
                </li>
                <li>
                  <strong>Meminta salinan atau penjelasan</strong> tentang data Anda yang kami simpan, lewat email yang sama.
                </li>
              </List>
              <p>
                Catatan: komentar yang masih ada di Instagram dapat terambil kembali pada sinkronisasi berikutnya. Agar tidak terambil lagi,
                hapus juga komentarnya di Instagram.
              </p>
            </Section>

            <Section id="perubahan" title="Perubahan kebijakan">
              <p>
                Kebijakan ini dapat diperbarui bila cara kerja dasbor berubah. Tanggal berlaku di bagian atas halaman selalu menunjukkan
                versi terbaru.
              </p>
            </Section>

            <Section id="english" title="English summary">
              <div lang="en" className="flex flex-col gap-3">
                <p>
                  Life at PTPN Insight is an internal dashboard operated by the team that manages the Instagram account @lifeatptpn. Using the
                  Instagram API with Instagram Login, it reads only our own business account: profile details, our posts and their thumbnails,
                  post and account insights, aggregated audience statistics provided by Meta, and public comments left on our posts (username,
                  Instagram-scoped user ID, comment text, timestamp, and like count).
                </p>
                <p>
                  We use this data for performance reporting, content planning, and drawing quiz winners at random from comments. We do not
                  sell data, use it for advertising, or run trackers. Data is stored with Supabase (Singapore region) and the dashboard is
                  hosted on Vercel. The only cookie is an edit-mode cookie set after a team member enters a PIN.
                </p>
                <p>
                  <strong>Data deletion:</strong> delete your comment on Instagram, or email <Mail /> with the subject &quot;Delete data&quot; and
                  your Instagram username. We delete the stored comment data linked to that username and confirm by email within{" "}
                  {DELETE_DAYS} days. Comments that remain on Instagram may be collected again during the next sync, so please also delete
                  them on Instagram.
                </p>
              </div>
            </Section>
          </article>

          <nav aria-label="Isi halaman" className="hidden rounded-card border border-border/70 bg-card/85 p-5 shadow-card xl:sticky xl:top-6 xl:block">
            <p className="text-caption font-semibold text-muted-foreground">Isi halaman</p>
            <ol className="mt-3 flex flex-col gap-1.5 text-body-sm">
              {SECTIONS.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="block rounded-full px-3 py-1.5 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden">
                    {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </div>
      </div>
    </BlurFade>
  );
}

// Dibuat oleh Faiz Hazim Hawari · skill-ui-ux
