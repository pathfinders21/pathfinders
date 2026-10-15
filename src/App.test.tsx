// @vitest-environment jsdom
/**
 * The screens are the URL now, so this drives the real app: open a deep link, click the
 * navigation, and fire a hashchange the way the back button would. A pure mapping test
 * cannot show that the two stay in step.
 */
import React from 'react';
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';
import App from './App.tsx';

// The app asks the server who is signed in. Stub it so the suite never depends on a
// running backend, and so the signed out path is the one under test.
beforeAll(() => {
  vi.stubGlobal('fetch', async () =>
    new Response(JSON.stringify({ ok: false, error: 'Sign in required' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    }),
  );
});
afterAll(() => {
  vi.unstubAllGlobals();
});

const heroHeadline = () =>
  screen.getByRole('heading', { level: 1, name: /meets your next beginning/i });

const goTo = (hash: string) => {
  act(() => {
    window.location.hash = hash;
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
};

describe('App routing', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '';
    Element.prototype.scrollIntoView = () => {};
    window.scrollTo = () => {};
  });

  afterEach(() => {
    cleanup();
  });

  it('opens a deep link straight onto that screen', () => {
    goTo('#/mentors');
    render(<App />);
    expect(screen.getByText('Explore Mentors')).toBeTruthy();
    expect(screen.queryByRole('heading', { level: 1, name: /meets your next beginning/i })).toBeNull();
  });

  it('carries every signed out screen on its own link', () => {
    goTo('#/roadmaps');
    const first = render(<App />);
    expect(screen.getByText(/Target Trajectory/)).toBeTruthy();
    first.unmount();

    goTo('#/community');
    render(<App />);
    expect(screen.getByText(/Mentees post real architectural/i)).toBeTruthy();
  });

  it('writes the screen into the URL when you use the navigation', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'AI Roadmaps' }));
    expect(window.location.hash).toBe('#/roadmaps');
    expect(screen.getByText(/Target Trajectory/)).toBeTruthy();
  });

  it('follows a hashchange, which is what the back button sends', () => {
    render(<App />);
    goTo('#/community');
    expect(screen.getByText(/Mentees post real architectural/i)).toBeTruthy();
    goTo('#/');
    expect(heroHeadline()).toBeTruthy();
  });

  it('sends a deep link into a signed in screen home when signed out', () => {
    goTo('#/dashboard');
    render(<App />);
    expect(heroHeadline()).toBeTruthy();
    expect(window.location.hash).toBe('#/');
  });

  it('never renders an empty page for an unknown link', () => {
    goTo('#/not-a-screen');
    const { container } = render(<App />);
    expect(heroHeadline()).toBeTruthy();
    expect(container.textContent?.length).toBeGreaterThan(500);
  });

  it('shows the verification controller in development', () => {
    render(<App />);
    expect(screen.getByText(/CTA Rule State/i)).toBeTruthy();
  });
});
