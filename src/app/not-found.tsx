import Link from "next/link";

import { buttonVariants } from "@/components/ui/button-variants";

export default function NotFound() {
  return (
    <div className="flex flex-col items-start gap-3 py-10">
      <h1 className="text-h5 font-semibold">Halaman tidak ditemukan</h1>
      <p className="max-w-[60ch] text-body-sm text-muted-foreground">
        Alamatnya salah atau postingan ini tidak ada di data yang tersinkron.
      </p>
      <Link href="/" className={buttonVariants()}>
        Ke Ringkasan
      </Link>
    </div>
  );
}
