import React, { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import confetti from "canvas-confetti";
import { db, ref, set, update, onValue, remove } from "../firebase";
import defaultPreguntas from "../data/preguntas.json";
import {
  Users,
  Play,
  Award,
  CheckCircle,
  Clock,
  RotateCcw,
  ChevronRight,
  Trophy,
  Eye,
  AlertCircle,
  Copy,
  Check,
} from "lucide-react";

const QUESTION_TIME = 45; // 45 segundos por pregunta

const OPTION_COLORS = [
  {
    bg: "bg-red-500 hover:bg-red-600",
    border: "border-red-400",
    symbol: "▲",
    name: "Rojo",
  },
  {
    bg: "bg-blue-500 hover:bg-blue-600",
    border: "border-blue-400",
    symbol: "◆",
    name: "Azul",
  },
  {
    bg: "bg-amber-500 hover:bg-amber-600",
    border: "border-amber-400",
    symbol: "●",
    name: "Amarillo",
  },
  {
    bg: "bg-emerald-500 hover:bg-emerald-600",
    border: "border-emerald-400",
    symbol: "■",
    name: "Verde",
  },
];

export default function HostView() {
  const [gameState, setGameState] = useState(null);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME);
  const [copied, setCopied] = useState(false);

  // Sincronizar estado de la sala desde Firebase
  useEffect(() => {
    const roomRef = ref(db, "room");
    const unsubscribe = onValue(roomRef, (snapshot) => {
      const data = snapshot.val();
      setGameState(data);
    });
    return () => unsubscribe();
  }, []);

  // Temporizador para la pregunta en pantalla de Anfitrión
  useEffect(() => {
    if (!gameState || gameState.status !== "QUESTION") return;

    const timer = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now - gameState.questionStartTime) / 1000);
      const remaining = Math.max(0, QUESTION_TIME - elapsed);
      setTimeLeft(remaining);

      // Si se acaba el tiempo, pasar automáticamente a REVEAL
      if (remaining === 0) {
        clearInterval(timer);
        revealAnswer();
      }
    }, 500);

    return () => clearInterval(timer);
  }, [gameState?.status, gameState?.questionStartTime]);

  // URL para jugadores (misma URL sin parámetros de anfitrión)
  const playerUrl = window.location.origin + window.location.pathname;

  const copyUrl = () => {
    navigator.clipboard.writeText(playerUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Inicializar o reiniciar partida
  const resetGame = async () => {
    if (
      window.confirm("¿Seguro que querés reiniciar el juego y volver al lobby?")
    ) {
      await set(ref(db, "room"), {
        status: "LOBBY",
        currentQuestionIndex: -1,
        questionStartTime: 0,
        teams: {},
        answers: {},
        updatedAt: Date.now(),
      });
    }
  };

  // Iniciar partida eligiendo 15 preguntas aleatorias del banco
  const startGame = async () => {
    // Mezclar el banco de preguntas (Fisher-Yates) y tomar exactamente 15
    const shuffled = [...defaultPreguntas].sort(() => 0.5 - Math.random());
    const selected15 = shuffled.slice(0, 15);

    // Guardamos la lista de las 15 preguntas seleccionadas en la sala
    await update(ref(db, "room"), {
      gameQuestions: selected15,
      totalQuestions: 15,
    });

    nextQuestion(0, selected15);
  };

  // Pasar a una pregunta específica
  const nextQuestion = async (index, questionsList = null) => {
    const list =
      questionsList ||
      gameState?.gameQuestions ||
      defaultPreguntas.slice(0, 15);

    if (index >= list.length) {
      // Fin del juego -> pantalla final y podio
      await update(ref(db, "room"), {
        status: "FINISHED",
        updatedAt: Date.now(),
      });
      triggerConfetti();
      return;
    }

    const q = list[index];
    await update(ref(db, "room"), {
      status: "QUESTION",
      currentQuestionIndex: index,
      questionStartTime: Date.now(),
      answers: {}, // reiniciar respuestas de esta ronda
      currentQuestion: {
        pregunta: q.pregunta,
        opciones: q.opciones,
        correcta: q.correcta,
        numero: index + 1,
        total: list.length,
      },
      updatedAt: Date.now(),
    });
    setTimeLeft(QUESTION_TIME);
  };

  // Revelar la respuesta correcta y calcular puntos
  const revealAnswer = async () => {
    if (!gameState || gameState.status !== "QUESTION") return;

    const list = gameState.gameQuestions || defaultPreguntas.slice(0, 15);
    const currentQ = list[gameState.currentQuestionIndex];
    const correctIdx = currentQ.correcta;
    const roundAnswers = gameState.answers || {};
    const teams = { ...(gameState.teams || {}) };

    // Calcular puntos por cada respuesta
    Object.keys(teams).forEach((teamId) => {
      const ans = roundAnswers[teamId];
      if (ans && ans.selected === correctIdx) {
        // Correcto: Base 1000 pts + bonus por velocidad (hasta 500 pts extra según los 90s)
        const speedBonus = Math.round(
          Math.max(
            0,
            ((QUESTION_TIME - (ans.timeElapsed || QUESTION_TIME)) /
              QUESTION_TIME) *
              500,
          ),
        );
        const roundPoints = 1000 + speedBonus;
        teams[teamId].score = (teams[teamId].score || 0) + roundPoints;
        teams[teamId].lastRoundPoints = roundPoints;
        teams[teamId].lastRoundCorrect = true;
      } else {
        // No contestó a tiempo o incorrecto: 0 puntos
        teams[teamId].lastRoundPoints = 0;
        teams[teamId].lastRoundCorrect = false;
      }
    });

    await update(ref(db, "room"), {
      status: "REVEAL",
      teams: teams,
      updatedAt: Date.now(),
    });
  };

  // Ir a tabla de posiciones intermedia
  const showLeaderboard = async () => {
    await update(ref(db, "room"), {
      status: "LEADERBOARD",
      updatedAt: Date.now(),
    });
  };

  const triggerConfetti = () => {
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
    });
  };

  const teamsList = Object.entries(gameState?.teams || {}).map(([id, t]) => ({
    id,
    ...t,
  }));
  const sortedTeams = [...teamsList].sort(
    (a, b) => (b.score || 0) - (a.score || 0),
  );

  const currentQ = gameState?.currentQuestion;
  const answersCount = Object.keys(gameState?.answers || {}).length;
  const totalTeams = teamsList.length;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-4 md:p-8">
      {/* Barra superior con controles */}
      <header className="flex justify-between items-center border-b border-slate-800 pb-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-xl text-white font-black text-xl tracking-wider shadow-lg shadow-indigo-500/30">
            TRIVIA
          </div>
          <span className="text-slate-400 text-sm hidden sm:inline">
            Modo Pantalla Gigante / Anfitrión
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={resetGame}
            title="Reiniciar sala"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition border border-slate-700 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reiniciar Sala
          </button>
        </div>
      </header>

      {/* Contenido según el estado */}
      <main className="flex-1 flex flex-col justify-center">
        {/* 1. LOBBY / SALA DE ESPERA */}
        {(!gameState || gameState.status === "LOBBY") && (
          <div className="max-w-4xl mx-auto w-full text-center space-y-8 animate-fade-in">
            <div className="space-y-3">
              <h1 className="text-4xl md:text-6xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
                ¡Prepárense para Jugar!
              </h1>
              <p className="text-lg md:text-xl text-slate-300 font-medium">
                15 Preguntas • 45 Segundos • Respondan en Equipo
              </p>
            </div>

            {/* Código QR y Link para entrar */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl max-w-md mx-auto flex flex-col items-center gap-4 backdrop-blur">
              <div className="bg-white p-4 rounded-2xl shadow-inner">
                <QRCodeSVG value={playerUrl} size={220} level="M" />
              </div>

              <div className="w-full text-center space-y-2">
                <p className="text-sm font-semibold text-slate-400">
                  Escaneen con la cámara del celular o entren a:
                </p>
                <button
                  onClick={copyUrl}
                  className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-indigo-300 px-4 py-2 rounded-xl text-sm font-mono border border-slate-700 transition cursor-pointer"
                >
                  <span className="truncate">{playerUrl}</span>
                  {copied ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Lista de Equipos Conectados */}
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-2 text-slate-400 font-medium">
                <Users className="w-5 h-5 text-indigo-400" />
                <span>
                  Equipos unidos:{" "}
                  <strong className="text-white text-lg">
                    {teamsList.length}
                  </strong>
                </span>
              </div>

              {teamsList.length === 0 ? (
                <div className="p-6 bg-slate-900/40 rounded-2xl border border-dashed border-slate-800 text-slate-500 max-w-lg mx-auto">
                  Esperando que los grupos se unan desde sus celulares...
                </div>
              ) : (
                <div className="flex flex-wrap justify-center gap-3 max-w-3xl mx-auto">
                  {teamsList.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center gap-2 bg-gradient-to-r from-slate-800 to-slate-900 border border-slate-700 px-4 py-2.5 rounded-2xl shadow-md text-white font-bold text-lg animate-bounce-short"
                    >
                      <span className="text-2xl">{t.avatar || "⚡"}</span>
                      <span>{t.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Botón Comenzar */}
            <div className="pt-4">
              <button
                onClick={startGame}
                disabled={teamsList.length === 0}
                className="inline-flex items-center gap-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-xl px-10 py-5 rounded-2xl shadow-xl shadow-indigo-600/30 transition transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none cursor-pointer"
              >
                <Play className="w-7 h-7 fill-white" /> ¡EMPEZAR JUEGO!
              </button>
            </div>
          </div>
        )}

        {/* 2. PANTALLA DE PREGUNTA ACTIVA */}
        {gameState?.status === "QUESTION" && currentQ && (
          <div className="max-w-5xl mx-auto w-full space-y-6 animate-fade-in">
            {/* Header de Pregunta con Temporizador y Contador */}
            <div className="flex flex-wrap justify-between items-center bg-slate-900/80 p-4 rounded-2xl border border-slate-800 gap-4">
              <div className="flex items-center gap-2 font-bold text-indigo-400 text-lg">
                <span>
                  Pregunta {currentQ.numero} de {currentQ.total}
                </span>
              </div>

              {/* Temporizador gigante 90s */}
              <div
                className={`flex items-center gap-2 px-5 py-2 rounded-xl font-black text-2xl transition-colors ${
                  timeLeft <= 10
                    ? "bg-red-500/20 text-red-400 border border-red-500/50 animate-pulse"
                    : "bg-slate-800 text-amber-400 border border-slate-700"
                }`}
              >
                <Clock className="w-6 h-6" />
                <span>{timeLeft}s</span>
              </div>

              {/* Contador de respuestas recibidas */}
              <div className="flex items-center gap-2 text-slate-300 font-bold bg-slate-800 px-4 py-2 rounded-xl border border-slate-700">
                <Users className="w-5 h-5 text-indigo-400" />
                <span>
                  Respuestas:{" "}
                  <strong className="text-white">{answersCount}</strong> /{" "}
                  {totalTeams}
                </span>
              </div>
            </div>

            {/* Barra de progreso de tiempo */}
            <div className="w-full bg-slate-900 rounded-full h-3 overflow-hidden border border-slate-800">
              <div
                className={`h-full transition-all duration-500 ${timeLeft <= 15 ? "bg-red-500" : "bg-gradient-to-r from-indigo-500 to-purple-500"}`}
                style={{ width: `${(timeLeft / QUESTION_TIME) * 100}%` }}
              />
            </div>

            {/* Texto de la Pregunta */}
            <div className="bg-slate-900 border-2 border-indigo-500/30 rounded-3xl p-8 md:p-12 text-center shadow-2xl">
              <h2 className="text-2xl md:text-4xl font-extrabold text-white leading-relaxed">
                {currentQ.pregunta}
              </h2>
            </div>

            {/* Opciones con Colores y Símbolos Kahoot */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentQ.opciones.map((opcion, idx) => {
                const color = OPTION_COLORS[idx % OPTION_COLORS.length];
                return (
                  <div
                    key={idx}
                    className={`${color.bg} text-white p-6 rounded-2xl shadow-lg flex items-center gap-4 transition`}
                  >
                    <span className="text-3xl font-black opacity-90 shrink-0">
                      {color.symbol}
                    </span>
                    <span className="text-lg md:text-xl font-bold leading-snug break-words min-w-0 w-full">
                      {opcion}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Botón Anfitrión para forzar resolución antes de los 90s */}
            <div className="flex justify-end pt-2">
              <button
                onClick={revealAnswer}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-5 py-2.5 rounded-xl text-sm font-semibold border border-slate-700 transition cursor-pointer"
              >
                <Eye className="w-4 h-4" /> Revelar Respuesta Ahora
              </button>
            </div>
          </div>
        )}

        {/* 3. REVELACIÓN DE RESPUESTA */}
        {gameState?.status === "REVEAL" && currentQ && (
          <div className="max-w-4xl mx-auto w-full space-y-6 text-center animate-fade-in">
            <h3 className="text-xl font-bold text-slate-400">
              Pregunta {currentQ.numero} de {currentQ.total}
            </h3>
            <h2 className="text-2xl md:text-3xl font-bold text-white leading-snug break-words">
              {currentQ.pregunta}
            </h2>

            <div className="p-8 rounded-3xl bg-emerald-950/40 border-2 border-emerald-500 shadow-2xl max-w-xl mx-auto">
              <div className="inline-flex p-3 bg-emerald-500/20 text-emerald-400 rounded-full mb-3">
                <CheckCircle className="w-12 h-12" />
              </div>
              <p className="text-sm font-bold text-emerald-400 uppercase tracking-wider mb-2">
                Respuesta Correcta
              </p>
              <p className="text-2xl md:text-3xl font-black text-white leading-snug break-words">
                {currentQ.opciones[currentQ.correcta]}
              </p>
            </div>

            {/* Resumen de grupos que acertaron */}
            <div className="max-w-lg mx-auto bg-slate-900 p-4 rounded-2xl border border-slate-800">
              <p className="text-xs font-semibold text-slate-400 uppercase mb-3">
                Desempeño de los grupos en esta ronda
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {teamsList.map((t) => (
                  <span
                    key={t.id}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold border ${
                      t.lastRoundCorrect
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                        : "bg-red-500/10 text-red-300 border-red-500/30"
                    }`}
                  >
                    <span>{t.avatar}</span>
                    <span>{t.name}</span>
                    <span>
                      {t.lastRoundCorrect
                        ? `(+${t.lastRoundPoints || 0})`
                        : "(0 pts)"}
                    </span>
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-4">
              <button
                onClick={showLeaderboard}
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-lg px-8 py-4 rounded-2xl shadow-xl shadow-indigo-600/30 transition cursor-pointer"
              >
                Ver Tabla de Puntos <ChevronRight className="w-6 h-6" />
              </button>
            </div>
          </div>
        )}

        {/* 4. TABLA DE POSICIONES (LEADERBOARD) */}
        {gameState?.status === "LEADERBOARD" && (
          <div className="max-w-2xl mx-auto w-full space-y-6 animate-fade-in">
            <div className="text-center space-y-1">
              <div className="inline-flex p-3 bg-amber-500/20 text-amber-400 rounded-2xl mb-2">
                <Trophy className="w-8 h-8" />
              </div>
              <h2 className="text-3xl font-black text-white">
                Tabla de Posiciones
              </h2>
              <p className="text-slate-400 text-sm">
                Ronda {gameState.currentQuestionIndex + 1} de{" "}
                {defaultPreguntas.length}
              </p>
            </div>

            <div className="space-y-3">
              {sortedTeams.map((team, idx) => (
                <div
                  key={team.id}
                  className={`flex items-center justify-between p-4 rounded-2xl border transition ${
                    idx === 0
                      ? "bg-gradient-to-r from-amber-950/40 to-slate-900 border-amber-500/60 shadow-lg"
                      : idx === 1
                        ? "bg-slate-900 border-slate-400/40"
                        : idx === 2
                          ? "bg-slate-900 border-amber-700/40"
                          : "bg-slate-900/60 border-slate-800"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${
                        idx === 0
                          ? "bg-amber-400 text-slate-950"
                          : idx === 1
                            ? "bg-slate-300 text-slate-950"
                            : idx === 2
                              ? "bg-amber-700 text-white"
                              : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <span className="text-2xl">{team.avatar || "⚡"}</span>
                    <span className="font-bold text-lg text-white">
                      {team.name}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-xl text-indigo-400">
                      {team.score || 0}
                    </span>
                    <span className="text-xs text-slate-400 block">puntos</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 text-center">
              <button
                onClick={() => nextQuestion(gameState.currentQuestionIndex + 1)}
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-lg px-8 py-4 rounded-2xl shadow-xl shadow-indigo-600/30 transition cursor-pointer"
              >
                {gameState.currentQuestionIndex + 1 >= defaultPreguntas.length
                  ? "Ver Ganadores Finales"
                  : "Siguiente Pregunta"}
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
          </div>
        )}

        {/* 5. PANTALLA FINAL / PODIO */}
        {gameState?.status === "FINISHED" && (
          <div className="max-w-3xl mx-auto w-full text-center space-y-8 animate-fade-in py-8">
            <div className="space-y-2">
              <div className="inline-flex p-4 bg-amber-500/20 text-amber-400 rounded-3xl mb-2 animate-bounce">
                <Trophy className="w-16 h-16" />
              </div>
              <h1 className="text-4xl md:text-6xl font-black text-white">
                ¡Juego Finalizado!
              </h1>
              <p className="text-slate-400 text-lg">
                Gran trabajo de todos los grupos
              </p>
            </div>

            {/* Podio Top 3 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end pt-4">
              {/* Segundo Lugar */}
              {sortedTeams[1] && (
                <div className="bg-slate-900 border border-slate-700 p-6 rounded-3xl space-y-2 order-2 md:order-1">
                  <span className="text-4xl block">
                    {sortedTeams[1].avatar}
                  </span>
                  <div className="bg-slate-400 text-slate-950 font-black text-xs px-3 py-1 rounded-full inline-block">
                    2° LUGAR
                  </div>
                  <h3 className="text-xl font-bold text-white truncate">
                    {sortedTeams[1].name}
                  </h3>
                  <p className="text-indigo-400 font-extrabold text-2xl">
                    {sortedTeams[1].score || 0} pts
                  </p>
                </div>
              )}

              {/* Primer Lugar / Ganador */}
              {sortedTeams[0] && (
                <div className="bg-gradient-to-b from-amber-950/60 to-slate-900 border-2 border-amber-400 p-8 rounded-3xl space-y-3 order-1 md:order-2 transform md:-translate-y-4 shadow-2xl shadow-amber-500/20">
                  <span className="text-6xl block animate-bounce-short">
                    {sortedTeams[0].avatar}
                  </span>
                  <div className="bg-amber-400 text-slate-950 font-black text-sm px-4 py-1.5 rounded-full inline-block shadow-md">
                    👑 CAMPEÓN
                  </div>
                  <h3 className="text-2xl md:text-3xl font-black text-white truncate">
                    {sortedTeams[0].name}
                  </h3>
                  <p className="text-amber-300 font-black text-4xl">
                    {sortedTeams[0].score || 0} pts
                  </p>
                </div>
              )}

              {/* Tercer Lugar */}
              {sortedTeams[2] && (
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-2 order-3">
                  <span className="text-4xl block">
                    {sortedTeams[2].avatar}
                  </span>
                  <div className="bg-amber-700 text-white font-black text-xs px-3 py-1 rounded-full inline-block">
                    3° LUGAR
                  </div>
                  <h3 className="text-xl font-bold text-white truncate">
                    {sortedTeams[2].name}
                  </h3>
                  <p className="text-indigo-400 font-extrabold text-2xl">
                    {sortedTeams[2].score || 0} pts
                  </p>
                </div>
              )}
            </div>

            <div className="pt-6">
              <button
                onClick={resetGame}
                className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-bold px-6 py-3 rounded-xl border border-slate-700 transition cursor-pointer"
              >
                <RotateCcw className="w-5 h-5" /> Jugar Otra Partida
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-slate-600 border-t border-slate-900 pt-4 mt-6">
        Juego de Trivia Multijugador • Hecho para reuniones en equipo
      </footer>
    </div>
  );
}
