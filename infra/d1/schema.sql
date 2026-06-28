-- d1 (sqlite) schema for the venues the app serves. mirrors dim_venue from dbt.
-- json-ish fields (hours, photos) are stored as text json strings.

create table if not exists venues (
  venue_id         text primary key,
  name             text not null,
  slug             text not null unique,
  subcategory_slug text not null,
  subcategory_name text,
  category_slug    text,
  category_name    text,
  google_category  text,
  rating           real,
  review_count     integer,
  latitude         real,
  longitude        real,
  area             text,
  address          text,
  city             text,
  price_level      text,
  website          text,
  phone            text,
  hours            text,
  photo_url        text,
  photos           text,
  google_url       text,
  status           text,
  is_open          integer,
  source_query     text,
  last_verified    text
);

create index if not exists idx_venues_subcategory on venues (subcategory_slug);
create index if not exists idx_venues_category on venues (category_slug);
create index if not exists idx_venues_rating on venues (rating desc);
