// Translation messages are a flat key/value bag loaded per locale from src/i18n/*.json.
// ponytail: index signature instead of enumerating every key — content churns, the shape doesn't.
interface TranslationMessages {
  [key: string]: string;
}

export default TranslationMessages;
