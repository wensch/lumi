import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useBibleSearch, type BibleSearchResult } from '@youversion/platform-react-hooks';
import type { BibleBook } from '@youversion/platform-core';
import { Card, Screen, ScreenHeader, Skeleton, TextField } from '@/components';
import {
  DEFAULT_BIBLE_VERSION_ID,
  useBibleBook,
  useBibleBooks,
  useBibleChapterText,
} from '@/features/bible';
import { useTheme, type Theme } from '@/theme';
import { useTranslation } from '@/i18n';

type ViewState =
  | { kind: 'list' }
  | { kind: 'chapters'; bookId: string }
  | { kind: 'reader'; bookId: string; chapter: number };

export default function BibliaScreen() {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { t } = useTranslation();
  const [view, setView] = useState<ViewState>({ kind: 'list' });
  const search = useBibleSearch({ versionId: DEFAULT_BIBLE_VERSION_ID });

  const openResult = (result: BibleSearchResult) => {
    setView({ kind: 'reader', bookId: result.book, chapter: Number(result.chapter) });
  };

  const openBook = (bookId: string) => setView({ kind: 'chapters', bookId });
  const openChapter = (bookId: string, chapter: number) =>
    setView({ kind: 'reader', bookId, chapter });
  const backToList = () => setView({ kind: 'list' });
  const backToChapters = (bookId: string) => setView({ kind: 'chapters', bookId });

  return (
    <Screen>
      <ScreenHeader title={t('tabs.bible')} />

      <TextField
        label={t('bible.searchLabel')}
        placeholder={t('bible.searchPlaceholder')}
        value={search.query}
        onChangeText={search.setQuery}
        onSubmitEditing={search.submit}
        returnKeyType="search"
      />

      {search.phase.kind === 'trending' && view.kind === 'list' ? (
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

      {search.phase.kind === 'trending' && view.kind === 'chapters' ? (
        <ChapterGrid bookId={view.bookId} onSelectChapter={openChapter} onBack={backToList} />
      ) : null}

      {search.phase.kind === 'trending' && view.kind === 'reader' ? (
        <ChapterReader
          bookId={view.bookId}
          chapter={view.chapter}
          onBack={() => backToChapters(view.bookId)}
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
  return (
    <View style={styles.errorBox}>
      <Text style={styles.helperText}>{t('bible.errorLoading')}</Text>
      <Text style={styles.errorDetail} selectable>
        {detail}
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
  onBack,
}: {
  bookId: string;
  chapter: number;
  onBack: () => void;
}) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { t } = useTranslation();
  const { passage, loading, error } = useBibleChapterText(bookId, chapter);

  return (
    <View style={styles.bookListContainer}>
      <Pressable onPress={onBack}>
        <Text style={styles.backLink}>{`← ${t('bible.chapters')}`}</Text>
      </Pressable>

      {loading ? <Text style={styles.helperText}>{t('bible.loadingChapter')}</Text> : null}
      {error ? <BibleError error={error} /> : null}

      {passage ? (
        <Card style={styles.readerCard}>
          <Text style={styles.readerReference}>{passage.reference}</Text>
          <Text style={styles.readerText}>{passage.content}</Text>
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
        <Pressable key={result.id} onPress={() => onSelect(result)} style={styles.resultRow}>
          <Text style={styles.bookChipLabel}>{result.id}</Text>
        </Pressable>
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
    resultRow: {
      backgroundColor: theme.colors.white,
      borderWidth: 2.5,
      borderColor: theme.colors.ink,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
    },
  });
