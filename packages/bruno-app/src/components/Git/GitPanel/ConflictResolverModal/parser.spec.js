import { parseConflicts, resolveConflictInText, resolveAllConflictsInText } from './parser';

describe('Conflict parser & resolution utilities', () => {
  const sample = `function test() {
<<<<<<< HEAD
  const mode = 'current';
=======
  const mode = 'incoming';
>>>>>>> origin/main
  return mode;
}`;

  it('parses conflict markers accurately', () => {
    const conflicts = parseConflicts(sample);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toMatchObject({
      startLine: 1,
      separatorLine: 3,
      endLine: 5,
      currentLabel: 'HEAD',
      incomingLabel: 'origin/main',
      currentContent: '  const mode = \'current\';',
      incomingContent: '  const mode = \'incoming\';'
    });
  });

  it('resolves conflict using current change', () => {
    const conflicts = parseConflicts(sample);
    const resolved = resolveConflictInText(sample, conflicts[0], 'current');
    expect(resolved).toBe(`function test() {
  const mode = 'current';
  return mode;
}`);
    expect(parseConflicts(resolved)).toHaveLength(0);
  });

  it('resolves conflict using incoming change', () => {
    const conflicts = parseConflicts(sample);
    const resolved = resolveConflictInText(sample, conflicts[0], 'incoming');
    expect(resolved).toBe(`function test() {
  const mode = 'incoming';
  return mode;
}`);
    expect(parseConflicts(resolved)).toHaveLength(0);
  });

  it('resolves conflict keeping both changes', () => {
    const conflicts = parseConflicts(sample);
    const resolved = resolveConflictInText(sample, conflicts[0], 'both');
    expect(resolved).toBe(`function test() {
  const mode = 'current';
  const mode = 'incoming';
  return mode;
}`);
    expect(parseConflicts(resolved)).toHaveLength(0);
  });

  it('resolves multiple conflicts with resolveAllConflictsInText', () => {
    const multiSample = `before
<<<<<<< HEAD
a1
=======
b1
>>>>>>> feature
middle
<<<<<<< HEAD
a2
=======
b2
>>>>>>> feature
after`;

    const resolvedCurrent = resolveAllConflictsInText(multiSample, 'current');
    expect(resolvedCurrent).toBe(`before
a1
middle
a2
after`);

    const resolvedIncoming = resolveAllConflictsInText(multiSample, 'incoming');
    expect(resolvedIncoming).toBe(`before
b1
middle
b2
after`);
  });
});
