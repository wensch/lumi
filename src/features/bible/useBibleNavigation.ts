import { useBook, useBooks, usePassage } from '@youversion/platform-react-hooks';
import { DEFAULT_BIBLE_VERSION_ID } from './constants';

export function useBibleBooks() {
  const { books, loading, error } = useBooks(DEFAULT_BIBLE_VERSION_ID);
  return { books: books?.data ?? [], loading, error };
}

export function useBibleBook(bookId: string | null) {
  const { book, loading, error } = useBook(DEFAULT_BIBLE_VERSION_ID, bookId ?? '', {
    enabled: !!bookId,
  });
  return { book, loading, error };
}

export function useBibleChapterText(bookId: string | null, chapter: number | null) {
  const usfm = bookId && chapter ? `${bookId}.${chapter}` : '';
  const { passage, loading, error } = usePassage({
    versionId: DEFAULT_BIBLE_VERSION_ID,
    usfm,
    format: 'text',
    options: { enabled: !!usfm },
  });
  return { passage, loading, error };
}
