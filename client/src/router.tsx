import { Navigate, createBrowserRouter } from "react-router";
import { BrowseSkeleton } from "./components/Skeletons";
import RootLayout from "./layouts/RootLayout";
import { listingsLoader } from "./loaders";
import ErrorPage from "./pages/ErrorPage";
import HomePage from "./pages/HomePage";
import PhotoSearchPage from "./pages/PhotoSearchPage";

const withoutItem = (url: URL) => {
  const params = new URLSearchParams(url.search);
  params.delete("item");
  return `${url.pathname}?${params}`;
};

// A single page: categories, search and filters all live in the query string.
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
            // Opening or closing the item popup (?item=) shouldn't refetch the results behind it.
            shouldRevalidate: ({ currentUrl, nextUrl, defaultShouldRevalidate }) =>
              withoutItem(currentUrl) === withoutItem(nextUrl) ? false : defaultShouldRevalidate,
            hydrateFallbackElement: <BrowseSkeleton />,
          },
          {
            path: "photo",
            element: <PhotoSearchPage />,
          },
          {
            // Any other address goes back to the one page.
            path: "*",
            element: <Navigate to="/" replace />,
          },
        ],
      },
    ],
  },
]);
