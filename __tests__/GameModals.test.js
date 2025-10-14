import React from 'react';
import renderer, { act } from 'react-test-renderer';
import GamePreviewModal from '../components/GamePreviewModal';
import GameOverModal from '../components/GameOverModal';
import ThemeContext from '../contexts/ThemeContext';

jest.mock('../hooks/useWinLossStats', () => jest.fn(() => ({
  wins: 3,
  losses: 1,
  loading: false,
})));

const themeValue = {
  darkMode: false,
  hydrated: true,
  toggleTheme: jest.fn(),
  setDarkMode: jest.fn(),
  theme: {
    text: '#111827',
    textSecondary: '#6B7280',
    card: '#FFFFFF',
    accent: '#EC4899',
    gradient: ['#8B5CF6', '#EC4899'],
    gradientStart: '#8B5CF6',
    gradientEnd: '#EC4899',
    primary: '#8B5CF6',
    headerBackground: 'rgba(255,255,255,0.95)',
  },
};

const renderWithTheme = (element) =>
  renderer.create(
    <ThemeContext.Provider value={themeValue}>{element}</ThemeContext.Provider>
  );

describe('Game modals', () => {
  it('renders GamePreviewModal while toggling visibility', () => {
    const baseProps = {
      visible: true,
      game: {
        title: 'Icebreaker Challenge',
        description: 'Answer quick questions to break the ice.',
        category: 'Party',
        mode: 'co-op',
        speed: 'quick',
      },
      onPlayFriend: jest.fn(),
      onPracticeBot: jest.fn(),
      onClose: jest.fn(),
    };

    const component = renderWithTheme(<GamePreviewModal {...baseProps} />);
    expect(component.toJSON()).toBeTruthy();

    act(() => {
      component.update(
        <ThemeContext.Provider value={themeValue}>
          <GamePreviewModal {...baseProps} visible={false} />
        </ThemeContext.Provider>
      );
    });

    expect(component.toJSON()).toBeNull();
  });

  it('renders GameOverModal while toggling visibility', () => {
    const baseProps = {
      visible: true,
      winnerName: 'Taylor',
      winnerAvatar: null,
      winnerId: 'user-123',
      onRematch: jest.fn(),
      rematchDisabled: false,
      onExit: jest.fn(),
    };

    const component = renderWithTheme(<GameOverModal {...baseProps} />);
    expect(component.toJSON()).toBeTruthy();

    act(() => {
      component.update(
        <ThemeContext.Provider value={themeValue}>
          <GameOverModal {...baseProps} visible={false} />
        </ThemeContext.Provider>
      );
    });

    expect(component.toJSON()).toBeNull();
  });
});
