/**
 * xlsxUiImport.test.jsx — Agent 5 (Task H1 regression).
 * The exact production crash ("Cannot read properties of undefined (reading 'map')")
 * was a missing await on async parseXlsx inside parseImport: a Promise shipped as
 * ParsedImport. This drives the real xlsx through the real UI import path and
 * asserts the seeded counts — plus the friendly-error contract (readable messages,
 * never raw JS strings).
 */
/** @vitest-environment jsdom */
import 'fake-indexeddb/auto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { clearAllTables } from '../src/data/db.js';
import { listBomItems } from '../src/data/bomRepo.js';
import { countUnresolved } from '../src/data/shortageRepo.js';
import { listProjectSuppliers, listSuppliers } from '../src/data/supplierRepo.js';
import { friendlyImportError, isEmptyImport } from '../src/utils/importParser/index.js';
import ProjectsScreen from '../src/screens/ProjectsScreen.jsx';

afterEach(() => cleanup());

const dir = path.dirname(fileURLToPath(import.meta.url));
const xlsxPath = path.join(dir, 'fixtures/Surau_Darul_Dakwah_BOM_A7_Grounded_Sourcing.xlsx');

const dropXlsxThroughUi = async () => {
  const buf = fs.readFileSync(xlsxPath);
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  const opened = vi.fn();
  const ui = render(<ProjectsScreen onOpenProject={opened} />);
  const input = ui.container.querySelector('input[type="file"]');
  const file = new File([ab], 'Surau_Darul_Dakwah_BOM_A7_Grounded_Sourcing.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  fireEvent.change(input, { target: { files: [file] } });
  await waitFor(() => expect(opened).toHaveBeenCalledTimes(1), { timeout: 10000 });
  const projectId = opened.mock.calls[0][0];
  ui.unmount();
  return projectId;
};

beforeEach(async () => {
  await clearAllTables();
});

describe('H1: real xlsx imports through the UI (no crash, exact counts)', () => {
  it('seeds 52 BOM / 6 confirm / 14 suppliers with zero pendings', async () => {
    const projectId = await dropXlsxThroughUi();
    expect((await listBomItems(projectId))).toHaveLength(52);
    expect(await countUnresolved(projectId)).toBe(6);
    expect((await listProjectSuppliers(projectId))).toHaveLength(14);
    expect((await listSuppliers())).toHaveLength(14);
  });

  it('failures surface as readable messages, never raw JS errors', () => {
    expect(friendlyImportError(new Error("Cannot read properties of undefined (reading 'map')")))
      .toBe("Couldn't read this file — check it matches the expected 8-section .md/.xlsx format.");
    expect(friendlyImportError(new Error('password protected file')))
      .toMatch(/password-protected/i);
    expect(friendlyImportError(new Error('no recognizable BOM content')))
      .toMatch(/No recognizable BOM section/i);
    expect(isEmptyImport({ projectTitle: 'X', bomItems: [], shortageConfirmItems: [], supplierEntries: [], changeLogFromAgent: [] })).toBe(true);
    expect(isEmptyImport({ projectTitle: 'X', bomItems: [{ item: 'A' }], shortageConfirmItems: [], supplierEntries: [], changeLogFromAgent: [] })).toBe(false);
  });
});
