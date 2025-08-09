import { useUser, SignInButton } from '@clerk/clerk-react';
import { api } from '../Queries';
import { Link } from '@tanstack/react-router';


function TourniesList({ user }: { user: string }) {
  const qres = api.query.useTournies();

  if (qres.isLoading) {
    return (
      <section>
        <p>Loading tournies...</p>
      </section>
    );
  }

  if (qres.isError) {
    return (
      <section>
        <p>Failed to load tournies: {qres.error.message}</p>
      </section>
    );
  }

  const data = qres.data!;

  if (!data.ok) {
    return (
      <section>
        <h2>Failed to Get Tournies</h2>
        <p>{data.message}</p>
        {
          data.errors && data.errors.length > 0
            ? <ul>{data.errors.map(v => <li>{v}</li>)}</ul>
            : undefined
        }
      </section>
    );
  }

  if (data.count == 0) {
    return (
      <section>You have made no tournies</section>
    );
  }

  return (
    <section>
      <h2>You Hold {data.count} Tournie{data.count == 1 ? '' : 's'}</h2>
      <ul>
        {data.list.map(({ id, name }) => <li key={id}><Link to="/u/$user/$name" params={{ user, name }}>{name}</Link></li>)}
      </ul>
    </section>
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
        <SignInButton />
      </div>
    );
  }


  const user = u.user;
  const username = user.username!;

  return (
    <div className="flex flex-col items-center">
      <h1 className="text-3xl">Tournieggi</h1>
      <p className="text-lg text-center">
        Manage a simple tournie in tournieggi.<br />
        Welcome back {username}!
      </p>
      <TourniesList user={username} />
    </div>
  );
}

