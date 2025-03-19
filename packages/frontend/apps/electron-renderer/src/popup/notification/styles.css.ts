import { globalStyle, style } from '@vanilla-extract/css';

export const root = style({
  width: '100%',
  height: '100%',
  padding: '12px',
  background: '#ffffff',
  borderRadius: '8px',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
  overflow: 'hidden',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  border: '1px solid rgba(0, 0, 0, 0.1)',
});

export const meetingNotification = style({
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
});

export const icon = style({
  width: '36px',
  height: '36px',
  borderRadius: '4px',
  overflow: 'hidden',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#fff',
  flexShrink: 0,
});

globalStyle(`${icon} img`, {
  width: '100%',
  height: '100%',
  objectFit: 'contain',
});

export const content = style({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
});

globalStyle(`${content} h3`, {
  margin: 0,
  fontSize: '14px',
  fontWeight: 400,
  color: '#1d1c1d',
  lineHeight: 1.4,
});

globalStyle(`${content} p`, {
  margin: 0,
  fontSize: '14px',
  color: '#616061',
  lineHeight: 1.4,
});
