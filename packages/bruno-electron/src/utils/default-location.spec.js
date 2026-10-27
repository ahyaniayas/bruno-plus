jest.mock('electron', () => ({
  app: { getPath: jest.fn() }
}));

const fs = require('node:fs');
const path = require('node:path');
const { app } = require('electron');

const DOCUMENTS = '/home/user/Documents';
const USER_DATA = '/home/user/.config/brunoplus';

app.getPath.mockImplementation((name) => {
  if (name === 'documents') return DOCUMENTS;
  if (name === 'userData') return USER_DATA;
  throw new Error(`unexpected path: ${name}`);
});

describe('resolveDefaultLocation', () => {
  let resolveDefaultLocation;
  let mkdirSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    mkdirSpy = jest.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    ({ resolveDefaultLocation } = require('./default-location'));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('stores collections under Documents/brunoplus', () => {
    expect(resolveDefaultLocation()).toBe(path.join(DOCUMENTS, 'brunoplus'));
  });

  it('creates the directory before returning it', () => {
    resolveDefaultLocation();

    expect(mkdirSpy).toHaveBeenCalledWith(path.join(DOCUMENTS, 'brunoplus'), { recursive: true });
  });

  it('does not fall back to the legacy "bruno" directory', () => {
    resolveDefaultLocation();

    const created = mkdirSpy.mock.calls.map((call) => call[0]);
    expect(created).not.toContain(path.join(DOCUMENTS, 'bruno'));
  });

  it('falls back to userData when Documents cannot be created', () => {
    mkdirSpy.mockImplementation((dirPath) => {
      if (dirPath === path.join(DOCUMENTS, 'brunoplus')) {
        throw new Error('permission denied');
      }
      return undefined;
    });

    expect(resolveDefaultLocation()).toBe(USER_DATA);
  });

  it('throws when no candidate directory can be created', () => {
    mkdirSpy.mockImplementation(() => {
      throw new Error('permission denied');
    });

    expect(() => resolveDefaultLocation()).toThrow('Failed to create default location');
  });
});
