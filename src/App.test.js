import { render, screen } from '@testing-library/react';
import { useAuth0 } from '@auth0/auth0-react';
import App from './App';

jest.mock('@auth0/auth0-react');

describe('App', () => {
  it('renders the login screen when not authenticated', () => {
    useAuth0.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
    });

    render(<App />);

    expect(screen.getByText(/Welcome to the Oceanographic Platform/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();
  });

  it('renders the loading screen when loading', () => {
    useAuth0.mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
    });

    render(<App />);

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

    render(<App />);

    // Here you would check for an element that is unique to the main platform
    // For example, the header text or a specific component.
    // Since I don't have deep knowledge of the components, I'll check for the header.
    expect(screen.getByText(/CubeAI/i)).toBeInTheDocument();
  });
});
