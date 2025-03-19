import { apis, events } from '@affine/electron-api';
import { useEffect, useState } from 'react';

import * as styles from './styles.css';

type ElectronNotification = {
  type: 'meeting';
  icon?: Buffer;
  appName: string;
  processGroupId: number;
};

const useCurrentNotification = () => {
  const [notification, setNotification] = useState<ElectronNotification | null>(
    null
  );

  useEffect(() => {
    const fetchNotification = async () => {
      const notification = await apis?.popup?.getCurrentNotification();
      if (notification) {
        setNotification(notification);
      }
    };
    fetchNotification().catch(error => {
      console.error('Failed to fetch notification', error);
    });

    if (events?.popup?.onNotificationChanged) {
      const unsubscribe = events.popup.onNotificationChanged(setNotification);
      return () => {
        unsubscribe();
      };
    }
    return () => {};
  }, []);

  return notification;
};

const useBlobUrl = (buffer?: Buffer) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!buffer) {
      return;
    }
    const url = URL.createObjectURL(new Blob([buffer]));
    setBlobUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [buffer]);

  return blobUrl;
};

function MeetingNotification({
  notification,
}: {
  notification: ElectronNotification;
}) {
  const blobUrl = useBlobUrl(notification.icon);

  return (
    <div className={styles.root}>
      {notification.type === 'meeting' && (
        <div className={styles.meetingNotification}>
          <div className={styles.icon}>
            <img src={blobUrl ?? undefined} alt={notification.appName} />
          </div>
          <div className={styles.content}>
            <h3>{notification.appName}</h3>
            <p>Meeting started</p>
          </div>
        </div>
      )}
    </div>
  );
}

export function Notification() {
  const notification = useCurrentNotification();

  // only show meeting notification for now
  if (!notification || notification.type !== 'meeting') {
    return null;
  }

  return <MeetingNotification notification={notification} />;
}
