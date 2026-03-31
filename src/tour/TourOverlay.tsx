import React from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  useWindowDimensions, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTour, TOUR_STEPS } from './TourContext';

const OVERLAY_COLOR = 'rgba(0,0,0,0.78)';
const BORDER_RADIUS = 14;
const TAB_BAR_HEIGHT = 72;

// Tab icon centre-x positions (5 tabs, equal width)
function tabCentreX(tabIndex: number, screenWidth: number) {
  return (screenWidth / 5) * tabIndex + screenWidth / 10;
}

// Which tab index each tab_* step maps to
const TAB_STEP_INDEX: Record<string, number> = {
  tab_spends:    1,
  tab_analytics: 3,
  tab_plan:      2,
};

export default function TourOverlay() {
  const { active, stepIndex, spotlight, currentStep, next, skip } = useTour();
  const { width: sw, height: sh } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  if (!active || !currentStep) return null;

  const isTabStep = currentStep.id.startsWith('tab_');
  const isLastStep = stepIndex === TOUR_STEPS.length - 1;

  // ── For tab steps: compute a synthetic spotlight over the tab icon ──────────
  let measure = spotlight;
  if (isTabStep && !measure) {
    const tabIdx = TAB_STEP_INDEX[currentStep.id] ?? 0;
    const cx     = tabCentreX(tabIdx, sw);
    const tabBarTop = sh - TAB_BAR_HEIGHT - insets.bottom;
    measure = {
      x: cx - 28, y: tabBarTop + 4,
      width: 56,  height: 44,
      padded: { x: cx - 32, y: tabBarTop, width: 64, height: 52 },
    };
  }

  const pm = measure?.padded ?? null;

  // ── Tooltip position: prefer below, fall back to above ───────────────────────
  const tooltipH = 170;
  const tooltipW = sw - 40;
  const belowY   = pm ? pm.y + pm.height + 16 : sh / 2;
  const aboveY   = pm ? pm.y - tooltipH - 16  : sh / 2 - tooltipH;
  const fitsBelow = pm && belowY + tooltipH < sh - insets.bottom - 20;
  const tooltipTop = fitsBelow ? belowY : (pm ? aboveY : (sh - tooltipH) / 2);

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">

        {/* ── Spotlight using 4 dark rects ───────────────────────────── */}
        {pm ? (
          <>
            {/* top */}
            <View style={[styles.dark, { top: 0, left: 0, right: 0, height: Math.max(pm.y, 0) }]} />
            {/* bottom */}
            <View style={[styles.dark, { top: pm.y + pm.height, left: 0, right: 0, bottom: 0 }]} />
            {/* left */}
            <View style={[styles.dark, { top: pm.y, left: 0, width: Math.max(pm.x, 0), height: pm.height }]} />
            {/* right */}
            <View style={[styles.dark, { top: pm.y, left: pm.x + pm.width, right: 0, height: pm.height }]} />
            {/* highlight border */}
            <View style={[styles.highlight, {
              top: pm.y, left: pm.x,
              width: pm.width, height: pm.height,
              borderRadius: BORDER_RADIUS,
            }]} />
          </>
        ) : (
          /* No measure yet — full dim overlay */
          <View style={[styles.dark, StyleSheet.absoluteFill]} />
        )}

        {/* ── Tooltip card ─────────────────────────────────────────────── */}
        <View style={[styles.tooltip, {
          top: tooltipTop,
          left: 20, width: tooltipW,
        }]}>
          {/* step counter */}
          <Text style={styles.counter}>{stepIndex + 1} / {TOUR_STEPS.length}</Text>
          <Text style={styles.title}>{currentStep.title}</Text>
          <Text style={styles.desc}>{currentStep.description}</Text>

          <View style={styles.btnRow}>
            <TouchableOpacity onPress={skip} style={styles.skipBtn} activeOpacity={0.7}>
              <Text style={styles.skipText}>Skip tour</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={next} style={styles.nextBtn} activeOpacity={0.85}>
              <Text style={styles.nextText}>{isLastStep ? 'Done 🎉' : 'Next →'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  dark: {
    position: 'absolute',
    backgroundColor: OVERLAY_COLOR,
  },
  highlight: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#8257E6',
  },
  tooltip: {
    position: 'absolute',
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2C2C2C',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
  counter: {
    fontSize: 11,
    color: '#8257E6',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  desc: {
    fontSize: 14,
    color: '#ABABAB',
    lineHeight: 21,
    marginBottom: 18,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  skipBtn: {
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  skipText: {
    fontSize: 14,
    color: '#4B4B4B',
    fontWeight: '500',
  },
  nextBtn: {
    backgroundColor: '#8257E6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  nextText: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
