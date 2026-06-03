import { getRecentApprovedBusinesses } from "../services/businesses.service";
import { getRecentApprovedDestinations } from "../services/destinations.service";
import { getBusinessImages, getDestinationImages } from "./placeImages";

export async function getSpotlightItems(limit = 5) {
  const [businesses, destinations] = await Promise.all([
    getRecentApprovedBusinesses(limit * 3).catch(() => []),
    getRecentApprovedDestinations(limit * 3).catch(() => []),
  ]);

  const tagged = [
    ...businesses.map((b) => ({ ...b, _kind: "business" })),
    ...destinations.map((d) => ({ ...d, _kind: "destination" })),
  ];

  const withRealPhotos = tagged.filter((item) => {
    const images =
      item._kind === "destination"
        ? getDestinationImages(item)
        : getBusinessImages(item);
    return Array.isArray(images) && images.length > 0;
  });

  withRealPhotos.sort((a, b) => {
    const aTime = a.createdAt?.seconds || a.createdAt?._seconds || 0;
    const bTime = b.createdAt?.seconds || b.createdAt?._seconds || 0;
    return bTime - aTime;
  });

  return withRealPhotos.slice(0, limit);
}
