export const EMBED_LIMITS = {
  title: 256,
  description: 4096,
  fields: 25,
  fieldName: 256,
  fieldValue: 1024,
  footerText: 2048,
  authorName: 256,
  totalCharacters: 6000,
  buttons: 25,
  buttonsPerRow: 5,
} as const;

export const CV2_LIMITS = {
  textContent: 4000,
  galleryItems: 10,
  sectionTextDisplays: 3,
  topLevelComponents: 40,
  buttonsPerActionRow: 5,
} as const;
