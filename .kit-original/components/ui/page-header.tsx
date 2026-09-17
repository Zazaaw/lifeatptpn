import Typography from "./typography";
import { cn } from "@/lib/utils";

/**
 * PageHeader — the opening block every top-level page uses.
 *
 * This is the most-repeated pattern in the whole design: a bold 3xl heading
 * with a muted one-line subtitle underneath. Extracting it means every page
 * starts identically, which is a big part of why the site feels coherent.
 *
 *   <PageHeader
 *     title="Projects"
 *     subtitle="Several projects that I have worked on, both private and open source."
 *   />
 *
 * Note the `text-3xl font-bold` override on H3: the heading LEVEL is h3 for
 * document outline purposes (the page's h1 lives in the layout/metadata),
 * but visually it's the largest text on the page.
 */

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  /** Optional right-aligned slot — a button, a toggle, a link. */
  action?: React.ReactNode;
  className?: string;
};

export default function PageHeader({
  title,
  subtitle,
  action,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("mb-6", className)}>
      <div className="flex items-start justify-between gap-4">
        <Typography.H3 className="text-3xl font-bold">{title}</Typography.H3>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {subtitle ? (
        <Typography.P className="mt-2 max-w-2xl text-muted-foreground">
          {subtitle}
        </Typography.P>
      ) : null}
    </div>
  );
}
