"use client";
import {
  useScroll,
  useTransform,
  motion,
} from "framer-motion";
import React, { useEffect, useRef, useState } from "react";

interface TimelineEntry {
  title: React.ReactNode | string;
  content: React.ReactNode;
}

export const Timeline = ({ data }: { data: TimelineEntry[] }) => {
  const ref = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setHeight(rect.height);
    }
  }, [ref]);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 10%", "end 50%"],
  });

  const heightTransform = useTransform(scrollYProgress, [0, 1], [0, height]);
  const opacityTransform = useTransform(scrollYProgress, [0, 0.1], [0, 1]);

  return (
    <div
      className="w-full font-sans md:px-10"
      ref={containerRef}
    >
      <div ref={ref} className="relative max-w-7xl mx-auto pb-20">
        {data.map((item, index) => (
          <div
            key={index}
            className="flex justify-start pt-10 md:pt-40 md:gap-10"
          >
            <div className="sticky flex flex-col md:flex-row z-40 items-center top-40 self-start max-w-xs lg:max-w-sm md:w-full">
              <div className="h-10 absolute left-3 md:left-3 w-10 rounded-full bg-white/60 backdrop-blur-md shadow-[0_2px_8px_rgba(0,0,0,0.04)] ring-1 ring-gray-100 flex items-center justify-center">
                <div className="h-3.5 w-3.5 rounded-full bg-gradient-to-b from-white to-gray-50 border border-gray-200/60 shadow-[inset_0_1px_3px_rgba(255,255,255,0.9),0_1px_2px_rgba(0,0,0,0.05)]" />
              </div>
              <div className="hidden md:block pl-20 w-full">
                {item.title}
              </div>
            </div>

            <div className="relative pl-14 md:pl-4 w-full flex justify-center lg:justify-end">
              <div className="md:hidden block mb-4 w-full">
                {item.title}
              </div>
              {item.content}{" "}
            </div>
          </div>
        ))}
        <div
          style={{
            height: height + "px",
          }}
          className="absolute md:left-[31px] left-[31px] top-0 overflow-hidden w-[2px] bg-gradient-to-b from-transparent via-gray-200/50 to-transparent [mask-image:linear-gradient(to_bottom,transparent_0%,black_10%,black_90%,transparent_100%)] shadow-sm"
        >
          <motion.div
            style={{
              height: heightTransform,
              opacity: opacityTransform,
            }}
            className="absolute inset-x-0 top-0 w-full bg-gradient-to-t from-gray-300/60 via-white to-transparent from-[0%] via-[20%] rounded-full shadow-[0_0_12px_rgba(100,120,150,0.8)]"
          />
        </div>
      </div>
    </div>
  );
};
