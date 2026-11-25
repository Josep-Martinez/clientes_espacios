-- Rename the existing local schema and execution role without rebuilding data.
-- Keep earlier migrations immutable because they may already be recorded locally.
ALTER SCHEMA bookfit RENAME TO buqfit;
ALTER ROLE bookfit_runtime RENAME TO buqfit_runtime;
