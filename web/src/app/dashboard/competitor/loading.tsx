export default function CompetitorLoading() {
  return (
    <div className="flex min-h-0 w-full flex-1 flex-col gap-4 p-4 sm:p-6 opacity-50">
      <div className="h-9 w-52 max-w-[min(100%,18rem)] animate-pulse rounded-xl bg-[#ececef]" />
      <div className="h-36 max-w-3xl animate-pulse rounded-2xl bg-[#ececef]" />
      <div className="grid min-h-0 flex-1 gap-3 sm:grid-cols-2">
        <div className="min-h-[200px] animate-pulse rounded-2xl bg-[#ececef]" />
        <div className="min-h-[200px] animate-pulse rounded-2xl bg-[#ececef]" />
      </div>
    </div>
  );
}
