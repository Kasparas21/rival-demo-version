import type { BlogFaqItem } from "@/lib/sanity/types";

type Props = {
  items: BlogFaqItem[];
};

export function BlogFaqSection({ items }: Props) {
  if (!items.length) return null;

  return (
    <section className="mt-12 border-t border-slate-200 pt-10" aria-labelledby="post-faq-heading">
      <h2 id="post-faq-heading" className="text-xl font-semibold text-gray-900">
        Frequently asked questions
      </h2>
      <dl className="mt-6 space-y-6">
        {items.map((item) => (
          <div key={item.question}>
            <dt className="text-base font-semibold text-gray-900">{item.question}</dt>
            <dd className="mt-2 text-base leading-7 text-gray-700">{item.answer}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
