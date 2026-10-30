export function createInformationLedDeck(baseDeck, styleCandidates) {
  const route = styleCandidates?.aiRoutes?.find(({ id }) => id === 'route-technical-map');
  if (!route) throw new Error('缺少 route-technical-map StyleSpec。');
  return {
    ...structuredClone(baseDeck),
    deckId: 'pptskill-information-led-world',
    style: structuredClone(route),
  };
}
