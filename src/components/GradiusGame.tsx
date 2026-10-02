/**
 * GRADIUS COSMIC FORCE - Main Game Component
 * Retro 8-bit Horizontal Scrolling Space Shooter
 */

import React, { useState } from 'react';
import {
  Volume2,
  VolumeX,
  Tv,
  HelpCircle,
  Play,
  RotateCcw,
  Zap,
  Crosshair,
  Shield,
  Layers,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import { useGameEngine, CANVAS_WIDTH, CANVAS_HEIGHT } from '../hooks/useGameEngine';
import { PowerUpSlotType } from '../types/game';

export const GradiusGame: React.FC = () => {
  const {
    canvasRef,
    gameState,
    score,
    highScore,
    lives,
    stage,
    playerHp,
    playerMaxHp,
    isTerrainTransitioning,
    powerMeterIndex,
    powerSlots,
    bossActive,
    bossHpRatio,
    isWarningActive,
    isMuted,
    crtEnabled,
    optionsCount,
    toggleMute,
    toggleCrt,
    startGame,
    advanceToNextStage,
    activatePowerUp,
    setKeys,
  } = useGameEngine();

  const [showHelp, setShowHelp] = useState<boolean>(false);
  const [autoFire, setAutoFire] = useState<boolean>(true);

  // Format 7-digit zero-padded score
  const formatScore = (num: number) => num.toString().padStart(7, '0');

  // Virtual touch button handlers
  const handleTouchStart = (key: 'up' | 'down' | 'left' | 'right' | 'shoot' | 'missile' | 'powerUp') => {
    setKeys({ [key]: true });
  };

  const handleTouchEnd = (key: 'up' | 'down' | 'left' | 'right' | 'shoot' | 'missile' | 'powerUp') => {
    setKeys({ [key]: false });
  };

  // Direct power slot tap
  const handleSlotClick = (slotId: PowerUpSlotType) => {
    activatePowerUp(slotId);
  };

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen w-full bg-[#030712] text-slate-100 select-none overflow-x-hidden font-mono p-2 sm:p-4">
      {/* Top Arcade Header Bar */}
      <header className="w-full max-w-5xl flex items-center justify-between px-3 py-2 border-b border-slate-800 text-xs sm:text-sm">
        <div className="flex items-center gap-3">
          <span className="text-cyan-400 font-bold tracking-wider text-sm sm:text-base">
            GRADIUS COSMIC FORCE
          </span>
          <span className="hidden sm:inline text-slate-500">|</span>
          <span className="hidden sm:inline text-slate-400 text-xs">8-BIT SPACE SHMUP</span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleMute}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white transition-colors"
            title="Toggle Audio"
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-red-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
            <span className="hidden md:inline">{isMuted ? 'MUTE' : 'SOUND'}</span>
          </button>

          <button
            onClick={toggleCrt}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded border transition-colors ${
              crtEnabled
                ? 'bg-cyan-950/70 border-cyan-500 text-cyan-300'
                : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
            }`}
            title="Toggle CRT Scanline Effect"
          >
            <Tv className="w-3.5 h-3.5" />
            <span className="hidden md:inline">CRT {crtEnabled ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={() => setShowHelp(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white transition-colors"
            title="Help & Controls"
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">HELP</span>
          </button>
        </div>
      </header>

      {/* Main Game Screen Outer Cabinet Frame */}
      <main className="w-full max-w-5xl flex flex-col items-center mt-2 sm:mt-3">
        {/* HUD Top Bar (Classic Arcade Scoreboard) */}
        <div className="w-full bg-[#0a0f1d] border-t-2 border-x-2 border-slate-800 px-3 sm:px-6 py-2 flex flex-wrap items-center justify-between text-xs sm:text-sm font-['Press_Start_2P'] tracking-wider shadow-md">
          <div className="flex items-center gap-4 sm:gap-8">
            <div className="flex items-center gap-2">
              <span className="text-red-400 font-bold">1UP</span>
              <span className="text-white tabular-nums">{formatScore(score)}</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-amber-400 font-bold">HIGH</span>
              <span className="text-amber-200 tabular-nums">{formatScore(highScore)}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-6 mt-1 sm:mt-0 flex-wrap">
            <div className="flex items-center gap-1.5 text-cyan-400">
              <span>STAGE</span>
              <span className="text-white font-bold">{stage}</span>
            </div>

            {/* Expanded 7 Lives Display (HP abolished, 1 hit = 1 life) */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-400 text-[10px]">LIVES:</span>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(7, Math.max(0, lives)) }).map((_, i) => (
                  <span
                    key={i}
                    className={`text-sm ${
                      lives > 2
                        ? 'text-red-500 drop-shadow-[0_0_4px_rgba(239,68,68,0.8)]'
                        : 'text-red-400 animate-pulse drop-shadow-[0_0_6px_rgba(239,68,68,1)]'
                    }`}
                  >
                    ♥
                  </span>
                ))}
                {lives > 7 && (
                  <span className="text-[10px] text-red-400 font-bold ml-0.5">+{lives - 7}</span>
                )}
                <span className="text-[10px] text-white font-bold ml-1 tabular-nums">x{lives}</span>
              </div>
            </div>

            {optionsCount > 0 && (
              <div className="hidden sm:flex items-center gap-1 text-orange-400">
                <span className="text-slate-400">OPTION:</span>
                <span className="text-orange-300 font-bold">x{optionsCount}</span>
              </div>
            )}

            {isTerrainTransitioning && (
              <span className="hidden sm:inline text-[9px] text-cyan-300 border border-cyan-500/60 bg-cyan-950/70 px-2 py-0.5 rounded animate-pulse">
                PASS-THROUGH (地形無効)
              </span>
            )}
          </div>
        </div>

        {/* Canvas Display Viewport with CRT Overlays */}
        <div
          className={`relative w-full aspect-[16/9] bg-black border-2 border-slate-700 overflow-hidden shadow-2xl ${
            crtEnabled ? 'crt-effect' : ''
          }`}
          style={{ maxHeight: '70vh' }}
        >
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="w-full h-full block pixel-art"
          />

          {/* Boss Encounter HP Bar Overlay */}
          {bossActive && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 w-72 sm:w-96 bg-black/80 border border-red-500/70 p-1.5 rounded flex flex-col gap-1 backdrop-blur-sm shadow-lg">
              <div className="flex justify-between items-center text-[10px] text-red-400 font-bold tracking-wider px-1">
                <span>WARNING: BIG CORE DREADNOUGHT</span>
                <span className="text-white tabular-nums">{Math.round(bossHpRatio * 100)}%</span>
              </div>
              <div className="w-full h-2.5 bg-slate-900 rounded overflow-hidden border border-slate-700">
                <div
                  className={`h-full transition-all duration-100 ${
                    bossHpRatio > 0.5 ? 'bg-gradient-to-r from-cyan-500 to-blue-500' :
                    bossHpRatio > 0.25 ? 'bg-gradient-to-r from-amber-500 to-orange-500' :
                    'bg-gradient-to-r from-red-600 to-rose-400 animate-pulse'
                  }`}
                  style={{ width: `${Math.max(0, bossHpRatio * 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Title Screen Overlay */}
          {gameState === 'TITLE' && (
            <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center p-6 text-center z-30 backdrop-blur-xs">
              <div className="text-cyan-400 text-xl sm:text-3xl font-extrabold tracking-widest drop-shadow-[0_0_15px_rgba(6,182,212,0.8)] mb-2 font-['Press_Start_2P']">
                GRADIUS
              </div>
              <div className="text-orange-400 text-sm sm:text-lg font-bold tracking-widest mb-6">
                COSMIC FORCE 〜 宇宙の覇者 〜
              </div>

              <div className="max-w-md bg-slate-950/80 border border-slate-800 p-4 rounded-lg text-left text-xs text-slate-300 leading-relaxed mb-6 space-y-2">
                <p className="text-amber-300 font-bold flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" /> 勝利への鍵：アーケード仕様 & オート強化
                </p>
                <p>・自機は<span className="text-red-400 font-bold">被弾で即座に1機消費されるクラシック仕様（初期残機7機スタート）</span>！シールド（SHIELD）を装備すると敵弾を防げます。</p>
                <p>・序盤から手強い敵部隊が猛攻！アイテムカプセル出現率は低めになっているため、出現したカプセルは確実に回収しよう！</p>
                <p>・カプセルを取ると<span className="text-cyan-300 font-bold">自動でランダムにスロットが即座に取得・発動</span>！数字キー操作なしでノンストップ戦闘が可能です。</p>
                <p>・<span className="text-cyan-400 font-bold">左方向（後退）の移動速度が高速化</span>されており、敵弾や敵機の接近から素早く緊急回避できます。</p>
                <p>・<span className="text-orange-400 font-bold">OPTION (分身)</span>を装備すると、最大4体の分身が自機に追従して一斉射撃！</p>
                <p>・ステージ終盤には<span className="text-red-400 font-bold">HPが2倍以上（110HP+）に超強化された巨大戦艦「BIG CORE」</span>が待ち受ける！</p>
              </div>

              <button
                onClick={startGame}
                className="group relative px-8 py-3.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-['Press_Start_2P'] text-xs sm:text-sm tracking-wider rounded border border-cyan-300 arcade-glow-cyan transition-all transform active:scale-95 cursor-pointer flex items-center gap-2"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>START MISSION (SPACE)</span>
              </button>
            </div>
          )}

          {/* Paused Screen Overlay */}
          {gameState === 'PAUSED' && (
            <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center p-6 text-center z-30">
              <div className="text-amber-400 text-2xl font-bold font-['Press_Start_2P'] tracking-widest mb-4">
                PAUSED
              </div>
              <p className="text-slate-300 text-xs mb-6">PRESS [P] OR [ESC] TO RESUME</p>
              <button
                onClick={startGame}
                className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs rounded border border-slate-600 transition-colors"
              >
                RESTART MISSION
              </button>
            </div>
          )}

          {/* Stage Clear Victory Screen Overlay */}
          {gameState === 'STAGE_CLEAR' && (
            <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center p-6 text-center z-30 backdrop-blur-xs">
              <div className="text-emerald-400 text-xl sm:text-2xl font-bold font-['Press_Start_2P'] tracking-wider mb-2">
                STAGE {stage} CLEARED!
              </div>
              <div className="text-cyan-300 text-sm font-bold mb-4">
                MISSION ACCOMPLISHED
              </div>

              <div className="bg-slate-900/90 border border-slate-700 p-4 rounded-lg max-w-sm w-full mb-6 space-y-2 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>BIG CORE DEFEATED:</span>
                  <span className="text-amber-400 font-bold">+10,000 PTS</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>CURRENT SCORE:</span>
                  <span className="text-white font-bold">{formatScore(score)}</span>
                </div>
              </div>

              <button
                onClick={advanceToNextStage}
                className="px-8 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-['Press_Start_2P'] text-xs tracking-wider rounded border border-emerald-300 shadow-lg transition-all transform active:scale-95 cursor-pointer"
              >
                NEXT STAGE →
              </button>
            </div>
          )}

          {/* Game Over Screen Overlay */}
          {gameState === 'GAME_OVER' && (
            <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-6 text-center z-30">
              <div className="text-red-500 text-2xl sm:text-3xl font-bold font-['Press_Start_2P'] tracking-wider mb-3 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]">
                GAME OVER
              </div>
              <div className="text-slate-400 text-xs mb-6">
                THE COSMIC FORCE FELL IN SECTOR {stage}
              </div>

              <div className="bg-slate-950/80 border border-slate-800 p-4 rounded max-w-xs w-full mb-6 space-y-2 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>FINAL SCORE:</span>
                  <span className="text-white font-bold">{formatScore(score)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>BEST RECORD:</span>
                  <span className="text-amber-300 font-bold">{formatScore(highScore)}</span>
                </div>
              </div>

              <button
                onClick={startGame}
                className="px-8 py-3 bg-red-600 hover:bg-red-500 text-white font-['Press_Start_2P'] text-xs tracking-wider rounded border border-red-400 arcade-glow-red transition-all transform active:scale-95 cursor-pointer flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>TRY AGAIN</span>
              </button>
            </div>
          )}
        </div>

        {/* Bottom Classic Gradius Power Meter Bar */}
        <div className="w-full bg-[#0a0f1d] border-b-2 border-x-2 border-slate-800 p-2 sm:p-3 shadow-md">
          <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1.5 px-1 font-['Press_Start_2P']">
            <span>POWER-UP METER (カプセル取得で自動ランダム装備！数字キー不要)</span>
            <span className="text-cyan-400 hidden sm:inline">AUTO-EQUIP ACTIVE</span>
          </div>

          <div className="grid grid-cols-6 gap-1 sm:gap-2">
            {powerSlots.map((slot, index) => {
              const slotNumber = index + 1;
              const isCursorOnSlot = powerMeterIndex === slotNumber;
              const isEquipped = slot.active;

              return (
                <button
                  key={slot.id}
                  onClick={() => handleSlotClick(slot.id)}
                  className={`relative flex flex-col items-center justify-center py-2 px-1 sm:px-2 rounded border transition-all cursor-pointer font-['Press_Start_2P'] ${
                    isCursorOnSlot
                      ? 'animate-cursor-active border-amber-300 font-bold shadow-md scale-[1.02]'
                      : isEquipped
                      ? 'bg-cyan-950/80 border-cyan-500 text-cyan-300'
                      : 'bg-slate-900/90 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
                  }`}
                >
                  <span className="text-[9px] sm:text-xs tracking-tighter truncate">
                    {slot.label}
                  </span>

                  {/* Level / Status indicator */}
                  <span className="text-[7px] sm:text-[8px] mt-0.5 opacity-80">
                    {slot.id === 'SPEED' && slot.currentLevel > 0
                      ? `LV.${slot.currentLevel}`
                      : slot.id === 'OPTION' && slot.currentLevel > 0
                      ? `x${slot.currentLevel}`
                      : isEquipped
                      ? 'ACTIVE'
                      : `[${slotNumber}]`}
                  </span>

                  {/* Mini badge icon */}
                  {isEquipped && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-cyan-400 border border-slate-900" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Mobile On-Screen Virtual Controls */}
        <div className="w-full flex lg:hidden items-center justify-between mt-3 px-2 py-2 bg-slate-900/60 rounded-xl border border-slate-800">
          {/* Virtual D-pad (Left side) */}
          <div className="relative w-32 h-32 flex items-center justify-center">
            {/* Up */}
            <button
              onTouchStart={() => handleTouchStart('up')}
              onTouchEnd={() => handleTouchEnd('up')}
              onMouseDown={() => handleTouchStart('up')}
              onMouseUp={() => handleTouchEnd('up')}
              className="absolute top-0 w-11 h-11 bg-slate-800 active:bg-cyan-600 rounded-lg border border-slate-700 flex items-center justify-center text-slate-200"
            >
              <ArrowUp className="w-5 h-5" />
            </button>
            {/* Down */}
            <button
              onTouchStart={() => handleTouchStart('down')}
              onTouchEnd={() => handleTouchEnd('down')}
              onMouseDown={() => handleTouchStart('down')}
              onMouseUp={() => handleTouchEnd('down')}
              className="absolute bottom-0 w-11 h-11 bg-slate-800 active:bg-cyan-600 rounded-lg border border-slate-700 flex items-center justify-center text-slate-200"
            >
              <ArrowDown className="w-5 h-5" />
            </button>
            {/* Left */}
            <button
              onTouchStart={() => handleTouchStart('left')}
              onTouchEnd={() => handleTouchEnd('left')}
              onMouseDown={() => handleTouchStart('left')}
              onMouseUp={() => handleTouchEnd('left')}
              className="absolute left-0 w-11 h-11 bg-slate-800 active:bg-cyan-600 rounded-lg border border-slate-700 flex items-center justify-center text-slate-200"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            {/* Right */}
            <button
              onTouchStart={() => handleTouchStart('right')}
              onTouchEnd={() => handleTouchEnd('right')}
              onMouseDown={() => handleTouchStart('right')}
              onMouseUp={() => handleTouchEnd('right')}
              className="absolute right-0 w-11 h-11 bg-slate-800 active:bg-cyan-600 rounded-lg border border-slate-700 flex items-center justify-center text-slate-200"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>

          {/* Action Buttons (Right side) */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Shoot Button */}
            <button
              onTouchStart={() => handleTouchStart('shoot')}
              onTouchEnd={() => handleTouchEnd('shoot')}
              onMouseDown={() => handleTouchStart('shoot')}
              onMouseUp={() => handleTouchEnd('shoot')}
              className="w-14 h-14 rounded-full bg-red-600 active:bg-red-500 border-2 border-red-400 flex flex-col items-center justify-center text-white text-[9px] font-bold shadow-lg"
            >
              <Crosshair className="w-4 h-4 mb-0.5" />
              <span>SHOT</span>
            </button>

            {/* Missile Button */}
            <button
              onTouchStart={() => handleTouchStart('missile')}
              onTouchEnd={() => handleTouchEnd('missile')}
              onMouseDown={() => handleTouchStart('missile')}
              onMouseUp={() => handleTouchEnd('missile')}
              className="w-13 h-13 rounded-full bg-amber-600 active:bg-amber-500 border-2 border-amber-400 flex flex-col items-center justify-center text-white text-[8px] font-bold shadow-lg"
            >
              <Zap className="w-3.5 h-3.5 mb-0.5" />
              <span>MISSILE</span>
            </button>

            {/* Power-Up Activate Button */}
            <button
              onClick={() => activatePowerUp()}
              className="w-14 h-14 rounded-full bg-cyan-600 active:bg-cyan-500 border-2 border-cyan-400 flex flex-col items-center justify-center text-white text-[8px] font-bold shadow-lg"
            >
              <Layers className="w-4 h-4 mb-0.5" />
              <span>POWER</span>
            </button>
          </div>
        </div>

        {/* Keyboard Controls Reference Footer (Desktop) */}
        <div className="hidden lg:flex w-full items-center justify-between mt-3 text-[11px] text-slate-400 bg-slate-900/40 px-4 py-2 rounded-lg border border-slate-800">
          <div className="flex items-center gap-6">
            <span>
              <span className="text-cyan-300 font-bold">[W, A, S, D / 矢印]</span>: 移動 (左は高速後退)
            </span>
            <span>
              <span className="text-red-400 font-bold">[SPACE / Z / J]</span>: 連射攻撃
            </span>
            <span>
              <span className="text-amber-400 font-bold">[X / K]</span>: ミサイル
            </span>
            <span>
              <span className="text-orange-400 font-bold">[カプセル回収]</span>: 自動ランダム強化 (数字キー不要)
            </span>
          </div>

          <div>
            <span>[P / ESC]: ポーズ</span>
          </div>
        </div>
      </main>

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-lg w-full p-6 text-slate-200 text-xs space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-cyan-400 font-['Press_Start_2P']">
                HOW TO PLAY
              </h2>
              <button
                onClick={() => setShowHelp(false)}
                className="text-slate-400 hover:text-white px-2 py-1 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 leading-relaxed">
              <div>
                <h3 className="text-emerald-400 font-bold mb-1">■ クラシック残機制 (初期7機スタート)</h3>
                <p>
                  HP制を廃止し、被弾した瞬間に残機が1機減少する本格アーケード仕様です。初期残機は<span className="text-red-400 font-bold">7機</span>用意されています。<span className="text-blue-400 font-bold">SHIELD</span>を装備すると機首で敵弾を防ぎ、本体の被弾を防ぐことができます。
                </p>
              </div>

              <div>
                <h3 className="text-amber-400 font-bold mb-1">■ 序盤の難易度 & アイテム出現率</h3>
                <p>
                  序盤から手強い敵部隊が多数出現します。アイテムカプセルの出現率は厳選されているため、1つ1つのパワーアップを確実に回収することが攻略のカギとなります。
                </p>
              </div>

              <div>
                <h3 className="text-cyan-300 font-bold mb-1">■ 地形変化時の安全機能 (PASS-THROUGH)</h3>
                <p>
                  地形（洞窟の岩壁）は緩やかに変化し、出現時や変化中は<span className="text-cyan-400 font-bold">当たり判定が無効化</span>されるため、急な衝突事故を防ぎ安心して操縦できます。
                </p>
              </div>

              <div>
                <h3 className="text-amber-300 font-bold mb-1">■ オートランダム強化システム</h3>
                <p>
                  敵の編隊や特定の敵を撃破すると<span className="text-orange-400 font-bold">オレンジのカプセル</span>が出現します。回収すると<span className="text-cyan-300 font-bold">自動でランダムなスロットが即座に取得・発動</span>されます！数字キーや発動キーを押す必要はなく、直感的にパワーアップを楽しめます。
                </p>
                <p className="mt-1 text-slate-400 text-[10px]">
                  ※下部のスロットを直接クリック／タップすることでも任意のスロットを装備可能です。
                </p>
              </div>

              <div className="bg-slate-950 p-3 rounded border border-slate-800 space-y-1.5 text-[11px]">
                <p><span className="text-cyan-400 font-bold">1. SPEED UP:</span> 自機の飛行速度が上昇 (最大4段階)</p>
                <p><span className="text-red-400 font-bold">2. MISSILE:</span> 地形に沿って走る対地ミサイルを投下</p>
                <p><span className="text-amber-400 font-bold">3. DOUBLE:</span> 前方＋斜め上45度への2連射同時攻撃</p>
                <p><span className="text-cyan-400 font-bold">4. LASER:</span> 敵や岩を貫通して突き抜ける強力な直線レーザー</p>
                <p><span className="text-orange-400 font-bold">5. OPTION (分身):</span> 自機の航跡を追尾するエネルギー分身。自機と同じ武装を最大4体まで一斉射撃！</p>
                <p><span className="text-blue-400 font-bold">6. SHIELD:</span> 機首に敵弾を防御するフォースフィールドを展開</p>
              </div>

              <div>
                <h3 className="text-red-400 font-bold mb-1">■ 巨大ボス「BIG CORE」の攻略</h3>
                <p>
                  ステージ終盤に警報とともに巨大戦艦が出現します。中央の赤いコアを守る青い遮蔽シールド板を射撃で破壊し、露出したコアに集中砲火を浴びせて破壊してください！
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowHelp(false)}
              className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-bold transition-colors"
            >
              CLOSE
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
