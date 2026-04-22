"use client";
import React from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export const TestimonialsColumn = (props: {
  className?: string;
  testimonials: { text: string; image: string; name: string; role: string }[];
  duration?: number;
}) => {
  return (
    <div className={cn("relative overflow-hidden", props.className)}>
      <motion.div
        animate={{
          translateY: "-50%",
        }}
        transition={{
          duration: props.duration || 10,
          repeat: Infinity,
          ease: "linear",
          repeatType: "loop",
        }}
        className="flex flex-col gap-6 pb-6"
      >
        {[
          ...new Array(2).fill(0).map((_, index) => (
            <React.Fragment key={index}>
              {props.testimonials.map(({ text, image, name, role }, i) => (
                <div 
                  className="p-8 rounded-3xl border border-gray-100 bg-white/70 backdrop-blur-md shadow-sm hover:shadow-md transition-shadow duration-300 max-w-xs w-full" 
                  key={`${index}-${i}`}
                >
                  <p className="text-[15px] leading-relaxed text-[#4b5563] font-medium italic">
                    "{text}"
                  </p>
                  <div className="flex items-center gap-3 mt-6">
                    <img
                      width={44}
                      height={44}
                      src={image}
                      alt={name}
                      className="h-11 w-11 rounded-full object-cover ring-2 ring-gray-50 shadow-inner"
                    />
                    <div className="flex flex-col">
                      <div className="font-serif text-[16px] text-[#343434] tracking-tight">{name}</div>
                      <div className="text-[12px] font-semibold text-[#5a99b8] uppercase tracking-[0.1em] mt-0.5">{role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </React.Fragment>
          )),
        ]}
      </motion.div>
    </div>
  );
};
