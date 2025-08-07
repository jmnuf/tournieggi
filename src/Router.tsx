import {
  Outlet,
  Link,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';

import HomePage from './pages/Home';
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react';

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
          <SignInButton withSignUp={true} />
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

const routeTree = rootRoute.addChildren([HomeRoute]);

const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

export default function RouterComponent() {
  return <RouterProvider router={router} />;
}

