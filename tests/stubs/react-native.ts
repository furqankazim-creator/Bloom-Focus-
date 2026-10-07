/** Minimal react-native stand-in so pure engine modules can run under Node in tests. */
export const Platform = { OS: 'test', select: (o: any) => o.default };
export const I18nManager = { isRTL: false, allowRTL: () => {}, forceRTL: () => {} };
