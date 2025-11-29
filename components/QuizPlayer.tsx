import React, { useState } from 'react';
import { QuizQuestion } from '../types';
import { CheckCircle, XCircle, Award } from 'lucide-react';

interface QuizPlayerProps {
  questions: QuizQuestion[];
  onComplete: (score: number) => void;
}

export const QuizPlayer: React.FC<QuizPlayerProps> = ({ questions, onComplete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);

  // Safety Check: If questions is undefined or empty (should be handled by parent, but extra safety)
  if (!questions || questions.length === 0) {
      return <div className="text-center font-display text-xl text-gray-400">No quiz questions generated.</div>;
  }

  const handleOptionSelect = (index: number) => {
    if (isSubmitted) return;
    setSelectedOption(index);
  };

  const handleSubmit = () => {
    if (selectedOption === null) return;
    
    const correct = selectedOption === questions[currentIndex].correctIndex;
    if (correct) setScore(s => s + 1);
    setIsSubmitted(true);
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(c => c + 1);
      setSelectedOption(null);
      setIsSubmitted(false);
    } else {
      setShowResult(true);
      onComplete(score + (selectedOption === questions[currentIndex].correctIndex ? 1 : 0));
    }
  };

  if (showResult) {
    const percentage = Math.round((score / questions.length) * 100);
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center animate-in zoom-in duration-500">
        <Award className="w-24 h-24 text-yellow-400 mb-6 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)] animate-bounce" />
        <h2 className="text-5xl font-display font-bold text-white mb-2 tracking-wide">QUIZ COMPLETE</h2>
        <p className="text-xl text-gray-400 mb-8">You scored {score} out of {questions.length}</p>
        
        <div className="w-full max-w-md h-6 bg-black/30 rounded-full overflow-hidden mb-8 border border-white/10">
          <div 
            className="h-full bg-gradient-to-r from-brand-accent to-brand-secondary transition-all duration-1000 relative overflow-hidden"
            style={{ width: `${percentage}%` }}
          >
             <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
          </div>
        </div>

        <p className="text-4xl font-bold font-mono text-brand-accent">{percentage}%</p>
      </div>
    );
  }

  const currentQ = questions[currentIndex];

  // Safety Check: Ensure current question and options exist before rendering
  if (!currentQ || !Array.isArray(currentQ.options)) {
      return (
          <div className="max-w-3xl mx-auto mt-10 text-center p-10 glass-panel rounded-xl">
              <p className="text-red-400 font-bold">Error: Invalid question data format.</p>
              <button 
                  onClick={handleNext} 
                  className="mt-4 px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 text-sm"
              >
                  Skip Question
              </button>
          </div>
      );
  }

  return (
    <div className="max-w-3xl mx-auto mt-10">
      <div className="flex justify-between items-center mb-8">
        <span className="text-sm font-mono text-gray-500">QUESTION {currentIndex + 1} / {questions.length}</span>
        <span className="text-sm font-mono text-brand-accent">SCORE: {score}</span>
      </div>

      <h3 className="text-3xl font-display font-bold text-white mb-10 leading-relaxed">{currentQ.question}</h3>

      <div className="space-y-4">
        {currentQ.options.map((option, idx) => {
          let baseClasses = "w-full p-6 rounded-2xl text-left border transition-all flex items-center justify-between group shadow-lg ";
          if (isSubmitted) {
            if (idx === currentQ.correctIndex) {
              baseClasses += "bg-green-500/10 border-green-500 text-green-200 shadow-[0_0_20px_rgba(34,197,94,0.1)]";
            } else if (idx === selectedOption) {
              baseClasses += "bg-red-500/10 border-red-500 text-red-200 shadow-[0_0_20px_rgba(239,68,68,0.1)]";
            } else {
              baseClasses += "bg-white/5 border-white/5 opacity-40";
            }
          } else {
            if (idx === selectedOption) {
              baseClasses += "bg-brand-accent/20 border-brand-accent text-brand-accent shadow-[0_0_20px_rgba(var(--color-accent),0.2)]";
            } else {
              baseClasses += "bg-glass-100 border-white/10 hover:bg-white/10 text-gray-300 hover:border-brand-accent/30 hover:translate-x-1";
            }
          }

          return (
            <button 
              key={idx} 
              onClick={() => handleOptionSelect(idx)}
              disabled={isSubmitted}
              className={baseClasses}
            >
              <span className="text-lg font-medium">{option}</span>
              {isSubmitted && idx === currentQ.correctIndex && <CheckCircle className="w-6 h-6 text-green-400" />}
              {isSubmitted && idx === selectedOption && idx !== currentQ.correctIndex && <XCircle className="w-6 h-6 text-red-400" />}
            </button>
          );
        })}
      </div>

      <div className="mt-10 flex justify-end">
        {!isSubmitted ? (
          <button 
            onClick={handleSubmit}
            disabled={selectedOption === null}
            className="px-10 py-4 bg-brand-accent rounded-xl font-bold text-black uppercase tracking-wider text-xs disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-all shadow-[0_0_20px_rgba(var(--color-accent),0.4)] hover:scale-105"
          >
            Submit Answer
          </button>
        ) : (
          <button 
            onClick={handleNext}
            className="px-10 py-4 bg-brand-secondary rounded-xl font-bold text-white uppercase tracking-wider text-xs hover:opacity-90 transition-all shadow-[0_0_20px_rgba(var(--color-secondary),0.4)] hover:scale-105"
          >
            {currentIndex === questions.length - 1 ? 'Finish Quiz' : 'Next Question'}
          </button>
        )}
      </div>
    </div>
  );
};