import { PortableText, type PortableTextComponents } from "@portabletext/react";
import type { PortableTextBlock } from "@portabletext/types";
import Image from "next/image";

import { urlForImage } from "@/lib/sanity/image";
import { SITE_URL } from "@/lib/seo/site";

function isInternalHref(href: string): boolean {
  if (href.startsWith("/")) return true;
  try {
    const url = new URL(href);
    return url.origin === SITE_URL || url.hostname === "spy-rival.com" || url.hostname === "www.spy-rival.com";
  } catch {
    return false;
  }
}

const components: PortableTextComponents = {
  block: {
    h1: ({ children }) => <h1 className="mt-10 text-3xl font-semibold text-gray-900 first:mt-0">{children}</h1>,
    h2: ({ children }) => <h2 className="mt-8 text-2xl font-semibold text-gray-900 first:mt-0">{children}</h2>,
    h3: ({ children }) => <h3 className="mt-6 text-xl font-semibold text-gray-900 first:mt-0">{children}</h3>,
    h4: ({ children }) => <h4 className="mt-5 text-lg font-semibold text-gray-900 first:mt-0">{children}</h4>,
    normal: ({ children }) => <p className="mt-4 text-base leading-7 text-gray-700 first:mt-0">{children}</p>,
    blockquote: ({ children }) => (
      <blockquote className="mt-6 border-l-4 border-purple-300 pl-4 text-lg italic text-gray-700">{children}</blockquote>
    ),
  },
  list: {
    bullet: ({ children }) => <ul className="mt-4 list-disc space-y-2 pl-6 text-gray-700">{children}</ul>,
  },
  marks: {
    strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
    em: ({ children }) => <em>{children}</em>,
    link: ({ children, value }) => {
      const href = typeof value?.href === "string" ? value.href : "#";
      const internal = isInternalHref(href);
      return (
        <a
          href={href}
          className="font-medium text-purple-700 underline underline-offset-2"
          {...(internal ? {} : { target: "_blank", rel: "noopener noreferrer" })}
        >
          {children}
        </a>
      );
    },
  },
  types: {
    image: ({ value }) => {
      if (!value?.asset?._ref) return null;
      const src = urlForImage(value).width(1200).fit("max").url();
      return (
        <figure className="my-8 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="relative aspect-[16/10] w-full">
            <Image
              src={src}
              alt={value.alt ?? ""}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 768px"
            />
          </div>
        </figure>
      );
    },
  },
};

export function PortableTextBody({ value }: { value: PortableTextBlock[] | null | undefined }) {
  if (!value?.length) return null;
  return (
    <div className="blog-prose max-w-none">
      <PortableText value={value} components={components} />
    </div>
  );
}
