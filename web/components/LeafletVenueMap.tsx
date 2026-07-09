"use client";

import L, { type LayerGroup, type Map as LeafletMap } from "leaflet";
import "leaflet.markercluster";
import { useEffect, useRef } from "react";
import type { Coordinates } from "@/lib/geo";
import {
  KARACHI_MAP_CENTER,
  MAP_TILE_PROVIDER,
  primaryCategorySlug,
  type MapVenue,
} from "@/lib/mapMode";
import { categoryIcon } from "@/lib/icons";

const CATEGORY_CLASS: Record<string, string> = {
  "sports-active": "sports",
  entertainment: "entertainment",
  "outdoors-adventure": "outdoors",
  "creative-chill": "creative",
  culture: "culture",
};

function markerClass(category: string, active: boolean) {
  return [
    "niklo-map-pin",
    `niklo-map-pin--${CATEGORY_CLASS[category] ?? "default"}`,
    active ? "niklo-map-pin--active" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function makeVenueIcon(venue: MapVenue, active: boolean) {
  const category = primaryCategorySlug(venue);
  return L.divIcon({
    className: "",
    html: `<span class="${markerClass(category, active)}">${categoryIcon(category)}</span>`,
    iconAnchor: [18, 18],
    iconSize: [36, 36],
    popupAnchor: [0, -18],
  });
}

function makeUserIcon() {
  return L.divIcon({
    className: "",
    html: '<span class="niklo-map-user">You</span>',
    iconAnchor: [22, 22],
    iconSize: [44, 44],
    popupAnchor: [0, -22],
  });
}

function makeClusterIcon(cluster: L.MarkerCluster) {
  const count = cluster.getChildCount();
  const size = count >= 100 ? "large" : count >= 25 ? "medium" : "small";
  return L.divIcon({
    className: "",
    html: `<span class="niklo-map-cluster niklo-map-cluster--${size}">${count}</span>`,
    iconAnchor: [24, 24],
    iconSize: [48, 48],
  });
}

function popupContent(venue: MapVenue) {
  const wrap = document.createElement("div");
  wrap.className = "niklo-map-popup";

  const label = document.createElement("p");
  label.textContent = [venue.subcategory_name, venue.area].filter(Boolean).join(" · ");
  wrap.append(label);

  const title = document.createElement("strong");
  title.textContent = venue.name;
  wrap.append(title);

  if (venue.rating) {
    const rating = document.createElement("span");
    rating.textContent = `★ ${venue.rating.toFixed(1)}${
      venue.review_count ? ` · ${venue.review_count} reviews` : ""
    }`;
    wrap.append(rating);
  }

  const link = document.createElement("a");
  link.href = `/v/${venue.slug}`;
  link.textContent = "Open place";
  wrap.append(link);

  return wrap;
}

function placeMarkers({
  map,
  layer,
  venues,
  userLocation,
  activeSlug,
  onSelectVenue,
}: {
  map: LeafletMap;
  layer: LayerGroup;
  venues: MapVenue[];
  userLocation: Coordinates | null;
  activeSlug: string;
  onSelectVenue: (slug: string) => void;
}) {
  layer.clearLayers();

  for (const venue of venues) {
    const marker = L.marker([venue.latitude, venue.longitude], {
      icon: makeVenueIcon(venue, venue.slug === activeSlug),
      title: venue.name,
    })
      .addTo(layer)
      .bindPopup(popupContent(venue));

    marker.on("click", () => onSelectVenue(venue.slug));
  }

  if (userLocation) {
    L.marker([userLocation.latitude, userLocation.longitude], {
      icon: makeUserIcon(),
      title: "You",
      zIndexOffset: 1000,
    })
      .addTo(layer)
      .bindPopup("Your location");
  }

  map.invalidateSize();
}

function fitMap(map: LeafletMap, venues: MapVenue[], userLocation: Coordinates | null) {
  const points: [number, number][] = venues.map((venue) => [
    venue.latitude,
    venue.longitude,
  ]);
  if (userLocation) points.push([userLocation.latitude, userLocation.longitude]);

  if (!points.length) {
    map.setView(KARACHI_MAP_CENTER, 11);
    return;
  }

  map.fitBounds(L.latLngBounds(points), {
    maxZoom: 14,
    padding: [44, 44],
  });
}

export function LeafletVenueMap({
  venues,
  activeSlug,
  userLocation,
  fitSignal,
  onSelectVenue,
}: {
  venues: MapVenue[];
  activeSlug: string;
  userLocation: Coordinates | null;
  fitSignal: number;
  onSelectVenue: (slug: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layerRef = useRef<LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: KARACHI_MAP_CENTER,
      zoom: 11,
      scrollWheelZoom: true,
      zoomControl: true,
    });
    L.tileLayer(MAP_TILE_PROVIDER.url, {
      attribution: MAP_TILE_PROVIDER.attribution,
      maxZoom: MAP_TILE_PROVIDER.maxZoom,
    }).addTo(map);

    mapRef.current = map;
    layerRef.current = L.markerClusterGroup({
      disableClusteringAtZoom: 16,
      maxClusterRadius: 48,
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      iconCreateFunction: makeClusterIcon,
    }).addTo(map);

    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !layerRef.current) return;
    placeMarkers({
      map: mapRef.current,
      layer: layerRef.current,
      venues,
      userLocation,
      activeSlug,
      onSelectVenue,
    });
  }, [activeSlug, onSelectVenue, userLocation, venues]);

  useEffect(() => {
    if (!mapRef.current) return;
    fitMap(mapRef.current, venues, userLocation);
  }, [fitSignal, userLocation, venues]);

  return (
    <div
      ref={containerRef}
      className="h-[520px] min-h-[520px] w-full bg-paper-2 sm:h-[620px] xl:h-full xl:min-h-[620px]"
      aria-label="Interactive Karachi entertainment map"
    />
  );
}
