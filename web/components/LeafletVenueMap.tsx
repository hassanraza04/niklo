"use client";

import L, {
  type LayerGroup,
  type Map as LeafletMap,
  type Marker,
} from "leaflet";
import "leaflet.markercluster";
import { useEffect, useRef } from "react";
import type { Coordinates } from "@/lib/geo";
import {
  KARACHI_MAP_CENTER,
  MAP_TILE_PROVIDER,
  USER_LOCATION_MARKER,
  mapCameraForLocation,
  mapCameraForVenue,
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

function makeVenueIcon(venue: MapVenue) {
  const category = primaryCategorySlug(venue);
  return L.divIcon({
    className: "",
    html: `<span class="${markerClass(category, false)}">${categoryIcon(category)}</span>`,
    iconAnchor: [18, 18],
    iconSize: [36, 36],
    popupAnchor: [0, -18],
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
  layer,
  venues,
  markers,
  onSelectVenue,
}: {
  layer: LayerGroup;
  venues: MapVenue[];
  markers: Map<string, Marker>;
  onSelectVenue: (slug: string) => void;
}) {
  layer.clearLayers();
  markers.clear();

  for (const venue of venues) {
    const marker = L.marker([venue.latitude, venue.longitude], {
      icon: makeVenueIcon(venue),
      title: venue.name,
    })
      .addTo(layer)
      .bindPopup(popupContent(venue));

    marker.on("click", () => onSelectVenue(venue.slug));
    markers.set(venue.slug, marker);
  }
}

function placeUserMarker(layer: LayerGroup, userLocation: Coordinates | null) {
  layer.clearLayers();
  if (userLocation) {
    const position: [number, number] = [userLocation.latitude, userLocation.longitude];
    L.circleMarker(position, {
      pane: "niklo-user-location",
      radius: USER_LOCATION_MARKER.outerRadius,
      stroke: false,
      fill: true,
      fillColor: "#2563eb",
      fillOpacity: 0.18,
      interactive: false,
    }).addTo(layer);
    const marker = L.circleMarker(position, {
      pane: "niklo-user-location",
      radius: USER_LOCATION_MARKER.innerRadius,
      color: "#ffffff",
      weight: 4,
      fill: true,
      fillColor: "#2563eb",
      fillOpacity: 1,
    }).addTo(layer);
    if (USER_LOCATION_MARKER.opensPopup) marker.bindPopup("Your location");
  }
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
  focusVenueSignal,
  focusUserSignal,
  onSelectVenue,
}: {
  venues: MapVenue[];
  activeSlug: string;
  userLocation: Coordinates | null;
  fitSignal: number;
  focusVenueSignal: number;
  focusUserSignal: number;
  onSelectVenue: (slug: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const venueLayerRef = useRef<L.MarkerClusterGroup | null>(null);
  const userLayerRef = useRef<LayerGroup | null>(null);
  const markersRef = useRef<Map<string, Marker>>(new Map());
  const lastFitSignalRef = useRef<number | null>(null);
  const lastFocusedUserRef = useRef("");

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const markers = markersRef.current;

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

    map.createPane("niklo-user-location");
    map.getPane("niklo-user-location")!.style.zIndex = "650";

    mapRef.current = map;
    venueLayerRef.current = L.markerClusterGroup({
      disableClusteringAtZoom: 15,
      maxClusterRadius: 42,
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      iconCreateFunction: makeClusterIcon,
    }).addTo(map);
    userLayerRef.current = L.layerGroup().addTo(map);

    return () => {
      map.remove();
      mapRef.current = null;
      venueLayerRef.current = null;
      userLayerRef.current = null;
      markers.clear();
      lastFitSignalRef.current = null;
      lastFocusedUserRef.current = "";
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !venueLayerRef.current) return;
    placeMarkers({
      layer: venueLayerRef.current,
      venues,
      markers: markersRef.current,
      onSelectVenue,
    });
    mapRef.current.invalidateSize();
  }, [onSelectVenue, venues]);

  useEffect(() => {
    if (!userLayerRef.current) return;
    placeUserMarker(userLayerRef.current, userLocation);
  }, [userLocation]);

  useEffect(() => {
    if (!mapRef.current) return;
    if (lastFitSignalRef.current === fitSignal) return;
    fitMap(mapRef.current, venues, userLocation);
    lastFitSignalRef.current = fitSignal;
  }, [fitSignal, userLocation, venues]);

  useEffect(() => {
    if (!mapRef.current || !venueLayerRef.current || !focusVenueSignal) return;
    const marker = markersRef.current.get(activeSlug);
    const venue = venues.find((item) => item.slug === activeSlug);
    if (!marker || !venue) return;
    const camera = mapCameraForVenue(venue);

    venueLayerRef.current.zoomToShowLayer(marker, () => {
      mapRef.current?.flyTo(camera.center, camera.zoom, { duration: 0.35 });
      marker.openPopup();
    });
  }, [activeSlug, focusVenueSignal, venues]);

  useEffect(() => {
    if (!mapRef.current || !focusUserSignal) return;
    const camera = mapCameraForLocation(userLocation);
    if (!camera) return;
    const focusKey = `${focusUserSignal}:${camera.center.join(",")}`;
    if (lastFocusedUserRef.current === focusKey) return;

    mapRef.current.flyTo(camera.center, camera.zoom, { duration: 0.35 });
    lastFocusedUserRef.current = focusKey;
  }, [focusUserSignal, userLocation]);

  return (
    <div
      ref={containerRef}
      className="h-[520px] min-h-[520px] w-full bg-paper-2 sm:h-[620px] xl:h-full xl:min-h-[620px]"
      aria-label="Interactive Karachi entertainment map"
    />
  );
}
