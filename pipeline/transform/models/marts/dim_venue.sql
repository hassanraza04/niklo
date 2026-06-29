-- the canonical venue table the app reads. one row per venue, joined to the
-- taxonomy and with a stable url slug. scraped_at doubles as "last verified".
--
-- a venue keeps ONE primary subcategory (drives its url + breadcrumb) but can
-- belong to several: a sports complex scraped under padel and futsal shows up in
-- both browse pages, appears once in search, and lists both on its own page. that
-- membership lives in the `subcategories` / `category_slugs` lists below.

with v as (
    select * from {{ ref('int_venues_deduped') }}
),

-- manual curation: move a venue to the right primary subcategory (e.g. a place
-- that got scraped under bowling but is really padel). see category_overrides.
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

-- venues that clear the quality bar. this is the canonical set, and it also
-- defines which subcategories are "live" (have at least one home venue) so a
-- dead category like mini-golf can't sneak back in via a multi-sport venue.
kept as (
    select c.*
    from corrected c
    where c.place_id not in (select venue_id from {{ ref('excluded_venues') }})
      and coalesce(c.review_count, 0) >= 3
),

live_subs as (
    select distinct subcategory_slug from kept
),

-- second signal: google's own categories[] array. a multi-activity venue often
-- lists the extra activities there (e.g. Arena -> [...,"Bowling alley","Ice
-- skating rink"]) even when our search query only caught one. map the unambiguous
-- ones to our taxonomy so those memberships get added too. junk and broad google
-- categories (restaurant, sports club, amusement center) are simply not in the map.
from_gcat as (
    select k.place_id as venue_id, gm.subcategory as subcategory_slug
    from kept k
    cross join unnest(cast(k.google_categories as varchar[])) as t(gcat)
    join {{ ref('gcat_to_subcategory') }} gm
      on lower(trim(t.gcat)) = gm.google_category
    where k.google_categories is not null
),

-- many-to-many membership: every category a venue was scraped under, plus its
-- corrected primary, plus what google's categories[] imply, minus dead categories
-- and the hand-pruned misfiles in venue_category_excludes (e.g. a padel court that
-- false-matched a bowling query).
member_src as (
    select distinct place_id as venue_id, subcategory_slug
    from {{ ref('stg_venues') }}
    where place_id is not null
    union
    select venue_id, subcategory from overrides
    union
    select venue_id, subcategory_slug from from_gcat
),

members as (
    select m.venue_id, m.subcategory_slug
    from member_src m
    join live_subs ls on m.subcategory_slug = ls.subcategory_slug
    left join {{ ref('venue_category_excludes') }} x
           on x.venue_id = m.venue_id and x.subcategory = m.subcategory_slug
    where x.venue_id is null
),

member_named as (
    select
        me.venue_id,
        me.subcategory_slug,
        t.subcategory_name,
        t.category_slug,
        (me.subcategory_slug = k.subcategory_slug) as is_primary
    from members me
    join kept k on me.venue_id = k.place_id
    left join tax t on me.subcategory_slug = t.subcategory_slug
),

member_agg as (
    select
        venue_id,
        -- primary first, then alphabetical, so the venue page reads naturally
        string_agg(subcategory_slug, ',' order by is_primary desc, subcategory_name) as subcategories,
        string_agg(distinct category_slug, ',') as category_slugs
    from member_named
    group by venue_id
),

joined as (
    select
        k.place_id                                          as venue_id,
        k.name,
        k.subcategory_slug,
        t.subcategory_name,
        t.category_slug,
        t.category_name,
        coalesce(ma.subcategories, k.subcategory_slug)      as subcategories,
        coalesce(ma.category_slugs, t.category_slug)        as category_slugs,
        k.google_category,
        k.rating,
        k.review_count,
        k.latitude,
        k.longitude,
        coalesce(nullif(k.borough, ''), k.city)             as area,
        k.address,
        k.city,
        k.price_level,
        k.website,
        k.phone,
        k.hours,
        k.thumbnail                                         as photo_url,
        k.photos,
        k.google_url,
        k.status,
        (k.status is null or lower(k.status) not like '%closed%') as is_open,
        k.source_query,
        k.scraped_at                                        as last_verified
    from kept k
    left join tax t on k.subcategory_slug = t.subcategory_slug
    left join member_agg ma on k.place_id = ma.venue_id
)

select
    *,
    regexp_replace(
        regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g'),
        '(^-|-$)', '', 'g'
    ) || '-' || lower(substr(venue_id, 4, 6))               as slug
from joined
