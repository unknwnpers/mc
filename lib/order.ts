import { db } from "@/lib/firebase";
import { addDoc, collection, serverTimestamp, doc, getDoc } from "firebase/firestore";

export async function createOrder(
    userId: string, 
    cart: any[]
) {
    // 1. Fetch latest user profile
    const userSnap = await getDoc(doc(db, "users", userId));
    const userData = userSnap.data();

    // 2. Strict validation (check for structured address fields)
    if (!userData?.addressLine1 || !userData?.city || !userData?.pincode || !userData?.phone || !userData?.name) {
        throw new Error("Incomplete profile - please add delivery address");
    }

    // 3. Calculate total
    const total = cart.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
    );

    // 4. Clean Items Structure
    const cleanedItems = cart.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        image: item.image,
        quantity: item.quantity
    }));

    // 5. Create Order with structured address
    const orderRef = await addDoc(collection(db, "orders"), {
        userId,
        userName: userData.name || "Customer",
        shippingAddress: `${userData.addressLine1}${userData.addressLine2 ? ', ' + userData.addressLine2 : ''}${userData.landmark ? ', Near ' + userData.landmark : ''}`,
        city: userData.city,
        state: userData.state || "Kerala",
        pincode: userData.pincode,
        phone: userData.phone,
        items: cleanedItems,
        total,
        status: "created",
        payment: "pending",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });

    return orderRef.id;
}