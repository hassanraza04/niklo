import type { Coordinates } from "./geo";

export const USER_LOCATION_REFERENCE_ID = "user-location";

export type LandmarkReference = Coordinates & {
  id: string;
  name: string;
};

export const LANDMARK_REFERENCES: LandmarkReference[] = [
  { id: "do-talwar", name: "Do Talwar", latitude: 24.8177, longitude: 67.0332 },
  {
    id: "dolmen-clifton",
    name: "Dolmen Mall Clifton",
    latitude: 24.8028,
    longitude: 67.0298,
  },
  { id: "port-grand", name: "Port Grand", latitude: 24.8446, longitude: 66.9978 },
  { id: "tariq-road", name: "Tariq Road", latitude: 24.8738, longitude: 67.0618 },
  { id: "lucky-one", name: "LuckyOne Mall", latitude: 24.9336, longitude: 67.0878 },
  {
    id: "millennium-mall",
    name: "Millennium Mall",
    latitude: 24.9007,
    longitude: 67.1158,
  },
  {
    id: "malir-cantt",
    name: "Malir Cantt",
    latitude: 24.9437,
    longitude: 67.2056,
  },
  {
    id: "north-nazimabad",
    name: "North Nazimabad",
    latitude: 24.9309,
    longitude: 67.0367,
  },
];

export function distanceReferenceCoordinates(
  referenceId: string,
  userLocation: Coordinates | null,
): Coordinates | null {
  if (referenceId === USER_LOCATION_REFERENCE_ID) return userLocation;
  const landmark = LANDMARK_REFERENCES.find((reference) => reference.id === referenceId);
  if (!landmark) return null;
  return { latitude: landmark.latitude, longitude: landmark.longitude };
}

export function distanceReferenceName(referenceId: string): string {
  if (referenceId === USER_LOCATION_REFERENCE_ID) return "your location";
  return (
    LANDMARK_REFERENCES.find((reference) => reference.id === referenceId)?.name ??
    "selected place"
  );
}
