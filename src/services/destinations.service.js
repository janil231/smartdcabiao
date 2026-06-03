/**
 * Destinations Service Layer
 * Backend-ready service for destination management
 * Uses Firestore when VITE_USE_FIRESTORE_DATA=true, falls back to mock data
 */

import { getDocs, collection, doc, setDoc, getDoc, updateDoc, deleteDoc, serverTimestamp, query, where } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { getDestinations as getMockDestinations } from '../data'
import { readCache, writeCache, getCacheMeta, CACHE_KEYS } from './cache.service'
import { sanitizeForFirestore, stripIdField } from '../utils/firestoreSanitize'

const USE_FIRESTORE = import.meta.env.VITE_USE_FIRESTORE_DATA === 'true'
const DESTINATIONS_COLLECTION = 'destinations'

let destinationsCache = null

function normalizeDestinationDoc(docSnap) {
  const data = docSnap.data()
  return {
    id: docSnap.id,
    name: data.name || '',
    category: data.category || 'Destination',
    type: data.type || 'destination',
    description: data.description || '',
    position: normalizePosition(data.position),
    address: data.address || '',
    barangay: data.barangay || '',
    phone: data.phone || '',
    hours: data.hours || '',
    priceRange: data.priceRange || 'Free',
    specialties: data.specialties || [],
    features: data.features || [],
    images: normalizeImages(data.images),
    website: data.website || null,
    socialMedia: data.socialMedia || {},
    tags: data.tags || [],
    verified: data.verified ?? false,
    isActive: data.isActive !== false,
    archivedAt: data.archivedAt || null,
    archivedBy: data.archivedBy || null,
    archivedReason: data.archivedReason || null,
  }
}

function normalizePosition(position) {
  if (!position) return [15.2345, 120.83965]
  if (Array.isArray(position) && position.length >= 2) return position
  if (position.lat !== undefined && position.lng !== undefined) return [position.lat, position.lng]
  return [15.2345, 120.83965]
}

function normalizeImages(images) {
  if (!images) return []
  if (Array.isArray(images)) return images.filter(Boolean)
  return []
}

function mergeStaticAndFirestore(staticList = [], firestoreList = []) {
  const map = new Map();
  staticList.forEach((item) => {
    if (!item || (item.id === undefined && item.id !== 0)) return;
    map.set(String(item.id), { ...item, _source: 'static' });
  });
  firestoreList.forEach((item) => {
    if (!item || !item.id) return;
    const existing = map.get(String(item.id));
    if (existing) {
      map.set(String(item.id), { ...existing, ...item, _source: 'firestore-overlay' });
    } else {
      map.set(String(item.id), { ...item, _source: 'firestore' });
    }
  });
  return Array.from(map.values());
}

async function fetchAllFromFirestore() {
  try {
    const querySnapshot = await getDocs(collection(db, DESTINATIONS_COLLECTION))
    return querySnapshot.docs.map(normalizeDestinationDoc)
  } catch {
    return null
  }
}

export async function listDestinations({ forceRefresh = false } = {}) {
  if (forceRefresh) {
    destinationsCache = null
  }

  if (!destinationsCache) {
    const firestoreData = await fetchAllFromFirestore()

    if (firestoreData === null) {
      const cached = readCache(CACHE_KEYS.destinations)
      if (cached) {
        destinationsCache = cached.data
        return { data: destinationsCache, source: 'cache' }
      }
      return { data: getMockDestinations(), source: 'mock' }
    }

    const merged = mergeStaticAndFirestore(getMockDestinations(), firestoreData)
    destinationsCache = merged
    writeCache(CACHE_KEYS.destinations, merged)
    const source =
      firestoreData.length === 0
        ? 'mock'
        : merged.length > firestoreData.length
          ? 'mixed'
          : 'live'
    return { data: merged, source }
  }

  return { data: destinationsCache, source: destinationsCache.length > getMockDestinations().length ? 'live' : 'mock' }
}

export async function getDestinationById(id) {
  const { data } = await listDestinations()
  return data.find(d => String(d.id) === String(id)) || null
}

export async function getDestinationBarangays() {
  try {
    const { data } = await listDestinations()
    const barangays = [...new Set(data
      .map(d => d.barangay)
      .filter(Boolean)
    )].sort()
    return barangays
  } catch {
    return []
  }
}

export async function searchDestinations(query = '', filters = {}) {
  const { data: results } = await listDestinations()

  let filtered = results

  if (query.trim()) {
    const lowercaseQuery = query.toLowerCase()
    filtered = filtered.filter(d =>
      d.name.toLowerCase().includes(lowercaseQuery) ||
      d.description?.toLowerCase().includes(lowercaseQuery) ||
      d.address?.toLowerCase().includes(lowercaseQuery) ||
      d.barangay?.toLowerCase().includes(lowercaseQuery) ||
      d.tags?.some(tag => tag.toLowerCase().includes(lowercaseQuery))
    )
  }

  if (filters.barangay) {
    filtered = filtered.filter(d => d.barangay === filters.barangay)
  }

  if (filters.type) {
    filtered = filtered.filter(d => d.type === filters.type)
  }

  if (filters.verified !== undefined) {
    filtered = filtered.filter(d => d.verified === filters.verified)
  }

  return filtered
}

export function clearDestinationsCache() {
  destinationsCache = null
}

export function getDestinationsLastSynced() {
  const meta = getCacheMeta(CACHE_KEYS.destinations)
  return meta?.savedAt || null
}

export async function listDestinationsWithFilter(filter = "active") {
  const allDestinations = await listDestinations({ forceRefresh: true });
  const { data } = allDestinations;
  if (filter === "active") {
    return data.filter((d) => d.isActive !== false);
  } else if (filter === "archived") {
    return data.filter((d) => d.isActive === false);
  }
  return data;
}

function normalizeName(str) {
  if (!str || typeof str !== "string") return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ");
}

async function findSubmissionForDestination(destinationData) {
  if (destinationData.sourceSubmissionId) {
    try {
      const subSnap = await getDoc(doc(db, "submissions", destinationData.sourceSubmissionId));
      if (subSnap.exists()) {
        return {
          submission: { id: subSnap.id, ...subSnap.data() },
          strategy: `direct (sourceSubmissionId=${destinationData.sourceSubmissionId})`,
        };
      }
    } catch (err) {
      console.warn("[findSubmission] Direct lookup failed:", err);
    }
  }

  if (!destinationData.name) return null;

  const targetName = normalizeName(destinationData.name);

  let allSubs = [];
  try {
    const subsQuery = query(
      collection(db, "submissions"),
      where("type", "==", "destination")
    );
    const snap = await getDocs(subsQuery);
    allSubs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.warn("[findSubmission] Submissions fetch failed:", err);
    return null;
  }

  if (allSubs.length === 0) return null;

  const getSubName = (s) =>
    s.data?.name || s.name || "";

  let exactMatches = allSubs.filter(
    (s) => normalizeName(getSubName(s)) === targetName
  );

  if (exactMatches.length > 0) {
    const approved = exactMatches.filter((s) => s.status === "approved");
    const pool = approved.length > 0 ? approved : exactMatches;
    const best = pool.sort((a, b) => {
      const aTime = a.createdAt?.seconds || a.createdAt?._seconds || 0;
      const bTime = b.createdAt?.seconds || b.createdAt?._seconds || 0;
      return bTime - aTime;
    })[0];
    return {
      submission: best,
      strategy: `exact-name (${approved.length > 0 ? "approved" : "any-status"}, ${exactMatches.length} candidate(s))`,
    };
  }

  if (destinationData.publishedBy || destinationData.createdByUid) {
    const ownerUid = destinationData.publishedBy || destinationData.createdByUid;
    const byOwner = allSubs.filter(
      (s) => s.createdByUid === ownerUid || s.submittedBy === ownerUid
    );
    if (byOwner.length === 1) {
      return {
        submission: byOwner[0],
        strategy: `by-owner-uid (1 unique submission from ${ownerUid})`,
      };
    }
  }

  const fuzzyMatches = allSubs.filter((s) => {
    const subName = normalizeName(getSubName(s));
    if (!subName) return false;
    return subName.includes(targetName) || targetName.includes(subName);
  });
  if (fuzzyMatches.length === 1) {
    return {
      submission: fuzzyMatches[0],
      strategy: `fuzzy-substring (1 unique match: "${getSubName(fuzzyMatches[0])}")`,
    };
  }

  return null;
}

export async function resyncDestinationImagesFromSubmission(destinationId, destinationData) {
  if (!destinationId && destinationId !== 0) throw new Error("Missing destination ID");
  if (!destinationData) throw new Error("Missing destination data");
  const idStr = String(destinationId);

  const match = await findSubmissionForDestination(destinationData);

  if (!match) {
    const err = new Error(
      `No matching submission found for "${destinationData.name}". ` +
      `This destination may have been created manually or its submission was deleted. ` +
      `Use "Upload Photos Manually" to add photos directly.`
    );
    err.code = "NO_SUBMISSION";
    throw err;
  }

  const { submission, strategy } = match;

  const collected = [
    ...(Array.isArray(submission.data?.images) ? submission.data.images : []),
    ...(Array.isArray(submission.data?.photos) ? submission.data.photos : []),
    ...(Array.isArray(submission.images) ? submission.images : []),
    ...(Array.isArray(submission.photos) ? submission.photos : []),
  ].filter((url) => typeof url === "string" && url.trim().length > 0);

  const images = Array.from(new Set(collected));

  if (images.length === 0) {
    const err = new Error(
      `Found matching submission (${strategy}), but it contains no photos. ` +
      `Use "Upload Photos Manually" to add photos directly.`
    );
    err.code = "SUBMISSION_EMPTY";
    err.submissionId = submission.id;
    throw err;
  }

  const safePayload = sanitizeForFirestore({
    images,
    photos: images,
    updatedAt: serverTimestamp(),
    _imagesResynced: serverTimestamp(),
    sourceSubmissionId: submission.id,
  });

  await setDoc(doc(db, "destinations", idStr), safePayload, { merge: true });

  clearDestinationsCache();

  return { syncedCount: images.length, source: strategy, submissionId: submission.id };
}

export async function manuallySetDestinationImages(destinationId, imageUrls, masterUid) {
  if (!destinationId && destinationId !== 0) throw new Error("Missing destination ID");
  if (!Array.isArray(imageUrls)) throw new Error("imageUrls must be an array");

  const idStr = String(destinationId);

  const cleanUrls = imageUrls.filter(
    (u) => typeof u === "string" && u.trim().length > 0
  );
  const uniqueUrls = Array.from(new Set(cleanUrls));

  const payload = sanitizeForFirestore({
    images: uniqueUrls,
    photos: uniqueUrls,
    updatedAt: serverTimestamp(),
    _imagesManuallySetAt: serverTimestamp(),
    _imagesManuallySetBy: masterUid,
  });

  await setDoc(doc(db, "destinations", idStr), payload, { merge: true });

  clearDestinationsCache();

  return { count: uniqueUrls.length };
}

export async function getRecentApprovedDestinations(limit = 10) {
  const { data } = await listDestinations({ forceRefresh: false });

  const eligible = data.filter((d) => {
    if (d.isActive === false) return false;
    if (!d.createdAt) return false;
    return true;
  });

  eligible.sort((a, b) => {
    const aTime = a.createdAt?.seconds || a.createdAt?._seconds || 0;
    const bTime = b.createdAt?.seconds || b.createdAt?._seconds || 0;
    return bTime - aTime;
  });

  return eligible.slice(0, limit);
}

export async function repairAllDestinationImages(onProgress = () => {}) {
  const all = await listDestinations({ forceRefresh: true });
  const { data } = all;
  const needsRepair = data.filter((d) => {
    const hasImages = Array.isArray(d.images) && d.images.length > 0;
    const hasPhotos = Array.isArray(d.photos) && d.photos.length > 0;
    return !hasImages && !hasPhotos;
  });
  const total = needsRepair.length;
  let repaired = 0;
  let skipped = 0;
  let failed = 0;
  const details = [];
  for (let i = 0; i < needsRepair.length; i++) {
    const destination = needsRepair[i];
    onProgress({ current: i + 1, total, currentName: destination.name, status: "processing" });
    try {
      const result = await resyncDestinationImagesFromSubmission(destination.id, destination);
      repaired++;
      details.push({
        id: destination.id,
        name: destination.name,
        status: "repaired",
        syncedCount: result.syncedCount,
        source: result.source,
      });
    } catch (err) {
      if (err.code === "NO_SUBMISSION") {
        skipped++;
        details.push({
          id: destination.id,
          name: destination.name,
          status: "skipped",
          reason: "no matching submission found",
          hint: "use Manual Upload",
        });
      } else if (err.code === "SUBMISSION_EMPTY") {
        skipped++;
        details.push({
          id: destination.id,
          name: destination.name,
          status: "skipped",
          reason: "submission has no photos",
          hint: "use Manual Upload",
        });
      } else {
        failed++;
        details.push({
          id: destination.id,
          name: destination.name,
          status: "failed",
          reason: err.message,
        });
      }
    }
  }
  clearDestinationsCache();
  return { total, repaired, skipped, failed, details };
}

export async function archiveDestination(destinationId, masterUid, reason = "", fullDestinationData = null) {
  if (!destinationId && destinationId !== 0) throw new Error("Missing destination ID");
  const idStr = String(destinationId);
  const docRef = doc(db, "destinations", idStr);

  const archiveMetadata = {
    isActive: false,
    archivedAt: serverTimestamp(),
    archivedBy: masterUid,
    archivedReason: reason || null,
    updatedAt: serverTimestamp(),
  };

  if (fullDestinationData) {
    const stripped = stripIdField(fullDestinationData);
    const sanitized = sanitizeForFirestore(stripped);
    await setDoc(docRef, { ...sanitized, ...archiveMetadata });
  } else {
    await setDoc(docRef, archiveMetadata, { merge: true });
  }

  console.log("[archiveDestination] ✅ Wrote to Firestore:", { id: idStr, hasFullData: !!fullDestinationData, isActive: false });
  clearDestinationsCache();
}

export async function restoreDestination(destinationId) {
  if (!destinationId) throw new Error("Missing destination ID");
  await setDoc(doc(db, "destinations", String(destinationId)), {
    isActive: true,
    archivedAt: null,
    archivedBy: null,
    archivedReason: null,
  }, { merge: true });
  clearDestinationsCache();
}

export function isStaticDestination(destination) {
  if (!destination) return false;

  if (destination._source === "static" || destination._source === "firestore-overlay") {
    return true;
  }
  if (destination._source === "firestore") {
    return false;
  }

  const id = destination.id;
  if (id === undefined || id === null) return false;

  if (typeof id === "number") return true;

  const idStr = String(id);
  if (idStr.length < 15) return true;

  return false;
}

export async function permanentlyDeleteDestination(destinationId, destinationData = null) {
  if (!destinationId && destinationId !== 0) throw new Error("Missing destination ID");

  if (destinationData && isStaticDestination(destinationData)) {
    const err = new Error(
      "This is a built-in sample item and cannot be permanently deleted. " +
      "Use Archive to hide it from public view instead."
    );
    err.code = "STATIC_ITEM_NOT_DELETABLE";
    throw err;
  }

  const idStr = String(destinationId);
  await deleteDoc(doc(db, "destinations", idStr));
  clearDestinationsCache();
}
