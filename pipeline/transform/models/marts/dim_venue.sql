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

members_raw as (
    select m.venue_id, m.subcategory_slug
    from member_src m
    join live_subs ls on m.subcategory_slug = ls.subcategory_slug
    left join {{ ref('venue_category_excludes') }} x
           on x.venue_id = m.venue_id and x.subcategory = m.subcategory_slug
    where x.venue_id is null
      -- retired categories (removed from the directory)
      and m.subcategory_slug not in ('theatre', 'bookstore-cafe')
),

-- google maps treats padel as "padel tennis", so tennis queries drag in padel
-- arenas. a venue that is really a padel place is not a tennis venue, unless it's
-- a member club (gcat Club/Country club, e.g. a gymkhana) that has real courts.
padel_ids as (select distinct venue_id from members_raw where subcategory_slug = 'padel'),

members as (
    select mr.venue_id, mr.subcategory_slug
    from members_raw mr
    left join kept k on mr.venue_id = k.place_id
    where not (
        mr.subcategory_slug = 'tennis'
        and mr.venue_id in (select venue_id from padel_ids)
        and lower(coalesce(k.google_category, '')) not in ('club', 'country club')
    )
),

-- the venue's primary subcategory drives its breadcrumb and "more nearby". keep the
-- curated/deduped pick when it's still a live membership; otherwise (e.g. its category
-- was retired) fall back to the lowest-priority remaining membership. venues left with
-- no live membership at all are dropped (the join below is what removes them).
member_pri as (
    select venue_id, subcategory_slug,
        case subcategory_slug
            when 'padel' then 1 when 'box-cricket' then 2 when 'tennis' then 3
            when 'squash' then 4 when 'swimming' then 5 when 'bowling' then 6
            when 'karting' then 7 when 'trampoline' then 8 when 'climbing' then 9
            when 'skating' then 10 when 'paintball' then 11 when 'escape-rooms' then 12
            when 'cinemas' then 13 when 'vr' then 14 when 'laser-tag' then 15
            when 'arcades' then 16 when 'mini-golf' then 17 when 'billiards' then 18
            when 'futsal' then 19 when 'shisha' then 20 when 'board-game-paint-cafe' then 21
            when 'pottery-art' then 22 when 'music-rooms' then 24 when 'cooking-classes' then 25
            when 'museums-galleries' then 27 when 'heritage' then 29 when 'hikes' then 31
            when 'beaches' then 32 when 'boating' then 33 when 'adventure-parks' then 34
            when 'camping' then 35 else 99
        end as pri
    from members
),

primary_pick as (
    select
        mp.venue_id,
        coalesce(
            max(case when mp.subcategory_slug = k.subcategory_slug then mp.subcategory_slug end),
            arg_min(mp.subcategory_slug, mp.pri)
        ) as subcategory_slug
    from member_pri mp
    join kept k on mp.venue_id = k.place_id
    group by mp.venue_id
),

member_named as (
    select
        me.venue_id,
        me.subcategory_slug,
        t.subcategory_name,
        t.category_slug,
        (me.subcategory_slug = pp.subcategory_slug) as is_primary
    from members me
    join primary_pick pp on me.venue_id = pp.venue_id
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
        pp.subcategory_slug,
        t.subcategory_name,
        t.category_slug,
        t.category_name,
        coalesce(ma.subcategories, pp.subcategory_slug)     as subcategories,
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
    join primary_pick pp on k.place_id = pp.venue_id
    left join tax t on pp.subcategory_slug = t.subcategory_slug
    left join member_agg ma on k.place_id = ma.venue_id
)

select
    *,
    regexp_replace(
        regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g'),
        '(^-|-$)', '', 'g'
    ) || '-' || lower(substr(venue_id, 4, 6))               as slug
from joined
