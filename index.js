import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

// Silence React Native Firebase v23 namespaced API deprecation warnings
globalThis.RNFB_SILENCE_MODULAR_DEPRECATION_WARNINGS = true;

AppRegistry.registerComponent(appName, () => App);
