import React, { useState, useEffect, useRef } from 'react';
import { Music, Play, CheckCircle, XCircle, RotateCcw, Volume2, Award, Trophy, Timer, Zap } from 'lucide-react';

const SwarTrainer = () => {
  const [mode, setMode] = useState('practice');
  const [gameMode, setGameMode] = useState('classic');
  const [currentNote, setCurrentNote] = useState(null);
  const [sequence, setSequence] = useState([]);
  const [userSequence, setUserSequence] = useState([]);
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [gameActive, setGameActive] = useState(false);
  const [difficulty, setDifficulty] = useState('medium');
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10);
  const [combo, setCombo] = useState(1);
  const [baseScale, setBaseScale] = useState('C');
  const audioContextRef = useRef(null);
  const timerRef = useRef(null);

  const allSwars = {
    mandra: {
      'Sa': 130.81, 'Rek': 138.59, 'Re': 146.83, 'Gak': 155.56,
      'Ga': 164.81, 'Ma': 174.61, 'Mat': 185.00, 'Pa': 196.00,
      'Dhak': 207.65, 'Dha': 220.00, 'Nik': 233.08, 'Ni': 246.94
    },
    madhya: {
      'Sa': 261.63, 'Rek': 277.18, 'Re': 293.66, 'Gak': 311.13,
      'Ga': 329.63, 'Ma': 349.23, 'Mat': 369.99, 'Pa': 392.00,
      'Dhak': 415.30, 'Dha': 440.00, 'Nik': 466.16, 'Ni': 493.88
    },
    taar: {
      'Sa': 523.25, 'Rek': 554.37, 'Re': 587.33, 'Gak': 622.25,
      'Ga': 659.25, 'Ma': 698.46, 'Mat': 739.99, 'Pa': 783.99,
      'Dhak': 830.61, 'Dha': 880.00, 'Nik': 932.33, 'Ni': 987.77
    }
  };

  const swarOrder = ['Sa', 'Rek', 'Re', 'Gak', 'Ga', 'Ma', 'Mat', 'Pa', 'Dhak', 'Dha', 'Nik', 'Ni'];
  const swarDisplay = {
    'Sa': 'Sa', 'Rek': 'Re(k)', 'Re': 'Re', 'Gak': 'Ga(k)',
    'Ga': 'Ga', 'Ma': 'Ma', 'Mat': 'Ma(t)', 'Pa': 'Pa',
    'Dhak': 'Dha(k)', 'Dha': 'Dha', 'Nik': 'Ni(k)', 'Ni': 'Ni'
  };

  // Base frequencies for different scales (all in Hz)
  const scaleFrequencies = {
    'C': 261.63,   // C4 (Middle C)
    'C#': 277.18,  // C#4
    'D': 293.66,   // D4
    'D#': 311.13,  // D#4
    'E': 329.63,   // E4
    'F': 349.23,   // F4
    'F#': 369.99,  // F#4
    'G': 392.00,   // G4
    'G#': 415.30,  // G#4
    'A': 440.00,   // A4
    'A#': 466.16,  // A#4
    'B': 493.88    // B4
  };

  // Calculate frequencies based on selected scale
  const getFrequency = (swar, octave) => {
    const baseSaFreq = scaleFrequencies[baseScale];
    const octaveMultiplier = octave === 'mandra' ? 0.5 : octave === 'taar' ? 2 : 1;
    
    // Semitone ratios from Sa
    const semitonesFromSa = {
      'Sa': 0, 'Rek': 1, 'Re': 2, 'Gak': 3,
      'Ga': 4, 'Ma': 5, 'Mat': 6, 'Pa': 7,
      'Dhak': 8, 'Dha': 9, 'Nik': 10, 'Ni': 11
    };
    
    const semitones = semitonesFromSa[swar];
    return baseSaFreq * Math.pow(2, semitones / 12) * octaveMultiplier;
  };

  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    return () => {
      if (audioContextRef.current) audioContextRef.current.close();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (gameActive && gameMode === 'speed' && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleTimeout();
            return 10;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timerRef.current);
    }
  }, [gameActive, timeLeft, gameMode]);

  const playNote = (swar, octave, duration = 0.8) => {
    const audioContext = audioContextRef.current;
    const frequency = getFrequency(swar, octave);
    
    // Create multiple oscillators for harmonium-like timbre
    // Harmonium has rich harmonics due to multiple reeds
    const oscillators = [];
    const gainNodes = [];
    
    // Fundamental frequency
    const osc1 = audioContext.createOscillator();
    const gain1 = audioContext.createGain();
    osc1.frequency.value = frequency;
    osc1.type = 'sawtooth'; // Rich in harmonics
    gain1.gain.value = 0.3;
    osc1.connect(gain1);
    oscillators.push(osc1);
    gainNodes.push(gain1);
    
    // Second harmonic (octave)
    const osc2 = audioContext.createOscillator();
    const gain2 = audioContext.createGain();
    osc2.frequency.value = frequency * 2;
    osc2.type = 'sawtooth';
    gain2.gain.value = 0.15;
    osc2.connect(gain2);
    oscillators.push(osc2);
    gainNodes.push(gain2);
    
    // Third harmonic
    const osc3 = audioContext.createOscillator();
    const gain3 = audioContext.createGain();
    osc3.frequency.value = frequency * 3;
    osc3.type = 'sine';
    gain3.gain.value = 0.08;
    osc3.connect(gain3);
    oscillators.push(osc3);
    gainNodes.push(gain3);
    
    // Slight detuning for chorus effect (harmonium reeds are never perfectly in tune)
    const osc4 = audioContext.createOscillator();
    const gain4 = audioContext.createGain();
    osc4.frequency.value = frequency * 1.002; // Slightly detuned
    osc4.type = 'sawtooth';
    gain4.gain.value = 0.15;
    osc4.connect(gain4);
    oscillators.push(osc4);
    gainNodes.push(gain4);
    
    // Create a filter for warmth
    const filter = audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2000;
    filter.Q.value = 1;
    
    // Master gain for envelope
    const masterGain = audioContext.createGain();
    
    // Connect all oscillators through filter to master gain
    gainNodes.forEach(gain => gain.connect(filter));
    filter.connect(masterGain);
    masterGain.connect(audioContext.destination);
    
    // Envelope: Quick attack, sustained, gentle release (harmonium characteristic)
    const now = audioContext.currentTime;
    masterGain.gain.setValueAtTime(0, now);
    masterGain.gain.linearRampToValueAtTime(1, now + 0.05); // Quick attack
    masterGain.gain.setValueAtTime(0.9, now + duration - 0.1); // Sustain
    masterGain.gain.exponentialRampToValueAtTime(0.01, now + duration); // Gentle release
    
    // Start all oscillators
    oscillators.forEach(osc => {
      osc.start(now);
      osc.stop(now + duration);
    });
  };

  const playSequence = async (notes) => {
    for (let i = 0; i < notes.length; i++) {
      playNote(notes[i].swar, notes[i].octave, 0.6);
      await new Promise(resolve => setTimeout(resolve, 700));
    }
  };

  const getDifficultySwars = () => {
    if (difficulty === 'easy') return ['Sa', 'Re', 'Ga', 'Ma', 'Pa', 'Dha', 'Ni'];
    return swarOrder;
  };

  const handleTimeout = () => {
    setStreak(0);
    setCombo(1);
    setFeedback({ correct: false, note: currentNote, timeout: true });
    setTimeout(() => {
      playRandomNote();
    }, 1500);
  };

  const startGame = () => {
    setGameActive(true);
    setScore(0);
    setAttempts(0);
    setStreak(0);
    setCombo(1);
    setFeedback(null);
    setTimeLeft(10);
    
    if (gameMode === 'sequence') {
      generateSequence();
    } else if (gameMode === 'interval') {
      playInterval();
    } else {
      playRandomNote();
    }
  };

  const playRandomNote = () => {
    const availableSwars = getDifficultySwars();
    const randomSwar = availableSwars[Math.floor(Math.random() * availableSwars.length)];
    const randomOctave = difficulty === 'hard' 
      ? ['mandra', 'madhya', 'taar'][Math.floor(Math.random() * 3)]
      : 'madhya';
    
    setCurrentNote({ swar: randomSwar, octave: randomOctave });
    setFeedback(null);
    setTimeLeft(10);
    playNote(randomSwar, randomOctave);
  };

  const generateSequence = () => {
    const length = difficulty === 'easy' ? 3 : difficulty === 'medium' ? 4 : 5;
    const availableSwars = getDifficultySwars();
    const newSequence = [];
    
    for (let i = 0; i < length; i++) {
      const randomSwar = availableSwars[Math.floor(Math.random() * availableSwars.length)];
      newSequence.push({ swar: randomSwar, octave: 'madhya' });
    }
    
    setSequence(newSequence);
    setUserSequence([]);
    setFeedback(null);
    playSequence(newSequence);
  };

  const playInterval = () => {
    const availableSwars = getDifficultySwars();
    const swar1 = availableSwars[Math.floor(Math.random() * availableSwars.length)];
    const swar2 = availableSwars[Math.floor(Math.random() * availableSwars.length)];
    
    setCurrentNote({ swar1, swar2, octave: 'madhya' });
    setFeedback(null);
    
    playNote(swar1, 'madhya', 0.6);
    setTimeout(() => playNote(swar2, 'madhya', 0.6), 700);
  };

  const calculateInterval = (swar1, swar2) => {
    const index1 = swarOrder.indexOf(swar1);
    const index2 = swarOrder.indexOf(swar2);
    return Math.abs(index2 - index1);
  };

  const checkAnswer = (selectedSwar) => {
    if (!gameActive || feedback) return;

    setAttempts(attempts + 1);
    
    const correctAnswer = difficulty === 'hard' 
      ? `${currentNote.swar}-${currentNote.octave}`
      : currentNote.swar;
    
    const userAnswer = difficulty === 'hard' ? selectedSwar : selectedSwar.split('-')[0];

    if (userAnswer === correctAnswer) {
      const points = gameMode === 'speed' ? Math.ceil(timeLeft * combo) : combo;
      setScore(score + points);
      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak > bestStreak) setBestStreak(newStreak);
      if (newStreak % 5 === 0) setCombo(combo + 1);
      
      setFeedback({ correct: true, note: currentNote, points });
      setTimeout(() => {
        if (gameMode === 'interval') playInterval();
        else playRandomNote();
      }, 1000);
    } else {
      setStreak(0);
      setCombo(1);
      setFeedback({ correct: false, note: currentNote, selected: selectedSwar });
      setTimeout(() => {
        setFeedback(null);
      }, 2000);
    }
  };

  const handleSequenceInput = (swar) => {
    const newUserSequence = [...userSequence, swar];
    setUserSequence(newUserSequence);

    if (newUserSequence.length === sequence.length) {
      const correct = sequence.every((note, i) => note.swar === newUserSequence[i]);
      setAttempts(attempts + 1);
      
      if (correct) {
        setScore(score + sequence.length * combo);
        const newStreak = streak + 1;
        setStreak(newStreak);
        if (newStreak > bestStreak) setBestStreak(newStreak);
        if (newStreak % 3 === 0) setCombo(combo + 1);
        
        setFeedback({ correct: true, sequence: true });
        setTimeout(() => generateSequence(), 1500);
      } else {
        setStreak(0);
        setCombo(1);
        setFeedback({ correct: false, sequence: true });
        setTimeout(() => {
          setUserSequence([]);
          setFeedback(null);
        }, 2000);
      }
    }
  };

  const checkInterval = (intervalSize) => {
    const correct = calculateInterval(currentNote.swar1, currentNote.swar2) === intervalSize;
    setAttempts(attempts + 1);

    if (correct) {
      setScore(score + combo * 2);
      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak > bestStreak) setBestStreak(newStreak);
      if (newStreak % 5 === 0) setCombo(combo + 1);
      
      setFeedback({ correct: true, interval: true });
      setTimeout(() => playInterval(), 1200);
    } else {
      setStreak(0);
      setCombo(1);
      setFeedback({ correct: false, interval: true, correctInterval: calculateInterval(currentNote.swar1, currentNote.swar2) });
      setTimeout(() => setFeedback(null), 2000);
    }
  };

  const renderHarmoniumKey = (swar, octave) => {
    const isKomal = swar.includes('k') && swar !== 'Nik';
    const isTeevra = swar === 'Mat';
    const isBlack = isKomal || isTeevra;

    return (
      <button
        key={`${swar}-${octave}`}
        onClick={() => playNote(swar, octave)}
        className={`relative transition-all transform hover:scale-105 ${
          isBlack
            ? 'h-20 -mx-3 z-10 bg-gradient-to-b from-gray-800 to-black text-white shadow-lg hover:from-gray-700'
            : 'h-32 bg-gradient-to-b from-white via-gray-50 to-gray-100 border-2 border-gray-300 text-gray-800 shadow-md hover:from-orange-50 hover:via-orange-100'
        } rounded-b-lg flex flex-col items-center justify-end pb-2 font-bold text-xs active:scale-95`}
        style={{ width: isBlack ? '40px' : '60px' }}
      >
        <span className={isBlack ? 'text-white' : 'text-orange-700'}>{swarDisplay[swar]}</span>
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Music className="w-12 h-12 text-orange-600" />
            <h1 className="text-5xl font-bold text-orange-800">स्वर साधना</h1>
          </div>
          <p className="text-orange-700 text-lg">Master Indian Classical Music - Complete Harmonium Training</p>
        </div>

        <div className="flex gap-4 mb-6 justify-center flex-wrap">
          <button
            onClick={() => setMode('practice')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              mode === 'practice' ? 'bg-orange-600 text-white shadow-lg scale-105' : 'bg-white text-orange-600 hover:bg-orange-100'
            }`}
          >
            🎹 Practice Harmonium
          </button>
          <button
            onClick={() => setMode('game')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              mode === 'game' ? 'bg-orange-600 text-white shadow-lg scale-105' : 'bg-white text-orange-600 hover:bg-orange-100'
            }`}
          >
            🎮 Training Games
          </button>
        </div>

        {/* Scale Selector */}
        <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-700">Set Sa (Base Scale):</span>
            </div>
            <div className="flex gap-2 flex-wrap justify-center">
              {Object.keys(scaleFrequencies).map(scale => (
                <button
                  key={scale}
                  onClick={() => setBaseScale(scale)}
                  className={`px-4 py-2 rounded-lg font-bold transition-all ${
                    baseScale === scale
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg scale-105'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {scale}
                </button>
              ))}
            </div>
            <div className="text-sm text-gray-600 w-full text-center mt-2">
              Current: Sa = {baseScale} ({scaleFrequencies[baseScale].toFixed(2)} Hz)
            </div>
          </div>
        </div>

        {mode === 'practice' && (
          <div className="bg-gradient-to-b from-amber-100 to-orange-100 rounded-3xl shadow-2xl p-8 border-4 border-orange-300">
            <h2 className="text-3xl font-bold text-orange-900 mb-6 text-center flex items-center justify-center gap-2">
              <Music className="w-8 h-8" />
              Complete 3-Octave Harmonium
            </h2>

            <div className="bg-gradient-to-b from-amber-50 to-white rounded-2xl p-6 shadow-inner">
              <div className="mb-6">
                <div className="text-center mb-3 bg-blue-100 py-2 rounded-lg">
                  <span className="font-bold text-blue-800">तार सप्तक (Upper Octave)</span>
                </div>
                <div className="flex justify-center items-end">
                  {swarOrder.map(swar => renderHarmoniumKey(swar, 'taar'))}
                </div>
              </div>

              <div className="mb-6">
                <div className="text-center mb-3 bg-green-100 py-2 rounded-lg">
                  <span className="font-bold text-green-800">मध्य सप्तक (Middle Octave)</span>
                </div>
                <div className="flex justify-center items-end">
                  {swarOrder.map(swar => renderHarmoniumKey(swar, 'madhya'))}
                </div>
              </div>

              <div className="mb-4">
                <div className="text-center mb-3 bg-purple-100 py-2 rounded-lg">
                  <span className="font-bold text-purple-800">मंद्र सप्तक (Lower Octave)</span>
                </div>
                <div className="flex justify-center items-end">
                  {swarOrder.map(swar => renderHarmoniumKey(swar, 'mandra'))}
                </div>
              </div>

              <div className="mt-6 bg-amber-50 rounded-lg p-4 border-2 border-amber-200">
                <p className="text-sm text-gray-700 text-center">
                  <strong>🎵 Legend:</strong> White keys = Shuddha swars | Black keys = Komal (k) & Teevra (t) swars | 
                  Click any key to hear the note<br/>
                  <strong>Current Scale:</strong> Sa is set to <span className="font-bold text-purple-700">{baseScale}</span> ({scaleFrequencies[baseScale].toFixed(2)} Hz)
                </p>
              </div>
            </div>
          </div>
        )}

        {mode === 'game' && (
          <div className="space-y-6">
            {!gameActive ? (
              <div className="bg-white rounded-2xl shadow-xl p-8">
                <h2 className="text-3xl font-bold text-orange-800 mb-6 text-center">Choose Your Training Game</h2>
                
                <div className="grid md:grid-cols-2 gap-4 mb-8">
                  <button
                    onClick={() => setGameMode('classic')}
                    className={`p-6 rounded-xl transition-all ${
                      gameMode === 'classic' ? 'bg-blue-500 text-white shadow-lg scale-105' : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
                    }`}
                  >
                    <div className="text-3xl mb-2">🎯</div>
                    <div className="font-bold text-xl mb-2">Classic Mode</div>
                    <div className="text-sm opacity-90">Identify single notes - Perfect for beginners</div>
                  </button>
                  
                  <button
                    onClick={() => setGameMode('speed')}
                    className={`p-6 rounded-xl transition-all ${
                      gameMode === 'speed' ? 'bg-red-500 text-white shadow-lg scale-105' : 'bg-red-50 text-red-800 hover:bg-red-100'
                    }`}
                  >
                    <div className="text-3xl mb-2">⚡</div>
                    <div className="font-bold text-xl mb-2">Speed Challenge</div>
                    <div className="text-sm opacity-90">Beat the clock! 10 seconds per note</div>
                  </button>
                  
                  <button
                    onClick={() => setGameMode('sequence')}
                    className={`p-6 rounded-xl transition-all ${
                      gameMode === 'sequence' ? 'bg-purple-500 text-white shadow-lg scale-105' : 'bg-purple-50 text-purple-800 hover:bg-purple-100'
                    }`}
                  >
                    <div className="text-3xl mb-2">🎼</div>
                    <div className="font-bold text-xl mb-2">Sequence Memory</div>
                    <div className="text-sm opacity-90">Remember and repeat note sequences</div>
                  </button>
                  
                  <button
                    onClick={() => setGameMode('interval')}
                    className={`p-6 rounded-xl transition-all ${
                      gameMode === 'interval' ? 'bg-green-500 text-white shadow-lg scale-105' : 'bg-green-50 text-green-800 hover:bg-green-100'
                    }`}
                  >
                    <div className="text-3xl mb-2">📏</div>
                    <div className="font-bold text-xl mb-2">Interval Training</div>
                    <div className="text-sm opacity-90">Identify distance between two notes</div>
                  </button>
                </div>

                <div className="mb-8">
                  <p className="text-center text-gray-700 mb-4 font-semibold text-lg">Select Difficulty:</p>
                  <div className="flex gap-4 justify-center">
                    {['easy', 'medium', 'hard'].map(level => (
                      <button
                        key={level}
                        onClick={() => setDifficulty(level)}
                        className={`px-8 py-4 rounded-lg font-bold transition-all ${
                          difficulty === level
                            ? level === 'easy' ? 'bg-green-500 text-white shadow-lg scale-105'
                            : level === 'medium' ? 'bg-yellow-500 text-white shadow-lg scale-105'
                            : 'bg-red-500 text-white shadow-lg scale-105'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                        <div className="text-xs mt-1">
                          {level === 'easy' ? '7 Shuddha' : level === 'medium' ? '12 Swars' : '3 Octaves'}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={startGame}
                  className="px-12 py-5 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl font-bold text-2xl hover:from-orange-700 hover:to-red-700 transition-all shadow-2xl flex items-center gap-3 mx-auto transform hover:scale-105"
                >
                  <Play className="w-8 h-8" />
                  Start Training
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl text-center border-2 border-blue-200">
                    <Trophy className="w-6 h-6 text-blue-600 mx-auto mb-1" />
                    <div className="text-2xl font-bold text-blue-700">{score}</div>
                    <div className="text-xs text-blue-600">Score</div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl text-center border-2 border-purple-200">
                    <div className="text-2xl font-bold text-purple-700">{attempts}</div>
                    <div className="text-xs text-purple-600">Attempts</div>
                  </div>
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-xl text-center border-2 border-orange-200">
                    <Zap className="w-6 h-6 text-orange-600 mx-auto mb-1" />
                    <div className="text-2xl font-bold text-orange-700">{streak} 🔥</div>
                    <div className="text-xs text-orange-600">Streak</div>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl text-center border-2 border-green-200">
                    <Award className="w-6 h-6 text-green-600 mx-auto mb-1" />
                    <div className="text-2xl font-bold text-green-700">{bestStreak}</div>
                    <div className="text-xs text-green-600">Best</div>
                  </div>
                  <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-xl text-center border-2 border-red-200">
                    <div className="text-2xl font-bold text-red-700">×{combo}</div>
                    <div className="text-xs text-red-600">Combo</div>
                  </div>
                </div>

                {gameMode === 'speed' && (
                  <div className="mb-6">
                    <div className="flex items-center justify-center gap-3 mb-2">
                      <Timer className="w-6 h-6 text-red-600" />
                      <span className="font-bold text-gray-700">Time Left:</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                      <div 
                        className={`h-full transition-all ${timeLeft > 5 ? 'bg-green-500' : timeLeft > 3 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${(timeLeft / 10) * 100}%` }}
                      />
                    </div>
                    <div className="text-center text-3xl font-bold mt-2 text-red-600">{timeLeft}s</div>
                  </div>
                )}

                <div className="flex gap-3 justify-center mb-6">
                  <button
                    onClick={() => {
                      if (gameMode === 'sequence') playSequence(sequence);
                      else if (gameMode === 'interval') {
                        playNote(currentNote.swar1, 'madhya', 0.6);
                        setTimeout(() => playNote(currentNote.swar2, 'madhya', 0.6), 700);
                      } else if (currentNote) playNote(currentNote.swar, currentNote.octave);
                    }}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all shadow-md flex items-center gap-2"
                  >
                    <Volume2 className="w-5 h-5" />
                    {gameMode === 'sequence' ? 'Replay Sequence' : 'Replay'}
                  </button>
                  <button
                    onClick={() => {
                      setGameActive(false);
                      setFeedback(null);
                      if (timerRef.current) clearInterval(timerRef.current);
                    }}
                    className="px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all flex items-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Exit
                  </button>
                </div>

                {feedback && (
                  <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 shadow-lg ${
                    feedback.correct ? 'bg-gradient-to-r from-green-100 to-green-200 border-2 border-green-300' : 'bg-gradient-to-r from-red-100 to-red-200 border-2 border-red-300'
                  }`}>
                    {feedback.correct ? (
                      <>
                        <CheckCircle className="w-8 h-8 text-green-600" />
                        <div>
                          <div className="text-green-800 font-bold text-lg">
                            {feedback.sequence ? 'Perfect Sequence!' : feedback.interval ? 'Correct Interval!' : 'Excellent! '}
                            {feedback.points && <span className="text-green-600"> +{feedback.points} points!</span>}
                          </div>
                          {combo > 1 && <div className="text-green-700 text-sm">Combo ×{combo}!</div>}
                        </div>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-8 h-8 text-red-600" />
                        <span className="text-red-800 font-semibold">
                          {feedback.timeout ? "Time's up!" : 
                           feedback.sequence ? 'Wrong sequence! Try again.' :
                           feedback.interval ? `Wrong! Distance was ${feedback.correctInterval} steps` :
                           `Wrong! It was ${swarDisplay[feedback.note?.swar]}`}
                        </span>
                      </>
                    )}
                  </div>
                )}

                {gameMode === 'sequence' && (
                  <div className="mb-6 bg-purple-50 p-4 rounded-xl border-2 border-purple-200">
                    <div className="text-center mb-2 font-semibold text-purple-800">
                      Your Answer: {userSequence.length} / {sequence.length}
                    </div>
                    <div className="flex gap-2 justify-center">
                      {sequence.map((item, i) => (
                        <div key={i} className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold text-xs ${
                          i < userSequence.length ? 'bg-purple-300 text-purple-800' : 'bg-gray-200 text-gray-400'
                        }`}>
                          {i < userSequence.length ? swarDisplay[userSequence[i]] : '?'}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {gameMode === 'interval' ? (
                  <div className="grid grid-cols-6 gap-3">
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(interval => (
                      <button
                        key={interval}
                        onClick={() => checkInterval(interval)}
                        disabled={feedback !== null}
                        className="py-4 px-2 bg-green-100 text-green-800 rounded-lg font-bold hover:bg-green-200 transition-all disabled:cursor-not-allowed shadow-md"
                      >
                        {interval}
                      </button>
                    ))}
                  </div>
                ) : gameMode === 'sequence' ? (
                  <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
                    {getDifficultySwars().map((swar) => (
                      <button
                        key={swar}
                        onClick={() => handleSequenceInput(swar)}
                        disabled={feedback !== null || userSequence.length >= sequence.length}
                        className="py-3 px-2 bg-purple-100 text-purple-800 rounded-lg font-bold hover:bg-purple-200 transition-all disabled:cursor-not-allowed shadow-md text-xs"
                      >
                        {swarDisplay[swar]}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                    {difficulty === 'hard' ? (
                      ['mandra', 'madhya', 'taar'].map((octave) => (
                        <React.Fragment key={octave}>
                          {getDifficultySwars().map((swar) => {
                            const key = `${swar}-${octave}`;
                            const octaveSymbol = octave === 'mandra' ? '̣' : octave === 'taar' ? '\'' : '';
                            const displayName = swarDisplay[swar] + octaveSymbol;
                            return (
                              <button
                                key={key}
                                onClick={() => checkAnswer(key)}
                                disabled={feedback !== null}
                                className={`py-3 px-1 rounded-lg font-bold text-xs transition-all ${
                                  feedback?.note?.swar === swar && feedback?.note?.octave === octave && feedback?.correct
                                    ? 'bg-green-500 text-white'
                                    : feedback?.selected === key && !feedback?.correct
                                    ? 'bg-red-500 text-white'
                                    : 'bg-orange-100 text-orange-800 hover:bg-orange-200'
                                } disabled:cursor-not-allowed shadow-md`}
                              >
                                {displayName}
                              </button>
                            );
                          })}
                        </React.Fragment>
                      ))
                    ) : (
                      getDifficultySwars().map((swar) => (
                        <button
                          key={swar}
                          onClick={() => checkAnswer(swar)}
                          disabled={feedback !== null}
                          className={`py-3 px-2 rounded-lg font-bold text-sm transition-all ${
                            feedback?.note?.swar === swar && feedback?.correct
                              ? 'bg-green-500 text-white'
                              : feedback?.selected === swar && !feedback?.correct
                              ? 'bg-red-500 text-white'
                              : 'bg-orange-100 text-orange-800 hover:bg-orange-200'
                          } disabled:cursor-not-allowed shadow-md`}
                        >
                          {swarDisplay[swar]}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="mt-6 bg-white rounded-lg shadow-md p-6">
          <h3 className="font-bold text-orange-800 mb-3 text-xl">📚 How to Use:</h3>
          <div className="grid md:grid-cols-2 gap-6 text-sm text-gray-700">
            <div>
              <h4 className="font-semibold text-orange-700 mb-2 text-lg">🎹 Practice Mode:</h4>
              <ul className="space-y-2">
                <li>• Complete 3-octave harmonium with all 36 notes</li>
                <li>• White keys = Shuddha swars (natural notes)</li>
                <li>• Black keys = Komal (flat) & Teevra (sharp) swars</li>
                <li>• Practice at your own pace, build muscle memory</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-orange-700 mb-2 text-lg">🎮 Game Modes:</h4>
              <ul className="space-y-2">
                <li>• <strong>Classic:</strong> Identify single notes accurately</li>
                <li>• <strong>Speed:</strong> Race against time (10 seconds!)</li>
                <li>• <strong>Sequence:</strong> Remember & repeat note patterns</li>
                <li>• <strong>Interval:</strong> Identify distance between notes</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-orange-700 mb-2 text-lg">⭐ Difficulty Levels:</h4>
              <ul className="space-y-2">
                <li>• <strong>Easy:</strong> 7 shuddha swars only</li>
                <li>• <strong>Medium:</strong> All 12 swars (includes komal/teevra)</li>
                <li>• <strong>Hard:</strong> All swars across 3 octaves!</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-orange-700 mb-2 text-lg">🏆 Scoring System:</h4>
              <ul className="space-y-2">
                <li>• Build streaks for combo multipliers</li>
                <li>• Speed mode: Faster answers = more points</li>
                <li>• Every 5 correct = combo increases</li>
                <li>• Track your best streak and improve!</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center pb-6">
          <div className="inline-block bg-gradient-to-r from-orange-100 to-amber-100 rounded-full px-6 py-3 shadow-md border-2 border-orange-200">
            <p className="text-sm text-gray-700">
              🎵 Developed with <span className="text-red-500 animate-pulse">♥</span> for the love of music by{' '}
              <span className="font-bold text-orange-800">Sandeep Padhi</span>
            </p>
            <p className="text-xs text-gray-600 mt-1">
              Master the art of Indian Classical Music • Practice • Learn • Excel
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SwarTrainer;