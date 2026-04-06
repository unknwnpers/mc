export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

const PINCODE_CACHE_COLLECTION = "pincode_cache";
const CACHE_TTL_DAYS = 30; // Cache for 30 days

interface PincodeCache {
  pincode: string;
  district: string;
  state: string;
  offices: Array<{
    name: string;
    district: string;
    state: string;
    delivery: string;
  }>;
  cachedAt: Date;
}

/**
 * Validate Indian PIN code format
 * - 6 digits
 * - First digit 1-9 (not 0)
 * - No alphabets or special chars
 */
function isValidPincode(pincode: string): boolean {
  return /^[1-9][0-9]{5}$/.test(pincode);
}

/**
 * Check if cache is still valid
 */
function isCacheValid(cachedAt: Date): boolean {
  const now = new Date();
  const diffDays = (now.getTime() - cachedAt.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays < CACHE_TTL_DAYS;
}

/**
 * Get pincode data from cache
 */
async function getCachedPincode(pincode: string): Promise<PincodeCache | null> {
  try {
    const doc = await adminDb.collection(PINCODE_CACHE_COLLECTION).doc(pincode).get();
    if (!doc.exists) return null;
    
    const data = doc.data() as PincodeCache;
    if (!isCacheValid(data.cachedAt)) return null;
    
    return data;
  } catch (error) {
    console.error("Cache read error:", error);
    return null;
  }
}

/**
 * Save pincode data to cache
 */
async function saveToCache(pincode: string, data: Omit<PincodeCache, "cachedAt">): Promise<void> {
  try {
    await adminDb.collection(PINCODE_CACHE_COLLECTION).doc(pincode).set({
      ...data,
      cachedAt: new Date(),
    });
  } catch (error) {
    console.error("Cache write error:", error);
    // Non-critical: don't throw
  }
}

/**
 * Fetch from postal API with timeout
 */
async function fetchFromPostalAPI(pincode: string) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

  try {
    const res = await fetch(
      `https://api.postalpincode.in/pincode/${pincode}`,
      { 
        signal: controller.signal,
        cache: "no-store" // Don't use browser cache
      }
    );
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    return await res.json();
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      throw new Error("Request timeout");
    }
    throw error;
  }
}

// ── GET /api/pincode?pincode=673001 ──────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const pincode = searchParams.get("pincode");

    // Validation
    if (!pincode) {
      return NextResponse.json(
        { success: false, error: "Pincode is required" },
        { status: 400 }
      );
    }

    if (!isValidPincode(pincode)) {
      return NextResponse.json(
        { success: false, error: "Invalid pincode format. Must be 6 digits starting with 1-9" },
        { status: 400 }
      );
    }

    // Check cache first
    const cached = await getCachedPincode(pincode);
    if (cached) {
      return NextResponse.json({
        success: true,
        data: {
          pincode: cached.pincode,
          district: cached.district,
          state: cached.state,
          offices: cached.offices,
        },
        cached: true,
      });
    }

    // Fetch from postal API
    const data = await fetchFromPostalAPI(pincode);

    // Check API response structure
    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json(
        { success: false, error: "Invalid response from postal API" },
        { status: 500 }
      );
    }

    const result = data[0];

    if (result.Status === "Error" || !result.PostOffice || result.PostOffice.length === 0) {
      return NextResponse.json(
        { success: false, error: "No records found for this pincode" },
        { status: 404 }
      );
    }

    // Clean and structure the response
    const offices = result.PostOffice.map((po: any) => ({
      name: po.Name,
      district: po.District,
      state: po.State,
      delivery: po.DeliveryStatus,
    }));

    // Use first office with delivery status as primary, or just first office
    const primaryOffice = offices.find((o: any) => o.delivery === "Delivery") || offices[0];

    const responseData = {
      pincode,
      district: primaryOffice.district,
      state: primaryOffice.state,
      offices,
    };

    // Save to cache (non-blocking)
    await saveToCache(pincode, responseData);

    return NextResponse.json({
      success: true,
      data: responseData,
      cached: false,
    });

  } catch (error: any) {
    console.error("Pincode API error:", error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || "Failed to fetch pincode data" 
      },
      { status: 500 }
    );
  }
}
