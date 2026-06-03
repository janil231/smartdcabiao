import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { uploadToCloudinary } from "../utils/cloudinary";
import { compressImage } from "../utils/compressImage";

const MAX_PHOTOS = 8;
const MAX_FILE_MB = 3;
const ACCEPTED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

export default function ManualPhotoUploadModal({ target, onClose, onSave }) {
  const [images, setImages] = useState(target?.currentImages || []);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const handler = (e) => {
      if (e.key === "Escape" && !uploading && !saving) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handler);
    };
  }, [uploading, saving, onClose]);

  const handleFileSelect = async (e) => {
    setError("");
    setSuccessMsg("");
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (fileInputRef.current) fileInputRef.current.value = "";

    if (images.length + files.length > MAX_PHOTOS) {
      setError(`Maximum ${MAX_PHOTOS} photos total. You currently have ${images.length}.`);
      return;
    }

    for (const file of files) {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        setError(`"${file.name}" — only JPG, PNG, or WebP allowed.`);
        return;
      }
      if (file.size > MAX_FILE_MB * 1024 * 1024) {
        setError(`"${file.name}" is too large (max ${MAX_FILE_MB}MB).`);
        return;
      }
    }

    setUploading(true);
    const newUrls = [];
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress({ current: i + 1, total: files.length, fileName: file.name });

        let toUpload = file;
        try {
          toUpload = await compressImage(file, 1600, 0.8);
        } catch (compErr) {
          console.warn("Compression failed, using original:", compErr);
        }

        const url = await uploadToCloudinary(toUpload);
        if (url) newUrls.push(url);
      }

      setImages((prev) => [...prev, ...newUrls]);
      setSuccessMsg(`Uploaded ${newUrls.length} photo${newUrls.length === 1 ? "" : "s"}.`);
      setTimeout(() => setSuccessMsg(""), 2500);
    } catch (err) {
      setError(`Upload failed: ${err.message || "Unknown error"}`);
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  const handleRemove = (idx) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
    setError("");
  };

  const handleMoveLeft = (idx) => {
    if (idx === 0) return;
    setImages((prev) => {
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  };

  const handleMoveRight = (idx) => {
    setImages((prev) => {
      if (idx === prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  };

  const handleSave = async () => {
    setError("");
    setSaving(true);
    try {
      await onSave(images);
      onClose();
    } catch (err) {
      setError(err.message || "Save failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!target) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/60"
        onClick={() => !uploading && !saving && onClose()}
      />
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 flex items-start justify-between gap-4">
          <div>
            <h3 className="font-bold text-lg text-gray-900">Manage Photos</h3>
            <p className="text-sm text-gray-600 mt-0.5">
              For <span className="font-semibold">"{target.name}"</span> &middot; {target.type}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={uploading || saving}
            className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-700 disabled:opacity-50"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="mb-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              multiple
              onChange={handleFileSelect}
              disabled={uploading || saving || images.length >= MAX_PHOTOS}
              className="hidden"
              id="manual-photo-input"
            />
            <label
              htmlFor="manual-photo-input"
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition cursor-pointer ${
                uploading || saving || images.length >= MAX_PHOTOS
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
              }`}
            >
              + Add Photos
            </label>
            <span className="ml-3 text-xs text-gray-500">
              {images.length} / {MAX_PHOTOS} photos &middot; max {MAX_FILE_MB}MB each &middot; JPG/PNG/WebP
            </span>
          </div>

          {uploadProgress && (
            <div className="mb-4 bg-blue-50 border border-blue-200 rounded-xl p-3">
              <div className="flex items-center justify-between text-sm font-semibold text-blue-900 mb-1.5">
                <span>Uploading...</span>
                <span className="font-mono">{uploadProgress.current} / {uploadProgress.total}</span>
              </div>
              <div className="text-xs text-blue-700 truncate">{uploadProgress.fileName}</div>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm text-emerald-800">
              {successMsg}
            </div>
          )}

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {images.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
              <div className="text-4xl mb-2">📷</div>
              <p className="text-gray-600 font-medium">No photos yet</p>
              <p className="text-xs text-gray-500 mt-1">Click "Add Photos" to upload</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {images.map((url, idx) => (
                <div
                  key={`${url}-${idx}`}
                  className="relative group aspect-square rounded-xl overflow-hidden bg-gray-100 border border-gray-200"
                >
                  <img
                    src={url}
                    alt={`Photo ${idx + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                  />

                  <div className="absolute top-1.5 left-1.5 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full font-mono">
                    #{idx + 1}
                  </div>

                  <button
                    onClick={() => handleRemove(idx)}
                    disabled={saving}
                    className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md opacity-0 group-hover:opacity-100 transition disabled:opacity-50"
                    title="Remove"
                  >
                    ✕
                  </button>

                  <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button
                      onClick={() => handleMoveLeft(idx)}
                      disabled={saving || idx === 0}
                      className="w-7 h-7 rounded-full bg-white/95 hover:bg-white text-gray-800 text-xs font-bold shadow-md disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Move left"
                    >
                      ◀
                    </button>
                    <button
                      onClick={() => handleMoveRight(idx)}
                      disabled={saving || idx === images.length - 1}
                      className="w-7 h-7 rounded-full bg-white/95 hover:bg-white text-gray-800 text-xs font-bold shadow-md disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Move right"
                    >
                      ▶
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {images.length > 0 && (
            <p className="mt-3 text-xs text-gray-500">
              First photo is the main cover image. Hover to reorder or remove.
            </p>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 sm:justify-end">
          <button
            onClick={onClose}
            disabled={uploading || saving}
            className="px-5 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-700 font-semibold hover:bg-gray-50 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={uploading || saving}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <span className="animate-spin">⏳</span> Saving...
              </>
            ) : (
              `Save ${images.length} photo${images.length === 1 ? "" : "s"}`
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
