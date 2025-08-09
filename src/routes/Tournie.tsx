import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useAuth } from '@clerk/clerk-react';
import { api } from '../Queries';
import type { TournieData } from '../../api';

export default function TourniePage(props: { username: string; name: string }) {
  const query = api.query.useTournieByUserAndName(props);
  const userId = useAuth({ treatPendingAsSignedOut: true }).userId;

  if (query.isLoading) {
    return (
      <section className="flex flex-col items-center">
        <p>Loading...</p>
      </section>
    );
  }

  if (query.error) {
    return (
      <section className="flex flex-col items-center">
        <h1>ERROR</h1>
        <p>{query.error.message}</p>
      </section>
    );
  }


  const data = query.data!;
  if (!data.ok) {
    return (
      <section className="flex flex-col items-center">
        <h1>ERROR</h1>
        <p>{data.message}</p>
      </section>
    );
  }

  const { name, owner } = data.tournie;

  return (
    <section className="flex flex-col items-center">
      <h1 className="text-4xl ">{name.split(' ').map(s => s[0].toUpperCase() + s.substring(1)).join(' ')}</h1>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 p-4 md:gap-4">
        <div className="flex flex-col items-center md:col-span-1">
          <div className="flex flex-col items-center bg-sky-100 gap-1 p-4 border border-2 border-sky-400 rounded">
            <h2>Manager: <Link className="underline decoration-wavy" to="/u/$username" params={owner} >@{owner.username}</Link></h2>
            <img src={owner.image_url} />
          </div>
        </div>

        <TeamsListing is_viewer_owner={userId === owner.clerk_id} tournie={data.tournie} />
      </div>
    </section>
  );
}

function TeamsListing(props: { is_viewer_owner?: boolean; tournie: TournieData; }) {
  const tournie_id = props.tournie.id;
  const [groups, setGroups] = useState(props.tournie.groups);
  const teams = props.tournie.teams;

  if (groups.length == 0) {
    return (
      <div className="md:col-span-3">
        <h2 className="text-xl">Teams to Organize</h2>
        {!props.is_viewer_owner ? undefined : <button onClick={() => {
          const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUV';
          const prev = { groups, teams };

          const teams_with_index = props.tournie.teams.map((team_name, team_index) => [team_name, team_index] as const);

          const new_groups: TournieData['groups'] = Array.from({ length: Math.floor(teams_with_index.length / 4) })
            .map((_, i) => {
              return {
                name: ALPHABET[i % ALPHABET.length]!,
                teams: [],
              };
            });

          while (teams_with_index.length) {
            let entropy_idx = teams_with_index.length == 1 ? 0 : Math.floor(Math.random() * teams_with_index.length);
            const [_, team_index] = teams_with_index.splice(entropy_idx, 1)[0]!;
            entropy_idx = Math.floor(Math.random() * new_groups.length);
            while (new_groups[entropy_idx].teams.length == 4) {
              entropy_idx = Math.floor(Math.random() * new_groups.length);
            }
            const group = new_groups[entropy_idx]!;
            group.teams.push(team_index);
          }
          console.log('[DEBUG] Random groups', new_groups.map(g => g.name).join(', '));

          console.table(new_groups.reduce((acc, g) => {
            acc[g.name] = g.teams.map(i => teams[i]);
            return acc;
          }, {} as Record<string, string[]>));

          setGroups(new_groups);
          api.mut.updateTournie({ id: tournie_id, tournie: { ...props.tournie, groups: new_groups } })
            .then(result => {
              if (result.ok) {
                setGroups(result.updated.groups);
                return;
              }
              setGroups(prev.groups);
              alert(result.message);
            })
            .catch((error: Error) => {
              setGroups(prev.groups);
              alert(error.message);
            });
        }}>Randomize Groups</button>}
        <ul className="list-disc pl-4">
          {teams.map((team, i) => <li key={i}>{team}</li>)}
        </ul>
      </div>
    );
  }

  return (
    <div className="md:col-span-3">
      <h2>Groups</h2>
      {
        groups.map((g, group_index) => (
          <table key={group_index}>
            <thead>
              <tr>
                <th className="text-lg">{g.name}</th>
              </tr>
            </thead>
            <tbody>
              {g.teams.map(idx => (<tr key={idx}><td>{teams[idx]!}</td></tr>))}
            </tbody>
          </table>
        ))
      }
    </div>
  );
}

