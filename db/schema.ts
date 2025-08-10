// import { sql } from 'drizzle-orm';
import {
  text,
  integer,
  customType,
  index,
  unique,
  sqliteTable,
} from 'drizzle-orm/sqlite-core';

const uuid = customType<{ data: ReturnType<typeof crypto.randomUUID>; notNull: true }>({
  dataType: () => 'text',
});

const uuid_field = <DbName extends string>(name: DbName) => uuid(name).notNull().$defaultFn(() => crypto.randomUUID());

const bool = <DbName extends string>(name: DbName) => integer(name, { mode: 'boolean' });

const string_array = customType<{ data: string[]; notNull: true; }>({
  dataType: () => 'text',
  fromDriver: (v) => v && typeof v == 'string' ? JSON.parse(v) as string[] : [],
  toDriver: (value: string[]) => JSON.stringify(value),
});

export type Goal = {
  kind: 'base-time' | 'extra-time';
  time: number;
  player: string;
} | {
  kind: 'shootout';
  player: string;
};

export type Group = {
  name: string;
  teams: number[];
};

const goals_array = customType<{ data: Goal[]; driverData: string; }>({
  dataType: () => 'text',
  fromDriver: (v): Goal[] => v ? JSON.parse(v) : [],
  toDriver: (value) => JSON.stringify(value),
});

const groups_array = customType<{ data: Group[]; driverData: string; }>({
  dataType: () => 'text',
  fromDriver: (v): Group[] => v ? JSON.parse(v) : [],
  toDriver: (value) => JSON.stringify(value),
});

export const usersTable = sqliteTable('users', {
  id: uuid_field('id').primaryKey(),
  username: text('username').notNull().unique(),
  image_url: text('image_url').notNull().default("https://img.clerk.com/eyJ0eXBlIjoiZGVmYXVsdCIsImlpZCI6Imluc18zMTJlV1lVTnFiYXVZaUJKRXpPbHIzemlkenoiLCJyaWQiOiJ1c2VyXzMxNVdNc3h6RDhMZ2xScnBrYko4NWpDVzVNTyJ9"),
}, t => [index('username_index').on(t.username)]);
export type User = typeof usersTable['$inferSelect'];

export const tourniesTable = sqliteTable('tournies', {
  id: uuid_field('id').primaryKey(),
  name: text('name').notNull(),
  ownerId: uuid('owner_id').notNull().references(() => usersTable.id),
  teams: string_array('teams').notNull().default('[]' as any),
  groups: groups_array('groups').notNull().default('[]' as any),
  knockout_games: string_array('ladders').notNull().default('[]' as any),
}, t => [
  unique('owner_and_tournie_unique_index').on(t.ownerId, t.name),
  index('owner_index').on(t.ownerId),
  index('tournie_name_index').on(t.name),
]);
export type Tournie = typeof tourniesTable['$inferSelect'];

export const gamesDataTable = sqliteTable('game_data', {
  id: uuid_field('id').primaryKey(),
  played: bool('played').notNull().default(false),
  tournieId: uuid('tournie_id').notNull().references(() => tourniesTable.id),
  goals: goals_array('goals').notNull().default([]),
}, t => [
  index('tournie_index').on(t.tournieId),
  index('played_tournie_index').on(t.played, t.tournieId),
]);
export type GameData = typeof gamesDataTable['$inferSelect'];

