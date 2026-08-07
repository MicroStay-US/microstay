'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useVendor } from '@/contexts/VendorContext';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Building2, Camera, FileText, PenLine, CheckCircle2, ChevronRight, ChevronLeft, Upload, X, Home } from 'lucide-react';

// ── Step indicator ─────────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: 'Property Info', icon: Building2 },
  { id: 2, label: 'Photos', icon: Camera },
  { id: 3, label: 'License', icon: FileText },
  { id: 4, label: 'Agreement', icon: PenLine },
];

function StepDot({ step, current }: { step: typeof STEPS[0]; current: number }) {
  const done = current > step.id;
  const active = current === step.id;
  const Icon = step.icon;
  return (
    <div className="flex flex-col items-center gap-1.5 flex-1">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${done ? 'bg-ms-orange border-ms-orange text-white' :
          active ? 'bg-white border-ms-orange text-ms-orange' :
            'bg-white border-gray-200 text-gray-400'
        }`}>
        {done ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-4 h-4" />}
      </div>
      <span className={`text-[11px] font-semibold ${active || done ? 'text-ms-orange' : 'text-gray-400'}`}>
        {step.label}
      </span>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function VendorOnboardingPage() {
  const router = useRouter();
  const { vendor, refreshVendor } = useVendor();
  // console.log('Vendor Data:', vendor);
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Step 1 fields
  const [businessName, setBusinessName] = useState(vendor?.business_name !== 'My Property' ? vendor?.business_name || '' : '');
  const [ownerName, setOwnerName] = useState(vendor?.owner_name || '');
  const [email, setEmail] = useState(vendor?.email || user?.email || '');
  const [phone, setPhone] = useState(vendor?.phone || '');
  // const [rooms, setRooms] = useState(vendor?.rooms || '');
  const rooms = vendor?.rooms ?? 0;
  const [address, setAddress] = useState(vendor?.address || '');
  const [city, setCity] = useState(vendor?.city || '');
  const [stateVal, setStateVal] = useState(vendor?.state || '');
  const [zip, setZip] = useState(vendor?.zip || '');
  const [roomTypes, setRoomTypes] = useState([
    {
      roomType: 'Standard',
      bedType: '1 bed',
      smokingType: 'non-smoking',
      slotLabel: 'Afternoon',
      startHour: 12,
      endHour: 18,
      quantity: 1,
      price: 50
    }
  ]);
  const addRoomType = () => {
    setRoomTypes([
      ...roomTypes,
      {
        roomType: '',
        bedType: '',
        smokingType: 'non-smoking',
        slotLabel: '',
        startHour: 12,
        endHour: 18,
        quantity: 1,
        price: 50
      }
    ]);
  };

  const removeRoomType = (index: number) => {
    setRoomTypes(roomTypes.filter((_, i) => i !== index));
  };

  const updateRoomType = (
    index: number,
    field: string,
    value: any
  ) => {
    const updated = [...roomTypes];
    updated[index] = {
      ...updated[index],
      [field]: value
    };
    setRoomTypes(updated);
  };

  // Step 2 — photos
  const [photos, setPhotos] = useState<{ file: File; preview: string }[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Step 3 — license
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [licenseName, setLicenseName] = useState('');
  const [uploadingLicense, setUploadingLicense] = useState(false);
  const licenseInputRef = useRef<HTMLInputElement>(null);

  // Step 4 — agreement
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  // const [signatureName, setSignatureName] = useState('');
  const [signatureName, setSignatureName] = useState(vendor?.owner_name || '');

  useEffect(() => {
    if (!vendor) return;

    setBusinessName(
      vendor.business_name !== 'My Property'
        ? vendor.business_name || ''
        : ''
    );

    setOwnerName(vendor.owner_name || '');
    setEmail(vendor.email || user?.email || '');
    setPhone(vendor.phone || '');
    setAddress(vendor.address || '');
    setCity(vendor.city || '');
    setStateVal(vendor.state || '');
    setZip(vendor.zip || '');
    setSignatureName(vendor.owner_name || '');
  }, [vendor, user]);

  // ── Step 1: Property info validation ────────────────────────────────────────
  const step1Valid = businessName.trim() && ownerName.trim() && email.trim() && phone.trim() && address.trim() && city.trim();

  // ── Step 2: Photos upload ────────────────────────────────────────────────────
  const addPhotos = (files: FileList) => {
    const newItems = Array.from(files).map(file => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setPhotos(prev => [...prev, ...newItems].slice(0, 12));
  };

  const removePhoto = (idx: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== idx));
  };

  const uploadPhotos = async (): Promise<string[]> => {
    if (!vendor) return [];
    setUploadingPhotos(true);
    const urls: string[] = [];
    for (const { file } of photos) {
      const ext = file.name.split('.').pop();
      const path = `${vendor.id}/photos/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('vendor-documents').upload(path, file, { upsert: true });
      if (!error) {
        const { data } = supabase.storage.from('vendor-documents').getPublicUrl(path);
        urls.push(data.publicUrl);
      }
    }
    setUploadingPhotos(false);
    return urls;
  };

  // ── Step 3: License upload ───────────────────────────────────────────────────
  const uploadLicense = async (): Promise<string> => {
    if (!licenseFile || !vendor) return '';
    setUploadingLicense(true);
    const ext = licenseFile.name.split('.').pop();
    const path = `${vendor.id}/license/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('vendor-documents').upload(path, licenseFile, { upsert: true });
    setUploadingLicense(false);
    if (error) return '';
    const { data } = supabase.storage.from('vendor-documents').getPublicUrl(path);
    return data.publicUrl;
  };

  // ── Final submit ─────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!agreedToTerms || !signatureName.trim()) {
      setError('Please agree to the terms and enter your full name as digital signature.');
      return;
    }
    if (!vendor) return;

    setSaving(true);
    setError('');

    try {
      const [photoUrls, licenseUrl] = await Promise.all([uploadPhotos(), uploadLicense()]);

      const res = await fetch('/api/vendor/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorId: vendor.id,
          businessName,
          ownerName,
          email,
          phone,
          address,
          city,
          state: stateVal,
          zip,
          photos: photoUrls,
          licenseUrl,
          roomTypes,
          signatureName,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Submission failed');

      await refreshVendor();
      router.replace('/vendor/dashboard');
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5DC] flex flex-col">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-ms-orange to-ms-orange-hover rounded-lg flex items-center justify-center shadow-sm">
            <Home className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">MicroStay</p>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Vendor Onboarding</p>
          </div>
        </div>
        <span className="text-xs text-gray-400 font-medium">Step {step} of 4</span>
      </header>

      <div className="flex-1 flex flex-col items-center justify-start py-10 px-4">
        <div className="w-full max-w-2xl">

          {/* Step Progress */}
          <div className="flex items-center justify-between mb-10 px-4">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center flex-1">
                <StepDot step={s} current={step} />
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 ${step > s.id ? 'bg-ms-orange' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">

            {/* ── Step 1: Property Info ──────────────────────────────────────── */}
            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Property Information</h2>
                  <p className="text-gray-500 text-sm mt-1">Tell us about your property. You can update this later from your dashboard.</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Property / Business Name *</label>
                    <input value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="e.g. Sunset Motel" className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-ms-orange" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Owner / Manager Name *</label>
                    <input value={ownerName} onChange={e => setOwnerName(e.target.value)} placeholder="Full name" className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-ms-orange" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Phone *</label>
                    <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 (555) 000-0000" className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-ms-orange" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Business Email *</label>
                    <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="you@property.com" className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-ms-orange" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Street Address *</label>
                    <input value={address} onChange={e => setAddress(e.target.value)} placeholder="123 Main St" className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-ms-orange" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">City *</label>
                    <input value={city} onChange={e => setCity(e.target.value)} placeholder="Miami" className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-ms-orange" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">State</label>
                      <input value={stateVal} onChange={e => setStateVal(e.target.value)} placeholder="FL" className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-ms-orange" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">ZIP</label>
                      <input value={zip} onChange={e => setZip(e.target.value)} placeholder="33101" className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-ms-orange" />
                    </div>

                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Total Rooms</label>
                    {/* <input value={rooms} onChange={e => setRooms(e.target.value)} placeholder="3" className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-ms-orange" readOnly /> */}
                    <input value={rooms} readOnly className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900" />
                  </div>
                  {/* <div className="col-span-2 mt-6">
                    <h3 className="font-bold text-lg mb-4">
                      Room Types
                    </h3>

                    {roomTypes.map((room, index) => (
                      <div
                        key={index}
                        className="border rounded-lg p-4 mb-4"
                      >
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

                          <div>
                            <label>Room Type</label>

                            <select
                              value={room.roomType}
                              onChange={(e) =>
                                updateRoomType(
                                  index,
                                  'roomType',
                                  e.target.value
                                )
                              }
                              className="w-full border rounded px-3 py-2"
                            >
                              <option value="">Select</option>
                              <option value="Standard">Standard</option>
                              <option value="Deluxe">Deluxe</option>
                              <option value="Suite">Suite</option>
                            </select>
                          </div>
                          <div>
                            <label>Bed Type</label>
                            <select
                              value={room.bedType}
                              onChange={(e) =>
                                updateRoomType(
                                  index,
                                  'bedType',
                                  e.target.value
                                )
                              }
                              className="w-full border rounded px-3 py-2"
                            >
                              <option value="">Select</option>
                              <option value="1 bed">1 Bed</option>
                              <option value="2 bed">2 Beds</option>
                              <option value="executive">Executive</option>
                            </select>
                          </div>
                          <div>
                            <label>Smoking Type</label>

                            <select
                              value={room.smokingType}
                              onChange={(e) =>
                                updateRoomType(
                                  index,
                                  'smokingType',
                                  e.target.value
                                )
                              }
                              className="w-full border rounded px-3 py-2"
                            >
                              <option value="non-smoking">
                                Non Smoking
                              </option>

                              <option value="smoking">
                                Smoking
                              </option>
                            </select>
                          </div>
                          <div>
                            <label>Quantity</label>

                            <input
                              type="number"
                              value={room.quantity}
                              onChange={(e) =>
                                updateRoomType(
                                  index,
                                  'quantity',
                                  Number(e.target.value)
                                )
                              }
                              className="w-full border rounded px-3 py-2"
                            />
                          </div>

                          <div>
                            <label>Price ($)</label>

                            <input
                              type="number"
                              value={room.price}
                              onChange={(e) =>
                                updateRoomType(
                                  index,
                                  'price',
                                  Number(e.target.value)
                                )
                              }
                              className="w-full border rounded px-3 py-2"
                            />
                          </div>
                          <div>
                            <select
                              value={room.slotLabel || ''}
                              onChange={(e) => {
                                const slot = e.target.value;

                                let startHour = 6;
                                let endHour = 12;

                                if (slot === 'Morning') {
                                  startHour = 6;
                                  endHour = 12;
                                } else if (slot === 'Afternoon') {
                                  startHour = 12;
                                  endHour = 18;
                                } else if (slot === 'Evening') {
                                  startHour = 18;
                                  endHour = 24;
                                }

                                const updated = [...roomTypes];
                                updated[index] = {
                                  ...updated[index],
                                  slotLabel: slot,
                                  startHour,
                                  endHour
                                };

                                setRoomTypes(updated);
                              }}
                            >
                              <option value="">Select Slot</option>
                              <option value="Morning">Morning (6 AM - 12 PM)</option>
                              <option value="Afternoon">Afternoon (12 PM - 6 PM)</option>
                              <option value="Evening">Evening (6 PM - 12 AM)</option>
                            </select>
                          </div>
                        </div>

                        {roomTypes.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeRoomType(index)}
                            className="text-red-500 mt-2"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={addRoomType}
                      className="bg-ms-orange text-white px-4 py-2 rounded"
                    >
                      + Add Room Type
                    </button>
                  </div> */}
                </div>
              </div>
            )}

            {/* ── Step 2: Photos ────────────────────────────────────────────── */}
            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Property Photos</h2>
                  <p className="text-gray-500 text-sm mt-1">Upload at least <strong>12 photos</strong> of your property. Good photos increase bookings significantly.</p>
                </div>
                <div
                  onClick={() => photoInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-ms-orange-border hover:bg-ms-orange-light/30 transition-all"
                >
                  <Upload className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-gray-500">Click to upload photos</p>
                  <p className="text-xs text-gray-400 mt-1">JPG, PNG — up to 10MB each</p>
                  <input ref={photoInputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => e.target.files && addPhotos(e.target.files)} />
                </div>
                {photos.length > 0 && (
                  <div className="grid grid-cols-3 gap-3">
                    {photos.map((p, i) => (
                      <div key={i} className="relative group rounded-xl overflow-hidden aspect-video bg-gray-100">
                        <img src={p.preview} alt="" className="w-full h-full object-cover" />
                        <button onClick={() => removePhoto(i)} className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <X className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className={`text-sm font-semibold ${photos.length >= 12 ? 'text-ms-teal' : 'text-amber-600'}`}>
                  {photos.length} / 12 minimum uploaded
                </div>
              </div>
            )}

            {/* ── Step 3: Business License ──────────────────────────────────── */}
            {step === 3 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Business License</h2>
                  <p className="text-gray-500 text-sm mt-1">Upload a copy of your business license or operating permit. Accepted formats: PDF, JPG, PNG.</p>
                </div>
                <div
                  onClick={() => licenseInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-200 rounded-xl p-10 text-center cursor-pointer hover:border-ms-orange-border hover:bg-ms-orange-light/30 transition-all"
                >
                  {licenseFile ? (
                    <div className="flex items-center gap-3 justify-center">
                      <FileText className="w-8 h-8 text-ms-orange" />
                      <div className="text-left">
                        <p className="text-sm font-semibold text-gray-900">{licenseFile.name}</p>
                        <p className="text-xs text-gray-400">{(licenseFile.size / 1024).toFixed(0)} KB</p>
                      </div>
                      <button onClick={e => { e.stopPropagation(); setLicenseFile(null); setLicenseName(''); }} className="ml-4 p-1 text-gray-400 hover:text-red-500 rounded-full">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm font-semibold text-gray-500">Click to upload business license</p>
                      <p className="text-xs text-gray-400 mt-1">PDF, JPG or PNG — max 10MB</p>
                    </>
                  )}
                  <input
                    ref={licenseInputRef}
                    type="file"
                    accept=".pdf,image/*"
                    className="hidden"
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) { setLicenseFile(f); setLicenseName(f.name); }
                    }}
                  />
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 font-medium">
                  ℹ️ Your license will be reviewed by our team. You can still submit without it and upload later.
                </div>
              </div>
            )}

            {/* ── Step 4: Agreement ─────────────────────────────────────────── */}
            {step === 4 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Partnership Agreement</h2>
                  <p className="text-gray-500 text-sm mt-1">Please review and sign the MicroStay partner agreement below.</p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 h-48 overflow-y-auto text-xs text-gray-600 leading-relaxed space-y-3">
                  <p className="font-bold text-gray-800">MicroStay Vendor Partnership Agreement</p>
                  <p>By signing this agreement, you agree to list your property on the MicroStay platform and comply with all platform policies, including but not limited to: maintaining accurate availability, honoring confirmed bookings, and maintaining property standards.</p>
                  <p>MicroStay charges a platform fee of <strong>12%</strong> of each booking's gross amount. Fees are deducted before payout to the vendor.</p>
                  <p>Vendors must maintain a cancellation rate below 30%. Accounts exceeding this threshold may be flagged, suspended, or removed from the platform.</p>
                  <p>MicroStay reserves the right to suspend accounts that violate platform policies, receive excessive negative reviews, or engage in fraudulent activity.</p>
                  <p>This agreement is effective from the date of signing and remains in force until terminated by either party with 30 days written notice.</p>
                </div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={agreedToTerms} onChange={e => setAgreedToTerms(e.target.checked)} className="mt-0.5 w-4 h-4 accent-ms-orange" />
                  <span className="text-sm text-gray-700">I have read and agree to the MicroStay Vendor Partnership Agreement and all platform policies.</span>
                </label>
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Digital Signature — Type your full legal name *</label>
                  <input
                    value={signatureName}
                    onChange={e => setSignatureName(e.target.value)}
                    placeholder="Your full legal name"
                    className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-ms-orange italic"
                    style={{ fontFamily: 'Georgia, serif' }}
                  />
                  <p className="text-[11px] text-gray-400 mt-1">This acts as your digital signature on the agreement above.</p>
                </div>
                {error && <p className="text-sm text-red-600 font-medium bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>}
              </div>
            )}

            {/* ── Navigation ────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
              <button
                onClick={() => setStep(s => s - 1)}
                disabled={step === 1}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>

              {step < 4 ? (
                <button
                  onClick={() => {
                    if (step === 1 && !step1Valid) { setError('Please fill in all required fields.'); return; }
                    if (step === 2 && photos.length < 12) { setError('Please upload at least 12 photos.'); return; }
                    setError('');
                    setStep(s => s + 1);
                  }}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-ms-orange hover:bg-ms-orange-hover text-white text-sm font-bold shadow-sm transition-colors"
                >
                  Continue <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={saving || !agreedToTerms || !signatureName.trim()}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-ms-orange hover:bg-ms-orange-hover text-white text-sm font-bold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Submitting...</>
                  ) : (
                    <><CheckCircle2 className="w-4 h-4" /> Submit for Approval</>
                  )}
                </button>
              )}
            </div>
            {error && step < 4 && <p className="text-sm text-red-500 mt-3 text-center">{error}</p>}
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            Need help? Email <a href="mailto:support@microstay.us" className="text-ms-orange font-semibold">support@microstay.us</a>
          </p>
        </div>
      </div>
    </div>
  );
}
