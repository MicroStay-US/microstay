import { NextRequest, NextResponse } from 'next/server';
import { requireVendor } from '@/lib/vendor-auth-server';
import { rateLimit, getIP, rateLimitResponse } from '@/lib/rate-limit';
import { isValidEmail, isValidPhone, isValidZip, isValidState, sanitizeString } from '@/lib/validation';

export async function POST(req: NextRequest) {
  // SECURITY: Only the authenticated vendor may modify their own record.
  // Previously this route was unauthenticated — any caller could overwrite
  // any vendor's profile by POSTing their vendorId. See audit C2.
  const auth = await requireVendor(req);
  if (auth.error) return auth.error;
  const supabase = auth.serviceClient;
  const authedVendor = auth.vendor;

  const ip = getIP(req);
  const { allowed, retryAfterMs } = rateLimit('vendor-onboarding:' + ip, 15, 5 * 60 * 1000);
  if (!allowed) return rateLimitResponse(retryAfterMs);

  try {
    const body = await req.json();
    const {
      vendorId,
      businessName,
      ownerName,
      email,
      phone,
      address,
      city,
      state,
      zip,
      photos,       // string[] — storage URLs
      licenseUrl,   // string — storage URL
       roomTypes,
      signatureName, // string — typed full name
    } = body;

    if (!vendorId) {
      return NextResponse.json({ error: 'vendorId required' }, { status: 400 });
    }
    if (!businessName || sanitizeString(businessName, 200).length < 2) {
      return NextResponse.json({ error: 'Business name is required' }, { status: 400 });
    }
    if (email && !isValidEmail(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }
    if (phone && !isValidPhone(phone)) {
      return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 });
    }
    if (zip && !isValidZip(zip)) {
      return NextResponse.json({ error: 'Invalid ZIP code' }, { status: 400 });
    }
    if (state && !isValidState(state)) {
      return NextResponse.json({ error: 'State must be a 2-letter abbreviation' }, { status: 400 });
    }

    // Caller must be the owner of the vendor record they're trying to update.
    if (vendorId !== authedVendor.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check email uniqueness (excluding this vendor's own record)
    const { data: existingEmail } = await supabase
      .from('vendors')
      .select('id')
      .eq('email', email)
      .neq('id', vendorId)
      .maybeSingle();

    if (existingEmail) {
      return NextResponse.json(
        { error: 'This email address is already registered with another motel account. Please use a different email.' },
        { status: 409 }
      );
    }

    // Check address uniqueness
    const { data: existingAddress } = await supabase
      .from('properties')
      .select('id')
      .eq('address', address)
      .eq('city', city)
      .eq('state', state)
      .eq('zip', zip)
      .maybeSingle();

    if (existingAddress) {
      return NextResponse.json(
        { error: 'A motel at this address is already registered on MicroStay. Each property must have a unique address.' },
        { status: 409 }
      );
    }

    // Update vendor record
    const { error: vendorErr } = await supabase
      .from('vendors')
      .update({
        business_name: businessName,
        owner_name: ownerName,
        email,
        phone,
        address,
        city,
        state,
        zip,
        onboarded_at: new Date().toISOString(),
        status: 'pending', // remains pending until admin approves
      })
      .eq('id', vendorId);

    if (vendorErr) throw vendorErr;

    // Create initial property
    const { data: property, error: propErr } = await supabase
      .from('properties')
      .insert({
        vendor_id: vendorId,
        name: businessName,
        address,
        city,
        state,
        zip,
        phone,
        email,
        photos: photos || [],
        status: 'active',
        total_rooms: 0,
        star_rating: 3,
        amenities: [],
      })
      .select()
      .single();

    if (propErr) throw propErr;
      const propertyId = property.id;

      if (roomTypes?.length) {
      for (const room of roomTypes) 
        {
        if (!room.roomType) {
          throw new Error('Please select Room Type');
        }

        if (!room.bedType) {
          throw new Error('Please select Bed Type');
        }

        if (!room.slotLabel) {
          throw new Error('Please select Slot');
        }
      }
        // for (const room of roomTypes) {
        //     if (
        //       room.startHour === undefined ||
        //       room.endHour === undefined
        //     ) {
        //       throw new Error(
        //         'Please select Start Hour and End Hour'
        //       );
        //     }

        //     const duration =
        //       Number(room.endHour) -
        //       Number(room.startHour);

        //     const actualDuration =
        //       duration > 0
        //         ? duration
        //         : (24 - Number(room.startHour)) +
        //           Number(room.endHour);

        //     if (actualDuration < 3) {
        //       throw new Error(
        //         `Duration must be at least 3 hours`
        //       );
        //     }
        //   }
        // Check duplicate slots
        const selectedSlots = new Set<string>();

        for (const room of roomTypes) {
          if (selectedSlots.has(room.slotLabel)) {
            return NextResponse.json(
              {
                error: `${room.slotLabel} has already been assigned to another room type.`,
              },
              { status: 400 }
            );
          }

          selectedSlots.add(room.slotLabel);
        }
          const SLOT_MAP = {
            "Morning Time": {
              start: 6,
              end: 12
            },
            "Afternoon Time": {
              start: 12,
              end: 18
            },
            "Evening Time": {
              start: 18,
              end: 24
            }
          };

          const slotRows = roomTypes.map(
            (room: any, index: number) => {

              const slot =
                SLOT_MAP[
                  room.slotLabel as keyof typeof SLOT_MAP
                ];

              if (!slot) {
                throw new Error(
                  `Please select a valid slot for ${room.roomType}`
                );
              }

              return {
                property_id: propertyId,

                slot_label: room.slotLabel,

                start_hour: slot.start,

                end_hour: slot.end,

                duration_hours: slot.end - slot.start,

                price_per_room: room.price,

                max_rooms: room.quantity,

                room_type: room.roomType,

                bed_type: room.bedType,

                smoking_type: room.smokingType,

                rooms_available: room.quantity,

                is_active: true,

                sort_order: index
              };
            }
          );
        const { error: slotErr } = await supabase
          .from('vd_time_slots')
          .insert(slotRows);

        // if (slotErr) throw slotErr;
        if (slotErr) {
          console.error('VD SLOT ERROR:', slotErr);
          return NextResponse.json(
            { error: slotErr.message },
            { status: 500 }
          );
        }
      }

    // Store agreement record if signature provided
    if (signatureName) {
      await supabase.from('vendor_agreements').upsert({
        vendor_id: vendorId,
        signed_at: new Date().toISOString(),
        signature_name: signatureName,
        license_url: licenseUrl || null,
        agreement_type: 'onboarding',
      }, { onConflict: 'vendor_id' });
      // silently ignore if vendor_agreements table doesn't exist yet
    }

    return NextResponse.json({ success: true, propertyId: property.id });
  } catch (err: any) {
    console.error('[vendor/onboarding]', err);
    return NextResponse.json({ error: 'Failed to save onboarding' }, { status: 500 });
  }
}
