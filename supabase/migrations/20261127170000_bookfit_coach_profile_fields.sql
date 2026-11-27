ALTER TABLE bookfit.professional_preferences
  ADD COLUMN training_approach text NOT NULL DEFAULT ''
    CHECK (char_length(training_approach) <= 500),
  ADD COLUMN qualifications text NOT NULL DEFAULT ''
    CHECK (char_length(qualifications) <= 300);
