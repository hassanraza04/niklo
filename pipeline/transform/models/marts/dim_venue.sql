-- the canonical venue table the app reads. one row per venue, joined to the
-- taxonomy and with a stable url slug. scraped_at doubles as "last verified".

with v as (
    select * from {{ ref('int_venues_deduped') }}
),

tax as (
    select * from {{ ref('taxonomy') }}
),

joined as (
    select
        v.place_id                                          as venue_id,
        v.name,
        v.subcategory_slug,
        t.subcategory_name,
        t.category_slug,
        t.category_name,
        v.google_category,
        v.rating,
        v.review_count,
        v.latitude,
        v.longitude,
        coalesce(nullif(v.borough, ''), v.city)             as area,
        v.address,
        v.city,
        v.price_level,
        v.website,
        v.phone,
        v.hours,
        v.thumbnail                                         as photo_url,
        v.photos,
        v.google_url,
        v.status,
        (v.status is null or lower(v.status) not like '%closed%') as is_open,
        v.source_query,
        v.scraped_at                                        as last_verified
    from v
    left join tax t on v.subcategory_slug = t.subcategory_slug
)

select
    *,
    regexp_replace(
        regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g'),
        '(^-|-$)', '', 'g'
    ) || '-' || lower(substr(venue_id, 4, 6))               as slug
from joined
