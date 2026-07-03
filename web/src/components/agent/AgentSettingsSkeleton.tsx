import { cn } from "@/lib/utils";

function Bone({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-[#ececef]", className)} />;
}

export function AgentSettingsFormSkeleton() {
  return (
    <div className="space-y-5" aria-hidden>
      <div>
        <Bone className="mb-2 h-3.5 w-28" />
        <Bone className="mb-3 h-3 w-48" />
        <div className="space-y-3">
          <Bone className="h-[72px] w-full rounded-xl" />
          <Bone className="h-[72px] w-full rounded-xl" />
          <Bone className="h-14 w-full rounded-xl" />
        </div>
      </div>
      <div>
        <Bone className="mb-3 h-3.5 w-24" />
        <div className="space-y-2">
          <Bone className="h-4 w-full max-w-[280px]" />
          <Bone className="h-4 w-full max-w-[240px]" />
          <Bone className="h-4 w-full max-w-[200px]" />
        </div>
      </div>
      <Bone className="h-10 w-28 rounded-xl" />
    </div>
  );
}

export function AgentMessagesSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("mt-6 border-t border-[#f0f0f2] pt-5", className)} aria-hidden>
      <Bone className="mb-3 h-3.5 w-32" />
      <div className="space-y-2">
        <Bone className="h-12 w-full rounded-lg" />
        <Bone className="h-12 w-full rounded-lg" />
      </div>
    </div>
  );
}
