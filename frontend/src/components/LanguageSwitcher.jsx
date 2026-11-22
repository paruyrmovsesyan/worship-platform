import { useLanguage } from '../context/LanguageContext';
import { SegmentedControl } from 'glisse';
import './LanguageSwitcher.css';

const LANG_ITEMS = [
  { value: 'am', label: 'AM' },
  { value: 'en', label: 'EN' },
  { value: 'ru', label: 'RU' },
];

export default function LanguageSwitcher({ className = '', style = {} }) {
  const { language, setLanguage } = useLanguage();

  return (
    <SegmentedControl
      className={`wp-glisse-lang ${className}`.trim()}
      style={style}
      aria-label="Language"
      items={LANG_ITEMS}
      value={language}
      onValueChange={(nextLang) => {
        if (nextLang && nextLang !== language) {
          setLanguage(nextLang);
        }
      }}
    />
  );
}
