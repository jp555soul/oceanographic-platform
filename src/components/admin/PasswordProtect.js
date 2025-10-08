import React, { useState } from 'react';

/**
 * A component that renders a password entry form to gate access to the application.
 * It checks the entered password against an environment variable.
 * @param {object} props - The component props.
 * @param {Function} props.onSuccess - Callback function to execute on successful authentication.
 * @param {boolean} props.inline - If true, renders without full-screen wrapper (for embedding)
 */
const PasswordProtect = ({ onSuccess, inline = false }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  /**
   * Handles the form submission event.
   * Prevents default page reload, checks the password, and calls onSuccess or sets an error.
   * @param {React.FormEvent<HTMLFormElement>} event - The form submission event.
   */
  const handleSubmit = (event) => {
    event.preventDefault();

    // Check if the entered password matches the one from the .env file
    if (password === process.env.REACT_APP_ACCESS_PASSWORD) {
      setError('');
      onSuccess();
    } else {
      setError('Incorrect password. Please try again.');
      setPassword(''); // Clear the input field after a failed attempt
    }
  };

  // Inline version for embedding in other layouts
  if (inline) {
    return (
      <div className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label 
              htmlFor="password" 
              className="block mb-2 text-sm font-medium text-slate-300 sr-only"
            >
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-md placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition"
              autoFocus
            />
          </div>
          
          <button
            type="submit"
            className="w-full py-2 px-4 bg-pink-600 hover:bg-pink-700 rounded-md font-semibold text-white transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-pink-500"
          >
            Unlock
          </button>
        </form>

        {error && (
          <p className="text-center text-red-400 text-sm">
            {error}
          </p>
        )}
      </div>
    );
  }

  // Full-screen version (original)
  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-900 text-white">
      <div className="w-full max-w-sm p-8 space-y-6 bg-slate-800 rounded-xl shadow-lg border border-pink-500/30">
        <h1 className="text-2xl font-bold text-center">
          Access Required
        </h1>
        <p className="text-center text-slate-400">
          Please enter the password to continue.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label 
              htmlFor="password" 
              className="block mb-2 text-sm font-medium text-slate-300 sr-only"
            >
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-md placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition"
              autoFocus
            />
          </div>
          
          <button
            type="submit"
            className="w-full py-2 px-4 bg-pink-600 hover:bg-pink-700 rounded-md font-semibold text-white transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-pink-500"
          >
            Unlock
          </button>
        </form>

        {error && (
          <p className="mt-4 text-center text-red-400 text-sm">
            {error}
          </p>
        )}
      </div>
    </div>
  );
};

export default PasswordProtect;