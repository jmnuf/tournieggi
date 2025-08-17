import { useState } from 'react';
import { useAuth, useUser, RedirectToSignIn } from '@clerk/clerk-react';
import { useNavigate } from '@tanstack/react-router';
import type { Group } from '../../db';
import { api } from '../Queries';

export default function CreateTourniePage() {
  const auth = useAuth();
  const user = useUser();
  const navigate = useNavigate();
  const [name, setName] = useState('My Tournie');
  const [teams, setTeams] = useState<string[]>([]);
  const [groups, _setGroups] = useState<Group[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null as string | null);


  if (!user.isLoaded) {
    return (
      <section>
        <h1>Create New Tournie</h1>
        <p>Checking auth status...</p>
      </section>
    );
  }

  if (isSaving) {
    return (
      <section>
        <h1>Create New Tournie</h1>
        <p>Trying to create a tournie...</p>
      </section>
    );
  }

  const username = user.user?.username!;
  return (
    <section>
      <RedirectToSignIn signInFallbackRedirectUrl="/tournie/new" />
      <h1>Create New Tournie</h1>
      {error && <p>{error}</p>}
      <form
        className="grid grid-cols-1 gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (teams.length == 0) {
            alert('Tournie requires at least 4 teams');
            return;
          }
          console.log('[DEBUG] Attempting to create new tournie with name', name);
          setIsSaving(true);
          api.mut.createTournie({
            getToken: auth.getToken as () => Promise<string>,
            data: {
              name,
              teams,
              groups,
              knockout_games: [],
            },
          }).then((result) => {
            if (!result.ok) {
              setError(result.error);
              return;
            }

            navigate({
              from: '/tournie/new',
              to: '/u/$user/$name',
              params: {
                user: username,
                name: name,
              },
            });
          }).catch((e: Error) => {
            console.error(e);
            setError(e.message);
          });
        }}
      >
        <div className="flex gap-1">
          <label htmlFor="inpTournieName">Name:</label>
          <input id="inpTournieName" type="text" value={name} onChange={e => setName(e.currentTarget.value)} />
        </div>

        <TeamsSubform teams={teams} setTeams={setTeams} />
      </form>
    </section>
  );
}

function TeamsSubform({ teams, setTeams }: { teams: string[]; setTeams: (t: string[]) => void; }) {
  const [newTeam, setNewTeam] = useState('');

  return (
    <div className="flex flex-col">
      <form
        className="flex gap-1"
        onSubmit={(e) => {
          e.preventDefault();
          const team_name = newTeam.trim();
          if (teams.includes(team_name)) {
            alert('Team already in tournie');
            return;
          }
          setTeams([...teams, team_name]);
        }}
      >
        <label htmlFor="inpNewTeam">Team Name:</label>
        <input id="inpNewTeam" type="text" value={newTeam} onChange={e => setNewTeam(e.currentTarget.value)} />
        <button type="submit">Add</button>
      </form>
      <ul>
        {teams.map((team_name, i) => (
          <li key={team_name}>
            {team_name}
            {' '}
            <button
              className="px-2 py-1 bg-red-500 rounded"
              onClick={() => setTeams([...teams.slice(0, i), ...teams.slice(i + 1)])}
            >
              X
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}


