import { LuLeaf } from "react-icons/lu";
import { Outlet, ScrollRestoration } from "react-router";
import { BasketDrawer } from "../components/Basket";
import Footer from "../components/Footer";
import { SavedDrawer } from "../components/Saved";
import Navbar from "../components/Navbar";

export default function RootLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex items-center justify-center gap-2 bg-accent px-4 py-2 text-center text-xs text-[#eaf3ee] sm:text-[13px]">
        <LuLeaf className="size-[15px] shrink-0" />
        Give clothes a second life — every item here is pre-loved
      </div>

      <Navbar />

      <main className="flex-1">
        <Outlet />
      </main>

      <Footer />
      <BasketDrawer />
      <SavedDrawer />
      <ScrollRestoration />
    </div>
  );
}
