import { join } from 'node:path';

import { BrowserWindow, type BrowserWindowConstructorOptions } from 'electron';
import { BehaviorSubject } from 'rxjs';

import { popupViewUrl } from '../constants';
import { logger } from '../logger';
import type { MainEventRegister, NamespaceHandlers } from '../type';
import { getCurrentDisplay } from './utils';

type PopupWindowType = 'notification' | 'recording';

async function getAdditionalArguments(name: string) {
  const { getExposedMeta } = await import('../exposed');
  const mainExposedMeta = getExposedMeta();
  return [
    `--main-exposed-meta=` + JSON.stringify(mainExposedMeta),
    `--window-name=${name}`,
  ];
}

const POPUP_PADDING = 20; // padding between the popup and the edge of the screen

abstract class PopupWindow {
  abstract readonly type: PopupWindowType;
  abstract readonly name: string;
  browserWindow: BrowserWindow | undefined;

  abstract windowOptions: Partial<BrowserWindowConstructorOptions>;

  resolveReady: () => void = () => {};
  ready = new Promise<void>(resolve => {
    this.resolveReady = resolve;
  });

  async build(): Promise<BrowserWindow> {
    const browserWindow = new BrowserWindow({
      ...this.windowOptions,
      resizable: false,
      minimizable: false,
      maximizable: false,
      closable: false,
      alwaysOnTop: true,
      focusable: false,
      hiddenInMissionControl: true,
      movable: false,
      titleBarStyle: 'hidden',
      show: false, // hide by default,
      backgroundColor: 'transparent',
      visualEffectState: 'active',
      vibrancy: 'under-window',
      webPreferences: {
        ...this.windowOptions.webPreferences,
        webgl: true,
        contextIsolation: true,
        sandbox: false,
        transparent: true,
        spellcheck: false,
        preload: join(__dirname, './preload.js'), // this points to the bundled preload module
        // serialize exposed meta that to be used in preload
        additionalArguments: await getAdditionalArguments(this.name),
      },
    });

    // required to make the window transparent
    browserWindow.setBackgroundColor('#00000000');

    browserWindow.loadURL(popupViewUrl).catch(err => logger.error(err));
    browserWindow.on('ready-to-show', () => {
      browserWindow.webContents.on('did-finish-load', () => {
        this.resolveReady();
      });
    });
    return browserWindow;
  }

  async show() {
    if (!this.browserWindow) {
      this.browserWindow = await this.build();
    }
    const browserWindow = this.browserWindow;
    const workArea = getCurrentDisplay(browserWindow).workArea;
    const popupSize = browserWindow.getSize();

    await this.ready;

    browserWindow.showInactive(); // focus the notification is too distracting right?
    browserWindow.setOpacity(1);

    // make sure the window starts from the right edge of the screen
    browserWindow.setPosition(
      workArea.x + workArea.width + popupSize[0] + POPUP_PADDING,
      workArea.y + POPUP_PADDING,
      false
    );

    setTimeout(() => {
      // slide the window from the right edge of the screen
      browserWindow.setPosition(
        workArea.x + workArea.width - popupSize[0] - POPUP_PADDING,
        workArea.y + POPUP_PADDING,
        true
      );
    });
  }

  async hide() {
    if (!this.browserWindow) {
      return;
    }
    // hide in 0.2s in 60fps
    const duration = 200;
    const fps = 60;
    const steps = duration / (1000 / fps);
    for (let i = 0; i < steps; i++) {
      this.browserWindow.setOpacity(1 - i / steps);
      await new Promise(resolve => setTimeout(resolve, 1000 / fps));
    }
    this.browserWindow?.hide();
  }

  destroy() {
    this.browserWindow?.destroy();
  }
}

// may need to have other types of notifications
type ElectronNotification = {
  type: 'meeting';
  icon?: Buffer;
  appName: string;
  processGroupId: number;
};

class NotificationPopupWindow extends PopupWindow {
  readonly type = 'notification' as const;
  readonly name = `${this.type}`;

  notification$ = new BehaviorSubject<ElectronNotification | null>(null);

  windowOptions: Partial<BrowserWindowConstructorOptions> = {
    useContentSize: true,
    width: 300,
    height: 128,
  };

  async notify(notification: ElectronNotification) {
    this.notification$.next(notification);
    await super.show();
  }
}

// recording popup window is singleton across the app
class RecordingPopupWindow extends PopupWindow {
  readonly type = 'recording' as const;
  readonly name = `${this.type}`;
  windowOptions: Partial<BrowserWindowConstructorOptions> = {
    useContentSize: true,
    width: 300,
    height: 36,
  };
}

// Type mapping from PopupWindowType to specific window class
type PopupWindowTypeMap = {
  notification: NotificationPopupWindow;
  recording: RecordingPopupWindow;
};

export class PopupManager {
  static readonly instance = new PopupManager();
  // there could be a single instance of each type of popup window
  readonly popupWindows$ = new BehaviorSubject<Map<string, PopupWindow>>(
    new Map()
  );

  get<T extends PopupWindowType>(type: T): PopupWindowTypeMap[T] {
    // Check if popup of this type already exists
    const existingPopup = Array.from(this.popupWindows$.value.values()).find(
      popup => popup.type === type
    ) as PopupWindowTypeMap[T] | undefined;

    // If exists, return it
    if (existingPopup) {
      return existingPopup;
    }

    // Otherwise create a new one
    const popupWindow = (() => {
      switch (type) {
        case 'notification':
          return new NotificationPopupWindow() as PopupWindowTypeMap[T];
        case 'recording':
          return new RecordingPopupWindow() as PopupWindowTypeMap[T];
      }
    })();

    this.popupWindows$.next(
      new Map(this.popupWindows$.value).set(popupWindow.type, popupWindow)
    );
    return popupWindow;
  }
}

export const popupManager = PopupManager.instance;

export const popupHandlers = {
  getCurrentNotification: async () => {
    const notification = popupManager.get('notification').notification$.value;
    if (!notification) {
      return null;
    }
    return notification;
  },
} satisfies NamespaceHandlers;

export const popupEvents = {
  onNotificationChanged: (
    callback: (notification: ElectronNotification | null) => void
  ) => {
    const notification = popupManager.get('notification');
    const sub = notification.notification$.subscribe(notification => {
      callback(notification);
    });
    return () => {
      sub.unsubscribe();
    };
  },
} satisfies Record<string, MainEventRegister>;
