import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/** Respeita "reduzir movimento" do sistema operacional. */
export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduce)
      .catch(() => {});
  }, []);
  return reduce;
}
