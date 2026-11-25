-- The runtime may edit professional preferences and acquire row locks for allocation keys.
GRANT UPDATE ON bookfit.professional_preferences, bookfit.resource_day_locks TO bookfit_runtime;
