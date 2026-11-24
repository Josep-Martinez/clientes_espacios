import type { Database } from "../src/types/database.types.ts";

export type BookfitTables = Database["bookfit"]["Tables"];
export type BookfitTableName = keyof BookfitTables;
export type BookfitRow<Name extends BookfitTableName> =
  BookfitTables[Name]["Row"];

export type ProfessionalPreferencesRow = Omit<
  BookfitRow<"professional_preferences">,
  "max_radius_km"
> & {
  // node-postgres returns PostgreSQL numeric values as strings by default.
  max_radius_km: string | number;
};
