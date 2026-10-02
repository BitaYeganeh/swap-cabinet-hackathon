import { Outlet, ScrollRestoration } from "react-router";
import { BasketDrawer } from "../components/Basket";
import Footer from "../components/Footer";
import { SavedDrawer } from "../components/Saved";
import Navbar from "../components/Navbar";
import PhotoDropZone from "../components/PhotoDropZone";

export default function RootLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1">
        <Outlet />
      </main>

      <Footer />
      <BasketDrawer />
      <SavedDrawer />
      <PhotoDropZone />
      <ScrollRestoration />
    </div>
  );
}
