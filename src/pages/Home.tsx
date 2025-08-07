import { useUser, SignInButton } from '@clerk/clerk-react';


export default function HomePage() {
  const u = useUser();
  if (!u.isLoaded) {
    return (
      <div className="flex flex-col items-center">
        <p className="text-lg">Loading...</p>
      </div>
    );
  }

  if (!u.isSignedIn) {
    return (
      <div className="flex flex-col items-center">
        <h1 className="text-3xl">Tournieggi</h1>
        <p className="text-lg text-center">
          Manage a simple tournie in tournieggi.<br />
          Sign in to get started.
        </p>
        <SignInButton withSignUp={true} />
      </div>
    );
  }

  const user = u.user;
  return (
    <div className="flex flex-col items-center">
      <h1 className="text-3xl">Tournieggi</h1>
      <p className="text-lg text-center">
        Manage a simple tournie in tournieggi.<br />
        Welcome back {user.username!}!
      </p>
    </div>
  );
}

