import { nativeImage } from 'electron';

export class WindowsBadgeIconGenerator {
  static createNumberedBadgeIcon(count: number): Electron.NativeImage {
    const displayText = count > 9 ? '9+' : String(count);
    const fontSize = count > 9 ? '9' : '11';

    const svgData = `
      <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
        <circle cx="8" cy="8" r="7" fill="#FF0000"/>
        <text x="8" y="8" font-family="Arial, sans-serif" font-size="${fontSize}"
              font-weight="bold" fill="#FFFFFF" text-anchor="middle"
              dominant-baseline="central">${displayText}</text>
      </svg>
    `;

    const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svgData).toString('base64')}`;
    return nativeImage.createFromDataURL(dataUrl);
  }
}
