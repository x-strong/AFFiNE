import { ThemeProvider } from '@affine/core/components/theme-provider';
import { configureEssentialThemeModule } from '@affine/core/modules/theme';
import { appInfo } from '@affine/electron-api';
import { Framework, FrameworkRoot } from '@toeverything/infra';

import * as styles from './app.css';
import { Notification } from './notification';
import { Recording } from './recording';

const framework = new Framework();
configureEssentialThemeModule(framework);
const frameworkProvider = framework.provider();

const mode = appInfo?.windowName as 'notification' | 'recording';

export function App() {
  return (
    <FrameworkRoot framework={frameworkProvider}>
      <ThemeProvider>
        <div className={styles.root}>
          {mode === 'notification' && <Notification />}
          {mode === 'recording' && <Recording />}
        </div>
      </ThemeProvider>
    </FrameworkRoot>
  );
}
