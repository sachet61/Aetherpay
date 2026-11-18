export interface VisualViewportMetrics {
  innerHeight: number;
  visualHeight?: number | null;
  visualOffsetTop?: number | null;
}

export interface ComputedChatViewportState {
  isKeyboardOpen: boolean;
  containerHeightPx: number | null;
  offsetTopPx: number;
}

const KEYBOARD_HEIGHT_DELTA_THRESHOLD = 120;

/**
 * Computes whether an on-screen mobile keyboard has shrunk the visual viewport
 * and returns explicit pixel bounds so the full-screen chat container fits
 * cleanly above the soft keyboard without obscuring the message composer.
 */
export function computeVisualViewportState(
  metrics: VisualViewportMetrics
): ComputedChatViewportState {
  const innerHeight = Number(metrics.innerHeight) || 0;
  const visualHeight =
    typeof metrics.visualHeight === 'number' && Number.isFinite(metrics.visualHeight)
      ? metrics.visualHeight
      : null;

  if (!visualHeight || visualHeight <= 0 || innerHeight <= 0) {
    return {
      isKeyboardOpen: false,
      containerHeightPx: null,
      offsetTopPx: 0,
    };
  }

  const heightDelta = innerHeight - visualHeight;
  if (heightDelta > KEYBOARD_HEIGHT_DELTA_THRESHOLD) {
    const rawOffset =
      typeof metrics.visualOffsetTop === 'number' && Number.isFinite(metrics.visualOffsetTop)
        ? metrics.visualOffsetTop
        : 0;
    return {
      isKeyboardOpen: true,
      containerHeightPx: Math.round(visualHeight),
      offsetTopPx: Math.max(0, Math.round(rawOffset)),
    };
  }

  return {
    isKeyboardOpen: false,
    containerHeightPx: null,
    offsetTopPx: 0,
  };
}

export function shouldSubmitOnTextareaKeyDown(params: {
  key: string;
  shiftKey: boolean;
  isComposing?: boolean;
}): boolean {
  if (params.key !== 'Enter') return false;
  if (params.shiftKey) return false;
  if (params.isComposing) return false;
  return true;
}
