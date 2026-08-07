'use client';

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export default function LivePropertyPage() {

    const params = useParams();

    const propertyId = params.id as string;

    const [property,setProperty] = useState<any>(null);
    const [bookings,setBookings] = useState<any[]>([]);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const sidebarRef = useRef<HTMLDivElement>(null);

    useEffect(()=>{

        loadProperty();

    },[]);

    // Close sidebar when clicking outside of it
    useEffect(() => {
        if (!sidebarOpen) return;

        function handleClickOutside(e: MouseEvent) {
            if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
                setSidebarOpen(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [sidebarOpen]);

    async function loadProperty(){

        //------------------------------------------------
        // Property
        //------------------------------------------------

        const { data:propertyData } = await supabase
        .from("properties")
        .select(`
            *,
            vendor:vendors(*)
        `)
        .eq("id",propertyId)
        .single();

        setProperty(propertyData);

        //------------------------------------------------
        // Last Month Bookings
        //------------------------------------------------

        const start=new Date();

        start.setMonth(start.getMonth()-1);

        const { data:bookingData } = await supabase
        .from("vd_bookings")
        .select("*")
        .eq("property_id",propertyId)
        .eq("status","checked_in")
        .gte("booking_date",start.toISOString());

        setBookings(bookingData || []);
    }

    if(!property){

        return (
        <>
        <div>Property Not Found</div>
        </>
        )

    }

    const gross=bookings.reduce(
        (s,b)=>s+ Number(b.gross_amount),
        0
    );

    const bookingsCount=bookings.length;

    const commission=gross*0.12;

    const totalDue=commission;

    return(

        <>

        {/* Sidebar overlay — clicking this closes the sidebar */}
        {sidebarOpen && (
            <div
                className="fixed inset-0 z-40 bg-black/40 lg:hidden"
                aria-hidden="true"
                onClick={() => setSidebarOpen(false)}
            />
        )}

        {/* Sidebar */}
        <div
            ref={sidebarRef}
            className={`fixed left-0 top-0 h-full z-50 transition-transform duration-300 lg:hidden ${
                sidebarOpen ? "translate-x-0" : "-translate-x-full"
            }`}
        >
            <AdminSidebar
                activeTab=""
                onTabChange={() => setSidebarOpen(false)}
                pendingCount={0}
            />
        </div>

        

        <div className="max-w-7xl mx-auto p-10">

            <h1 className="text-4xl font-bold">
                {property.name}
            </h1>

            <p>
                {property.city},
                {property.state}
            </p>

            <hr className="my-6"/>

            <h2 className="text-2xl font-bold">
                Last 30 Days
            </h2>

            <div className="grid grid-cols-4 gap-5 mt-5">

                <div>

                    <h3>Gross</h3>

                    <p>${gross.toFixed(2)}</p>

                </div>

                <div>

                    <h3>Bookings</h3>

                    <p>{bookingsCount}</p>

                </div>

                <div>

                    <h3>Commission</h3>

                    <p>${commission.toFixed(2)}</p>

                </div>

                <div>

                    <h3>Total Due</h3>

                    <p>${totalDue.toFixed(2)}</p>

                </div>

            </div>

        </div>
        </>

    )

}