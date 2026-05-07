import Link from "next/link";
import { Search } from "lucide-react";

/** Home: filter saved competitors in the sidebar; use Find competitor for a new lookup */
export default function DashboardHomePage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 min-h-[min(480px,70vh)]">
      <div className="max-w-md text-center">
        <p className="text-[16px] sm:text-[17px] font-semibold text-[#343434] leading-snug">
          Search your competitors in the sidebar
        </p>
        <p className="mt-2 text-[14px] text-[#808080] font-medium leading-relaxed">
          Use the filter above your list to open anyone you&apos;ve saved. Use Find competitor in the sidebar to add someone new.
        </p>
        <Link
          href="/dashboard/spy"
          scroll={false}
          className="mt-8 inline-flex items-center justify-center gap-2 rounded-2xl bg-[#343434] px-6 py-3.5 text-[14px] font-semibold text-white shadow-md transition-colors hover:bg-[#2a2a2a]"
        >
          <Search className="h-4 w-4 shrink-0" strokeWidth={2.25} aria-hidden />
          Find competitor
        </Link>
      </div>
    </div>
  );
}
