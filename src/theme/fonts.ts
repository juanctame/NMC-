/**
 * Font families for NO MAD CORNER.
 *
 * In React Native each weight/style is registered as its own family name
 * (fontWeight does not reliably switch between separately-loaded faces on
 * Android), so we reference explicit family keys everywhere. We require the
 * individual TTF assets directly (rather than a font package's index) so Metro
 * only bundles the weights we actually use.
 *
 * Roles (from the design system):
 *   display        → Megazoid   (brand slab display; rendered uppercase)
 *   displayItalic  → Megazoid Italic
 *   banner         → Roquen     (all-caps bold sans: eyebrows, labels, buttons)
 *   serif          → Fraunces   (body editorial)
 *   serifDisplay   → DM Serif Display (card / place titles)
 *   sans           → Space Grotesk (default UI)
 *   mono           → JetBrains Mono (meta, timestamps, codes, prices)
 */

export const FONTS = {
  display: 'Megazoid',
  displayItalic: 'MegazoidItalic',
  banner: 'Roquen',
  bannerAlt: 'Oswald_600SemiBold',
  bannerBold: 'Oswald_700Bold',
  serif: 'Fraunces_400Regular',
  serifMedium: 'Fraunces_500Medium',
  serifSemi: 'Fraunces_600SemiBold',
  serifItalic: 'Fraunces_400Regular_Italic',
  serifDisplay: 'DMSerifDisplay_400Regular',
  serifDisplayItalic: 'DMSerifDisplay_400Regular_Italic',
  sans: 'SpaceGrotesk_400Regular',
  sansMedium: 'SpaceGrotesk_500Medium',
  sansSemi: 'SpaceGrotesk_600SemiBold',
  sansBold: 'SpaceGrotesk_700Bold',
  mono: 'JetBrainsMono_400Regular',
  monoMedium: 'JetBrainsMono_500Medium',
} as const;

/** Map of family-name → asset module, passed to `useFonts` / `Font.loadAsync`. */
export const FONT_ASSETS: Record<string, number> = {
  [FONTS.display]: require('../../assets/fonts/Megazoid-Regular.otf'),
  [FONTS.displayItalic]: require('../../assets/fonts/Megazoid-Italic.otf'),
  [FONTS.banner]: require('../../assets/fonts/Roquen.otf'),
  [FONTS.bannerAlt]: require('@expo-google-fonts/oswald/600SemiBold/Oswald_600SemiBold.ttf'),
  [FONTS.bannerBold]: require('@expo-google-fonts/oswald/700Bold/Oswald_700Bold.ttf'),
  [FONTS.serif]: require('@expo-google-fonts/fraunces/400Regular/Fraunces_400Regular.ttf'),
  [FONTS.serifMedium]: require('@expo-google-fonts/fraunces/500Medium/Fraunces_500Medium.ttf'),
  [FONTS.serifSemi]: require('@expo-google-fonts/fraunces/600SemiBold/Fraunces_600SemiBold.ttf'),
  [FONTS.serifItalic]: require('@expo-google-fonts/fraunces/400Regular_Italic/Fraunces_400Regular_Italic.ttf'),
  [FONTS.serifDisplay]: require('@expo-google-fonts/dm-serif-display/400Regular/DMSerifDisplay_400Regular.ttf'),
  [FONTS.serifDisplayItalic]: require('@expo-google-fonts/dm-serif-display/400Regular_Italic/DMSerifDisplay_400Regular_Italic.ttf'),
  [FONTS.sans]: require('@expo-google-fonts/space-grotesk/400Regular/SpaceGrotesk_400Regular.ttf'),
  [FONTS.sansMedium]: require('@expo-google-fonts/space-grotesk/500Medium/SpaceGrotesk_500Medium.ttf'),
  [FONTS.sansSemi]: require('@expo-google-fonts/space-grotesk/600SemiBold/SpaceGrotesk_600SemiBold.ttf'),
  [FONTS.sansBold]: require('@expo-google-fonts/space-grotesk/700Bold/SpaceGrotesk_700Bold.ttf'),
  [FONTS.mono]: require('@expo-google-fonts/jetbrains-mono/400Regular/JetBrainsMono_400Regular.ttf'),
  [FONTS.monoMedium]: require('@expo-google-fonts/jetbrains-mono/500Medium/JetBrainsMono_500Medium.ttf'),
};
