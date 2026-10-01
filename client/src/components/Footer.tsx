import Logo from "./Logo";

export default function Footer() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-ink-3 sm:px-6">
        <Logo small />
        <span>Team 4 · Powered by the Sharetribe Marketplace API</span>
      </div>
    </footer>
  );
}
