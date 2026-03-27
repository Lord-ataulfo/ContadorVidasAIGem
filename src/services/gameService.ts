import { collection, doc, setDoc, getDocs, query, orderBy, limit, serverTimestamp } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase.ts';
import { GameRecord } from '../types.ts';

export const saveGameRecord = async (record: Omit<GameRecord, 'id' | 'userId'>) => {
  const user = auth.currentUser;
  if (!user) return;

  const gameId = doc(collection(db, 'placeholder')).id;
  
  try {
    const fullRecord: GameRecord = {
      ...record,
      id: gameId,
      userId: user.uid,
    };

    // Save to the current user's history
    const primaryPath = `users/${user.uid}/history/${gameId}`;
    await setDoc(doc(db, primaryPath), fullRecord);

    // Save to all other registered participants' histories
    const otherParticipants = record.participantUids.filter(uid => uid !== user.uid);
    
    for (const participantUid of otherParticipants) {
      const participantPath = `users/${participantUid}/history/${gameId}`;
      await setDoc(doc(db, participantPath), {
        ...fullRecord,
        userId: participantUid, // Mark it as their record too
      });
    }

    return gameId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'history');
  }
};

export const getGameHistory = async (): Promise<GameRecord[]> => {
  const user = auth.currentUser;
  if (!user) return [];

  const path = `users/${user.uid}/history`;
  try {
    const q = query(collection(db, path), orderBy('endTime', 'desc'), limit(50));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data() as GameRecord);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return [];
  }
};
