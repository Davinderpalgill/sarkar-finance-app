import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Alert, Linking, Image, Modal,
  Dimensions,
} from 'react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, useFocusEffect } from '@react-navigation/native';
import { RentStackParamList } from '../../navigation/types/navigation';
import { useRentStore } from '../../store/rentStore';
import { RentRecord } from '../../models/RentRecord';
import { RentTenant, TenantDocument, TenantDocType } from '../../models/RentTenant';
import { RentRepository } from '../../storage/repositories/RentRepository';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';

const DOC_LABELS: Record<TenantDocType, string> = {
  aadhaar:   'Aadhaar Card',
  photo:     'Tenant Photo',
  agreement: 'Rent Agreement',
};
const DOC_ICONS: Record<TenantDocType, string> = {
  aadhaar:   'credit-card',
  photo:     'person',
  agreement: 'description',
};

type Props = {
  navigation: NativeStackNavigationProp<RentStackParamList, 'TenantDetail'>;
  route: RouteProp<RentStackParamList, 'TenantDetail'>;
};

function formatRupees(paise: number): string {
  return '₹' + (paise / 100).toLocaleString('en-IN');
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const STATUS_COLOR: Record<string, string> = {
  paid: '#00C896', partial: '#FFA502', pending: '#6B6B6B', overdue: '#FF4757',
};

export default function TenantDetailScreen({ navigation, route }: Props) {
  const { tenantId } = route.params;
  const { units, tenants, removeTenant, returnDeposit } = useRentStore();
  const [tenant, setTenant] = useState<RentTenant | null>(null);
  const [records, setRecords] = useState<RentRecord[]>([]);
  const [previewUri, setPreviewUri] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [t, r] = await Promise.all([
        RentRepository.getTenantById(tenantId),
        RentRepository.getRentRecords(tenantId),
      ]);
      setTenant(t);
      setRecords(r);
    } catch (e) {
      console.warn('TenantDetailScreen load error', e);
    }
  }, [tenantId]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const leaseExpiryDays = tenant?.leaseEnd
    ? Math.ceil((tenant.leaseEnd - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  const leaseExpiring = leaseExpiryDays !== null && leaseExpiryDays >= 0 && leaseExpiryDays <= 45;
  const leaseExpired = leaseExpiryDays !== null && leaseExpiryDays < 0;

  const unit = units.find(u => u.id === tenant?.unitId);

  const sendWhatsApp = () => {
    if (!tenant) return;
    const phone = tenant.whatsappNumber || tenant.phone;
    const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
    const unitNum = unit?.unitNumber ?? '';
    const amount = formatRupees(tenant.monthlyRent);
    const msg = `Hi ${tenant.name}, your rent of ${amount} for ${currentMonth} (Unit ${unitNum}) is due. Please pay by ${tenant.dueDay}th. Thank you.`;
    const url = `whatsapp://send?phone=91${phone}&text=${encodeURIComponent(msg)}`;
    Linking.openURL(url).catch(() =>
      Linking.openURL(`https://wa.me/91${phone}?text=${encodeURIComponent(msg)}`)
    );
  };

  const handleRemove = () => {
    Alert.alert(
      'Remove Tenant',
      `Remove ${tenant?.name}? The unit will be marked vacant. Rent history is preserved.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove', style: 'destructive',
          onPress: async () => {
            await removeTenant(tenantId);
            navigation.goBack();
          },
        },
      ]
    );
  };

  const pickAndSaveDocument = async (type: TenantDocType, source: 'camera' | 'library') => {
    try {
      // includeBase64 so we store the image data directly — temp file URIs get
      // cleaned up by iOS and won't load after the app restarts.
      const opts = {
        mediaType: 'photo' as const,
        quality: 0.7 as const,
        maxWidth: 1200,
        maxHeight: 1200,
        includeBase64: true,
      };
      const res = source === 'camera'
        ? await launchCamera(opts)
        : await launchImageLibrary(opts);
      if (res.didCancel) return;
      if (res.errorCode) {
        Alert.alert('Error', res.errorMessage ?? `Could not open ${source}`);
        return;
      }
      const asset = res.assets?.[0];
      if (!asset) return;
      // Build a persistent data URI from base64 (falls back to file URI if no base64)
      const dataUri = asset.base64
        ? `data:image/jpeg;base64,${asset.base64}`
        : asset.uri ?? '';
      if (!dataUri) return;
      const doc: TenantDocument = { type, uri: dataUri, name: asset.fileName ?? type };
      const newDocs = [...(tenant?.documents ?? []), doc];
      await RentRepository.updateTenantDocuments(tenantId, newDocs);
      setTenant(prev => prev ? { ...prev, documents: newDocs } : prev);
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to pick document');
    }
  };

  const addDocument = (type: TenantDocType) => {
    Alert.alert(
      DOC_LABELS[type],
      'Choose source',
      [
        { text: 'Camera',       onPress: () => pickAndSaveDocument(type, 'camera') },
        { text: 'Photo Library', onPress: () => pickAndSaveDocument(type, 'library') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const deleteDocument = (index: number) => {
    Alert.alert('Remove Document', 'Remove this document?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          const newDocs = tenant!.documents.filter((_, i) => i !== index);
          await RentRepository.updateTenantDocuments(tenantId, newDocs);
          setTenant(prev => prev ? { ...prev, documents: newDocs } : prev);
        },
      },
    ]);
  };

  if (!tenant) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Tenant</Text>
          <TouchableOpacity onPress={() => navigation.popToTop()}>
            <MaterialIcons name="home" size={22} color="#4B4B4B" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Tenant Detail</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <TouchableOpacity onPress={() => navigation.popToTop()}>
            <MaterialIcons name="home" size={22} color="#4B4B4B" />
          </TouchableOpacity>
          {tenant.status === 'active' && (
            <TouchableOpacity onPress={() => navigation.navigate('EditTenant', { tenantId })}>
              <MaterialIcons name="edit" size={22} color="#8257E6" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Lease Expiry Alert */}
        {(leaseExpiring || leaseExpired) && (
          <View style={[styles.alertBanner, { backgroundColor: leaseExpired ? '#FF475722' : '#FFA50222', borderColor: leaseExpired ? '#FF4757' : '#FFA502' }]}>
            <MaterialIcons name="event-busy" size={16} color={leaseExpired ? '#FF4757' : '#FFA502'} />
            <Text style={[styles.alertText, { color: leaseExpired ? '#FF4757' : '#FFA502' }]}>
              {leaseExpired
                ? `Lease expired ${Math.abs(leaseExpiryDays!)} day${Math.abs(leaseExpiryDays!) !== 1 ? 's' : ''} ago`
                : `Lease expires in ${leaseExpiryDays} day${leaseExpiryDays !== 1 ? 's' : ''}`}
            </Text>
          </View>
        )}

        {/* Tenant Profile */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{tenant.name.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.tenantName}>{tenant.name}</Text>
          {unit && <Text style={styles.tenantUnit}>Unit {unit.unitNumber}</Text>}
          <Text style={styles.tenantPhone}>{tenant.phone}</Text>
          {tenant.status === 'inactive' && (
            <View style={styles.inactiveBadge}>
              <Text style={styles.inactiveBadgeText}>Past Tenant</Text>
            </View>
          )}
        </View>

        {/* Info rows */}
        <View style={styles.infoCard}>
          <InfoRow icon="payments" label="Monthly Rent" value={formatRupees(tenant.monthlyRent)} />
          <InfoRow icon="event" label="Due Day" value={`${tenant.dueDay}th of each month`} />
          {tenant.escalationRate > 0 && (
            <InfoRow icon="trending-up" label="Annual Escalation" value={`${tenant.escalationRate}%`} />
          )}
          <InfoRow icon="date-range" label="Lease Start" value={formatDate(tenant.leaseStart)} />
          {tenant.leaseEnd && <InfoRow icon="event-busy" label="Lease End" value={formatDate(tenant.leaseEnd)} />}
        </View>

        {/* Security Deposit */}
        {unit && unit.securityDeposit > 0 && (
          <View style={styles.depositCard}>
            <View style={styles.depositHeader}>
              <MaterialIcons name="shield" size={16} color="#8257E6" />
              <Text style={styles.depositTitle}>Security Deposit</Text>
              <Text style={styles.depositAmount}>{formatRupees(unit.securityDeposit)}</Text>
            </View>
            {tenant.depositReturned ? (
              <View style={styles.depositReturned}>
                <MaterialIcons name="check-circle" size={14} color="#00C896" />
                <Text style={styles.depositReturnedText}>Deposit Returned</Text>
              </View>
            ) : tenant.status === 'inactive' ? (
              <TouchableOpacity
                style={styles.returnDepositBtn}
                onPress={() => {
                  Alert.alert('Return Deposit', `Mark ₹${(unit.securityDeposit / 100).toLocaleString('en-IN')} as returned?`, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Mark Returned', onPress: async () => {
                        try {
                          await returnDeposit(tenantId);
                          loadData();
                        } catch (e) {
                          console.warn('returnDeposit error', e);
                        }
                    }},
                  ]);
                }}
              >
                <Text style={styles.returnDepositText}>Mark as Returned</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.depositPending}>Held (refundable on exit)</Text>
            )}
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.whatsappBtn} onPress={sendWhatsApp}>
            <MaterialIcons name="chat" size={18} color="#FFF" />
            <Text style={styles.whatsappText}>WhatsApp Reminder</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.statementBtn}
            onPress={() => navigation.navigate('TenantStatement', { tenantId })}
          >
            <MaterialIcons name="receipt-long" size={18} color="#8257E6" />
            <Text style={styles.statementText}>Statement</Text>
          </TouchableOpacity>
        </View>

        {/* Documents */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Documents</Text>
          {(tenant.documents ?? []).map((doc, i) => (
            <TouchableOpacity
              key={i}
              style={styles.docCard}
              onPress={() => setPreviewUri(doc.uri)}
              onLongPress={() => deleteDocument(i)}
              activeOpacity={0.7}
            >
              <Image source={{ uri: doc.uri }} style={styles.docThumb} resizeMode="cover" />
              <View style={{ flex: 1 }}>
                <Text style={styles.docType}>{DOC_LABELS[doc.type]}</Text>
                <Text style={styles.docName} numberOfLines={1}>{doc.name}</Text>
                <Text style={styles.docHint}>Tap to view · Long-press to delete</Text>
              </View>
            </TouchableOpacity>
          ))}
          <View style={styles.addDocRow}>
            {(['aadhaar', 'photo', 'agreement'] as TenantDocType[]).map(type => (
              <TouchableOpacity key={type} style={styles.addDocBtn} onPress={() => addDocument(type)}>
                <MaterialIcons name={DOC_ICONS[type] as any} size={14} color="#8257E6" />
                <Text style={styles.addDocText}>{DOC_LABELS[type]}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Rent History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rent History</Text>
          {records.length === 0 && <Text style={styles.empty}>No records yet.</Text>}
          {records.map(r => (
            <TouchableOpacity
              key={r.id}
              style={styles.recordCard}
              onPress={() => navigation.navigate('RecordRent', { recordId: r.id, tenantId: r.tenantId })}
              activeOpacity={0.7}
            >
              <View>
                <Text style={styles.recordMonth}>{r.month}</Text>
                <Text style={styles.recordDue}>Due: {formatRupees(r.amountDue)}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <View style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[r.status] + '22' }]}>
                  <Text style={[styles.statusText, { color: STATUS_COLOR[r.status] }]}>{r.status}</Text>
                </View>
                {r.amountPaid > 0 && <Text style={styles.recordPaid}>Paid: {formatRupees(r.amountPaid)}</Text>}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {tenant.status === 'active' && (
          <TouchableOpacity style={styles.removeBtn} onPress={handleRemove}>
            <MaterialIcons name="person-remove" size={18} color="#FF4757" />
            <Text style={styles.removeBtnText}>Remove Tenant</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Full-screen image preview modal */}
      <Modal visible={!!previewUri} transparent animationType="fade" onRequestClose={() => setPreviewUri(null)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalClose} onPress={() => setPreviewUri(null)}>
            <MaterialIcons name="close" size={28} color="#FFF" />
          </TouchableOpacity>
          {previewUri && (
            <Image
              source={{ uri: previewUri }}
              style={styles.modalImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 }}>
      <MaterialIcons name={icon as any} size={18} color="#6B6B6B" />
      <Text style={{ flex: 1, fontSize: 14, color: '#6B6B6B' }}>{label}</Text>
      <Text style={{ fontSize: 14, fontWeight: '600', color: '#FFFFFF' }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container:           { flex: 1, backgroundColor: '#0D0D0D' },
  header:              { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 8 },
  title:               { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  content:             { padding: 16, gap: 16, paddingBottom: 60 },
  alertBanner:         { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, padding: 12, borderWidth: 1 },
  alertText:           { fontSize: 13, fontWeight: '600', flex: 1 },
  profileCard:         { backgroundColor: '#1A1A1A', borderRadius: 16, padding: 20, alignItems: 'center', gap: 6 },
  avatar:              { width: 64, height: 64, borderRadius: 32, backgroundColor: '#8257E6', alignItems: 'center', justifyContent: 'center' },
  avatarText:          { fontSize: 28, fontWeight: '800', color: '#FFF' },
  tenantName:          { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  tenantUnit:          { fontSize: 14, color: '#8257E6', fontWeight: '600' },
  tenantPhone:         { fontSize: 14, color: '#6B6B6B' },
  inactiveBadge:       { backgroundColor: '#2C2C2C', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  inactiveBadgeText:   { fontSize: 12, color: '#6B6B6B', fontWeight: '600' },
  infoCard:            { backgroundColor: '#1A1A1A', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 4 },
  depositCard:         { backgroundColor: '#1A1A1A', borderRadius: 16, padding: 16, gap: 10 },
  depositHeader:       { flexDirection: 'row', alignItems: 'center', gap: 8 },
  depositTitle:        { flex: 1, fontSize: 14, color: '#8257E6', fontWeight: '600' },
  depositAmount:       { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  depositReturned:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  depositReturnedText: { fontSize: 13, color: '#00C896', fontWeight: '600' },
  depositPending:      { fontSize: 12, color: '#6B6B6B' },
  returnDepositBtn:    { backgroundColor: '#8257E622', borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#8257E644' },
  returnDepositText:   { fontSize: 13, color: '#8257E6', fontWeight: '700' },
  actionsRow:          { flexDirection: 'row', gap: 10 },
  whatsappBtn:         { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#25D366', borderRadius: 14, padding: 14 },
  whatsappText:        { fontSize: 15, fontWeight: '700', color: '#FFF' },
  statementBtn:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#8257E622', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#8257E644' },
  statementText:       { fontSize: 15, fontWeight: '700', color: '#8257E6' },
  section:      { gap: 8 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#6B6B6B', textTransform: 'uppercase', letterSpacing: 1, paddingHorizontal: 4 },
  recordCard:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1A1A1A', borderRadius: 12, padding: 14 },
  recordMonth:  { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  recordDue:    { fontSize: 12, color: '#6B6B6B', marginTop: 2 },
  recordPaid:   { fontSize: 12, color: '#00C896', marginTop: 4 },
  statusBadge:  { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText:   { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  removeBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FF475722', borderRadius: 14, padding: 14 },
  removeBtnText:{ fontSize: 15, fontWeight: '700', color: '#FF4757' },
  empty:        { textAlign: 'center', color: '#4B4B4B', paddingTop: 20, fontSize: 14 },
  docCard:      { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#1A1A1A', borderRadius: 12, padding: 10, marginBottom: 8 },
  docThumb:     { width: 60, height: 60, borderRadius: 8, backgroundColor: '#2C2C2C' },
  docType:      { fontSize: 13, fontWeight: '600', color: '#FFFFFF' },
  docName:      { fontSize: 11, color: '#6B6B6B', marginTop: 2 },
  docHint:      { fontSize: 10, color: '#4B4B4B', marginTop: 2 },
  addDocRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  addDocBtn:    { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#8257E622', borderRadius: 8, borderWidth: 1, borderColor: '#8257E644', paddingHorizontal: 10, paddingVertical: 6 },
  addDocText:   { fontSize: 12, color: '#8257E6', fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  modalClose:   { position: 'absolute', top: 56, right: 20, zIndex: 10, padding: 8 },
  modalImage:   { width: SCREEN_WIDTH, height: SCREEN_WIDTH * 1.3 },
});
