import { Navigate, createBrowserRouter } from "react-router";
import { BrowseSkeleton } from "./components/Skeletons";
import RootLayout from "./layouts/RootLayout";
import { listingsLoader } from "./loaders";
import ErrorPage from "./pages/ErrorPage";
import HomePage from "./pages/HomePage";

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
            hydrateFallbackElement: <BrowseSkeleton />,
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
