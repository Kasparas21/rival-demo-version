"use client";

import { motion, useReducedMotion } from "framer-motion";

import { DiscoveryAdCard } from "@/components/discovery/discovery-ad-card";
import type { DiscoveryAdDto } from "@/lib/discovery/types";
import { cn } from "@/lib/utils";

type Props = {
  ads: DiscoveryAdDto[];
  isSaved: (id: string) => boolean;
  isPending: (id: string) => boolean;
  onOpenAd: (id: string) => void;
  onToggleSave: (ad: DiscoveryAdDto) => void;
  expanded?: boolean;
  selectable?: boolean;
  selectedAdIds?: Set<string>;
  onToggleSelectAd?: (ad: DiscoveryAdDto) => void;
};

export function DiscoveryAssistantAdGallery({
  ads,
  isSaved,
  isPending,
  onOpenAd,
  onToggleSave,
  expanded = false,
  selectable = false,
  selectedAdIds,
  onToggleSelectAd,
}: Props) {
  const reduceMotion = useReducedMotion();
  if (!ads.length) return null;

  return (
    <motion.div
      className={cn(
        "mt-3",
        expanded ? "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" : "space-y-3",
      )}
      initial={reduceMotion ? false : "hidden"}
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: reduceMotion ? 0 : 0.06 } },
      }}
    >
      {ads.map((ad) => (
        <motion.div
          key={ad.id}
          variants={
            reduceMotion
              ? undefined
              : {
                  hidden: { opacity: 0, y: 12 },
                  visible: { opacity: 1, y: 0, transition: { type: "spring", damping: 28, stiffness: 340 } },
                }
          }
        >
          <DiscoveryAdCard
            ad={ad}
            onOpen={() => onOpenAd(ad.id)}
            isSaved={isSaved(ad.id)}
            isSavePending={isPending(ad.id)}
            onToggleSave={() => onToggleSave(ad)}
            selectable={selectable}
            selected={selectedAdIds?.has(ad.id)}
            onToggleSelect={() => onToggleSelectAd?.(ad)}
            className="shadow-[0_8px_28px_-12px_rgba(15,23,42,0.2)]"
          />
        </motion.div>
      ))}
    </motion.div>
  );
}
