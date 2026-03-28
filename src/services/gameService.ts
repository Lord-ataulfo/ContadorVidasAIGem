import { collection, doc, setDoc, getDocs, query, orderBy, limit, onSnapshot, deleteDoc, where } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase.ts';
import { GameRecord, ActiveGame } from '../types.ts';

export const createActiveGame = async (game: ActiveGame) => {
  try {
    await setDoc(doc(db, 'active_games', game.id), game);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `active_games/${game.id}`);
  }
};

export const updateActiveGame = async (gameId: string, updates: Partial<ActiveGame>) => {
  try {
    await setDoc(doc(db, 'active_games', gameId), { ...updates, lastUpdated: Date.now() }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `active_games/${gameId}`);
  }
};

export const listenToActiveGame = (gameId: string, callback: (game: ActiveGame | null) => void) => {
  return onSnapshot(doc(db, 'active_games', gameId), (doc) => {
    if (doc.exists()) {
      callback(doc.data() as ActiveGame);
    } else {
      callback(null);
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, `active_games/${gameId}`);
  });
};

export const listenForInvites = (uid: string, callback: (games: ActiveGame[]) => void) => {
  const q = query(
    collection(db, 'active_games'),
    where('participantUids', 'array-contains', uid),
    where('isGameOver', '==', false)
  );
  
  return onSnapshot(q, (snapshot) => {
    const games = snapshot.docs.map(doc => doc.data() as ActiveGame);
    callback(games);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, 'active_games_invites');
  });
};

export const deleteActiveGame = async (gameId: string) => {
  try {
    await deleteDoc(doc(db, 'active_games', gameId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `active_games/${gameId}`);
  }
};

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
