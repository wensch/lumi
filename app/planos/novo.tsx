import { useMemo, useRef, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Button, Card, Screen, ScreenHeader, Stepper, TextField } from '@/components';
import {
  BIBLE_BOOKS,
  bookName,
  MAX_PLAN_DAYS,
  MIN_PLAN_DAYS,
  plansApi,
  type NewPlanDay,
} from '@/features/plans';
import { useTheme, type Theme } from '@/theme';
import { useTranslation, type LanguageCode } from '@/i18n';
import { goBackOrHome } from '@/lib/navigation';

type Mode = 'book' | 'youversion';

const YOUVERSION_PLANS_URL = 'https://www.bible.com/reading-plans';
/** Livros com capítulos suficientes para um plano de um capítulo por dia (mínimo do servidor). */
const PLANNABLE_BOOKS = BIBLE_BOOKS.filter((book) => book.chapters >= MIN_PLAN_DAYS);
const SUGGESTED_BOOKS = ['JHN', 'PSA', 'PRO', 'MRK', 'ACT', 'ROM', 'GEN', 'MAT', 'LUK', 'PHP'];
const EXTERNAL_DAY_CHOICES = [7, 14, 21, 30, 60, 90];
const TITLE_MAX_LENGTH = 60;

/** Sem acentos e em minúsculas, para a busca de livro ("joao" acha "João"). */
function normalize(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function searchBooks(query: string, language: LanguageCode) {
  const needle = normalize(query.trim());
  if (!needle)
    return SUGGESTED_BOOKS.flatMap((code) => PLANNABLE_BOOKS.filter((b) => b.code === code));
  return PLANNABLE_BOOKS.filter((book) =>
    normalize(bookName(book.code, language)).includes(needle),
  );
}

export default function NovoPlanoScreen() {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { t, language } = useTranslation();
  const [mode, setMode] = useState<Mode>('book');
  const [working, setWorking] = useState(false);
  // Trava síncrona contra toque duplo (o estado `working` só vale no próximo render).
  const busyRef = useRef(false);

  // Um livro, um capítulo por dia.
  const [query, setQuery] = useState('');
  const [bookCode, setBookCode] = useState('JHN');
  const [fromChapter, setFromChapter] = useState(1);
  const [toChapter, setToChapter] = useState(21);
  const [bookTitle, setBookTitle] = useState<string | null>(null);

  // Plano acompanhado do app da YouVersion.
  const [externalTitle, setExternalTitle] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [externalDays, setExternalDays] = useState(14);

  const book = BIBLE_BOOKS.find((item) => item.code === bookCode) ?? BIBLE_BOOKS[0];
  const name = bookName(book.code, language);
  const matches = useMemo(() => searchBooks(query, language), [query, language]);

  const bookDays = toChapter - fromChapter + 1;
  const defaultBookTitle =
    fromChapter === 1 && toChapter === book.chapters ? name : `${name} ${fromChapter}–${toChapter}`;
  const effectiveBookTitle = (bookTitle ?? defaultBookTitle).trim();

  const pickBook = (code: string) => {
    const picked = BIBLE_BOOKS.find((item) => item.code === code);
    if (!picked) return;
    setBookCode(code);
    setFromChapter(1);
    setToChapter(Math.min(picked.chapters, 30));
    setBookTitle(null);
  };

  const confirmSwitch = (activeTitle: string) =>
    new Promise<boolean>((resolve) => {
      Alert.alert(
        t('plans.switchTitle'),
        `${activeTitle}\n${t('plans.switchBody')}`,
        [
          { text: t('common.cancel'), style: 'cancel', onPress: () => resolve(false) },
          { text: t('plans.switchAction'), onPress: () => resolve(true) },
        ],
        { onDismiss: () => resolve(false) },
      );
    });

  const submit = async (plan: {
    title: string;
    description: string;
    icon: string;
    externalUrl: string | null;
    days: NewPlanDay[];
  }) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setWorking(true);
    // Criar já começa o plano e pausa o que estava em andamento: avisa antes, como ao trocar de plano.
    const current = await plansApi.list();
    const otherActive =
      current.error === null ? current.data.find((p) => p.status === 'active') : null;
    if (otherActive && !(await confirmSwitch(otherActive.title))) {
      setWorking(false);
      busyRef.current = false;
      return;
    }
    const result = await plansApi.createCustom(plan);
    if (result.error !== null || typeof result.data !== 'string') {
      setWorking(false);
      busyRef.current = false;
    }
    if (result.error !== null) {
      Alert.alert(
        result.error.includes('too_many')
          ? t('plans.create.errorTooMany')
          : result.error.includes('invalid_input')
            ? t('plans.create.errorInvalid')
            : t('plans.create.errorGeneric'),
      );
      return;
    }
    if (typeof result.data !== 'string') {
      Alert.alert(t('plans.create.errorGeneric'));
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    // Fica com o botão travado até a tela trocar (evita um segundo plano igual).
    router.replace(`/planos/${result.data}`);
  };

  const createBookPlan = () => {
    const days: NewPlanDay[] = [];
    for (let chapter = fromChapter; chapter <= toChapter; chapter += 1) {
      days.push({
        title: `${name} ${chapter}`,
        passage_reference: `${book.code}.${chapter}`,
        body: '',
      });
    }
    void submit({
      title: effectiveBookTitle,
      description: t('plans.create.descBook', { days: days.length }),
      icon: '📖',
      externalUrl: null,
      days,
    });
  };

  const createExternalPlan = () => {
    const title = externalTitle.trim();
    const days: NewPlanDay[] = Array.from({ length: externalDays }, (_, index) => ({
      title: t('plans.dayLabel', { day: index + 1 }),
      passage_reference: null,
      body: t('plans.create.externalBody', { day: index + 1, plan: title }),
    }));
    void submit({
      title,
      description: t('plans.create.descExternal', { days: externalDays }),
      icon: '🧭',
      externalUrl: externalUrl.trim() || null,
      days,
    });
  };

  const bookValid =
    bookDays >= MIN_PLAN_DAYS && bookDays <= MAX_PLAN_DAYS && effectiveBookTitle.length >= 3;
  const externalValid = externalTitle.trim().length >= 3;

  return (
    <Screen>
      <ScreenHeader title={t('plans.create.title')} onBackPress={goBackOrHome} />

      <View style={styles.chips}>
        <Chip
          theme={theme}
          label={t('plans.create.modeBook')}
          selected={mode === 'book'}
          onPress={() => setMode('book')}
        />
        <Chip
          theme={theme}
          label={t('plans.create.modeYouVersion')}
          selected={mode === 'youversion'}
          onPress={() => setMode('youversion')}
        />
      </View>

      {mode === 'book' ? (
        <Card style={styles.card}>
          <Text style={[theme.typography.caption, styles.muted]}>{t('plans.create.bookHint')}</Text>
          <TextField
            label={t('plans.create.bookSearch')}
            placeholder={t('plans.create.bookSearchPlaceholder')}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
          />
          <View style={styles.chips}>
            {matches.slice(0, 12).map((item) => (
              <Chip
                key={item.code}
                theme={theme}
                label={bookName(item.code, language)}
                selected={item.code === bookCode}
                onPress={() => pickBook(item.code)}
              />
            ))}
          </View>
          {matches.length === 0 ? (
            <Text style={[theme.typography.caption, styles.muted]}>
              {t('plans.create.bookNone')}
            </Text>
          ) : null}

          <Text style={styles.label}>
            {t('plans.create.chosenBook', { book: name, count: book.chapters })}
          </Text>

          <Text style={styles.label}>{t('plans.create.fromChapter')}</Text>
          <Stepper
            value={fromChapter}
            min={1}
            max={book.chapters}
            onChange={(value) => {
              setFromChapter(value);
              if (toChapter < value) setToChapter(value);
              setBookTitle(null);
            }}
            decreaseLabel={t('challenges.form.less')}
            increaseLabel={t('challenges.form.more')}
          />
          <Text style={styles.label}>{t('plans.create.toChapter')}</Text>
          <Stepper
            value={toChapter}
            min={fromChapter}
            max={book.chapters}
            onChange={(value) => {
              setToChapter(value);
              setBookTitle(null);
            }}
            decreaseLabel={t('challenges.form.less')}
            increaseLabel={t('challenges.form.more')}
          />
          <Text style={[theme.typography.bodyStrong, bookDays < MIN_PLAN_DAYS && styles.warning]}>
            {bookDays < MIN_PLAN_DAYS
              ? t('plans.create.tooShort', { min: MIN_PLAN_DAYS })
              : t('plans.create.bookSummary', { days: bookDays })}
          </Text>

          <TextField
            label={t('plans.create.planName')}
            value={bookTitle ?? defaultBookTitle}
            onChangeText={setBookTitle}
            maxLength={TITLE_MAX_LENGTH}
            autoCapitalize="sentences"
          />
          <Button
            label={t('plans.create.create')}
            onPress={createBookPlan}
            disabled={!bookValid || working}
          />
        </Card>
      ) : (
        <Card style={styles.card}>
          <Text style={theme.typography.bodyStrong}>{t('plans.create.ytTitle')}</Text>
          <Text style={[theme.typography.caption, styles.muted]}>{t('plans.create.ytHint')}</Text>
          <Button
            label={t('plans.create.ytBrowse')}
            variant="secondary"
            onPress={() =>
              Linking.openURL(YOUVERSION_PLANS_URL).catch(() =>
                Alert.alert(t('plans.create.errorGeneric')),
              )
            }
          />

          <TextField
            label={t('plans.create.ytName')}
            placeholder={t('plans.create.ytNamePlaceholder')}
            value={externalTitle}
            onChangeText={setExternalTitle}
            maxLength={TITLE_MAX_LENGTH}
            autoCapitalize="sentences"
          />
          <TextField
            label={t('plans.create.ytLink')}
            placeholder="https://www.bible.com/..."
            value={externalUrl}
            onChangeText={setExternalUrl}
            keyboardType="url"
            autoCorrect={false}
          />

          <Text style={styles.label}>{t('plans.create.ytDays')}</Text>
          <View style={styles.chips}>
            {EXTERNAL_DAY_CHOICES.map((choice) => (
              <Chip
                key={choice}
                theme={theme}
                label={String(choice)}
                selected={externalDays === choice}
                onPress={() => setExternalDays(choice)}
              />
            ))}
          </View>
          <Stepper
            value={externalDays}
            min={MIN_PLAN_DAYS}
            max={MAX_PLAN_DAYS}
            onChange={setExternalDays}
            decreaseLabel={t('challenges.form.less')}
            increaseLabel={t('challenges.form.more')}
          />
          <Text style={[theme.typography.caption, styles.muted]}>
            {t('plans.create.ytHowItWorks')}
          </Text>
          <Button
            label={t('plans.create.create')}
            onPress={createExternalPlan}
            disabled={!externalValid || working}
          />
        </Card>
      )}
    </Screen>
  );
}

function Chip({
  theme,
  label,
  selected,
  onPress,
}: {
  theme: Theme;
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const styles = getStyles(theme);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={styles.chipText}>{label}</Text>
    </Pressable>
  );
}

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      gap: theme.spacing.sm,
    },
    muted: {
      color: theme.colors.muted,
    },
    label: {
      ...theme.typography.label,
      color: theme.colors.ink,
    },
    warning: {
      color: theme.colors.danger,
    },
    chips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.xs,
    },
    chip: {
      minHeight: 40,
      paddingHorizontal: theme.spacing.md,
      justifyContent: 'center',
      borderRadius: theme.radius.md,
      borderWidth: 1.5,
      borderColor: `${theme.colors.muted}55`,
      backgroundColor: theme.colors.white,
    },
    chipSelected: {
      borderColor: theme.colors.ink,
      backgroundColor: theme.colors.yellow,
    },
    chipText: {
      ...theme.typography.bodyStrong,
    },
  });
