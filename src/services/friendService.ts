import { collection, doc, setDoc, getDocs, query, where, limit, deleteDoc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase.ts';
import { Friend, UserProfile } from '../types.ts';

export const addFriendByCode = async (userCode: string) => {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');

  const usersPublicPath = 'users_public';
  try {
    // Find user by code
    const q = query(collection(db, usersPublicPath), where('userCode', '==', userCode), limit(1));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      throw new Error('User not found with this code');
    }

    const friendDoc = querySnapshot.docs[0];
    const friendData = friendDoc.data() as { uid: string; username: string; userCode: string };

    if (friendData.uid === user.uid) {
      throw new Error('You cannot add yourself as a friend');
    }

    const friend: Friend = {
      uid: user.uid,
      friendUid: friendData.uid,
      username: friendData.username,
      userCode: friendData.userCode,
      addedAt: new Date().toISOString(),
    };

    const path = `users/${user.uid}/friends/${friendData.uid}`;
    await setDoc(doc(db, path), friend);
    return friend;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, usersPublicPath);
  }
};

export const getFriends = async (): Promise<Friend[]> => {
  const user = auth.currentUser;
  if (!user) return [];

  const path = `users/${user.uid}/friends`;
  try {
    const querySnapshot = await getDocs(collection(db, path));
    return querySnapshot.docs.map(doc => doc.data() as Friend);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return [];
  }
};

export const removeFriend = async (friendUid: string) => {
  const user = auth.currentUser;
  if (!user) return;

  const path = `users/${user.uid}/friends/${friendUid}`;
  try {
    await deleteDoc(doc(db, path));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};
