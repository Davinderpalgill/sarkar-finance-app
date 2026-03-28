import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';

export type AuthUser = FirebaseAuthTypes.User;

export async function signUpWithEmail(email: string, password: string): Promise<AuthUser> {
  const credential = await auth().createUserWithEmailAndPassword(email, password);
  return credential.user;
}

export async function signInWithEmail(email: string, password: string): Promise<AuthUser> {
  const credential = await auth().signInWithEmailAndPassword(email, password);
  return credential.user;
}

export async function sendPasswordReset(email: string): Promise<void> {
  await auth().sendPasswordResetEmail(email);
}

export async function sendSignInLink(email: string): Promise<void> {
  await auth().sendSignInLinkToEmail(email, {
    url: 'https://financeapp-789e4.firebaseapp.com/finishSignIn',
    handleCodeInApp: true,
    iOS: { bundleId: 'com.davindergill.financetracker' },
  });
}

export function isSignInLink(link: string): boolean {
  return auth().isSignInWithEmailLink(link);
}

export async function signInWithLink(email: string, link: string): Promise<AuthUser> {
  const credential = await auth().signInWithEmailLink(email, link);
  return credential.user;
}

export async function signOut(): Promise<void> {
  await auth().signOut();
}

export async function updateUserEmail(newEmail: string): Promise<void> {
  const user = auth().currentUser;
  if (!user) throw new Error('No user signed in');
  await user.verifyBeforeUpdateEmail(newEmail);
}

export async function reauthenticateWithPassword(password: string): Promise<void> {
  const user = auth().currentUser;
  if (!user || !user.email) throw new Error('No user signed in');
  const credential = auth.EmailAuthProvider.credential(user.email, password);
  await user.reauthenticateWithCredential(credential);
}

export function getCurrentUser(): AuthUser | null {
  return auth().currentUser;
}

export async function reloadUser(): Promise<void> {
  await auth().currentUser?.reload();
}

export function onAuthStateChanged(
  callback: (user: AuthUser | null) => void
): () => void {
  return auth().onAuthStateChanged(callback);
}
