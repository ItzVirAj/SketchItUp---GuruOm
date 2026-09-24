export interface ParsedDeviceInfo {
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  deviceName: string;
}

/**
 * Server-side User-Agent parser that generates clean, human-friendly device and browser details.
 */
export function parseUserAgent(userAgent?: string | null): ParsedDeviceInfo {
  if (!userAgent || typeof userAgent !== 'string' || userAgent.trim() === '') {
    return {
      browser: 'Unknown Browser',
      browserVersion: '',
      os: 'Unknown OS',
      osVersion: '',
      deviceType: 'unknown',
      deviceName: 'Unknown Device'
    };
  }

  const ua = userAgent;

  // 1. Determine Device Type
  let deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown' = 'desktop';
  if (/iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))/i.test(ua)) {
    deviceType = 'tablet';
  } else if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|NetFront|Silk-Accelerated|(hpw|web)OS|Fennec|Minimo|Opera M(obi|ini)|Blazer|Dolfin|Dolphin|Skyfire|Zune/i.test(ua)) {
    deviceType = 'mobile';
  }

  // 2. Determine Operating System
  let os = 'Unknown OS';
  let osVersion = '';

  if (/Windows NT 10\.0/i.test(ua)) {
    os = 'Windows';
    osVersion = '11 / 10';
  } else if (/Windows NT 6\.3/i.test(ua)) {
    os = 'Windows';
    osVersion = '8.1';
  } else if (/Windows NT 6\.2/i.test(ua)) {
    os = 'Windows';
    osVersion = '8';
  } else if (/Windows NT 6\.1/i.test(ua)) {
    os = 'Windows';
    osVersion = '7';
  } else if (/Windows/i.test(ua)) {
    os = 'Windows';
  } else if (/iPhone OS (\d+[._]\d+)/i.test(ua)) {
    const match = ua.match(/iPhone OS (\d+[._]\d+)/i);
    os = 'iOS';
    osVersion = match ? match[1].replace('_', '.') : '';
  } else if (/iPad.*OS (\d+[._]\d+)/i.test(ua)) {
    const match = ua.match(/iPad.*OS (\d+[._]\d+)/i);
    os = 'iPadOS';
    osVersion = match ? match[1].replace('_', '.') : '';
  } else if (/Mac OS X (\d+[._]\d+)/i.test(ua)) {
    const match = ua.match(/Mac OS X (\d+[._]\d+)/i);
    os = 'macOS';
    osVersion = match ? match[1].replace('_', '.') : '';
  } else if (/Android (\d+(\.\d+)?)/i.test(ua)) {
    const match = ua.match(/Android (\d+(\.\d+)?)/i);
    os = 'Android';
    osVersion = match ? match[1] : '';
  } else if (/CrOS/i.test(ua)) {
    os = 'Chrome OS';
  } else if (/Ubuntu/i.test(ua)) {
    os = 'Ubuntu Linux';
  } else if (/Linux/i.test(ua)) {
    os = 'Linux';
  }

  // 3. Determine Browser Name & Version
  let browser = 'Browser';
  let browserVersion = '';

  if (/Edg\/(\d+(\.\d+)?)/i.test(ua)) {
    const match = ua.match(/Edg\/(\d+(\.\d+)?)/i);
    browser = 'Edge';
    browserVersion = match ? match[1].split('.')[0] : '';
  } else if (/OPR\/(\d+(\.\d+)?)|Opera\/(\d+(\.\d+)?)/i.test(ua)) {
    const match = ua.match(/(?:OPR|Opera)\/(\d+(\.\d+)?)/i);
    browser = 'Opera';
    browserVersion = match ? match[1].split('.')[0] : '';
  } else if (/SamsungBrowser\/(\d+(\.\d+)?)/i.test(ua)) {
    const match = ua.match(/SamsungBrowser\/(\d+(\.\d+)?)/i);
    browser = 'Samsung Internet';
    browserVersion = match ? match[1].split('.')[0] : '';
  } else if (/Chrome\/(\d+(\.\d+)?)/i.test(ua)) {
    const match = ua.match(/Chrome\/(\d+(\.\d+)?)/i);
    browser = 'Chrome';
    browserVersion = match ? match[1].split('.')[0] : '';
  } else if (/Firefox\/(\d+(\.\d+)?)/i.test(ua)) {
    const match = ua.match(/Firefox\/(\d+(\.\d+)?)/i);
    browser = 'Firefox';
    browserVersion = match ? match[1].split('.')[0] : '';
  } else if (/Version\/(\d+(\.\d+)?).*Safari/i.test(ua)) {
    const match = ua.match(/Version\/(\d+(\.\d+)?).*Safari/i);
    browser = 'Safari';
    browserVersion = match ? match[1].split('.')[0] : '';
  } else if (/Brave/i.test(ua)) {
    browser = 'Brave';
  }

  // 4. Generate Friendly Display Name
  let friendlyDeviceName = `${browser} — ${os}`;
  if (os === 'iOS' && deviceType === 'mobile') {
    friendlyDeviceName = `${browser} — iPhone`;
  } else if (os === 'iPadOS' || (os === 'iOS' && deviceType === 'tablet')) {
    friendlyDeviceName = `${browser} — iPad`;
  } else if (os === 'Android' && deviceType === 'mobile') {
    friendlyDeviceName = `${browser} — Android`;
  } else if (os === 'Android' && deviceType === 'tablet') {
    friendlyDeviceName = `${browser} — Android Tablet`;
  }

  return {
    browser,
    browserVersion,
    os,
    osVersion,
    deviceType,
    deviceName: friendlyDeviceName
  };
}
