import React, { useRef, useEffect, ReactNode } from 'react';
import { View } from 'react-native';
import { useTour, TOUR_STEPS } from './TourContext';

interface Props {
  id: string;
  children: ReactNode;
}

/**
 * Wrap any UI element with <TourStep id="..."> to make it highlightable.
 * When this step becomes active the component measures itself and reports
 * its screen position to TourContext so the overlay can spotlight it.
 */
export default function TourStep({ id, children }: Props) {
  const { active, stepIndex, reportMeasure } = useTour();
  const ref = useRef<View>(null);

  const currentId = active ? TOUR_STEPS[stepIndex]?.id : null;

  useEffect(() => {
    if (!active || currentId !== id) return;
    // small delay to let layout settle
    const t = setTimeout(() => {
      ref.current?.measureInWindow((x, y, width, height) => {
        if (width > 0 && height > 0) {
          reportMeasure(id, { x, y, width, height });
        }
      });
    }, 120);
    return () => clearTimeout(t);
  }, [active, currentId, id, reportMeasure]);

  return (
    <View ref={ref} collapsable={false}>
      {children}
    </View>
  );
}
