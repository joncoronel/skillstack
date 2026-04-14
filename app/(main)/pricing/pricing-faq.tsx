"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/cubby-ui/accordion";

const FAQ = [
  {
    q: "What's the difference between Free and Pro?",
    a: "Free gives you manual stack selection, three saved bundles, and public bundles. Pro adds GitHub repo auto-detection, unlimited bundles, private bundles, and bundle analytics.",
  },
  {
    q: "What counts as a saved bundle?",
    a: "A bundle is a named collection of skills with a shareable URL. Free keeps up to three saved bundles; Pro is unlimited.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Cancel from your billing settings and you'll keep Pro access until the end of the current billing period.",
  },
  {
    q: "Is there a yearly discount?",
    a: "Yes — yearly is $90 instead of $108, roughly 17% off. Toggle the billing cycle above the plan cards to switch.",
  },
];

export function PricingFaq() {
  return (
    <section aria-labelledby="faq-heading" className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <span className="text-primary text-xs font-medium tracking-widest uppercase">
          Questions
        </span>
        <h2
          id="faq-heading"
          className="font-display text-3xl font-semibold tracking-tight md:text-4xl"
        >
          Things people ask.
        </h2>
      </div>

      <Accordion variant="outline">
        {FAQ.map((item) => (
          <AccordionItem key={item.q} value={item.q}>
            <AccordionTrigger
              indicatorType="plus"
              className="text-base font-medium"
            >
              {item.q}
            </AccordionTrigger>
            <AccordionContent>{item.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
