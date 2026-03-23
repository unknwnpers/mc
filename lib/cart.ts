import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';

export async function addToCart(userId: string, productId: string) {
    const cartRef = collection(db, 'users', userId, 'cart');

    // Check if already exists
    const q = query(cartRef, where('productId', '==', productId));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
        const item = snapshot.docs[0];
        await updateDoc(doc(db, 'users', userId, 'cart', item.id), {
            quantity: item.data().quantity + 1,
        });
    } else {
        await addDoc(cartRef, {
            productId,
            quantity: 1,
        });
    }
}