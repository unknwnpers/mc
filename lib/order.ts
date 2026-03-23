import { db } from "@/lib/firebase";
import { addDoc, collection, serverTimestamp, doc, getDoc } from "firebase/firestore";

export async function createOrder(
    userId: string, 
    cart: any[]
) {
    // 1. Fetch latest user profile
    const userSnap = await getDoc(doc(db, "users", userId));
    const userData = userSnap.data();

    // 2. Strict validation
    if (!userData?.address || !userData?.phone || !userData?.name) {
        throw new Error("Incomplete profile");
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

    // 5. Create Order
    const orderRef = await addDoc(collection(db, "orders"), {
        userId,
        userName: userData.name || "Customer",
        address: userData.address,
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