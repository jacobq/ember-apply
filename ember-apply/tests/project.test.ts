/* eslint-disable @typescript-eslint/no-empty-function */
import path from 'path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { project } from '../src';
import { newEmberApp, newMonorepo, newTmpDir, readFile } from '../src/test-utils';

// Snapshot testing is broken for concurrent tests in vitest < v0.10.0
// see: https://github.com/vitest-dev/vitest/issues/551
let it = test.concurrent;

let original = process.cwd();

/// Convience utility function for translating somePath + '/x/y/z'
/// into path.join(somePath, 'x', 'y', 'x')
/// for OS independence (i.e. Windows support)
function makeOSIndependentPaths(root, subPaths) {
  return subPaths.map((slashPath) => path.join(root, ...slashPath.split('/')));
}

describe('project', () => {
  beforeEach(() => {
    process.chdir(original);
  });
  afterEach(() => {
    process.chdir(original);
  });

  describe(project.gitRoot.name, () => {
    it('in a git directory, it works', async () => {
      let root = await project.gitRoot();
      let expected = path.resolve(__dirname, '../..');

      expect(root).toEqual(expected);
    });

    it('in a non-git directory, it raises', async () => {
      let newDir = await newTmpDir();

      try {
        await project.inWorkspace(newDir, async () => {
          let root = await project.gitRoot();

          expect(root).toEqual(newDir);
        });
      } catch (e) {
        expect(e.message).toMatch(/not a git repository/);

        return;
      }

      expect(null).toEqual('Test should return before here due to error');
    });
  });

  describe(project.gitIgnore.name, () => {
    let tmpDir: string;

    beforeEach(async () => {
      tmpDir = await newEmberApp();
      process.chdir(tmpDir);
    });

    it('adds a new entry to the bottom', async () => {
      let text = await readFile(path.join(tmpDir, '.gitignore'));

      expect(text).not.toMatch(/test-test/);

      await project.gitIgnore('test-test');

      text = await readFile(path.join(tmpDir, '.gitignore'));

      expect(text).toMatch(/test-test$/);
    });

    it('adds a new entry under a header', async () => {
      let text = await readFile(path.join(tmpDir, '.gitignore'));

      expect(text).not.toMatch(/test-test/);

      await project.gitIgnore('test-test', '# misc');

      text = await readFile(path.join(tmpDir, '.gitignore'));
      expect(text).toMatch(/# misc(\s+)test-test/);
    });

    it('adds a new entry and a new a header', async () => {
      let text = await readFile(path.join(tmpDir, '.gitignore'));

      expect(text).not.toMatch('my-new-header');
      expect(text).not.toMatch('test-test');

      await project.gitIgnore('test-test', '# my-new-header');

      text = await readFile(path.join(tmpDir, '.gitignore'));

      expect(text).toMatch(/# my-new-header(\s+)test-test/);
    });
  });

  describe(project.inWorkspace.name, () => {
    beforeEach(async () => {});

    it.skip('changes the working directory', () => {});
  });

  describe(project.eachWorkspace.name, () => {
    let root: string;

    beforeEach(async () => {
      root = await newMonorepo(['packages/a', 'packages/b', 'packages/c', 'd']);

      process.chdir(root);
    });

    it('iterates each workspace', async () => {
      let workspaces: string[] = [];

      for await (let current of await project.eachWorkspace()) {
        workspaces.push(current);
      }

      expect(workspaces).toEqual(
        makeOSIndependentPaths(root, [
          '',
          '/packages/a',
          '/packages/b',
          '/packages/c',
          '/d'
        ])
      );
    });
  });

  describe('getWorkspaces + workspaceRoot', () => {
    it('lists workspaces', async () => {
      let workspaces = await project.getWorkspaces();
      let root = await project.workspaceRoot();

      expect(workspaces).toEqual(
        makeOSIndependentPaths(root, [
          '',
          'ember-apply',
          '/packages/docs',
          '/packages/ember/embroider',
          '/packages/ember/tailwind',
        ])
      );
    });
  });
});
