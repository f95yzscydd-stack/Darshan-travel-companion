export const colors = {
  ink: '#17211B',
  muted: '#68736B',
  canvas: '#F5F4EE',
  card: '#FFFFFF',
  forest: '#1E5B43',
  forestDark: '#123E2E',
  mint: '#DDEDE3',
  lime: '#DDED9E',
  coral: '#F28C72',
  blush: '#F7DFD6',
  sky: '#DCEAF2',
  sand: '#EFE5D2',
  gold: '#C49338',
  line: '#E6E5DE',
  danger: '#A64A3A',
  white: '#FFFFFF',
  black: '#101511'
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 10, md: 16, lg: 22, pill: 999 };

export const shadow = Platform.select({
  web: { boxShadow: '0 8px 18px rgba(28, 51, 39, 0.08)' },
  default: {
    shadowColor: '#1C3327',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3
  }
})!;
import { Platform } from 'react-native';
