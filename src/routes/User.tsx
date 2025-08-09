import { Link } from '@tanstack/react-router';
import { api } from '../Queries';

export default function UserPage({ username }: { username: string }) {
  const query = api.query.useUserDataByUsername(username);

  if (query.isLoading) {
    return (
      <section className="flex flex-col gap-2 items-center">
        <p>Loading...</p>
      </section>
    );
  }

  if (query.isError) {
    const error = query.error;
    return (
      <section className="flex flex-col gap-2 items-center">
        <h1>Error</h1>
        <p>{error.message}</p>
      </section>
    );
  }

  const data = query.data!;
  if (!data.ok) {
    return (
      <section className="flex flex-col gap-2 items-center">
        <h1>Error</h1>
        <p>{data.message}</p>
      </section>
    );
  }

  const { image_url, tournies } = data.user;

  return (
    <section className="flex flex-col gap-2 items-center">
      <h1 className="text-4xl">@{username}</h1>
      <img src={image_url} />
      <h2 className="text-xl">Tournies ({tournies.length}):</h2>
      {tournies.length === 0 ? <p>Looking pretty empty here...</p> : null}
      <ul>
        {tournies.map(t => (
          <li key={t.id}><Link to="/u/$user/$name" params={{ name: t.name, user: username }}>{t.name}</Link></li>
        ))}
      </ul>
    </section>
  );
}

