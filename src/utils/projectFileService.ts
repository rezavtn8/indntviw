import JSZip from 'jszip';
import { PersistedWorkspace } from '@/utils/storageService';

const FILE_EXTENSION = '.indentview';
const WORKSPACE_JSON = 'workspace.json';
const CURRENT_VERSION = 1;

/**
 * Serialize and compress the workspace into a .indentview file and trigger download.
 */
export async function saveProjectToFile(workspace: PersistedWorkspace): Promise<void> {
  const zip = new JSZip();
  const json = JSON.stringify(workspace);
  zip.file(WORKSPACE_JSON, json);

  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });

  const date = new Date().toISOString().slice(0, 10);
  const fileName = `IndentView_${date}${FILE_EXTENSION}`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Read and decompress a .indentview file, returning the parsed workspace.
 */
export async function loadProjectFromFile(file: File): Promise<PersistedWorkspace> {
  if (!file.name.endsWith(FILE_EXTENSION)) {
    throw new Error(`Invalid file type. Expected a ${FILE_EXTENSION} file.`);
  }

  const zip = await JSZip.loadAsync(file);
  const entry = zip.file(WORKSPACE_JSON);

  if (!entry) {
    throw new Error('Invalid project file: missing workspace data.');
  }

  const json = await entry.async('string');
  const workspace: PersistedWorkspace = JSON.parse(json);

  // Version validation
  if (!workspace.version || typeof workspace.version !== 'number') {
    throw new Error('Invalid project file: missing version info.');
  }

  if (workspace.version > CURRENT_VERSION) {
    throw new Error(
      `This project file was created with a newer version (v${workspace.version}). Please update the app.`
    );
  }

  // Basic structure validation
  if (!Array.isArray(workspace.sessions) || workspace.sessions.length === 0) {
    throw new Error('Invalid project file: no session data found.');
  }

  return workspace;
}
