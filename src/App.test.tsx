
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';
import { describe, it, expect } from 'vitest';

describe('App', () => {
  it('renders the App component', () => {
    render(<App />);
    expect(screen.getByText('AI Procurement Agent for SMEs')).toBeInTheDocument();
  });

  it('renders the main components', () => {
    render(<App />);
    expect(screen.getByText('Run Full Demo')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Audit Trail')).toBeInTheDocument();
  });

  it('switches to the dashboard tab', () => {
    render(<App />);
    fireEvent.click(screen.getByText('Dashboard'));
    expect(screen.getByText('Real-Time KPI Dashboard')).toBeInTheDocument();
  });

  it('switches to the audit trail tab', () => {
    render(<App />);
    fireEvent.click(screen.getByText('Audit Trail'));
    expect(screen.getByText('Immutable Audit Trail')).toBeInTheDocument();
  });
});
