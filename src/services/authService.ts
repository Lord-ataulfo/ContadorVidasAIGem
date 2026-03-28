import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithPopup,
  GoogleAuthProvider,
  signOut, 
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  runTransaction,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase.ts';
import { UserProfile } from '../types.ts';

const USERS_COLLECTION = 'users';
const USERNAMES_COLLECTION = 'usernames';
const USER_CODES_COLLECTION = 'userCodes';

// Generate a random 6-character alphanumeric code
const generateUserCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No O, 0, I, 1
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `#${code}`;
};

export const registerUser = async (email: string, password: string, username: string): Promise<UserProfile> => {
  try {
    // 1. Check if username is already taken (client-side check for better UX)
    const usernameDoc = await getDoc(doc(db, USERNAMES_COLLECTION, username.toLowerCase()));
    if (usernameDoc.exists()) {
      throw new Error('Username is already taken.');
    }

    // 2. Create Auth user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // 3. Generate unique user code
    let userCode = generateUserCode();
    let isCodeUnique = false;
    while (!isCodeUnique) {
      const codeDoc = await getDoc(doc(db, USER_CODES_COLLECTION, userCode));
      if (!codeDoc.exists()) {
        isCodeUnique = true;
      } else {
        userCode = generateUserCode();
      }
    }

    const userProfile: UserProfile = {
      uid: user.uid,
      username: username,
      email: email,
      userCode: userCode,
      createdAt: new Date().toISOString(),
      provider: 'email'
    };

    const userPublic = {
      uid: user.uid,
      username: username,
      userCode: userCode
    };

    // 4. Use a transaction to ensure atomicity and uniqueness
    await runTransaction(db, async (transaction) => {
      // Re-check username in transaction
      const usernameRef = doc(db, USERNAMES_COLLECTION, username.toLowerCase());
      const usernameSnap = await transaction.get(usernameRef);
      if (usernameSnap.exists()) {
        throw new Error('Username is already taken.');
      }

      // Re-check userCode in transaction
      const userCodeRef = doc(db, USER_CODES_COLLECTION, userCode);
      const userCodeSnap = await transaction.get(userCodeRef);
      if (userCodeSnap.exists()) {
        throw new Error('User code collision. Please try again.');
      }

      // Write all documents
      transaction.set(doc(db, USERS_COLLECTION, user.uid), userProfile);
      transaction.set(doc(db, 'users_public', user.uid), userPublic);
      transaction.set(usernameRef, { uid: user.uid });
      transaction.set(userCodeRef, { uid: user.uid });
    });

    return userProfile;
  } catch (error) {
    if (error instanceof Error && (error.message.includes('permission') || error.message.includes('offline'))) {
       handleFirestoreError(error, OperationType.WRITE, USERS_COLLECTION);
    }
    throw error;
  }
};

export const loginUser = async (email: string, password: string): Promise<UserProfile> => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;
  
  try {
    const userDoc = await getDoc(doc(db, USERS_COLLECTION, user.uid));
    if (!userDoc.exists()) {
      throw new Error('User profile not found.');
    }
    return userDoc.data() as UserProfile;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, USERS_COLLECTION);
    throw error;
  }
};

export const signInWithGoogle = async (): Promise<UserProfile> => {
  const provider = new GoogleAuthProvider();
  const userCredential = await signInWithPopup(auth, provider);
  const user = userCredential.user;

  try {
    const userDoc = await getDoc(doc(db, USERS_COLLECTION, user.uid));
    
    if (userDoc.exists()) {
      return userDoc.data() as UserProfile;
    }

    // New user from Google - need to create profile
    let baseUsername = user.displayName || `User_${user.uid.substring(0, 5)}`;
    if (baseUsername.length > 50) baseUsername = baseUsername.substring(0, 50);
    
    // Ensure unique username for Google users
    let finalUsername = baseUsername;
    let isUsernameUnique = false;
    let usernameAttempt = 0;
    
    while (!isUsernameUnique && usernameAttempt < 10) {
      const usernameRef = doc(db, USERNAMES_COLLECTION, finalUsername.toLowerCase());
      const usernameSnap = await getDoc(usernameRef);
      if (!usernameSnap.exists()) {
        isUsernameUnique = true;
      } else {
        usernameAttempt++;
        const suffix = Math.floor(Math.random() * 1000).toString();
        finalUsername = `${baseUsername.substring(0, 46)}${suffix}`;
      }
    }

    // Ensure unique user code
    let userCode = generateUserCode();
    let isCodeUnique = false;
    while (!isCodeUnique) {
      const codeDoc = await getDoc(doc(db, USER_CODES_COLLECTION, userCode));
      if (!codeDoc.exists()) {
        isCodeUnique = true;
      } else {
        userCode = generateUserCode();
      }
    }

    const userProfile: UserProfile = {
      uid: user.uid,
      username: finalUsername,
      email: user.email || '',
      userCode: userCode,
      createdAt: new Date().toISOString(),
      provider: 'google'
    };

    const userPublic = {
      uid: user.uid,
      username: finalUsername,
      userCode: userCode
    };

    // Use a transaction to ensure atomicity and uniqueness
    await runTransaction(db, async (transaction) => {
      const usernameRef = doc(db, USERNAMES_COLLECTION, finalUsername.toLowerCase());
      const userCodeRef = doc(db, USER_CODES_COLLECTION, userCode);
      
      // Re-check in transaction
      const usernameSnap = await transaction.get(usernameRef);
      if (usernameSnap.exists()) {
        throw new Error('Username collision during Google sign-in. Please try again.');
      }
      
      const userCodeSnap = await transaction.get(userCodeRef);
      if (userCodeSnap.exists()) {
        throw new Error('User code collision during Google sign-in. Please try again.');
      }

      transaction.set(doc(db, USERS_COLLECTION, user.uid), userProfile);
      transaction.set(doc(db, 'users_public', user.uid), userPublic);
      transaction.set(usernameRef, { uid: user.uid });
      transaction.set(userCodeRef, { uid: user.uid });
    });
    
    return userProfile;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, USERS_COLLECTION);
    throw error;
  }
};

export const logoutUser = async () => {
  await signOut(auth);
};

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  try {
    const userDoc = await getDoc(doc(db, USERS_COLLECTION, uid));
    if (userDoc.exists()) {
      return userDoc.data() as UserProfile;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, USERS_COLLECTION);
    throw error;
  }
};

export const getPublicProfile = async (uid: string): Promise<{ uid: string; username: string; userCode: string } | null> => {
  try {
    const userDoc = await getDoc(doc(db, 'users_public', uid));
    if (userDoc.exists()) {
      return userDoc.data() as { uid: string; username: string; userCode: string };
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'users_public');
    throw error;
  }
};

export const getUserByCode = async (userCode: string): Promise<{ uid: string; username: string; userCode: string } | null> => {
  try {
    // Ensure the code starts with # and is uppercase
    const formattedCode = userCode.startsWith('#') ? userCode.toUpperCase() : `#${userCode.toUpperCase()}`;
    const codeDoc = await getDoc(doc(db, USER_CODES_COLLECTION, formattedCode));
    
    if (codeDoc.exists()) {
      const uid = codeDoc.data().uid;
      return getPublicProfile(uid);
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, USER_CODES_COLLECTION);
    return null;
  }
};

export const subscribeToAuthChanges = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};
