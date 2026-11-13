-- V64: Khach moi co the dien tu; giu nguyen cac nhom RBAC da gioi han quyen.
-- Chay sau upgrade-global-rbac-groups-v60.sql.
-- Chi nang cap nhom guest mac dinh cu (du 3 quyen ban dau).
-- Khong mo quyen cho cac nhom guest tuy chinh it quyen hon.
BEGIN;
UPDATE public.rbac_groups
SET abilities = ARRAY['portal.access','portal.card','portal.documents','portal.bch']::text[],
    updated_at = now()
WHERE role = 'guest'
  AND cardinality(abilities) = 3
  AND abilities @> ARRAY['portal.access','portal.documents','portal.bch']::text[];
COMMIT;
