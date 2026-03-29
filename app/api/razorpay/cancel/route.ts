import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc,
  serverTimestamp 
} from "firebase/firestore";
import { releaseReservations } from "@/lib/inventory";

export async function POST(req: Request) {
  try {
    const { reservationIds, razorpayOrderId } = await req.json();

    if (!reservationIds || reservationIds.length === 0) {
      return NextResponse.json({ error: "No reservations to release" }, { status: 400 });
    }

    // 1. Release Stock Reservations
    await releaseReservations(reservationIds);

    // 2. Update Order Status to failed if it exists
    if (razorpayOrderId) {
      const q = query(collection(db, "orders"), where("razorpayOrderId", "==", razorpayOrderId));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const orderDoc = snapshot.docs[0];
        const orderData = orderDoc.data();
        
        // Only update if not already paid/completed
        if (orderData.status === "pending_payment") {
          await updateDoc(doc(db, "orders", orderDoc.id), {
            status: "failed",
            updatedAt: serverTimestamp(),
          });
        }
      }
    }

    return NextResponse.json({ success: true, message: "Reservations released" });

  } catch (error: any) {
    console.error("Manual Release Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
