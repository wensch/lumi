import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { BackHandler, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useBibleSearch, type BibleSearchResult } from '@youversion/platform-react-hooks';
import type { BibleBook } from '@youversion/platform-core';
import { Card, Screen, ScreenHeader, Skeleton, TextField } from '@/components';
import {
  DEFAULT_BIBLE_VERSION_ID,
  useBibleBook,
  useBibleBooks,
  useBibleChapterText,
  useVersePassage,
  parseVerses,
  plainTextFromHtml,
} from '@/features/bible';
import { useTheme, type Theme } from '@/theme';
import { useTranslation } from '@/i18n';

type ViewState =
  | { kind: 'list' }
  | { kind: 'chapters'; bookId: string }
  | {
      kind: 'reader';
      bookId: string;
      chapter: number;
      /** Versículos a destacar (vindos de um resultado de busca). */
      highlight: readonly number[];
      from: 'search' | 'chapters';
    };

export default function BibliaScreen() {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { t } = useTranslation();
  const [view, setView] = useState<ViewState>({ kind: 'list' });
  const search = useBibleSearch({ versionId: DEFAULT_BIBLE_VERSION_ID });
  const scrollRef = useRef<ScrollView>(null);

  const openResult = (result: BibleSearchResult) => {
    setView({
      kind: 'reader',
      bookId: result.book,
      chapter: Number(result.chapter),
      highlight: result.verses,
      from: 'search',
    });
  };

  const openBook = (bookId: string) => setView({ kind: 'chapters', bookId });
  const openChapter = (bookId: string, chapter: number) =>
    setView({ kind: 'reader', bookId, chapter, highlight: [], from: 'chapters' });
  const backToList = () => setView({ kind: 'list' });
  const backToChapters = (bookId: string) => setView({ kind: 'chapters', bookId });

  // Botão voltar do Android: sobe um nível dentro da Bíblia em vez de sair do app.
  useEffect(() => {
    if (view.kind === 'list') return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (view.kind === 'reader' && view.from === 'chapters') {
        setView({ kind: 'chapters', bookId: view.bookId });
      } else {
        setView({ kind: 'list' });
      }
      return true;
    });
    return () => subscription.remove();
  }, [view]);

  const searchActive = search.query.trim().length > 0;

  return (
    <Screen scrollRef={scrollRef}>
      <ScreenHeader title={t('tabs.bible')} />

      {view.kind === 'list' ? (
        <>
          <TextField
            label={t('bible.searchLabel')}
            placeholder={t('bible.searchPlaceholder')}
            value={search.query}
            onChangeText={search.setQuery}
            onSubmitEditing={search.submit}
            returnKeyType="search"
          />

          {search.phase.kind === 'trending' ? (
            <>
              <SearchSuggestions
                queries={search.phase.queries}
                loading={search.phase.loading}
                isTrending
                onSelect={search.selectSuggestion}
              />
              <BookList onSelectBook={openBook} />
            </>
          ) : null}

          {search.phase.kind === 'suggesting' ? (
            <SearchSuggestions
              queries={search.phase.queries}
              loading={search.phase.loading}
              isTrending={false}
              onSelect={search.selectSuggestion}
            />
          ) : null}

          {search.phase.kind === 'searching' ? (
            <Text style={styles.helperText}>{t('bible.searching')}</Text>
          ) : null}

          {search.phase.kind === 'empty' || search.phase.kind === 'failed' ? (
            <Text style={styles.helperText}>
              {search.phase.kind === 'empty' ? t('bible.noResults') : t('bible.errorLoading')}
            </Text>
          ) : null}

          {search.phase.kind === 'results' ? (
            <SearchResults
              verses={search.phase.verses}
              nextPage={search.phase.nextPage}
              onSelect={openResult}
              onLoadMore={search.loadMore}
            />
          ) : null}

          {searchActive && search.phase.kind !== 'trending' ? (
            <Pressable onPress={() => search.setQuery('')} accessibilityRole="button">
              <Text style={styles.backLink}>{`← ${t('bible.books')}`}</Text>
            </Pressable>
          ) : null}
        </>
      ) : null}

      {view.kind === 'chapters' ? (
        <ChapterGrid bookId={view.bookId} onSelectChapter={openChapter} onBack={backToList} />
      ) : null}

      {view.kind === 'reader' ? (
        <ChapterReader
          bookId={view.bookId}
          chapter={view.chapter}
          highlight={view.highlight}
          scrollRef={scrollRef}
          backLabel={view.from === 'search' ? t('bible.results') : t('bible.chapters')}
          onBack={() => (view.from === 'search' ? backToList() : backToChapters(view.bookId))}
        />
      ) : null}
    </Screen>
  );
}

/**
 * Mensagem de erro da Bíblia + linha técnica com o motivo real. A linha
 * técnica é temporária: serve para diagnosticar falhas da API da YouVersion
 * em aparelhos reais, onde não há console.
 */
function BibleError({ error }: { error: unknown }) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { t } = useTranslation();
  const detail = error instanceof Error ? error.message : String(error);
  // Diagnóstico temporário do 401 (chave recusada): mostra só o tamanho e o final da chave
  // embutida no app, para comparar com a do painel da YouVersion.
  const appKey = process.env.EXPO_PUBLIC_YOUVERSION_APP_KEY ?? '';
  const keyHint = appKey
    ? `${t('bible.keyInApp')}: ${appKey.length} ${t('bible.characters')}, …${appKey.slice(-4)}`
    : t('bible.keyMissing');
  return (
    <View style={styles.errorBox}>
      <Text style={styles.helperText}>{t('bible.errorLoading')}</Text>
      <Text style={styles.errorDetail} selectable>
        {detail}
      </Text>
      <Text style={styles.errorDetail} selectable>
        {keyHint}
      </Text>
    </View>
  );
}

function BookList({ onSelectBook }: { onSelectBook: (bookId: string) => void }) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { t } = useTranslation();
  const { books, loading, error } = useBibleBooks();

  const { oldTestament, newTestament } = useMemo(() => {
    const oldTestament: BibleBook[] = [];
    const newTestament: BibleBook[] = [];
    for (const book of books) {
      (book.canon === 'new_testament' ? newTestament : oldTestament).push(book);
    }
    return { oldTestament, newTestament };
  }, [books]);

  if (loading) {
    return (
      <View style={styles.bookListContainer}>
        {Array.from({ length: 8 }, (_, index) => (
          <Skeleton key={index} height={48} radius={14} />
        ))}
      </View>
    );
  }

  if (error) {
    return <BibleError error={error} />;
  }

  return (
    <View style={styles.bookListContainer}>
      <BookGroup title={t('bible.oldTestament')} books={oldTestament} onSelectBook={onSelectBook} />
      <BookGroup title={t('bible.newTestament')} books={newTestament} onSelectBook={onSelectBook} />
    </View>
  );
}

function BookGroup({
  title,
  books,
  onSelectBook,
}: {
  title: string;
  books: BibleBook[];
  onSelectBook: (bookId: string) => void;
}) {
  const theme = useTheme();
  const styles = getStyles(theme);

  if (books.length === 0) return null;

  return (
    <View style={styles.bookGroup}>
      <Text style={styles.groupTitle}>{title}</Text>
      <View style={styles.bookGrid}>
        {books.map((book) => (
          <Pressable key={book.id} onPress={() => onSelectBook(book.id)} style={styles.bookChip}>
            <Text style={styles.bookChipLabel}>{book.title}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function ChapterGrid({
  bookId,
  onSelectChapter,
  onBack,
}: {
  bookId: string;
  onSelectChapter: (bookId: string, chapter: number) => void;
  onBack: () => void;
}) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { t } = useTranslation();
  const { book, loading, error } = useBibleBook(bookId);

  return (
    <View style={styles.bookListContainer}>
      <Pressable onPress={onBack}>
        <Text style={styles.backLink}>{`← ${t('bible.books')}`}</Text>
      </Pressable>

      {loading ? <Text style={styles.helperText}>{t('bible.loadingBooks')}</Text> : null}
      {error ? <BibleError error={error} /> : null}

      {book ? (
        <>
          <Text style={styles.groupTitle}>{book.title}</Text>
          <View style={styles.bookGrid}>
            {(book.chapters ?? []).map((chapter) => (
              <Pressable
                key={chapter.id}
                onPress={() => onSelectChapter(bookId, Number(chapter.id))}
                style={styles.chapterChip}
              >
                <Text style={styles.bookChipLabel}>{chapter.title}</Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}
    </View>
  );
}

function ChapterReader({
  bookId,
  chapter,
  highlight,
  scrollRef,
  backLabel,
  onBack,
}: {
  bookId: string;
  chapter: number;
  highlight: readonly number[];
  scrollRef: RefObject<ScrollView | null>;
  backLabel: string;
  onBack: () => void;
}) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { passage, loading, error } = useBibleChapterText(bookId, chapter);
  const verses = useMemo(() => (passage ? parseVerses(passage.content) : []), [passage]);
  const firstHighlighted = highlight.length > 0 ? Math.min(...highlight) : null;
  const firstRowRef = useRef<View>(null);

  // Vindo de uma busca, rola até o primeiro versículo encontrado (os destacados).
  useEffect(() => {
    if (firstHighlighted === null || verses.length === 0) return;
    const timer = setTimeout(() => {
      const scroll = scrollRef.current;
      const inner = (
        scroll as unknown as { getInnerViewRef?: () => View | null } | null
      )?.getInnerViewRef?.();
      if (!scroll || !inner) return;
      firstRowRef.current?.measureLayout(
        inner,
        (_x, y) => scroll.scrollTo({ y: Math.max(0, y - 120), animated: true }),
        () => {},
      );
    }, 250);
    return () => clearTimeout(timer);
  }, [firstHighlighted, verses, scrollRef]);

  return (
    <View style={styles.bookListContainer}>
      <Pressable onPress={onBack} accessibilityRole="button">
        <Text style={styles.backLink}>{`← ${backLabel}`}</Text>
      </Pressable>

      {loading ? <Skeleton height={320} radius={theme.radius.lg} /> : null}
      {error ? <BibleError error={error} /> : null}

      {passage ? (
        <Card style={styles.readerCard}>
          <Text style={styles.readerReference}>{passage.reference}</Text>
          {verses.length > 0 ? (
            <View style={styles.verseList}>
              {verses.map((verse) => {
                const marked = highlight.includes(Number(verse.number));
                return (
                  <View
                    key={verse.number}
                    ref={Number(verse.number) === firstHighlighted ? firstRowRef : undefined}
                    style={[styles.verseRow, marked && styles.verseRowMarked]}
                  >
                    <Text style={styles.verseNumber}>{verse.number}</Text>
                    <Text style={styles.verseText}>{verse.text}</Text>
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={styles.readerText}>{plainTextFromHtml(passage.content)}</Text>
          )}
        </Card>
      ) : null}
    </View>
  );
}

function SearchSuggestions({
  queries,
  loading,
  isTrending,
  onSelect,
}: {
  queries: readonly { text: string }[];
  loading: boolean;
  isTrending: boolean;
  onSelect: (text: string) => void;
}) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { t } = useTranslation();

  if (loading && queries.length === 0) {
    return <Text style={styles.helperText}>{t('bible.searching')}</Text>;
  }

  if (queries.length === 0) return null;

  return (
    <View style={styles.bookListContainer}>
      <Text style={styles.groupTitle}>
        {isTrending ? t('bible.trendingSearches') : t('bible.suggestions')}
      </Text>
      <View style={styles.bookGrid}>
        {queries.map((query) => (
          <Pressable key={query.text} onPress={() => onSelect(query.text)} style={styles.bookChip}>
            <Text style={styles.bookChipLabel}>{query.text}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function SearchResults({
  verses,
  nextPage,
  onSelect,
  onLoadMore,
}: {
  verses: readonly BibleSearchResult[];
  nextPage: 'none' | 'available' | 'loading' | 'failed';
  onSelect: (result: BibleSearchResult) => void;
  onLoadMore: () => void;
}) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { t } = useTranslation();

  return (
    <View style={styles.bookListContainer}>
      {verses.map((result) => (
        <SearchResultRow key={result.id} result={result} onPress={() => onSelect(result)} />
      ))}
      {nextPage === 'available' || nextPage === 'loading' ? (
        <Pressable onPress={onLoadMore} disabled={nextPage === 'loading'}>
          <Text style={styles.backLink}>
            {nextPage === 'loading' ? t('bible.searching') : t('bible.loadMore')}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Um resultado de busca: referência legível (ex.: Salmos 27:14) + o texto do versículo. */
function SearchResultRow({ result, onPress }: { result: BibleSearchResult; onPress: () => void }) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { passage, loading } = useVersePassage(DEFAULT_BIBLE_VERSION_ID, result.id);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={passage?.reference ?? result.id}
      style={({ pressed }) => [styles.resultRow, pressed && styles.resultRowPressed]}
    >
      <Text style={styles.resultReference}>{passage?.reference ?? result.id}</Text>
      {loading && !passage ? (
        <>
          <Skeleton height={14} radius={7} />
          <Skeleton height={14} width="70%" radius={7} />
        </>
      ) : passage ? (
        <Text style={styles.resultText} numberOfLines={3}>
          {plainTextFromHtml(passage.content)}
        </Text>
      ) : null}
    </Pressable>
  );
}

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    errorBox: {
      gap: theme.spacing.sm,
    },
    errorDetail: {
      ...theme.typography.caption,
      color: theme.colors.muted,
      textAlign: 'center',
    },
    helperText: {
      ...theme.typography.body,
      color: theme.colors.muted,
      textAlign: 'center',
      paddingVertical: theme.spacing.md,
    },
    bookListContainer: {
      gap: theme.spacing.md,
    },
    bookGroup: {
      gap: theme.spacing.sm,
    },
    groupTitle: {
      ...theme.typography.bodyStrong,
      color: theme.colors.muted,
    },
    bookGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
    },
    bookChip: {
      backgroundColor: theme.colors.white,
      borderWidth: 2.5,
      borderColor: theme.colors.ink,
      borderRadius: theme.radius.pill,
      paddingVertical: 8,
      paddingHorizontal: 14,
      ...theme.shadow.chip,
    },
    chapterChip: {
      backgroundColor: theme.colors.white,
      borderWidth: 2.5,
      borderColor: theme.colors.ink,
      borderRadius: theme.radius.pill,
      minWidth: 44,
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 12,
      ...theme.shadow.chip,
    },
    bookChipLabel: {
      ...theme.typography.button,
      fontSize: 14,
      color: theme.colors.ink,
    },
    backLink: {
      ...theme.typography.bodyStrong,
      color: theme.colors.ink,
    },
    readerCard: {
      gap: theme.spacing.sm,
      backgroundColor: theme.colors.blue,
    },
    readerReference: {
      ...theme.typography.heading,
      color: theme.colors.ink,
    },
    readerText: {
      ...theme.typography.body,
      fontSize: 18,
      lineHeight: 26,
      color: theme.colors.ink,
    },
    verseList: {
      gap: theme.spacing.sm,
    },
    verseRow: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    verseNumber: {
      ...theme.typography.bodyStrong,
      width: 26,
      fontSize: 14,
      lineHeight: 26,
      textAlign: 'right',
      color: theme.colors.ink,
      opacity: 0.7,
    },
    verseText: {
      ...theme.typography.body,
      flex: 1,
      fontSize: 18,
      lineHeight: 26,
      color: theme.colors.ink,
    },
    verseRowMarked: {
      backgroundColor: theme.colors.yellow,
      borderRadius: theme.radius.sm,
      marginHorizontal: -theme.spacing.xs,
      paddingHorizontal: theme.spacing.xs,
      paddingVertical: theme.spacing.xs,
    },
    resultRow: {
      backgroundColor: theme.colors.white,
      borderWidth: 2.5,
      borderColor: theme.colors.ink,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
      gap: theme.spacing.xs,
    },
    resultRowPressed: {
      opacity: 0.7,
    },
    resultReference: {
      ...theme.typography.bodyStrong,
      color: theme.colors.ink,
    },
    resultText: {
      ...theme.typography.body,
      fontSize: 15,
      lineHeight: 21,
      color: theme.colors.ink,
    },
  });
