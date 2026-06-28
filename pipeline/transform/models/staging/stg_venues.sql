-- one cleaned row per raw scrape hit (still has duplicates across queries/tiles).
-- pulls the fields we actually use out of gosom's json and builds two helpers:
-- a name+geo key for the missing-place_id fallback, and a completeness score so
-- dedupe keeps the richest copy of each venue.

with src as (
    select * from {{ source('raw', 'venues') }}
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
    _category                                             as subcategory_slug,
    _source_query                                         as source_query,
    _loaded_at                                            as scraped_at,

    -- normalized key to collapse the rare rows that come back with no place_id
    lower(trim(title)) || '|' || round(latitude, 4) || ',' || round(longitude, 4) as name_geo_key,

    -- how many useful fields are populated -- used to pick the best of N duplicates
    (
        (review_rating is not null)::int
      + (review_count is not null)::int
      + (nullif(web_site, '') is not null)::int
      + (nullif(phone, '') is not null)::int
      + (nullif(address, '') is not null)::int
      + (open_hours is not null)::int
      + (nullif(thumbnail, '') is not null)::int
    )                                                     as completeness_score

from src
