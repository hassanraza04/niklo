-- the canonical venue table the app reads. one row per venue, joined to the
-- taxonomy and with a stable url slug. scraped_at doubles as "last verified".

with v as (
    select * from {{ ref('int_venues_deduped') }}
),

-- manual curation: move a venue to the right subcategory (e.g. a place that got
-- scraped under bowling but is really padel). see category_overrides seed.
overrides as (
    select * from {{ ref('category_overrides') }}
),

corrected as (
    select
        v.* exclude (subcategory_slug),
        coalesce(o.subcategory, v.subcategory_slug) as subcategory_slug
    from v
    left join overrides o on v.place_id = o.venue_id
),

tax as (
    select * from {{ ref('taxonomy') }}
),

joined as (
    select
        c.place_id                                          as venue_id,
        c.name,
        c.subcategory_slug,
        t.subcategory_name,
        t.category_slug,
        t.category_name,
        c.google_category,
        c.rating,
        c.review_count,
        c.latitude,
        c.longitude,
        coalesce(nullif(c.borough, ''), c.city)             as area,
        c.address,
        c.city,
        c.price_level,
        c.website,
        c.phone,
        c.hours,
        c.thumbnail                                         as photo_url,
        c.photos,
        c.google_url,
        c.status,
        (c.status is null or lower(c.status) not like '%closed%') as is_open,
        c.source_query,
        c.scraped_at                                        as last_verified
    from corrected c
    left join tax t on c.subcategory_slug = t.subcategory_slug
)

select
    *,
    regexp_replace(
        regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g'),
        '(^-|-$)', '', 'g'
    ) || '-' || lower(substr(venue_id, 4, 6))               as slug
from joined
-- drop venues confirmed in manual review to be bad imports (shops, other sports, ...)
where venue_id not in (select venue_id from {{ ref('excluded_venues') }})
  -- hard quality bar: hide thin/unproven listings (junk, brand-new, bad scrapes)
  and coalesce(review_count, 0) >= 3
