import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.toonblast.game',
  appName: 'ToonBlast',
  webDir: 'dist',
  android: {
    // Painted behind the WebView before the first frame lands. Kept in sync
    // with the `body` background in src/index.css so launching the app does not
    // flash a different colour between the splash and the game.
    backgroundColor: '#1e40af',
  },
};

export default config;
