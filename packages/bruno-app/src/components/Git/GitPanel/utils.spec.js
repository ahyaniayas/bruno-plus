import { splitFilePath, statusLetter, statusClass, formatStashStats } from './utils';

describe('splitFilePath', () => {
  it('splits a nested path into directory and file name', () => {
    expect(splitFilePath('collection/folder/request.bru')).toEqual({
      dir: 'collection/folder/',
      name: 'request.bru'
    });
  });

  it('handles a top-level file with no directory', () => {
    expect(splitFilePath('bruno.json')).toEqual({ dir: '', name: 'bruno.json' });
  });

  it('normalises windows separators', () => {
    expect(splitFilePath('collection\\request.bru')).toEqual({ dir: 'collection/', name: 'request.bru' });
  });

  it('handles an empty path', () => {
    expect(splitFilePath()).toEqual({ dir: '', name: '' });
  });
});

describe('statusLetter', () => {
  it.each([
    ['M', 'M'],
    ['A', 'A'],
    ['D', 'D'],
    ['R', 'R'],
    ['U', '!']
  ])('maps %s to %s', (input, expected) => {
    expect(statusLetter(input)).toBe(expected);
  });

  it('shows an untracked file as added', () => {
    expect(statusLetter('?')).toBe('A');
  });

  it('falls back to modified for an unknown status', () => {
    expect(statusLetter('Z')).toBe('M');
  });
});

describe('statusClass', () => {
  it.each([
    ['A', 'added'],
    ['?', 'added'],
    ['D', 'deleted'],
    ['U', 'conflicted'],
    ['M', 'modified']
  ])('maps %s to %s', (input, expected) => {
    expect(statusClass(input)).toBe(expected);
  });
});

describe('formatStashStats', () => {
  it('summarises files, insertions and deletions', () => {
    expect(formatStashStats({ filesChanged: 3, insertions: 12, deletions: 4 })).toBe('3 files, +12, -4');
  });

  it('uses the singular for one file', () => {
    expect(formatStashStats({ filesChanged: 1, insertions: 2 })).toBe('1 file, +2');
  });

  it('omits zero values', () => {
    expect(formatStashStats({ filesChanged: 2, insertions: 0, deletions: 0 })).toBe('2 files');
  });

  it('returns an empty string when there is nothing to show', () => {
    expect(formatStashStats({})).toBe('');
  });
});
