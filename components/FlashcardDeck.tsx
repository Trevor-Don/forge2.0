import React, { useState, useEffect } from 'react';
import { Flashcard } from '../types';
import { Check, X, Image as ImageIcon, Loader2, RefreshCw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { GeminiService } from '../services/geminiService';

interface FlashcardDeckProps {
  cards: Flashcard[];
  onUpdateCard: (card: Flashcard) => void;
  onComplete: () => void;
}

export const FlashcardDeck: React.FC<FlashcardDeckProps> = ({ cards, onUpdateCard, onComplete }) => {
  const [sessionQueue, setSessionQueue] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  useEffect(() => {
    setSessionQueue(cards);
  }, [cards]);

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
    if (!isFlipped) setShowControls(true);
  };

  const handleRate = (success: boolean) => {
      const currentCard = sessionQueue[currentIndex];
      
      // SRS Logic (Simplified Leitner)
      const now = Date.now();
      const currentInterval = currentCard.srs?.interval || 0;
      const currentRepetitions = currentCard.srs?.repetitions || 0;

      let newInterval = 1;
      let newRepetitions = 0;

      if (success) {
          // If correct, double the interval (1 -> 2 -> 4 -> 8 days)
          newInterval = currentInterval === 0 ? 1 : currentInterval * 2;
          newRepetitions = currentRepetitions + 1;
      } else {
          // If wrong, reset to 1 day
          newInterval = 1;
          newRepetitions = 0;
      }

      // Calculate next review date (ms)
      const nextReviewDate = now + (newInterval * 24 * 60 * 60 * 1000);

      const updatedCard: Flashcard = {
          ...currentCard,
          srs: {
              interval: newInterval,
              repetitions: newRepetitions,
              nextReview: nextReviewDate
          }
      };

      // Propagate update to parent (Storage)
      onUpdateCard(updatedCard);

      // Move to next card
      if (currentIndex < sessionQueue.length - 1) {
          setIsFlipped(false);
          setShowControls(false);
          setTimeout(() => setCurrentIndex(c => c + 1), 300);
      } else {
          onComplete();
      }
  };

  const handleGenerateImage = async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isGeneratingImage) return;
      
      const card = sessionQueue[currentIndex];
      if (!card.visualAnalogy) return;

      setIsGeneratingImage(true);
      try {
          const imageUrl = await GeminiService.generateConceptImage(card.front, card.visualAnalogy);
          const updatedCard = { ...card, imageUrl };
          
          // Update local queue and persist
          const newQueue = [...sessionQueue];
          newQueue[currentIndex] = updatedCard;
          setSessionQueue(newQueue);
          onUpdateCard(updatedCard);
      } catch (error) {
          console.error("Image gen error:", error);
      } finally {
          setIsGeneratingImage(false);
      }
  };

  if (sessionQueue.length === 0) return <div className="text-center font-mono text-gray-500">NO CARDS</div>;

  const card = sessionQueue[currentIndex];

  return (
    <>
      <div className="flex flex-col items-center justify-center w-full max-w-2xl perspective-1000">
        
        {/* 3D Glass Card */}
        <div className="relative w-full aspect-[3/2] cursor-pointer group" onClick={handleFlip}>
            <div className={`relative w-full h-full duration-700 preserve-3d transition-transform ${isFlipped ? 'rotate-y-180' : ''}`}>
                
                {/* Front Face */}
                <div className="absolute inset-0 backface-hidden glass-panel rounded-[2rem] flex flex-col items-center justify-center p-10 text-center border border-white/20 hover:border-brand-accent/50 transition-colors shadow-[0_0_50px_rgba(0,0,0,0.3)] z-20">
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/5 to-transparent rounded-[2rem] pointer-events-none"></div>
                    
                    <span className="absolute top-8 left-8 font-mono text-xs uppercase tracking-widest text-gray-500">Question</span>
                    
                    <div className="flex-1 flex flex-col justify-center w-full overflow-y-auto custom-scrollbar">
                      <div className="prose prose-invert prose-xl font-display font-bold tracking-wide text-white mx-auto">
                          <ReactMarkdown>{card.front}</ReactMarkdown>
                      </div>
                    </div>
                    
                    <div className="absolute bottom-8 text-brand-accent text-xs font-bold uppercase tracking-[0.3em] animate-pulse">Click to Flip</div>
                </div>

                {/* Back Face */}
                <div className="absolute inset-0 backface-hidden rotate-y-180 glass-panel rounded-[2rem] flex flex-col items-center justify-between p-10 text-center bg-black/40 border border-brand-accent/30 z-20">
                    <span className="absolute top-8 left-8 font-mono text-xs uppercase tracking-widest text-brand-accent">Answer</span>
                    
                    <div className="flex-1 flex flex-col justify-center overflow-y-auto custom-scrollbar w-full">
                        <div className="prose prose-invert prose-lg font-sans font-light leading-relaxed text-gray-200 mx-auto">
                            <ReactMarkdown>{card.back}</ReactMarkdown>
                        </div>
                    </div>

                    {(card.visualAnalogy || card.imageUrl) && (
                        <div className="w-full mt-6 pt-4 border-t border-white/10 flex flex-col items-center">
                            {card.imageUrl ? (
                                <div className="relative w-full group/image overflow-hidden rounded-xl border border-white/10 shadow-2xl">
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60 pointer-events-none"></div>
                                  <img 
                                      src={card.imageUrl} 
                                      alt="Visual Explanation"
                                      className="w-full h-40 object-cover transition-transform group-hover/image:scale-105 cursor-zoom-in" 
                                      onClick={(e) => { e.stopPropagation(); setExpandedImage(card.imageUrl!); }}
                                  />
                                  <button 
                                    onClick={handleGenerateImage}
                                    disabled={isGeneratingImage}
                                    className="absolute bottom-2 right-2 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white opacity-0 group-hover/image:opacity-100 transition-all disabled:opacity-50 z-10"
                                    title="Regenerate Image"
                                  >
                                    {isGeneratingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                  </button>
                                </div>
                            ) : (
                                <div className="w-full">
                                    <p className="text-sm text-brand-accent italic font-serif mb-4 relative">
                                        <span className="text-3xl absolute -top-2 -left-2 text-white/10">"</span>
                                        {card.visualAnalogy}
                                        <span className="text-3xl absolute -bottom-4 -right-2 text-white/10">"</span>
                                    </p>
                                    <button 
                                      onClick={handleGenerateImage}
                                      disabled={isGeneratingImage}
                                      className="flex items-center justify-center gap-2 mx-auto px-6 py-3 rounded-full bg-white/5 hover:bg-brand-accent hover:text-black border border-white/10 text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 group/btn"
                                    >
                                        {isGeneratingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />}
                                        {isGeneratingImage ? "Generating..." : "Generate Visual"}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* Controls */}
        <div className={`flex items-center gap-8 mt-12 transition-all duration-500 ${showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
            <button 
              onClick={(e) => { e.stopPropagation(); handleRate(false); }}
              className="w-20 h-20 rounded-full glass-button flex items-center justify-center text-red-400 hover:bg-red-500 hover:text-white hover:shadow-[0_0_30px_rgba(239,68,68,0.4)] transition-all"
            >
                <X className="w-8 h-8" />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); handleRate(true); }}
              className="w-20 h-20 rounded-full glass-button flex items-center justify-center text-green-400 hover:bg-green-500 hover:text-white hover:shadow-[0_0_30px_rgba(34,197,94,0.4)] transition-all"
            >
                <Check className="w-8 h-8" />
            </button>
        </div>
        
        <div className="mt-8 font-mono text-xs text-gray-500 tracking-[0.2em]">
            {currentIndex + 1} / {sessionQueue.length}
        </div>
      </div>

      {/* Lightbox Modal */}
      {expandedImage && (
        <div 
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setExpandedImage(null)}
        >
          <button 
            onClick={() => setExpandedImage(null)}
            className="absolute top-6 right-6 p-3 bg-white/10 rounded-full text-white hover:bg-white/20 hover:scale-110 transition-all"
          >
            <X className="w-6 h-6" />
          </button>
          <img 
            src={expandedImage} 
            className="max-w-full max-h-[90vh] rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10" 
            alt="Enlarged"
            onClick={(e) => e.stopPropagation()} 
          />
        </div>
      )}
    </>
  );
};