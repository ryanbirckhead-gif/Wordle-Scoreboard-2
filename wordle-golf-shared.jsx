import React, { useState, useEffect } from 'react';
import { BarChart3, Users, TrendingUp, Calendar, Trophy, Flame, RefreshCw } from 'lucide-react';

const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyIFWg0JmuYrMc9z_N71piMcr8klnQd7QWjrqKkF30llqf58WCw-Tutkddp2XRwlEYRbw/exec';
const MY_NAME = 'Birckhead';

export default function WordleTracker() {
  const [allScores, setAllScores] = useState([]);
  const [pasteInput, setPasteInput] = useState('');
  const [activeTab, setActiveTab] = useState('add');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadScoresFromSheet();
  }, []);

  const loadScoresFromSheet = async () => {
    setSyncing(true);
    try {
      const response = await fetch(GOOGLE_SCRIPT_URL);
      const data = await response.json();
      
      const formattedScores = data.map(score => ({
        puzzleNumber: parseInt(score.puzzleNumber),
        guesses: parseInt(score.guesses),
        date: score.date,
        playerName: score.playerName
      }));
      
      setAllScores(formattedScores);
    } catch (err) {
      setError('Failed to load scores from Google Sheets');
      console.error(err);
    }
    setSyncing(false);
  };

  const addScoreToSheet = async (score) => {
    setLoading(true);
    try {
      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({
          action: 'add',
          puzzleNumber: score.puzzleNumber,
          guesses: score.guesses,
          date: score.date,
          playerName: MY_NAME
        })
      });
      
      const result = await response.json();
      if (result.success) {
        setSuccess('Score added successfully!');
        setTimeout(() => setSuccess(''), 3000);
        await loadScoresFromSheet();
      }
    } catch (err) {
      setError('Failed to save score to Google Sheets');
      console.error(err);
    }
    setLoading(false);
  };

  const guessesToGolfScore = (guesses) => {
    const scoreMap = {
      1: -3,
      2: -2,
      3: -1,
      4: 0,
      5: 1,
      6: 2,
      7: 4
    };
    return scoreMap[guesses] || 0;
  };

  const getGolfTermName = (guesses) => {
    const termMap = {
      1: 'Hole in One',
      2: 'Eagle',
      3: 'Birdie',
      4: 'Par',
      5: 'Bogey',
      6: 'Double Bogey',
      7: 'No Submission'
    };
    return termMap[guesses] || 'Unknown';
  };

  const parseWordleShare = (text) => {
    const lines = text.trim().split('\n');
    const firstLine = lines[0];
    
    const match = firstLine.match(/Wordle\s+([\d,]+)\s+([X1-6])\/6/i);
    if (!match) {
      throw new Error('Invalid Wordle share format');
    }

    const puzzleNumber = parseInt(match[1].replace(/,/g, ''));
    const guesses = match[2] === 'X' ? 7 : parseInt(match[2]);
    
    return { puzzleNumber, guesses, date: new Date().toISOString().split('T')[0] };
  };

  const handleAddScore = async () => {
    setError('');
    setSuccess('');
    try {
      const parsed = parseWordleShare(pasteInput);
      
      if (allScores.some(s => s.puzzleNumber === parsed.puzzleNumber && s.playerName === MY_NAME)) {
        setError('You already added this puzzle!');
        return;
      }

      await addScoreToSheet(parsed);
      setPasteInput('');
      setActiveTab('scorecard');
    } catch (err) {
      setError(err.message);
    }
  };

  const getPlayerScores = (playerName) => {
    return allScores
      .filter(s => s.playerName === playerName)
      .sort((a, b) => a.puzzleNumber - b.puzzleNumber);
  };

  const calculateStats = (scoreList) => {
    if (scoreList.length === 0) return null;

    const wins = scoreList.filter(s => s.guesses <= 6).length;
    const losses = scoreList.filter(s => s.guesses === 7).length;
    const totalGames = scoreList.length;
    const winRate = Math.round((wins / totalGames) * 100);
    
    const guessDistribution = [0, 0, 0, 0, 0, 0, 0];
    scoreList.forEach(s => {
      if (s.guesses >= 1 && s.guesses <= 7) {
        guessDistribution[s.guesses - 1]++;
      }
    });

    let currentStreak = 0;
    for (let i = scoreList.length - 1; i >= 0; i--) {
      if (scoreList[i].guesses <= 6) {
        currentStreak++;
      } else {
        break;
      }
    }

    let maxStreak = 0;
    let tempStreak = 0;
    scoreList.forEach(s => {
      if (s.guesses <= 6) {
        tempStreak++;
        maxStreak = Math.max(maxStreak, tempStreak);
      } else {
        tempStreak = 0;
      }
    });

    const avgGuesses = scoreList.reduce((sum, s) => sum + (s.guesses === 7 ? 0 : s.guesses), 0) / wins || 0;
    const totalStrokes = scoreList.reduce((sum, s) => sum + guessesToGolfScore(s.guesses), 0);

    return {
      totalGames,
      wins,
      losses,
      winRate,
      currentStreak,
      maxStreak,
      avgGuesses: avgGuesses.toFixed(2),
      guessDistribution,
      totalStrokes
    };
  };

  const myScores = getPlayerScores(MY_NAME);
  const myStats = calculateStats(myScores);
  
  const allPlayers = [...new Set(allScores.map(s => s.playerName))];
  const otherPlayers = allPlayers.filter(p => p !== MY_NAME);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold text-green-700">
                🟩 Wordle Golf
              </h1>
              <p className="text-gray-600">Playing as: <span className="font-bold text-green-700">{MY_NAME}</span></p>
            </div>
            <button
              onClick={loadScoresFromSheet}
              disabled={syncing}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw size={18} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Syncing...' : 'Refresh'}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg mb-6 p-2 flex gap-2 flex-wrap">
          <button
            onClick={() => setActiveTab('add')}
            className={`flex-1 min-w-[100px] py-3 px-3 rounded-lg font-medium transition-all text-sm ${
              activeTab === 'add' 
                ? 'bg-green-600 text-white shadow-md' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Calendar className="inline mr-1" size={16} />
            Add
          </button>
          <button
            onClick={() => setActiveTab('scorecard')}
            className={`flex-1 min-w-[100px] py-3 px-3 rounded-lg font-medium transition-all text-sm ${
              activeTab === 'scorecard' 
                ? 'bg-green-600 text-white shadow-md' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            SC
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex-1 min-w-[100px] py-3 px-3 rounded-lg font-medium transition-all text-sm ${
              activeTab === 'stats' 
                ? 'bg-green-600 text-white shadow-md' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <BarChart3 className="inline mr-1" size={16} />
            Stats
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 min-w-[100px] py-3 px-3 rounded-lg font-medium transition-all text-sm ${
              activeTab === 'history' 
                ? 'bg-green-600 text-white shadow-md' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <TrendingUp className="inline mr-1" size={16} />
            History
          </button>
        </div>

        {activeTab === 'add' && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">Add Your Score</h2>
            <p className="text-gray-600 mb-4">Paste your Wordle share result below:</p>
            
            <textarea
              value={pasteInput}
              onChange={(e) => setPasteInput(e.target.value)}
              placeholder="Wordle 1,234 4/6&#10;&#10;⬜🟨⬜⬜🟩&#10;🟩⬜🟩🟩🟩&#10;🟩🟩🟩🟩🟩"
              className="w-full p-4 border-2 border-gray-300 rounded-lg mb-4 font-mono text-sm"
              rows="6"
            />
            
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}
            
            {success && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                {success}
              </div>
            )}
            
            <button
              onClick={handleAddScore}
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Score'}
            </button>
          </div>
        )}

        {activeTab === 'scorecard' && (
          <div className="bg-gradient-to-br from-emerald-600 via-green-700 to-teal-800 rounded-xl shadow-2xl p-6 text-white">
            <h2 className="text-3xl font-bold mb-6 text-center text-yellow-300 drop-shadow-lg">
              ⛳ TOURNAMENT SCORECARD
            </h2>
            
            {allScores.length > 0 ? (
              <>
                {/* Scoring Legend */}
                <div className="bg-white/15 backdrop-blur-sm rounded-xl p-4 mb-6 border-2 border-yellow-400/30">
                  <h3 className="font-bold text-yellow-300 mb-3 text-center">🏌️ Scoring Guide</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs font-bold">
                    <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-3 py-2 rounded-lg text-center shadow-lg">
                      ⭐ HOLE IN ONE<br/>-3 (1/6)
                    </div>
                    <div className="bg-gradient-to-r from-green-500 to-green-600 px-3 py-2 rounded-lg text-center shadow-lg">
                      🦅 EAGLE<br/>-2 (2/6)
                    </div>
                    <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-3 py-2 rounded-lg text-center shadow-lg">
                      🐦 BIRDIE<br/>-1 (3/6)
                    </div>
                    <div className="bg-gradient-to-r from-gray-500 to-gray-600 px-3 py-2 rounded-lg text-center shadow-lg">
                      PAR<br/>0 (4/6)
                    </div>
                    <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 px-3 py-2 rounded-lg text-center shadow-lg">
                      BOGEY<br/>+1 (5/6)
                    </div>
                    <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-3 py-2 rounded-lg text-center shadow-lg">
                      DOUBLE BOGEY<br/>+2 (6/6)
                    </div>
                    <div className="bg-gradient-to-r from-red-600 to-red-700 px-3 py-2 rounded-lg text-center shadow-lg col-span-2">
                      ❌ NO SUBMISSION<br/>+4 (X)
                    </div>
                  </div>
                </div>

                {/* Leaderboard Summary */}
                {(() => {
                  const playerStats = allPlayers.map(playerName => {
                    const scores = getPlayerScores(playerName);
                    const stats = calculateStats(scores);
                    return {
                      name: playerName,
                      totalStrokes: stats.totalStrokes,
                      totalGames: stats.totalGames,
                      isYou: playerName === MY_NAME
                    };
                  }).sort((a, b) => a.totalStrokes - b.totalStrokes);
                  
                  return (
                    <div className="bg-gradient-to-br from-yellow-300 to-yellow-500 text-gray-900 rounded-xl p-6 mb-6 shadow-2xl border-4 border-yellow-600">
                      <h3 className="font-bold text-2xl mb-4 text-center text-green-900">🏆 LEADERBOARD 🏆</h3>
                      <div className="space-y-2">
                        {playerStats.map((player, idx) => (
                          <div 
                            key={player.name} 
                            className={`flex items-center justify-between p-3 rounded-lg ${
                              player.isYou 
                                ? 'bg-green-600 text-white font-bold shadow-lg border-2 border-green-800' 
                                : 'bg-white/80'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                                idx === 0 ? 'bg-yellow-400 text-gray-900 border-2 border-yellow-600' :
                                idx === 1 ? 'bg-gray-300 text-gray-800' :
                                idx === 2 ? 'bg-orange-400 text-white' :
                                'bg-gray-200 text-gray-700'
                              }`}>
                                {idx + 1}
                              </div>
                              <div>
                                <div className="font-bold text-lg">{player.name}</div>
                                <div className="text-xs opacity-75">{player.totalGames} holes</div>
                              </div>
                            </div>
                            <div className={`text-3xl font-bold ${
                              player.totalStrokes < 0 ? 'text-green-700' :
                              player.totalStrokes === 0 ? 'text-blue-700' :
                              'text-red-700'
                            }`}>
                              {player.totalStrokes > 0 ? `+${player.totalStrokes}` : player.totalStrokes}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Golf Scorecard Grid */}
                {(() => {
                  const allPuzzles = new Set(allScores.map(s => s.puzzleNumber));
                  const puzzleNumbers = Array.from(allPuzzles).sort((a, b) => a - b).slice(-18);
                  
                  return (
                    <div className="bg-white rounded-xl p-4 shadow-2xl">
                      <h3 className="font-bold text-2xl mb-4 text-green-900 text-center">📋 SCORECARD (Last 18 Holes)</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs border-collapse">
                          <thead>
                            <tr className="bg-gradient-to-r from-green-700 to-green-800 text-white">
                              <th className="border-2 border-green-900 p-2 text-left sticky left-0 bg-green-800 z-10">GOLFER</th>
                              {puzzleNumbers.map((puzzle, idx) => (
                                <th key={puzzle} className="border-2 border-green-900 p-2 text-center min-w-[50px]">
                                  <div className="font-bold">{idx + 1}</div>
                                  <div className="text-[10px] opacity-75">#{puzzle}</div>
                                </th>
                              ))}
                              <th className="border-2 border-green-900 p-2 text-center font-bold bg-yellow-500 text-gray-900">TOTAL</th>
                            </tr>
                          </thead>
                          <tbody>
                            {allPlayers.map(playerName => {
                              const playerScores = getPlayerScores(playerName);
                              const isYou = playerName === MY_NAME;
                              let runningTotal = 0;
                              
                              return (
                                <tr key={playerName} className={isYou ? 'bg-green-100 font-bold' : 'bg-white'}>
                                  <td className={`border-2 border-gray-300 p-2 font-bold sticky left-0 z-10 ${
                                    isYou ? 'bg-green-200' : 'bg-gray-50'
                                  }`}>
                                    {playerName.toUpperCase()}
                                  </td>
                                  {puzzleNumbers.map(puzzle => {
                                    const score = playerScores.find(s => s.puzzleNumber === puzzle);
                                    if (!score) {
                                      return (
                                        <td key={puzzle} className="border-2 border-gray-300 p-2 text-center bg-gray-100">
                                          -
                                        </td>
                                      );
                                    }
                                    const strokes = guessesToGolfScore(score.guesses);
                                    runningTotal += strokes;
                                    
                                    return (
                                      <td 
                                        key={puzzle} 
                                        className={`border-2 border-gray-300 p-2 text-center font-bold ${
                                          score.guesses === 1 ? 'bg-purple-200 text-purple-900' :
                                          score.guesses === 2 ? 'bg-green-200 text-green-900' :
                                          score.guesses === 3 ? 'bg-blue-200 text-blue-900' :
                                          score.guesses === 4 ? 'bg-gray-100 text-gray-700' :
                                          score.guesses === 5 ? 'bg-yellow-200 text-yellow-900' :
                                          score.guesses === 6 ? 'bg-orange-200 text-orange-900' :
                                          'bg-red-300 text-red-900'
                                        }`}
                                      >
                                        <div className="text-base">
                                          {strokes > 0 ? `+${strokes}` : strokes}
                                        </div>
                                        <div className="text-[9px] opacity-60">
                                          {score.guesses === 1 ? '⭐' :
                                           score.guesses === 2 ? '🦅' :
                                           score.guesses === 3 ? '🐦' :
                                           score.guesses === 7 ? '❌' : ''}
                                        </div>
                                      </td>
                                    );
                                  })}
                                  <td className={`border-2 border-gray-400 p-2 text-center font-bold text-lg ${
                                    runningTotal < 0 ? 'bg-green-300 text-green-900' :
                                    runningTotal === 0 ? 'bg-blue-200 text-blue-900' :
                                    'bg-red-300 text-red-900'
                                  }`}>
                                    {runningTotal > 0 ? `+${runningTotal}` : runningTotal}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}
              </>
            ) : (
              <div className="text-center py-12">
                <Trophy className="mx-auto mb-4 opacity-50" size={64} />
                <h3 className="text-xl font-bold mb-2">No Scores Yet</h3>
                <p className="opacity-75">Add your first score to get started!</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="space-y-6">
            {myStats ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-xl shadow-lg p-4 text-center">
                    <div className="text-3xl font-bold text-green-600">{myStats.totalGames}</div>
                    <div className="text-gray-600 text-sm">Games Played</div>
                  </div>
                  <div className="bg-white rounded-xl shadow-lg p-4 text-center">
                    <div className="text-3xl font-bold text-blue-600">{myStats.winRate}%</div>
                    <div className="text-gray-600 text-sm">Win Rate</div>
                  </div>
                  <div className="bg-white rounded-xl shadow-lg p-4 text-center">
                    <Flame className="mx-auto text-orange-500 mb-1" size={24} />
                    <div className="text-3xl font-bold text-orange-600">{myStats.currentStreak}</div>
                    <div className="text-gray-600 text-sm">Current Streak</div>
                  </div>
                  <div className="bg-white rounded-xl shadow-lg p-4 text-center">
                    <div className={`text-3xl font-bold ${
                      myStats.totalStrokes < 0 ? 'text-green-600' :
                      myStats.totalStrokes === 0 ? 'text-blue-600' :
                      'text-red-600'
                    }`}>
                      {myStats.totalStrokes > 0 ? `+${myStats.totalStrokes}` : myStats.totalStrokes}
                    </div>
                    <div className="text-gray-600 text-sm">Total Strokes</div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-xl font-bold mb-4 text-gray-800">Guess Distribution</h3>
                  <div className="space-y-2">
                    {myStats.guessDistribution.map((count, idx) => {
                      const maxCount = Math.max(...myStats.guessDistribution);
                      const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
                      const label = idx === 6 ? 'X' : (idx + 1).toString();
                      
                      return (
                        <div key={idx} className="flex items-center gap-2">
                          <div className="w-6 text-center font-bold text-gray-700">{label}</div>
                          <div className="flex-1 bg-gray-200 rounded-full h-8 relative">
                            <div
                              className={`h-8 rounded-full flex items-center justify-end pr-2 text-white font-bold ${
                                idx === 6 ? 'bg-red-500' : 'bg-green-600'
                              }`}
                              style={{ width: `${Math.max(percentage, 5)}%` }}
                            >
                              {count > 0 && count}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                <BarChart3 className="mx-auto text-gray-400 mb-4" size={64} />
                <h3 className="text-xl font-bold text-gray-600 mb-2">No Stats Yet</h3>
                <p className="text-gray-500">Add your first score to see statistics!</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">Your Score History</h2>
            {myScores.length > 0 ? (
              <div className="space-y-2">
                {myScores.slice().reverse().map((score) => {
                  const strokes = guessesToGolfScore(score.guesses);
                  return (
                    <div key={score.puzzleNumber} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div>
                        <div className="font-bold text-gray-800">Wordle {score.puzzleNumber}</div>
                        <div className="text-sm text-gray-600">{score.date}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className={`text-2xl font-bold px-4 py-2 rounded-lg ${
                          score.guesses === 1 ? 'bg-purple-100 text-purple-700' :
                          score.guesses === 2 ? 'bg-green-100 text-green-700' :
                          score.guesses === 3 ? 'bg-blue-100 text-blue-700' :
                          score.guesses === 4 ? 'bg-yellow-100 text-yellow-700' :
                          score.guesses === 5 ? 'bg-orange-100 text-orange-700' :
                          score.guesses === 6 ? 'bg-red-100 text-red-700' :
                          'bg-gray-800 text-white'
                        }`}>
                          {score.guesses === 7 ? 'X' : score.guesses}/6
                        </div>
                        <div className={`text-lg font-bold ${
                          strokes < 0 ? 'text-green-600' :
                          strokes === 0 ? 'text-gray-600' :
                          'text-red-600'
                        }`}>
                          ({strokes > 0 ? `+${strokes}` : strokes})
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <TrendingUp className="mx-auto text-gray-400 mb-4" size={64} />
                <h3 className="text-xl font-bold text-gray-600 mb-2">No History Yet</h3>
                <p className="text-gray-500">Start adding scores to build your history!</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}