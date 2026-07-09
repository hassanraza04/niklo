import test from "node:test";
import assert from "node:assert/strict";
import {
  LANDMARK_REFERENCES,
  USER_LOCATION_REFERENCE_ID,
  distanceReferenceCoordinates,
  distanceReferenceName,
} from "./locationReference.ts";

const userLocation = { latitude: 24.8138, longitude: 67.0305 };

test("distanceReferenceCoordinates returns user location when selected", () => {
  assert.deepEqual(
    distanceReferenceCoordinates(USER_LOCATION_REFERENCE_ID, userLocation),
    userLocation,
  );
});

test("distanceReferenceCoordinates returns landmark coordinates", () => {
  const landmark = LANDMARK_REFERENCES[0];

  assert.deepEqual(distanceReferenceCoordinates(landmark.id, null), {
    latitude: landmark.latitude,
    longitude: landmark.longitude,
  });
});

test("distanceReferenceName labels user location and landmarks", () => {
  const landmark = LANDMARK_REFERENCES[0];

  assert.equal(distanceReferenceName(USER_LOCATION_REFERENCE_ID), "your location");
  assert.equal(distanceReferenceName(landmark.id), landmark.name);
});

test("landmark references include central Karachi anchors", () => {
  const names = new Set(LANDMARK_REFERENCES.map((reference) => reference.name));

  assert.equal(names.has("Chaar Minar"), true);
  assert.equal(names.has("Mazar-e-Quaid"), true);
});
