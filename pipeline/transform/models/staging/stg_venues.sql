-- one cleaned row per raw scrape hit (still has duplicates across queries/tiles).
-- pulls the fields we actually use out of gosom's json and builds two helpers:
-- a name+geo key for the missing-place_id fallback, and a completeness score so
-- dedupe keeps the richest copy of each venue.

with src as (
    select * from {{ source('raw', 'venues') }}
),

-- museums and art galleries are presented as one browse category ("Museums &
-- Galleries"), so fold the two scrape categories into a single slug up front.
canon as (
    select *,
        case
            when _category in ('museums', 'galleries') then 'museums-galleries'
            else _category
        end                                              as _cat
    from src
)

select
    nullif(place_id, '')                                    as place_id,
    nullif(cid, '')                                         as cid,
    nullif(data_id, '')                                     as data_id,
    trim(title)                                             as name,
    nullif(category, '')                                    as google_category,
    categories                                             as google_categories,
    latitude,
    longitude,
    review_rating                                          as rating,
    review_count,
    nullif(web_site, '')                                   as website,
    nullif(phone, '')                                      as phone,
    nullif(price_range, '')                                as price_level,
    open_hours                                             as hours,
    nullif(address, '')                                    as address,
    json_extract_string(complete_address, '$.city')       as city,
    json_extract_string(complete_address, '$.borough')    as borough,
    json_extract_string(complete_address, '$.street')     as street,
    json_extract_string(complete_address, '$.postal_code') as postal_code,
    nullif(link, '')                                       as google_url,
    nullif(thumbnail, '')                                  as thumbnail,
    images                                                as photos,
    nullif(status, '')                                     as status,
    nullif(timezone, '')                                   as timezone,
    _cat                                                  as subcategory_slug,
    -- when a venue is scraped under several categories, the dedup keeps the
    -- established primary activity rather than a broad secondary query result.
    case _cat
        when 'padel' then 1 when 'box-cricket' then 2 when 'tennis' then 3
        when 'squash' then 4 when 'swimming' then 5 when 'bowling' then 6
        when 'karting' then 7 when 'trampoline' then 8
        when 'skating' then 10 when 'paintball' then 11 when 'escape-rooms' then 12
        when 'cinemas' then 13 when 'vr' then 14 when 'laser-tag' then 15
        when 'arcades' then 16 when 'billiards' then 18 when 'futsal' then 19
        when 'museums-galleries' then 27 when 'heritage' then 29
        when 'parks' then 31 when 'beaches' then 32 when 'boating' then 33
        when 'adventure-parks' then 34
        else 99
    end                                                   as category_priority,
    _source_query                                         as source_query,
    _loaded_at                                            as scraped_at,

    -- normalized key to collapse the rare rows that come back with no place_id
    lower(trim(title)) || '|' || round(latitude, 4) || ',' || round(longitude, 4) as name_geo_key,

    -- how many useful fields are populated -- used to pick the best of N duplicates.
    -- rating/review_count count only when > 0, since gosom occasionally returns a
    -- 0 on a bad parse for a venue that really does have ratings.
    (
        (review_rating is not null and review_rating > 0)::int
      + (review_count is not null and review_count > 0)::int
      + (nullif(web_site, '') is not null)::int
      + (nullif(phone, '') is not null)::int
      + (nullif(address, '') is not null)::int
      + (open_hours is not null)::int
      + (nullif(thumbnail, '') is not null)::int
    )                                                     as completeness_score

from canon
