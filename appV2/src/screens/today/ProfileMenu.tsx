import React, { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, Icon } from '@/components';
import { useAuth } from '@/auth';
import {
  disableNotifications,
  enableNotifications,
  getNotificationsOptIn,
} from '@/data/notifications';
import { accent, border, font, fontSize, radius, shadow, status, surface, text, tint } from '@/theme';

/**
 * Profile dropdown shown when the top-right avatar is tapped: account header +
 * a destructive "Sign out" item that confirms before signing out. Rendered in a
 * Modal with a tap-out scrim; anchored top-right under the status bar.
 */
export function ProfileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { session, signOut } = useAuth();
  const [notifOn, setNotifOn] = useState(false);
  const [notifBusy, setNotifBusy] = useState(false);

  useEffect(() => {
    if (open) void getNotificationsOptIn().then(setNotifOn);
  }, [open]);

  const toggleNotifications = async (next: boolean) => {
    setNotifBusy(true);
    try {
      if (next) {
        const ok = await enableNotifications();
        setNotifOn(ok);
        if (!ok) {
          onClose();
          setTimeout(
            () =>
              Alert.alert(
                'Notifications unavailable',
                'Enable notification permission for FitVibe (a dev/standalone build on a physical device is required).',
              ),
            250,
          );
        }
      } else {
        await disableNotifications();
        setNotifOn(false);
      }
    } finally {
      setNotifBusy(false);
    }
  };

  const confirmSignOut = () => {
    // Close the menu FIRST, then show the alert — an Alert fired while this
    // Modal is still open is rendered behind it / has its taps swallowed on
    // Android, so the confirm button appears to "do nothing".
    onClose();
    setTimeout(() => {
      Alert.alert('Sign out?', "You'll need to sign in with Google again to use FitVibe.", [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign out', style: 'destructive', onPress: () => void signOut() },
      ]);
    }, 250);
  };

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      {/* Tap-out scrim */}
      <Pressable style={styles.scrim} onPress={onClose}>
        {/* Menu card; stopPropagation so taps inside don't dismiss. */}
        <Pressable style={[styles.card, { top: insets.top + 56 }]} onPress={() => {}}>
          <View style={styles.account}>
            <Avatar name={session?.displayName || ''} src={session?.picture || undefined} size={40} />
            <View style={styles.who}>
              <Text style={styles.name} numberOfLines={1}>
                {session?.displayName || 'Your account'}
              </Text>
              {session?.email ? (
                <Text style={styles.email} numberOfLines={1}>
                  {session.email}
                </Text>
              ) : null}
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.item}>
            <View style={[styles.itemIcon, { backgroundColor: tint(accent.base, 0.16) }]}>
              <Icon name="bell" size={16} color={accent.base} />
            </View>
            <Text style={[styles.itemLabel, { color: text.primary }]}>Notifications</Text>
            <Switch
              value={notifOn}
              disabled={notifBusy}
              onValueChange={(v) => void toggleNotifications(v)}
              trackColor={{ true: accent.base, false: surface.hover }}
            />
          </View>

          <View style={styles.divider} />

          <Pressable
            style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
            onPress={confirmSignOut}
            accessibilityRole="button"
          >
            <View style={[styles.itemIcon, { backgroundColor: tint(status.danger, 0.16) }]}>
              <Icon name="log-out" size={16} color={status.danger} />
            </View>
            <Text style={[styles.itemLabel, { color: status.danger }]}>Sign out</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(3,5,9,0.5)' },
  card: {
    position: 'absolute',
    right: 18,
    // No fixed width — the card hugs its widest child. maxWidth keeps a long
    // email from stretching it past a sane bound (the email truncates instead).
    maxWidth: 320,
    borderRadius: radius.xl,
    backgroundColor: surface.overlay,
    borderWidth: 1,
    borderColor: border.subtle,
    paddingVertical: 6,
    ...shadow.lg,
  },
  account: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  who: { flexShrink: 1, minWidth: 0 },
  name: { fontFamily: font.sansBold, fontSize: fontSize.sm, color: text.primary },
  email: { fontFamily: font.sansRegular, fontSize: fontSize.xs, color: text.muted, marginTop: 2 },
  divider: { height: 1, backgroundColor: border.subtle, marginHorizontal: 6 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 13 },
  itemPressed: { backgroundColor: surface.hover },
  itemIcon: { width: 28, height: 28, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  itemLabel: { fontFamily: font.sansSemibold, fontSize: fontSize.sm },
});
