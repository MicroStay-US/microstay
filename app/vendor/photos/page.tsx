'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useVendor } from '@/contexts/VendorContext';
import { supabase } from '@/lib/supabase';
import { Camera, Upload, ArrowUp, ArrowDown, Trash2, Save, AlertCircle } from 'lucide-react';

interface UploadProgress {
  file: string;
  pct: number;
  done: boolean;
  error?: string;
}

export default function VendorPhotosPage() {
  const { vendor, selectedPropertyId, properties } = useVendor();
  const [photos, setPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedProperty = properties.find((p) => p.id === selectedPropertyId);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };


  // Ma'am below is the code for loading photos

  const loadPhotos = useCallback(async () => {
    if (!selectedPropertyId) { setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('properties')
      .select('photos')
      .eq('id', selectedPropertyId)
      .maybeSingle();
    if (error) console.error('Photos fetch error:', error);
    setPhotos(Array.isArray(data?.photos) ? (data?.photos ?? []) : []);
    setDirty(false);
    setLoading(false);
  }, [selectedPropertyId]);

  useEffect(() => { loadPhotos(); }, [loadPhotos]);

  const move = (index: number, direction: 'up' | 'down') => {
    const next = [...photos];
    const swapWith = direction === 'up' ? index - 1 : index + 1;
    if (swapWith < 0 || swapWith >= next.length) return;
    [next[index], next[swapWith]] = [next[swapWith], next[index]];
    setPhotos(next);
    setDirty(true);
  };

  // const deletePhoto = (url: string) => {
  //   setPhotos((prev) => prev.filter((p) => p !== url));
  //   setDeleteConfirm(null);
  //   setDirty(true);
  // };
  const deletePhoto = async (url: string) => {
  if (!selectedPropertyId) return;

  const updatedPhotos = photos.filter((p) => p !== url);

  setPhotos(updatedPhotos);
  setDeleteConfirm(null);

  const { error } = await supabase
    .from('properties')
    .update({
      photos: updatedPhotos,
    })
    .eq('id', selectedPropertyId);

  if (error) {
    showToast('Failed to delete photo', 'error');
    console.error(error);
    return;
  }

  showToast('Photo deleted successfully');
};
//   console.log("selectedPropertyId:", selectedPropertyId);
// console.log("properties:", properties);
// console.log("vendor:", vendor);

  const saveOrder = async () => {
    if (!selectedPropertyId) return;
    setSaving(true);
    const { error } = await supabase
      .from('properties')
      .update({ photos })
      .eq('id', selectedPropertyId);
    setSaving(false);
    if (error) {
      showToast('Failed to save order. Please try again.', 'error');
    } else {
      setDirty(false);
      showToast('Photo order saved successfully.');
    }
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0 || !selectedPropertyId) return;
    const fileArray = Array.from(files);

    const initialProgress: UploadProgress[] = fileArray.map((f) => ({
      file: f.name,
      pct: 0,
      done: false,
    }));
    setUploadProgress(initialProgress);

    const newUrls: string[] = [];

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${selectedPropertyId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      setUploadProgress((prev) =>
        prev.map((p, idx) => (idx === i ? { ...p, pct: 30 } : p))
      );

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('property-photos')
        .upload(path, file, { upsert: false });

      if (uploadError) {
        setUploadProgress((prev) =>
          prev.map((p, idx) =>
            idx === i ? { ...p, pct: 0, done: true, error: uploadError.message } : p
          )
        );
        continue;
      }

      setUploadProgress((prev) =>
        prev.map((p, idx) => (idx === i ? { ...p, pct: 80 } : p))
      );

      const { data: urlData } = supabase.storage
        .from('property-photos')
        .getPublicUrl(uploadData.path);

      const publicUrl = urlData?.publicUrl;

      setUploadProgress((prev) =>
        prev.map((p, idx) => (idx === i ? { ...p, pct: 100, done: true } : p))
      );

      if (publicUrl) newUrls.push(publicUrl);
    }

    if (newUrls.length > 0) {
      const merged = [...photos, ...newUrls];
      const { error: saveError } = await supabase
        .from('properties')
        .update({ photos: merged })
        .eq('id', selectedPropertyId);

      if (saveError) {
        showToast('Uploaded but failed to save URLs. Please refresh.', 'error');
      } else {
        setPhotos(merged);
        setDirty(false);
        showToast(`${newUrls.length} photo${newUrls.length > 1 ? 's' : ''} uploaded successfully.`);
      }
    }

    setTimeout(() => setUploadProgress([]), 2500);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  if (!selectedPropertyId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Camera className="w-12 h-12 text-ms-orange mx-auto" />
          <h2 className="text-xl font-bold text-gray-900">No Property Selected</h2>
          <p className="text-gray-500 font-medium">Select a property from the sidebar to manage photos.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg font-semibold text-sm transition-all ${
            toast.type === 'success'
              ? 'bg-ms-teal text-white'
              : 'bg-rose-600 text-white'
          }`}
        >
          {toast.type === 'error' && <AlertCircle className="w-4 h-4 shrink-0" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Photo Manager</h1>
          <p className="text-gray-500 font-medium mt-1">
            {selectedProperty?.name || 'Your Property'} &mdash;{' '}
            <span className="font-bold text-gray-700">{photos.length} photo{photos.length !== 1 ? 's' : ''}</span>
          </p>
        </div>
        {dirty && (
          <button
            onClick={saveOrder}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold bg-[#0f1f3d] text-white hover:bg-[#162d56] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Order'}
          </button>
        )}
      </div>

      {/* Upload Zone */}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
          dragOver
            ? 'border-[#c9a96e] bg-[#c9a96e]/5'
            : 'border-gray-300 bg-white hover:border-[#c9a96e] hover:bg-[#c9a96e]/5'
        }`}
      >
        <Upload className={`w-10 h-10 mx-auto mb-3 ${dragOver ? 'text-[#c9a96e]' : 'text-gray-400'}`} />
        <p className="text-gray-700 font-semibold text-sm">Click to upload or drag photos here</p>
        <p className="text-gray-400 text-xs mt-1">JPG, PNG, WEBP — multiple files supported</p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* Upload Progress */}
      {uploadProgress.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3 shadow-sm">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Uploading...</p>
          {uploadProgress.map((p, i) => (
            <div key={i} className="space-y-1">
              <div className="flex justify-between text-xs font-medium text-gray-600">
                <span className="truncate max-w-[70%]">{p.file}</span>
                <span className={p.error ? 'text-rose-500' : p.done ? 'text-ms-teal' : 'text-gray-400'}>
                  {p.error ? 'Failed' : p.done ? 'Done' : `${p.pct}%`}
                </span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    p.error ? 'bg-rose-400' : p.done ? 'bg-ms-teal' : 'bg-[#c9a96e]'
                  }`}
                  style={{ width: `${p.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Photos Grid */}
      {loading ? (
        <div className="text-center py-16 text-gray-500 font-bold animate-pulse">Loading photos...</div>
      ) : photos.length === 0 ? (
        <div className="bg-white dark:bg-slate-950 border border-gray-200 dark:border-transparent rounded-2xl p-16 text-center shadow-sm">
          <div className="w-16 h-16 bg-gray-50  dark:bg-slate-900 rounded-full mx-auto flex items-center justify-center mb-4">
            <Camera className="w-8 h-8 text-gray-400 dark:text-white" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">No photos yet</h3>
          <p className="text-gray-500 font-medium">Upload your first photo using the zone above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {photos.map((url, index) => (
            <div key={url} className="relative group bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              {/* Image */}
              <div className="aspect-video bg-gray-100 dark:bg-black overflow-hidden">
                <img
                  src={url}
                  alt={`Property photo ${index + 1}`}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>

              {/* Index badge */}
              <div className="absolute top-2 left-2 bg-black/60 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {index + 1}
              </div>

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  onClick={() => move(index, 'up')}
                  disabled={index === 0}
                  title="Move Up"
                  className="p-2 bg-white/90 hover:bg-white rounded-lg text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => move(index, 'down')}
                  disabled={index === photos.length - 1}
                  title="Move Down"
                  className="p-2 bg-white/90 hover:bg-white rounded-lg text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow"
                >
                  <ArrowDown className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeleteConfirm(url)}
                  title="Delete Photo"
                  className="p-2 bg-rose-500 hover:bg-rose-600 rounded-lg text-white transition-all shadow"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4">
            <div className="w-12 h-12 bg-rose-50 dark:bg-rose-700 rounded-full flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6 text-rose-500 dark:text-white" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-gray-900">Delete Photo?</h3>
              <p className="text-gray-500 text-sm mt-1">This photo will be removed from your listing. This cannot be undone.</p>
            </div>
            <img
              src={deleteConfirm}
              alt="To delete"
              className="w-full h-32 object-cover rounded-lg border border-gray-200"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-colors dark:bg-slate-700 dark:text-white/40 dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => deletePhoto(deleteConfirm)}
                className="flex-1 px-4 py-2.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-white font-bold text-sm transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
