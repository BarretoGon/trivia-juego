import React, { useState, useEffect } from "react";
import { db, ref, set, update, onValue } from "../firebase";
import {
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Sparkles,
  Trophy,
} from "lucide-react";

const QUESTION_TIME = 45; // debe coincidir con HostView

const AVATARS = [
  "🦁",
  "🦊",
  "🚀",
  "⚡",
  "🦉",
  "🐺",
  "🔥",
  "💎",
  "🦄",
  "🎯",
  "🍕",
  "🏆",
];

const OPTION_COLORS = [
  { bg: "bg-red-500 active:bg-red-600", symbol: "▲", name: "Rojo" },
  { bg: "bg-blue-500 active:bg-blue-600", symbol: "◆", name: "Azul" },
  { bg: "bg-amber-500 active:bg-amber-600", symbol: "●", name: "Amarillo" },
  { bg: "bg-emerald-500 active:bg-emerald-600", symbol: "■", name: "Verde" },
];

export default function PlayerView({ onSwitchToHost }) {
  const [teamName, setTeamName] = useState(
    () => localStorage.getItem("trivia_team_name") || "",
  );
  const [selectedAvatar, setSelectedAvatar] = useState(
    () => localStorage.getItem("trivia_team_avatar") || "🦁",
  );
  const [teamId, setTeamId] = useState(
    () => localStorage.getItem("trivia_team_id") || "",
  );
  const [hasJoined, setHasJoined] = useState(false);

  const [gameState, setGameState] = useState(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME);

  // Escuchar estado del juego
  useEffect(() => {
    const roomRef = ref(db, "room");
    const unsubscribe = onValue(roomRef, (snapshot) => {
      const data = snapshot.val();
      setGameState(data);

      // Si cambió de pregunta o volvió a lobby, resetear estado de respuesta local
      if (
        data?.status === "QUESTION" &&
        data?.currentQuestionIndex !== undefined
      ) {
        // Verificar si este equipo ya envió respuesta en Firebase
        if (teamId && data.answers && data.answers[teamId]) {
          setHasAnswered(true);
          setSelectedOption(data.answers[teamId].selected);
        } else {
          setHasAnswered(false);
          setSelectedOption(null);
        }
      }
    });

    return () => unsubscribe();
  }, [teamId]);

  // Temporizador sincronizado con el host
  useEffect(() => {
    if (!gameState || gameState.status !== "QUESTION") return;

    const timer = setInterval(() => {
      const elapsed = Math.floor(
        (Date.now() - gameState.questionStartTime) / 1000,
      );
      const remaining = Math.max(0, QUESTION_TIME - elapsed);
      setTimeLeft(remaining);
      if (remaining === 0) clearInterval(timer);
    }, 500);

    return () => clearInterval(timer);
  }, [gameState?.status, gameState?.questionStartTime]);

  // Si ya tenía equipo guardado en localStorage, verificar en la sala
  useEffect(() => {
    if (teamId && gameState?.teams && gameState.teams[teamId]) {
      setHasJoined(true);
    }
  }, [teamId, gameState]);

  // Unirse como grupo
  const handleJoin = async (e) => {
    e.preventDefault();
    if (!teamName.trim()) return;

    let currentId = teamId;
    if (!currentId) {
      currentId = "team_" + Math.random().toString(36).substr(2, 9);
      setTeamId(currentId);
      localStorage.setItem("trivia_team_id", currentId);
    }

    localStorage.setItem("trivia_team_name", teamName.trim());
    localStorage.setItem("trivia_team_avatar", selectedAvatar);

    // Guardar en Firebase
    await update(ref(db, `room/teams/${currentId}`), {
      name: teamName.trim(),
      avatar: selectedAvatar,
      score: 0,
      joinedAt: Date.now(),
    });

    setHasJoined(true);
  };

  // Enviar respuesta
  const sendAnswer = async (index) => {
    if (hasAnswered || gameState?.status !== "QUESTION") return;

    const timeElapsed = (Date.now() - gameState.questionStartTime) / 1000;

    // Si ya pasaron los 45s, no computar
    if (timeElapsed > 45) return;

    setHasAnswered(true);
    setSelectedOption(index);

    await update(ref(db, `room/answers/${teamId}`), {
      selected: index,
      timeElapsed: Number(timeElapsed.toFixed(2)),
      timestamp: Date.now(),
    });
  };

  const myTeam = gameState?.teams?.[teamId];

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-4 max-w-md mx-auto">
      {/* Barra superior de estado */}
      <header className="flex justify-between items-center py-2 border-b border-slate-900">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 px-2 py-1 rounded-lg text-white font-black text-sm tracking-wider">
            TRIVIA
          </div>
          {hasJoined && myTeam && (
            <div className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1 rounded-full border border-slate-800 text-xs font-bold">
              <span>{myTeam.avatar}</span>
              <span className="truncate max-w-[120px]">{myTeam.name}</span>
            </div>
          )}
        </div>

        {/* Puntos actuales */}
        {hasJoined && myTeam && (
          <div className="bg-indigo-950/60 border border-indigo-500/30 px-3 py-1 rounded-xl text-right">
            <span className="text-xs text-indigo-400 block font-semibold leading-none">
              Puntos
            </span>
            <span className="text-base font-black text-white">
              {myTeam.score || 0}
            </span>
          </div>
        )}
      </header>

      {/* Contenido principal para el jugador */}
      <main className="flex-1 flex flex-col justify-center py-4">
        {/* 1. PANTALLA DE REGISTRO / UNIRSE (Si aún no se unió) */}
        {!hasJoined && (
          <form onSubmit={handleJoin} className="space-y-6 animate-fade-in">
            <div className="text-center space-y-2">
              <div className="inline-flex p-3 bg-indigo-600/20 text-indigo-400 rounded-2xl mb-1">
                <Users className="w-8 h-8" />
              </div>
              <h1 className="text-2xl font-black text-white">
                Unirse a la Trivia
              </h1>
              <p className="text-slate-400 text-sm">
                Ingresá el nombre de tu grupo para empezar
              </p>
            </div>

            <div className="space-y-4 bg-slate-900/80 p-6 rounded-3xl border border-slate-800 shadow-xl">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Nombre del Grupo o Equipo
                </label>
                <input
                  type="text"
                  required
                  maxLength={24}
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="Ej: Los Vengadores, Mesa 3..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white font-bold text-lg focus:outline-none focus:border-indigo-500 transition placeholder:text-slate-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Elegí un Avatar
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {AVATARS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setSelectedAvatar(emoji)}
                      className={`text-2xl p-2 rounded-xl transition border cursor-pointer ${
                        selectedAvatar === emoji
                          ? "bg-indigo-600/30 border-indigo-500 scale-110 shadow-lg"
                          : "bg-slate-950 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-black text-lg py-4 rounded-xl shadow-lg shadow-indigo-600/30 transition transform active:scale-98 cursor-pointer"
              >
                ¡ENTRAR AL JUEGO!
              </button>
            </div>
          </form>
        )}

        {/* 2. ESPERANDO EN LOBBY */}
        {hasJoined && (!gameState || gameState.status === "LOBBY") && (
          <div className="text-center space-y-6 animate-fade-in py-8">
            <div className="text-6xl animate-bounce-short">
              {myTeam?.avatar || "🎉"}
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white">
                ¡Estás dentro, {myTeam?.name}!
              </h2>
              <p className="text-slate-400 text-sm">
                Mirá la pantalla gigante. El juego comenzará cuando el anfitrión
                dé la señal.
              </p>
            </div>
            <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 text-slate-500 text-xs flex items-center justify-center gap-2">
              <Clock className="w-4 h-4 animate-spin" /> Esperando al
              anfitrión...
            </div>
          </div>
        )}

        {/* 3. PREGUNTA EN CURSO: BOTONERA KAHOOT GIGANTE */}
        {hasJoined && gameState?.status === "QUESTION" && (
          <div className="space-y-4 flex-1 flex flex-col justify-center animate-fade-in">
            <div className="text-center">
              <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                Pregunta {gameState.currentQuestion?.numero} de{" "}
                {gameState.currentQuestion?.total}
              </p>
              <h2 className="text-base font-bold text-white leading-snug break-words">
                {gameState.currentQuestion?.pregunta}
              </h2>
            </div>

            {/* Temporizador */}
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl font-black text-xl transition-colors ${
                  timeLeft <= 10
                    ? "bg-red-500/20 text-red-400 border border-red-500/50 animate-pulse"
                    : "bg-slate-800 text-amber-400 border border-slate-700"
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>{timeLeft}s</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${timeLeft <= 10 ? "bg-red-500" : "bg-gradient-to-r from-indigo-500 to-purple-500"}`}
                  style={{ width: `${(timeLeft / QUESTION_TIME) * 100}%` }}
                />
              </div>
            </div>

            {!hasAnswered ? (
              <div className="grid grid-cols-2 gap-3">
                {OPTION_COLORS.map((color, idx) => (
                  <button
                    key={idx}
                    onClick={() => sendAnswer(idx)}
                    className={`${color.bg} rounded-3xl shadow-xl flex flex-col items-center justify-center p-4 gap-2 min-h-[110px] transition transform active:scale-95 border-2 border-white/10 cursor-pointer`}
                  >
                    <span className="text-4xl font-black text-white">
                      {color.symbol}
                    </span>
                    <span className="text-xs md:text-sm font-bold text-white text-center break-words leading-snug w-full">
                      {gameState.currentQuestion?.opciones[idx]}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-4 shadow-2xl">
                <div className="inline-flex p-4 bg-indigo-600/20 text-indigo-400 rounded-full animate-pulse-fast">
                  <CheckCircle className="w-12 h-12" />
                </div>
                <h3 className="text-2xl font-black text-white">
                  ¡Respuesta Enviada!
                </h3>
                <p className="text-slate-400 text-sm">
                  Elegiste la opción{" "}
                  <strong className="text-white">
                    {OPTION_COLORS[selectedOption]?.symbol} (
                    {gameState.currentQuestion?.opciones[selectedOption]})
                  </strong>
                </p>
                <p className="text-xs text-slate-500">
                  Esperando que termine el tiempo en la pantalla grande...
                </p>
              </div>
            )}
          </div>
        )}

        {/* 4. REVELACIÓN DE RESULTADOS DE LA RONDA */}
        {hasJoined && gameState?.status === "REVEAL" && (
          <div className="text-center space-y-6 animate-fade-in py-6">
            {myTeam?.lastRoundCorrect ? (
              <div className="bg-emerald-950/40 border-2 border-emerald-500 p-8 rounded-3xl space-y-3 shadow-2xl">
                <div className="inline-flex p-4 bg-emerald-500/20 text-emerald-400 rounded-full">
                  <CheckCircle className="w-14 h-14" />
                </div>
                <h2 className="text-3xl font-black text-emerald-400">
                  ¡CORRECTO!
                </h2>
                <p className="text-white font-bold text-lg">
                  +{myTeam?.lastRoundPoints || 0} puntos
                </p>
              </div>
            ) : (
              <div className="bg-red-950/40 border-2 border-red-500 p-8 rounded-3xl space-y-3 shadow-2xl">
                <div className="inline-flex p-4 bg-red-500/20 text-red-400 rounded-full">
                  <XCircle className="w-14 h-14" />
                </div>
                <h2 className="text-3xl font-black text-red-400">
                  ¡INCORRECTO!
                </h2>
                <p className="text-slate-400 text-sm">
                  {hasAnswered
                    ? "No era la opción correcta."
                    : "Se agotó el tiempo de 45 segundos."}
                </p>
                <p className="text-slate-300 font-bold">
                  +0 puntos en esta ronda
                </p>
              </div>
            )}

            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 text-slate-400 text-sm">
              Mirá la pantalla gigante para ver la tabla de posiciones general.
            </div>
          </div>
        )}

        {/* 5. TABLA DE POSICIONES INTERMEDIA */}
        {hasJoined && gameState?.status === "LEADERBOARD" && (
          <div className="text-center space-y-6 animate-fade-in py-6">
            <div className="inline-flex p-4 bg-indigo-600/20 text-indigo-400 rounded-full">
              <Trophy className="w-12 h-12" />
            </div>
            <div className="space-y-1">
              <h2 className="text-2xl font-black text-white">
                Puntuación Total
              </h2>
              <p className="text-4xl font-black text-indigo-400">
                {myTeam?.score || 0} pts
              </p>
            </div>
            <p className="text-slate-400 text-sm">
              ¡Prepárense para la siguiente pregunta!
            </p>
          </div>
        )}

        {/* 6. JUEGO FINALIZADO */}
        {hasJoined && gameState?.status === "FINISHED" && (
          <div className="text-center space-y-6 animate-fade-in py-8">
            <div className="text-6xl animate-bounce">🏆</div>
            <h2 className="text-3xl font-black text-white">¡Fin del Juego!</h2>
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-2">
              <p className="text-slate-400 text-xs uppercase font-bold">
                Puntaje Final de tu Equipo
              </p>
              <p className="text-4xl font-black text-indigo-400">
                {myTeam?.score || 0} pts
              </p>
            </div>
            <p className="text-slate-400 text-sm">
              Revisá la pantalla grande para ver el podio de ganadores.
            </p>
          </div>
        )}
      </main>

      {/* Acceso discreto para abrir la vista Anfitrión en caso de estar en la PC */}
      <footer className="text-center py-2">
        <button
          onClick={onSwitchToHost}
          className="text-xs text-slate-600 hover:text-slate-400 underline transition cursor-pointer"
        >
          ¿Sos el anfitrión? Abrir pantalla gigante aquí
        </button>
      </footer>
    </div>
  );
}
