import { heading } from "../lib/ui";

const STEPS = [
  { title: "Discover & Search", text: "Use our map search to find practical, affordable clothing near you." },
  { title: "Make a Deal & Pay", text: "Connect with sellers, agree on a fair price, and pay securely online." },
  {
    title: "Save Money or Earn Extra Cash",
    text: "Get the clothes you need at a lower cost, or earn money for items you no longer wear — good for your wallet and the planet.",
  },
];

const column = "flex flex-col items-center text-center";
const text = "mt-3 max-w-[420px] text-[15px] leading-relaxed text-ink-2";

// Home page section under the hero: how buying and selling works.
export default function HowItWorks() {
  return (
    <>
      <section className="border-t border-line px-4 py-16 sm:px-6 sm:py-20">
        <h2 className={`${heading.page} text-center sm:text-[34px]`}>How It Works</h2>
        <p className="mx-auto mt-4 max-w-xl text-center text-[15px] leading-relaxed text-ink-2">
          Shopping and selling sustainably is simple. Here's how it works in three easy steps.
        </p>

        <ol className="mx-auto mt-12 grid max-w-5xl gap-12 sm:grid-cols-3 sm:gap-10">
          {STEPS.map((step, i) => (
            <li key={step.title} className={column}>
              <span className="mb-4 grid size-9 place-items-center rounded-full bg-accent-soft text-sm font-bold text-accent">
                {i + 1}
              </span>
              <h3 className={heading.panel}>{step.title}</h3>
              <p className={text}>{step.text}</p>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
