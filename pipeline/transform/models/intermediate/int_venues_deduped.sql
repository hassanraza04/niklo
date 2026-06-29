-- entity resolution. the same venue shows up many times across synonym queries,
-- grid tiles and neighbourhood passes -- collapse them to one canonical row.
--   1. primary key: google place_id (stable per venue) -> keep freshest/richest
--   2. fallback: rows missing a place_id collapse on normalized name + rounded geo
--   3. clip to the karachi bbox (grid results aren't clipped to the box)

with stg as (
    select * from {{ ref('stg_venues') }}
),

with_pid as (
    select *,
        row_number() over (
            partition by place_id
            order by category_priority, completeness_score desc, review_count desc nulls last, scraped_at desc
        ) as rn
    from stg
    where place_id is not null
),

no_pid as (
    select *,
        row_number() over (
            partition by name_geo_key
            order by category_priority, completeness_score desc, review_count desc nulls last, scraped_at desc
        ) as rn
    from stg
    where place_id is null
),

deduped as (
    select * exclude (rn) from with_pid where rn = 1
    union all by name
    select * exclude (rn) from no_pid where rn = 1
)

select *
from deduped
-- greater-karachi bounding box. kept generous on the south/west so DHA Phase 8,
-- Korangi Creek and Sea View aren't clipped; no other city is near enough to spill in.
where latitude between 24.70 and 25.25
  and longitude between 66.80 and 67.55
