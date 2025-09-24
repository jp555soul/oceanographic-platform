import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import App from './App';

jest.mock('@auth0/auth0-react');
jest.mock('./contexts/OceanDataContext', () => ({
  OceanDataProvider: ({ children }) => <div data-testid="ocean-data-provider">{children}</div>,
  useOcean: () => ({}),
}));
jest.mock('./components/layout/Header', () => () => <div data-testid="header">Header</div>);
jest.mock('./components/panels/ControlPanel', () => () => <div data-testid="control-panel">Control Panel</div>);
jest.mock('./components/map/MapContainer', () => () => <div data-testid="map-container">Map Container</div>);
jest.mock('./components/panels/DataPanels', () => () => <div data-testid="data-panels">Data Panels</div>);
jest.mock('./components/panels/OutputModule', () => () => <div data-testid="output-module">Output Module</div>);
jest.mock('./components/chatbot/Chatbot', () => () => <div data-testid="chatbot">Chatbot</div>);
jest.mock('./components/tutorial/Tutorial', () => () => <div data-testid="tutorial">Tutorial</div>);
jest.mock('./components/tutorial/TutorialOverlay', () => () => <div data-testid="tutorial-overlay">Tutorial Overlay</div>);


describe('App', () => {
  it('renders the login screen when not authenticated', () => {
    useAuth0.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
    });

    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByText(/Welcome to the Oceanographic Platform/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();
  });

  it('renders the loading screen when loading', () => {
    useAuth0.mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
    });

    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('renders the main platform when authenticated', () => {
    useAuth0.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: {
        name: 'Test User',
        email: 'test@example.com',
        picture: 'https://example.com/avatar.png',
        sub: 'auth0|123456789',
      },
      getAccessTokenSilently: jest.fn(() => Promise.resolve('dummy-token')),
    });

    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByTestId('ocean-data-provider')).toBeInTheDocument();
  });
});
