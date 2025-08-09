import {
  Outlet,
  Link,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react';

import HomePage from './routes/Home';
import UserPage from './routes/User';
import TourniePage from './routes/Tournie';

const rootRoute = createRootRoute({
  component: () => (
    <>
      <header className="w-full bg-blue-200 px-2 py-1 flex justify-between">
        <nav className="flex gap-1">
          <Link to="/" className="px-2 py-1 [&.active]:font-bold">
            Home
          </Link>
        </nav>
        <SignedOut>
          <SignInButton />
        </SignedOut>
        <SignedIn>
          <UserButton />
        </SignedIn>
      </header>
      <hr className="w-full shadow-[0px_5px_1rem_2px_rgba(0,0,0,0.5)]" />
      <div className="py-2 invisible"></div>

      <Outlet />
      <TanStackRouterDevtools />
    </>
  ),
});

const HomeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomePage,
});

const UserRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/u/$username',
  component: () => {
    const params = UserRoute.useParams();
    return <UserPage username={params.username} />;
  },
});

const TournieRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/u/$user/$name',
  component: () => {
    const params = TournieRoute.useParams();
    return <TourniePage username={params.user} name={params.name} />
  },
});

const routeTree = rootRoute.addChildren([HomeRoute, UserRoute, TournieRoute]);

const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

export default function RouterComponent() {
  return <RouterProvider router={router} />;
}

