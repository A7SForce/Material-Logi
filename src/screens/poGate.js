/**
 * poGate.js — Agent 4: the PO navigation guard as a pure, testable function.
 * Rule: PO tab checks ShortageConfirmItem count (all kinds, resolved:false).
 * If count > 0, block and redirect to Confirm tab.
 */

export const getPoGate = (unresolvedCount) => {
  const count = Number(unresolvedCount) || 0;
  if (count > 0) return { allowed: false, redirect: 'confirm' };
  return { allowed: true, redirect: null };
};

/** Tab-bar navigation: a PO request while confirmations are open lands on Confirm. */
export const resolveTabRequest = (requestedTab, unresolvedCount) => {
  if (requestedTab === 'po' && !getPoGate(unresolvedCount).allowed) return 'confirm';
  return requestedTab;
};

export default { getPoGate, resolveTabRequest };
