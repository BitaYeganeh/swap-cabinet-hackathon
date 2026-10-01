import { createBrowserRouter } from "react-router";
import { BrowseSkeleton, DetailSkeleton } from "./components/Skeletons";
import RootLayout from "./layouts/RootLayout";
import { listingLoader, listingsLoader } from "./loaders";
import ErrorPage, { NotFoundPage } from "./pages/ErrorPage";
import HomePage from "./pages/HomePage";
import ListingPage from "./pages/ListingPage";
import SavedPage from "./pages/SavedPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      {
        // Pathless wrapper: page errors render inside the layout, keeping nav + footer.
        errorElement: <ErrorPage />,
        children: [
          {
            index: true,
            element: <HomePage />,
            loader: listingsLoader,
            hydrateFallbackElement: <BrowseSkeleton />,
          },
          {
            path: "category/:category",
            element: <HomePage />,
            loader: listingsLoader,
            hydrateFallbackElement: <BrowseSkeleton />,
          },
          {
            path: "listings/:id",
            element: <ListingPage />,
            loader: listingLoader,
            hydrateFallbackElement: <DetailSkeleton />,
          },
          {
            path: "saved",
            element: <SavedPage />,
          },
          {
            path: "*",
            element: <NotFoundPage />,
          },
        ],
      },
    ],
  },
]);
