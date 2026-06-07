/**
 * Businesses Service Layer
 * Loads from Firestore when available and merges with local mock data for demos.
 */

import { getDocs, collection, doc, setDoc, getDoc, updateDoc, deleteDoc, serverTimestamp, query, where } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { businesses as mockBusinesses, BUSINESS_TYPES } from '../data'
import { readCache, writeCache, getCacheMeta, CACHE_KEYS } from './cache.service'
import { sanitizeForFirestore, stripIdField } from '../utils/firestoreSanitize'

const USE_FIRESTORE = import.meta.env.VITE_USE_FIRESTORE_DATA === 'true'
const BUSINESSES_COLLECTION = 'businesses'

let businessesCache = null
let ownerBusinessesCache = null

function mapCategoryToType(category) {
  switch (category) {
    case 'food_dining':
      return BUSINESS_TYPES.restaurant
    case 'tourism_recreation':
    case 'accommodation':
      return BUSINESS_TYPES.attraction
    case 'retail_shopping':
    case 'services':
    case 'agriculture':
    case 'other':
    default:
      return BUSINESS_TYPES.shop
  }
}

function normalizeBusinessDoc(docSnap) {
  const data = docSnap.data()
  const category = data.category || ''
  return {
    id: docSnap.id,
    name: data.name || '',
    category: category,
    type: data.type || mapCategoryToType(category),
    description: data.description || '',
    position: normalizePosition(data.position || data.location),
    barangay: data.barangay || '',
    address: data.address || '',
    phone: data.phone || data.contactNumber || '',
    hours: data.hours || '',
    priceRange: data.priceRange || '₱',
    specialties: data.specialties || [],
    features: data.features || [],
    images: normalizeImages(data.images || data.photos),
    website: data.website || null,
    socialMedia: data.socialMedia || data.facebook ? { facebook: data.facebook } : {},
    isActive: data.isActive !== false,
    ownerUid: data.ownerUid || data.createdByUid || data.submittedBy || null,
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
      map.set(String(item.id), {
        ...existing,
        ...item,
        _source: 'firestore-overlay',
      });
    } else {
      map.set(String(item.id), { ...item, _source: 'firestore' });
    }
  });
  return Array.from(map.values());
}

async function fetchAllFromFirestore() {
  try {
    const querySnapshot = await getDocs(collection(db, BUSINESSES_COLLECTION))
    return querySnapshot.docs.map(normalizeBusinessDoc)
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('[businesses] Firestore fetch failed:', error)
    }
    return null
  }
}

async function clearMapPlacesCache() {
  try {
    const { clearPlacesCache } = await import('../features/map/mapHelpers')
    clearPlacesCache()
  } catch {
    // ignore circular import edge cases
  }
}

export async function listBusinesses({ forceRefresh = false } = {}) {
  if (forceRefresh) {
    businessesCache = null
    await clearMapPlacesCache()
  }

  if (!businessesCache) {
    const firestoreData = await fetchAllFromFirestore()

    if (firestoreData === null) {
      const cached = readCache(CACHE_KEYS.businesses)
      if (cached?.data?.length) {
        businessesCache = cached.data
        return { data: businessesCache, source: 'cache' }
      }
      businessesCache = mockBusinesses
      return { data: mockBusinesses, source: 'mock' }
    }

    const merged = mergeStaticAndFirestore(mockBusinesses, firestoreData)
    businessesCache = merged
    writeCache(CACHE_KEYS.businesses, merged)
    const source =
      firestoreData.length === 0
        ? 'mock'
        : merged.length > firestoreData.length
          ? 'mixed'
          : 'live'
    return { data: merged, source }
  }

  return {
    data: businessesCache,
    source: businessesCache.length > mockBusinesses.length ? 'live' : 'mock',
  }
}

export async function getBusinessById(id) {
  const { data } = await listBusinesses()
  return data.find(b => String(b.id) === String(id)) || null
}

export async function searchBusinesses(query = '', filters = {}) {
  const { data: results } = await listBusinesses()

  let filtered = results

  if (query.trim()) {
    const lowercaseQuery = query.toLowerCase()
    filtered = filtered.filter(b =>
      b.name.toLowerCase().includes(lowercaseQuery) ||
      b.category?.toLowerCase().includes(lowercaseQuery) ||
      b.description?.toLowerCase().includes(lowercaseQuery)
    )
  }

  if (filters.type && filters.type !== 'all') {
    filtered = filtered.filter(b => b.type === filters.type)
  }

  return filtered
}

export async function getFeaturedBusinesses() {
  const { data } = await listBusinesses()
  const FEATURED_IDS = [1, 2, 3]
  const featured = data.filter(b => FEATURED_IDS.includes(b.id))
  if (featured.length > 0) return featured
  return data.slice(0, 3)
}

export async function getMyApprovedBusinesses(uid) {
  if (!uid) return []
  try {
    const q = query(
      collection(db, BUSINESSES_COLLECTION),
      where('ownerUid', '==', uid)
    )
    const snapshot = await getDocs(q)
    const list = snapshot.docs.map(normalizeBusinessDoc)
    return list.filter(b => b.isActive !== false)
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('[businesses] getMyApprovedBusinesses failed:', error)
    }
    return []
  }
}

export async function clearBusinessesCache() {
  businessesCache = null
  ownerBusinessesCache = null
  await clearMapPlacesCache()
}

export function getBusinessesLastSynced() {
  const meta = getCacheMeta(CACHE_KEYS.businesses)
  return meta?.savedAt || null
}

export async function archiveBusiness(businessId, masterUid, reason = "", fullBusinessData = null) {
  if (!businessId && businessId !== 0) throw new Error("Missing business ID");
  const idStr = String(businessId);
  const docRef = doc(db, "businesses", idStr);

  const archiveMetadata = {
    isActive: false,
    archivedAt: serverTimestamp(),
    archivedBy: masterUid,
    archivedReason: reason || null,
    updatedAt: serverTimestamp(),
  };

  if (fullBusinessData) {
    const stripped = stripIdField(fullBusinessData);
    const sanitized = sanitizeForFirestore(stripped);
    await setDoc(docRef, { ...sanitized, ...archiveMetadata });
  } else {
    await setDoc(docRef, archiveMetadata, { merge: true });
  }

  console.log("[archiveBusiness] ✅ Wrote to Firestore:", { id: idStr, hasFullData: !!fullBusinessData, isActive: false });
  clearBusinessesCache();
}

export async function restoreBusiness(businessId) {
  if (!businessId) throw new Error("Missing business ID");
  await setDoc(doc(db, "businesses", String(businessId)), {
    isActive: true,
    archivedAt: null,
    archivedBy: null,
    archivedReason: null,
  }, { merge: true });
  clearBusinessesCache();
}

export function isStaticBusiness(business) {
  if (!business) return false;

  if (business._source === "static" || business._source === "firestore-overlay") {
    return true;
  }
  if (business._source === "firestore") {
    return false;
  }

  const id = business.id;
  if (id === undefined || id === null) return false;

  if (typeof id === "number") return true;

  const idStr = String(id);
  if (idStr.length < 15) return true;

  return false;
}

export async function permanentlyDeleteBusiness(businessId, businessData = null) {
  if (!businessId && businessId !== 0) throw new Error("Missing business ID");

  if (businessData && isStaticBusiness(businessData)) {
    const err = new Error(
      "This is a built-in sample item and cannot be permanently deleted. " +
      "Use Archive to hide it from public view instead."
    );
    err.code = "STATIC_ITEM_NOT_DELETABLE";
    throw err;
  }

  const idStr = String(businessId);
  await deleteDoc(doc(db, "businesses", idStr));
  clearBusinessesCache();
}

export async function listBusinessesWithFilter(filter = "active") {
  const allBusinesses = await listBusinesses({ forceRefresh: true });
  const { data } = allBusinesses;
  if (filter === "active") {
    return data.filter((b) => b.isActive !== false);
  } else if (filter === "archived") {
    return data.filter((b) => b.isActive === false);
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

async function findSubmissionForBusiness(businessData) {
  if (businessData.sourceSubmissionId) {
    try {
      const subSnap = await getDoc(doc(db, "submissions", businessData.sourceSubmissionId));
      if (subSnap.exists()) {
        return {
          submission: { id: subSnap.id, ...subSnap.data() },
          strategy: `direct (sourceSubmissionId=${businessData.sourceSubmissionId})`,
        };
      }
    } catch (err) {
      console.warn("[findSubmission] Direct lookup failed:", err);
    }
  }

  if (!businessData.name) return null;

  const targetName = normalizeName(businessData.name);

  let allSubs = [];
  try {
    const subsQuery = query(
      collection(db, "submissions"),
      where("type", "==", "business")
    );
    const snap = await getDocs(subsQuery);
    allSubs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.warn("[findSubmission] Submissions fetch failed:", err);
    return null;
  }

  if (allSubs.length === 0) return null;

  const getSubName = (s) =>
    s.data?.name || s.name || s.businessName || s.data?.businessName || "";

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

  if (businessData.publishedBy || businessData.createdByUid) {
    const ownerUid = businessData.publishedBy || businessData.createdByUid;
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

export async function resyncBusinessImagesFromSubmission(businessId, businessData) {
  if (!businessId && businessId !== 0) throw new Error("Missing business ID");
  if (!businessData) throw new Error("Missing business data");
  const idStr = String(businessId);

  const match = await findSubmissionForBusiness(businessData);

  if (!match) {
    const err = new Error(
      `No matching submission found for "${businessData.name}". ` +
      `This business may have been created manually or its submission was deleted. ` +
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

  await setDoc(doc(db, "businesses", idStr), safePayload, { merge: true });

  clearBusinessesCache();

  return { syncedCount: images.length, source: strategy, submissionId: submission.id };
}

export async function manuallySetBusinessImages(businessId, imageUrls, masterUid) {
  if (!businessId && businessId !== 0) throw new Error("Missing business ID");
  if (!Array.isArray(imageUrls)) throw new Error("imageUrls must be an array");

  const idStr = String(businessId);

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

  await setDoc(doc(db, "businesses", idStr), payload, { merge: true });

  clearBusinessesCache();

  return { count: uniqueUrls.length };
}

export async function getRecentApprovedBusinesses(limit = 10) {
  const { data } = await listBusinesses({ forceRefresh: false });

  const eligible = data.filter((b) => {
    if (b.isActive === false) return false;
    if (!b.createdAt) return false;
    return true;
  });

  eligible.sort((a, b) => {
    const aTime = a.createdAt?.seconds || a.createdAt?._seconds || 0;
    const bTime = b.createdAt?.seconds || b.createdAt?._seconds || 0;
    return bTime - aTime;
  });

  return eligible.slice(0, limit);
}

export async function backfillBusinessOwnerUids(adminUid, adminEmail) {
  const all = await listBusinesses({ forceRefresh: true })
  const { data } = all

  const needsBackfill = data.filter((b) => {
    if (!b.ownerUid) return true
    return false
  })

  let scanned = 0
  let backfilled = 0
  let skipped = 0
  let failed = 0
  const details = []

  for (const business of needsBackfill) {
    scanned++
    try {
      const match = await findSubmissionForBusiness(business)
      if (!match) {
        skipped++
        details.push({
          id: business.id,
          name: business.name,
          status: 'skipped',
          reason: 'no matching submission found',
        })
        continue
      }

      const submission = match.submission
      const ownerUid = submission.createdByUid || submission.submittedBy

      if (!ownerUid) {
        skipped++
        details.push({
          id: business.id,
          name: business.name,
          status: 'skipped',
          reason: `submission ${submission.id} has no createdByUid or submittedBy`,
          strategy: match.strategy,
        })
        continue
      }

      const safePayload = sanitizeForFirestore({
        ownerUid,
        updatedAt: serverTimestamp(),
        _ownerBackfilledAt: serverTimestamp(),
      })

      await updateDoc(doc(db, BUSINESSES_COLLECTION, String(business.id)), safePayload)

      try {
        const { logAudit } = await import('./audit.service')
        await logAudit({
          action: 'backfill_owner_uid',
          targetType: 'business',
          targetId: String(business.id),
          adminUid,
          adminEmail,
          meta: { ownerUid, source: match.strategy, businessName: business.name },
        })
      } catch {
        // audit log is non-critical
      }

      backfilled++
      details.push({
        id: business.id,
        name: business.name,
        status: 'backfilled',
        ownerUid,
        strategy: match.strategy,
      })
    } catch (err) {
      failed++
      details.push({
        id: business.id,
        name: business.name,
        status: 'failed',
        reason: err.message,
      })
    }
  }

  clearBusinessesCache()
  return { scanned, backfilled, skipped, failed, details }
}

export async function repairAllBusinessImages(onProgress = () => {}) {
  const all = await listBusinesses({ forceRefresh: true });
  const { data } = all;
  const needsRepair = data.filter((b) => {
    const hasImages = Array.isArray(b.images) && b.images.length > 0;
    const hasPhotos = Array.isArray(b.photos) && b.photos.length > 0;
    return !hasImages && !hasPhotos;
  });
  const total = needsRepair.length;
  let repaired = 0;
  let skipped = 0;
  let failed = 0;
  const details = [];
  for (let i = 0; i < needsRepair.length; i++) {
    const business = needsRepair[i];
    onProgress({ current: i + 1, total, currentName: business.name, status: "processing" });
    try {
      const result = await resyncBusinessImagesFromSubmission(business.id, business);
      repaired++;
      details.push({
        id: business.id,
        name: business.name,
        status: "repaired",
        syncedCount: result.syncedCount,
        source: result.source,
      });
    } catch (err) {
      if (err.code === "NO_SUBMISSION") {
        skipped++;
        details.push({
          id: business.id,
          name: business.name,
          status: "skipped",
          reason: "no matching submission found",
          hint: "use Manual Upload",
        });
      } else if (err.code === "SUBMISSION_EMPTY") {
        skipped++;
        details.push({
          id: business.id,
          name: business.name,
          status: "skipped",
          reason: "submission has no photos",
          hint: "use Manual Upload",
        });
      } else {
        failed++;
        details.push({
          id: business.id,
          name: business.name,
          status: "failed",
          reason: err.message,
        });
      }
    }
  }
  clearBusinessesCache();
  return { total, repaired, skipped, failed, details };
}
