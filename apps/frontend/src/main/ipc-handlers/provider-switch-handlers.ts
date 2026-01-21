/**
 * Provider Switch IPC Handlers
 *
 * Handles communication between the Electron renderer and the backend
 * for the provider switch confirmation system. Monitors provider_switch.json files
 * in spec directories and notifies the UI when a provider switch is requested.
 */

import { ipcMain, BrowserWindow } from 'electron';
import { watch, FSWatcher } from 'fs';
import { readFile, writeFile, access } from 'fs/promises';
import * as path from 'path';

import { IPC_CHANNELS } from '../../shared/constants';
import type {
  IPCResult,
  ProviderSwitchRequest,
  ProviderSwitchChoice,
} from '../../shared/types';

// Track active file watchers by spec path
const activeWatchers: Map<string, FSWatcher> = new Map();

/**
 * Read the provider_switch.json file from a spec directory
 */
async function readProviderSwitchFile(specPath: string): Promise<ProviderSwitchRequest | null> {
  const switchFile = path.join(specPath, 'provider_switch.json');

  try {
    await access(switchFile);
    const content = await readFile(switchFile, 'utf-8');
    return JSON.parse(content) as ProviderSwitchRequest;
  } catch {
    return null;
  }
}

/**
 * Write the provider_switch.json file to a spec directory
 */
async function writeProviderSwitchFile(specPath: string, data: ProviderSwitchRequest): Promise<void> {
  const switchFile = path.join(specPath, 'provider_switch.json');
  await writeFile(switchFile, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Register all provider switch IPC handlers
 */
export function registerProviderSwitchHandlers(getMainWindow: () => BrowserWindow | null): void {
  /**
   * Check for pending provider switch request in a spec directory
   * Returns the request if status is 'pending', null otherwise
   */
  ipcMain.handle(
    IPC_CHANNELS.PROVIDER_SWITCH_CHECK,
    async (_, specPath: string): Promise<IPCResult<ProviderSwitchRequest | null>> => {
      try {
        const data = await readProviderSwitchFile(specPath);

        if (data && data.status === 'pending') {
          return { success: true, data };
        }

        return { success: true, data: null };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to check provider switch',
        };
      }
    }
  );

  /**
   * Submit an answer to a provider switch request
   */
  ipcMain.handle(
    IPC_CHANNELS.PROVIDER_SWITCH_ANSWER,
    async (_, specPath: string, choice: ProviderSwitchChoice): Promise<IPCResult<void>> => {
      try {
        const data = await readProviderSwitchFile(specPath);

        if (!data) {
          return {
            success: false,
            error: 'No provider switch request found',
          };
        }

        if (data.status !== 'pending') {
          return {
            success: false,
            error: `Request is not pending (status: ${data.status})`,
          };
        }

        // Update the request with the user's choice
        data.status = choice === 'switch' ? 'approved' : 'rejected';
        data.user_choice = choice;
        data.answered_at = new Date().toISOString();

        await writeProviderSwitchFile(specPath, data);

        return { success: true, data: undefined };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to submit answer',
        };
      }
    }
  );

  /**
   * Start watching a spec directory for provider switch requests
   */
  ipcMain.handle(
    IPC_CHANNELS.PROVIDER_SWITCH_WATCH,
    async (_, specPath: string): Promise<IPCResult<void>> => {
      try {
        // Stop existing watcher if any
        const existingWatcher = activeWatchers.get(specPath);
        if (existingWatcher) {
          existingWatcher.close();
          activeWatchers.delete(specPath);
        }

        const mainWindow = getMainWindow();

        // Create a watcher for the spec directory
        const watcher = watch(specPath, { persistent: false }, async (eventType, filename) => {
          // Only react to changes to provider_switch.json
          if (filename !== 'provider_switch.json') {
            return;
          }

          try {
            const data = await readProviderSwitchFile(specPath);

            if (data && data.status === 'pending' && mainWindow && !mainWindow.isDestroyed()) {
              // Notify renderer about the new request
              mainWindow.webContents.send(IPC_CHANNELS.PROVIDER_SWITCH_CHANGED, {
                specPath,
                request: data,
              });
            }
          } catch {
            // File might be in the middle of being written, ignore errors
          }
        });

        activeWatchers.set(specPath, watcher);

        // Also check immediately for existing pending request
        const data = await readProviderSwitchFile(specPath);
        if (data && data.status === 'pending' && mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send(IPC_CHANNELS.PROVIDER_SWITCH_CHANGED, {
            specPath,
            request: data,
          });
        }

        return { success: true, data: undefined };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to start watching',
        };
      }
    }
  );

  /**
   * Stop watching a spec directory for provider switch requests
   */
  ipcMain.handle(
    IPC_CHANNELS.PROVIDER_SWITCH_UNWATCH,
    async (_, specPath: string): Promise<IPCResult<void>> => {
      try {
        const watcher = activeWatchers.get(specPath);
        if (watcher) {
          watcher.close();
          activeWatchers.delete(specPath);
        }

        return { success: true, data: undefined };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to stop watching',
        };
      }
    }
  );
}

/**
 * Cleanup all active watchers (call on app quit)
 */
export function cleanupProviderSwitchWatchers(): void {
  for (const watcher of activeWatchers.values()) {
    watcher.close();
  }
  activeWatchers.clear();
}
