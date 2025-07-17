-- Fix field sizes for longer indicator names

ALTER TABLE indicator_mappings ALTER COLUMN unified_concept TYPE VARCHAR(255);
ALTER TABLE indicator_mappings ALTER COLUMN concept_description TYPE TEXT;

-- Also make sure other fields are appropriately sized
ALTER TABLE indicator_mappings ALTER COLUMN wb_code TYPE VARCHAR(100);
ALTER TABLE indicator_mappings ALTER COLUMN oecd_code TYPE VARCHAR(100);
ALTER TABLE indicator_mappings ALTER COLUMN imf_code TYPE VARCHAR(100);

SELECT 'Fixed field sizes for indicator mappings!' as status;
