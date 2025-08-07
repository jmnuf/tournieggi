import { useUser, SignInButton } from '@clerk/clerk-react';
import { useTournies } from '../Queries';


function TourniesList() {
  const qres = useTournies();

  if (!qres.data) {
    return <p>Loading tournies...</p>;
  }

  if (!qres.data.ok) {
    return (
      <>
        <p>{qres.data.message}</p>
        {
          qres.data.errors && qres.data.errors.length > 0
            ? <ul>{qres.data.errors.map(v => <li>{v}</li>)}</ul>
            : undefined
        }
      </>
    );
  }

  return (
    <ul>
      {qres.data.list.map(({ name }) => <li>{name}</li>)}
    </ul>
  );
}

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
      <TourniesList />
    </div>
  );
}

