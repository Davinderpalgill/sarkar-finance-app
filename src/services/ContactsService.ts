import Contacts from 'react-native-contacts';

export interface ContactEntry {
  name: string;
  phone: string | null;
}

export async function getAllContacts(): Promise<ContactEntry[]> {
  const contacts = await Contacts.getAll();
  return contacts.map(c => ({
    name: [c.givenName, c.familyName].filter(Boolean).join(' '),
    phone: c.phoneNumbers?.[0]?.number ?? null,
  }));
}

export async function searchContacts(query: string): Promise<ContactEntry[]> {
  const contacts = await Contacts.getContactsMatchingString(query);
  return contacts.map(c => ({
    name: [c.givenName, c.familyName].filter(Boolean).join(' '),
    phone: c.phoneNumbers?.[0]?.number ?? null,
  }));
}
