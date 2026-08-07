'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useVendor } from '@/contexts/VendorContext';
import { supabase } from '@/lib/supabase';
import type { Property } from '@/lib/vendor-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Building2, Save, MapPin, Phone, Mail, Image, Star, CircleAlert as AlertCircle, CircleCheck as CheckCircle, X, Upload, Loader2 } from 'lucide-react';

const AMENITY_OPTIONS = [
  'Free WiFi', 'Free Parking', 'Air Conditioning', 'TV', 'Mini Fridge',
  'Microwave', 'Coffee Maker', 'Iron', 'Hair Dryer', 'Safe',
  'Jacuzzi', 'Pool', 'Laundry', 'Pet Friendly', 'Wheelchair Accessible',
  'EV Charging', '24/7 Front Desk', 'Vending Machines', 'Ice Machine', 'Elevator',
];

export default function VendorMotelDetailsPage() {
  const router = useRouter();
  const { vendor, role, selectedPropertyId, refreshVendor } = useVendor();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '', address: '', city: '', state: '', zip: '',
    phone: '', email: '', total_rooms: '10', star_rating: '3',
    description: '', special_instructions: '',
    amenities: [] as string[], photos: [] as string[], status: 'active',
  });

  const [newPhotoUrl, setNewPhotoUrl] = useState('');
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (role === 'front_desk') router.push('/vendor/dashboard');
  }, [role, router]);

  const loadProperty = useCallback(async () => {
    if (!vendor || !selectedPropertyId) { setLoading(false); return; }
    const { data } = await supabase
      .from('properties').select('*').eq('id', selectedPropertyId).maybeSingle();
    if (data) {
      const p = data as Property;
      setProperty(p);
      setForm({
        name: p.name || '', address: p.address || '', city: p.city || '',
        state: p.state || '', zip: p.zip || '', phone: p.phone || '',
        email: p.email || '', total_rooms: String(p.total_rooms),
        star_rating: String(p.star_rating), description: p.description || '',
        special_instructions: p.special_instructions || '',
        amenities: Array.isArray(p.amenities) ? p.amenities : [],
        photos: Array.isArray(p.photos) ? p.photos : [],
        status: p.status,
      });
    }
    setLoading(false);
  }, [vendor, selectedPropertyId]);

  useEffect(() => { loadProperty(); }, [loadProperty]);

  const toggleAmenity = (amenity: string) => {
    setForm((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter((a) => a !== amenity) : [...prev.amenities, amenity],
    }));
    setSaved(false);
  };

  const addPhoto = () => {
    if (!newPhotoUrl.trim()) return;
    setForm((prev) => ({ ...prev, photos: [...prev.photos, newPhotoUrl.trim()] }));
    setNewPhotoUrl('');
    setSaved(false);
  };

  const handlePhotoFileUpload = async (files: FileList) => {
    if (!selectedPropertyId || !files.length) return;
    setUploadingPhotos(true);
    const uploadedUrls: string[] = [];
    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop();
      const path = `${selectedPropertyId}/photos/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('vendor-documents').upload(path, file, { upsert: true });
      if (!error) {
        const { data } = supabase.storage.from('vendor-documents').getPublicUrl(path);
        uploadedUrls.push(data.publicUrl);
      }
    }
    if (uploadedUrls.length > 0) {
      setForm((prev) => ({ ...prev, photos: [...prev.photos, ...uploadedUrls] }));
      setSaved(false);
    }
    setUploadingPhotos(false);
  };

  const removePhoto = (idx: number) => {
    setForm((prev) => ({ ...prev, photos: prev.photos.filter((_, i) => i !== idx) }));
    setSaved(false);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Motel name is required'); return; }
    if (!form.address.trim()) { setError('Address is required'); return; }
    if (!form.city.trim()) { setError('City is required'); return; }
    if (!form.state.trim()) { setError('State is required'); return; }
    if (!form.phone.trim()) { setError('Phone number is required'); return; }
    if (!form.email.trim()) { setError('Email is required'); return; }
    setError(''); setSaving(true);

    const { error: dbErr } = await supabase.from('properties').update({
      name: form.name, address: form.address, city: form.city,
      state: form.state, zip: form.zip, phone: form.phone,
      email: form.email, total_rooms: parseInt(form.total_rooms) || 10,
      star_rating: parseInt(form.star_rating) || 3,
      description: form.description || null,
      special_instructions: form.special_instructions || null,
      amenities: form.amenities, photos: form.photos, status: form.status,
    }).eq('id', selectedPropertyId!);

    if (dbErr) { setError(dbErr.message); setSaving(false); return; }
    setSaving(false); setSaved(true); refreshVendor();
    setTimeout(() => setSaved(false), 3000);
  };

  if (role === 'front_desk') return null;
  if (loading) {
    return (
      <div className="p-6 md:p-8 space-y-6">
        <div className="h-8 bg-slate-800 rounded w-64 animate-pulse" />
        {[1, 2, 3, 4].map((i) => <div key={i} className="h-20 bg-slate-800 rounded-xl animate-pulse" />)}
      </div>
    );
  }
  if (!property) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Building2 className="w-12 h-12 text-slate-600 mx-auto" />
          <h2 className="text-xl font-semibold text-white">No Property Found</h2>
          <p className="text-slate-400">Please contact support to set up your motel.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-4xl ">
      <div className="flex items-center justify-between ">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold dark:text-white">Motel Details</h1>
          <p className="text-slate-400 mt-1">Manage your motel information visible to guests</p>
        </div>
        <div className="flex items-center gap-3">
          {saved && <span className="text-emerald-400 text-sm flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Saved</span>}
          <Button onClick={handleSave} disabled={saving} className="bg-cyan-500 hover:bg-cyan-600 font-bold">
            <Save className="w-4 h-4 mr-2" />{saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {error && (
        <Alert className="border-rose-500/50 dark:bg-rose-500/10">
          <AlertCircle className="w-4 h-4 text-rose-400 dark:text-white" />
          <AlertDescription className="text-rose-300 dark:text-white ml-2">{error}</AlertDescription>
        </Alert>
      )}

      <section className="dark:bg-[#111827] bg-blue-300/40 border dark:border-slate-800 rounded-xl p-6 space-y-5">
        <h2 className="text-lg font-semibold text-black/40 dark:text-cyan-400/40 flex items-center gap-2"><Building2 className="w-5 h-5 dark:text-cyan-400 text-black/40" /> Basic Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label className="dark:text-slate-400 text-black  text-xs">Motel Name *</Label>
            <Input value={form.name} onChange={(e) => { setForm({ ...form, name: e.target.value }); setSaved(false); }} className="dark:bg-slate-800 dark:border-slate-700 dark:text-white text-black/30   " />
          </div>
          <div>
            <Label className="dark:text-slate-400 text-black  text-xs">Total Rooms</Label>
            <Input value={form.total_rooms} onChange={(e) => { setForm({ ...form, total_rooms: e.target.value }); setSaved(false); }} type="number" min="1" className="dark:bg-slate-800 dark:border-slate-700 dark:text-white text-black/30   " />
          </div>
          <div>
            <Label className="dark:text-slate-400 text-black  text-xs">Star Rating</Label>
            <Select value={form.star_rating} onValueChange={(v) => { setForm({ ...form, star_rating: v }); setSaved(false); }}>
              <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700 dark:text-white text-black/30   "><SelectValue /></SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {[1, 2, 3, 4, 5].map((s) => <SelectItem key={s} value={String(s)} className="text-slate-200">{s} Star{s > 1 ? 's' : ''}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="dark:text-slate-400 text-black  text-xs">Status</Label>
            <Select value={form.status} onValueChange={(v) => { setForm({ ...form, status: v }); setSaved(false); }}>
              <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700 dark:text-white text-black/30   "><SelectValue /></SelectTrigger>
              <SelectContent className="bg-slate-800 dark:border-slate-700">
                <SelectItem value="active" className="text-slate-200">Active</SelectItem>
                <SelectItem value="inactive" className="text-slate-200">Inactive</SelectItem>
                <SelectItem value="maintenance" className="text-slate-200">Maintenance</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label className="dark:text-slate-400 text-black  text-xs">Description</Label>
          <Textarea value={form.description} onChange={(e) => { setForm({ ...form, description: e.target.value }); setSaved(false); }} placeholder="Describe your motel..." rows={4} className="dark:bg-slate-800 dark:border-slate-700 dark:text-white resize-none " />
        </div>
      </section>

      <section className="dark:bg-[#111827] dark:border dark:border-slate-800 bg-blue-300/40 rounded-xl p-6 space-y-5">
        <h2 className="text-lg font-semibold dark:text-white text-black/40 flex items-center gap-2"><MapPin className="w-5 h-5 dark:text-cyan-400 text-black/40" /> Address</h2>
        <div>
          <Label className="dark:text-slate-400 text-black  text-xs">Street Address *</Label>
          <Input value={form.address} onChange={(e) => { setForm({ ...form, address: e.target.value }); setSaved(false); }} className="dark:bg-slate-800 dark:border-slate-700 dark:text-white text-black/30   " />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div><Label className="dark:text-slate-400 text-black  text-xs">City *</Label><Input value={form.city} onChange={(e) => { setForm({ ...form, city: e.target.value }); setSaved(false); }} className="dark:bg-slate-800 dark:border-slate-700 dark:text-white text-black/30   " /></div>
          <div><Label className="dark:text-slate-400 text-black  text-xs">State *</Label><Input value={form.state} onChange={(e) => { setForm({ ...form, state: e.target.value }); setSaved(false); }} className="dark:bg-slate-800 dark:border-slate-700 dark:text-white text-black/30   " /></div>
          <div><Label className="dark:text-slate-400 text-black  text-xs">ZIP</Label><Input value={form.zip} onChange={(e) => { setForm({ ...form, zip: e.target.value }); setSaved(false); }} className="dark:bg-slate-800 dark:border-slate-700 dark:text-white text-black/30   " /></div>
        </div>
      </section>

      <section className="dark:bg-[#111827] dark:border bg-blue-300/40 dark:border-slate-800 rounded-xl p-6 space-y-5">
        <h2 className="text-lg font-semibold dark:text-white  text-black/40 flex items-center gap-2"><Phone className="w-5 h-5 dark:text-cyan-400 text-black/40" /> Contact</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><Label className="dark:text-slate-400 text-black  text-xs">Motel Phone *</Label><Input value={form.phone} onChange={(e) => { setForm({ ...form, phone: e.target.value }); setSaved(false); }} placeholder="+1-555-000-0000" className="dark:bg-slate-800 dark:border-slate-700 dark:text-white text-black/30   " /></div>
          <div><Label className="dark:text-slate-400 text-black  text-xs">Motel Email *</Label><Input value={form.email} onChange={(e) => { setForm({ ...form, email: e.target.value }); setSaved(false); }} placeholder="front.desk@motel.com" type="email" className="dark:bg-slate-800 dark:border-slate-700 dark:text-white text-black/30   " /></div>
        </div>
      </section>

      <section className="dark:bg-[#111827] dark:border dark:border-slate-800 bg-blue-300/40 rounded-xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold dark:text-white text-black/40 flex items-center gap-2"><Image className="w-5 h-5 dark:text-cyan-400 text-black/40" /> Photos</h2>
          <span className="text-xs text-slate-500">{form.photos.length} photo{form.photos.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Upload button */}
        <div
          onClick={() => !uploadingPhotos && photoInputRef.current?.click()}
          className="border-2 border-dashed border-blue-400 dark:border-slate-700 dark:hover:border-cyan-500/50 rounded-xl p-6 text-center cursor-pointer transition-all dark:hover:bg-slate-800/50 group hover:bg-blue-200"
        >
          {uploadingPhotos ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-7 h-7 text-cyan-400 animate-spin" />
              <p className="text-sm font-semibold text-slate-400">Uploading photos...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="w-7 h-7 text-slate-500 group-hover:text-cyan-400 transition-colors" />
              <p className="text-sm font-semibold dark:text-slate-400 dark:group-hover:text-slate-300 transition-colors">Click to upload photos</p>
              <p className="text-xs text-slate-600">JPG, PNG, WEBP — up to 10MB each, multiple allowed</p>
            </div>
          )}
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && handlePhotoFileUpload(e.target.files)}
          />
        </div>

        {/* Photo grid */}
        {form.photos.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {form.photos.map((url, idx) => (
              <div key={idx} className="relative group rounded-lg overflow-hidden border border-slate-700 aspect-video bg-slate-800">
                <img src={url} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                <div className="absolute top-1.5 left-1.5 bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                  {idx === 0 ? 'MAIN' : `#${idx + 1}`}
                </div>
                <button onClick={() => removePhoto(idx)} className="absolute top-2 right-2 bg-black/70 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* URL input as fallback */}
        <div className="flex gap-2 pt-1">
          <Input value={newPhotoUrl} onChange={(e) => setNewPhotoUrl(e.target.value)} placeholder="Or paste an image URL..." className="dark:bg-slate-800 dark:border-slate-700 dark:text-white flex-1 text-sm" onKeyDown={(e) => e.key === 'Enter' && addPhoto()} />
          <Button onClick={addPhoto} variant="outline" className="dark:border-slate-600 bg-blue-300  hover:bg-blue-400/40 dark:hover:bg-blue-500/40 dark:bg-blue-300  dark:text-white shrink-0 text-sm">Add URL</Button>
        </div>
        <p className="text-[11px] text-slate-600">First photo is the main listing image. Click ✕ to remove. Hit Save Changes when done.</p>
      </section>

      <section className="dark:bg-[#111827] bg-blue-300/40 dark:border dark:border-slate-800 rounded-xl p-6 space-y-5 text-black/40">
        <h2 className="text-lg font-semibold dark:text-white flex items-center gap-2"><Star className="w-5 h-5 dark:text-cyan-400 text-black/40" /> Amenities</h2>
        <div className="flex flex-wrap gap-2">
          {AMENITY_OPTIONS.map((a) => {
            const sel = form.amenities.includes(a);
            return (
              <button key={a} onClick={() => toggleAmenity(a)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-all ${sel ? 'dark:bg-cyan-500/20 dark:text-cyan-400 dark:border-cyan-500/50 bg-blue-500/40 text-white' : 'dark:bg-slate-800 bg-blue-500/70 text-white/40 dark:text-slate-400 dark:border-slate-700 dark:hover:border-slate-600'}`}>
                {sel && <span className="mr-1">&#10003;</span>}{a}
              </button>
            );
          })}
        </div>
      </section>

      <section className="dark:bg-[#111827] bg-blue-300/40 dark:border dark:border-slate-800 rounded-xl p-6 space-y-5 text-black/40">
        <h2 className="text-lg font-semibold flex items-center dark:text-white gap-2"><Mail className="w-5 h-5 dark:text-cyan-400 text-black/40" /> Special Instructions</h2>
        <Textarea value={form.special_instructions} onChange={(e) => { setForm({ ...form, special_instructions: e.target.value }); setSaved(false); }} placeholder="Check-in instructions, parking info, gate codes..." rows={3} className="dark:bg-slate-800 dark:border-slate-700 dark:text-white resize-none" />
      </section>
    </div>
  );
}
