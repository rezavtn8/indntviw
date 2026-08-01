/**
 * Single source of truth for the application version.
 *
 * Keep this in step with the `version` field in package.json. It is displayed
 * in the app header and stamped into saved project files, so that a workspace
 * can be traced back to the build that produced it — which matters when the
 * statistical methods change between releases.
 */
export const APP_VERSION = '2.3.0';

/** Short form for the header badge. */
export const APP_VERSION_LABEL = 'v2.3';

export const APP_NAME = 'IndentView';

/**
 * Public source repository.
 *
 * This is not decoration. IndentView is licensed under the AGPL-3.0, and
 * section 13 requires that anyone interacting with the software over a network
 * be offered the Corresponding Source of the version they are running. For a
 * browser application that means a visible, working link to this repository in
 * the interface itself — shipping the built bundle without it is a licence
 * violation, including for anyone who forks and hosts a modified copy.
 */
export const SOURCE_URL = 'https://github.com/rezavtn8/indntviw';

export const LICENSE_NAME = 'AGPL-3.0';
