import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { Redis } from "@upstash/redis";

// Initialize Redis
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!,
});

/**
 * GET /api/admin/security/blocks
 * Fetch all currently blocked IPs
 */
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAdmin(request);
    
    // Get all blocks from Redis list
    const blocks = await redis.lrange("blocks", 0, -1);
    
    // Parse and filter active blocks
    const activeBlocks = blocks
      .map((block: any) => JSON.parse(block as string))
      .filter((block: any) => {
        const now = Date.now();
        const expiresAt = block.timestamp + (block.duration * 1000);
        return now < expiresAt;
      });
    
    return NextResponse.json({
      success: true,
      blocks: activeBlocks,
      count: activeBlocks.length,
    });
  } catch (error: any) {
    console.error("Failed to fetch blocks:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || "Failed to fetch blocks" 
      },
      { status: error.status || 500 }
    );
  }
}

/**
 * DELETE /api/admin/security/blocks
 * Unblock an IP address
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await verifyAdmin(request);
    const { identifier } = await request.json();
    
    if (!identifier) {
      return NextResponse.json(
        { success: false, error: "Identifier required" },
        { status: 400 }
      );
    }
    
    // Remove from blocked set
    await redis.del(`blocked:${identifier}`);
    
    // Log the unblock action
    await redis.lpush("unblocks", JSON.stringify({
      identifier,
      adminId: user.uid,
      timestamp: Date.now(),
    }));
    
    return NextResponse.json({
      success: true,
      message: `Unblocked ${identifier}`,
    });
  } catch (error: any) {
    console.error("Failed to unblock IP:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || "Failed to unblock IP" 
      },
      { status: error.status || 500 }
    );
  }
}
