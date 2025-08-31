import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock a minimal version of the ConductInterviewPage for testing
function MockConductInterviewPage() {
  const [currentQuestion, setCurrentQuestion] = React.useState('What is your greatest strength?');
  const [currentResponse, setCurrentResponse] = React.useState('');
  const [submitted, setSubmitted] = React.useState(false);
  const [skipped, setSkipped] = React.useState(false);
  const [section, setSection] = React.useState(0);
  const sections = ['Behavioral', 'Technical', 'Coding'];

  return (
    <div>
      <div data-testid="section">Section: {sections[section]}</div>
      <div data-testid="question">{currentQuestion}</div>
      <textarea
        data-testid="response-input"
        value={currentResponse}
        onChange={e => setCurrentResponse(e.target.value)}
      />
      <button
        data-testid="submit-btn"
        disabled={!currentResponse.trim()}
        onClick={() => setSubmitted(true)}
      >
        Submit Response
      </button>
      <button
        data-testid="skip-btn"
        onClick={() => setSkipped(true)}
      >
        Skip
      </button>
      <button
        data-testid="next-section-btn"
        onClick={() => setSection((s) => (s + 1) % sections.length)}
      >
        Next Section
      </button>
      {submitted && <div data-testid="submitted">Response submitted!</div>}
      {skipped && <div data-testid="skipped">Question skipped!</div>}
    </div>
  );
}

describe('Interview Answering Flow', () => {
  it('allows answering and submitting a question', () => {
    render(<MockConductInterviewPage />);
    expect(screen.getByTestId('question')).toHaveTextContent('What is your greatest strength?');
    const input = screen.getByTestId('response-input');
    fireEvent.change(input, { target: { value: 'Hard work' } });
    expect(input).toHaveValue('Hard work');
    const submitBtn = screen.getByTestId('submit-btn');
    expect(submitBtn).not.toBeDisabled();
    fireEvent.click(submitBtn);
    expect(screen.getByTestId('submitted')).toHaveTextContent('Response submitted!');
  });

  it('allows skipping a question', () => {
    render(<MockConductInterviewPage />);
    const skipBtn = screen.getByTestId('skip-btn');
    fireEvent.click(skipBtn);
    expect(screen.getByTestId('skipped')).toHaveTextContent('Question skipped!');
  });

  it('allows navigating between sections', () => {
    render(<MockConductInterviewPage />);
    const section = screen.getByTestId('section');
    expect(section).toHaveTextContent('Section: Behavioral');
    const nextSectionBtn = screen.getByTestId('next-section-btn');
    fireEvent.click(nextSectionBtn);
    expect(section).toHaveTextContent('Section: Technical');
    fireEvent.click(nextSectionBtn);
    expect(section).toHaveTextContent('Section: Coding');
    fireEvent.click(nextSectionBtn);
    expect(section).toHaveTextContent('Section: Behavioral'); // Loops back
  });
}); 