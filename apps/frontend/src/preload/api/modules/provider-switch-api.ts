/**
 * Provider Switch API
 *
 * Exposes provider switch confirmation functionality to the renderer.
 * Allows the UI to check for pending switch requests, submit answers,
 * and watch for new requests.
 */

import { ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../../../shared/constants/ipc';
import type { IPCResult } from '../../../shared/types/common';
import type { ProviderSwitchRequest, ProviderSwitchChoice } from '../../../shared/types/human-input';

export interface ProviderSwitchAPI {
  /** Check for pending provider switch request in a spec directory */
  providerSwitchCheck: (specPath: string) => Promise<IPCResult<ProviderSwitchRequest | null>>;

  /** Submit a choice to a provider switch request */
  providerSwitchAnswer: (specPath: string, choice: ProviderSwitchChoice) => Promise<IPCResult<void>>;

  /** Start watching a spec directory for provider switch requests */
  providerSwitchWatch: (specPath: string) => Promise<IPCResult<void>>;

  /** Stop watching a spec directory for provider switch requests */
  providerSwitchUnwatch: (specPath: string) => Promise<IPCResult<void>>;

  /** Listen for provider switch change events */
  onProviderSwitchChanged: (
    callback: (data: { specPath: string; request: ProviderSwitchRequest }) => void
  ) => () => void;
}

export function createProviderSwitchAPI(): ProviderSwitchAPI {
  return {
    providerSwitchCheck: (specPath: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.PROVIDER_SWITCH_CHECK, specPath),

    providerSwitchAnswer: (specPath: string, choice: ProviderSwitchChoice) =>
      ipcRenderer.invoke(IPC_CHANNELS.PROVIDER_SWITCH_ANSWER, specPath, choice),

    providerSwitchWatch: (specPath: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.PROVIDER_SWITCH_WATCH, specPath),

    providerSwitchUnwatch: (specPath: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.PROVIDER_SWITCH_UNWATCH, specPath),

    onProviderSwitchChanged: (callback) => {
      const handler = (
        _event: Electron.IpcRendererEvent,
        data: { specPath: string; request: ProviderSwitchRequest }
      ) => {
        callback(data);
      };

      ipcRenderer.on(IPC_CHANNELS.PROVIDER_SWITCH_CHANGED, handler);

      // Return cleanup function
      return () => {
        ipcRenderer.removeListener(IPC_CHANNELS.PROVIDER_SWITCH_CHANGED, handler);
      };
    },
  };
}
