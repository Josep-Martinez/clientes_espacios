import type { Database } from "../src/types/database.types.ts";

export type BuqFitTables = Database["buqfit"]["Tables"];
export type BuqFitTableName = keyof BuqFitTables;
export type BuqFitRow<Name extends BuqFitTableName> = BuqFitTables[Name]["Row"];

export type ProfessionalPreferencesRow = Omit<
  BuqFitRow<"professional_preferences">,
  "max_radius_km"
> & {
  // node-postgres returns PostgreSQL numeric values as strings by default.
  max_radius_km: string | number;
};
