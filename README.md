# 🎮 Trivia Grupal en Tiempo Real (Tipo Kahoot)

Juego interactivo multijugador en tiempo real diseñado para reuniones y eventos en grupo, desarrollado con **React**, **Tailwind CSS** y **Firebase Realtime Database**.

---

## ⚡ Características Principales

- **Sin PIN ni complicaciones**: Los jugadores solo escanean el código QR gigante proyectado en la pantalla y entran directamente al juego.
- **Juego en Grupo**: Cada equipo designa a un representante con su celular, eligen nombre de grupo (ej: _"Los Gladiadores"_, _"Mesa 3"_) y un avatar.
- **Reglas del Juego**:
  - **15 Preguntas** por partida con 4 opciones desafiantes y relacionadas entre sí.
  - **90 Segundos** por pregunta para debatir en la mesa y responder.
  - **Puntos**: 1000 puntos base por respuesta correcta + bonificación de hasta 500 puntos según la rapidez.
  - Si no responden en los 90 segundos o eligen mal, obtienen **0 puntos**.
- **Pantalla Gigante (Anfitrión)**:
  - Generación automática de QR para unirse.
  - Sala de espera (_Lobby_) en vivo con los grupos conectados.
  - Temporizador animado con barra regresiva y contador de respuestas recibidas en tiempo real.
  - Revelación de respuestas correctas y tabla de posiciones (_Leaderboard_).
  - Podio final con animación de confeti para el equipo campeón.
- **Pantalla Celular (Grupos)**:
  - Botonera táctil estilo Kahoot (Rojo, Azul, Amarillo, Verde).
  - Feedback instantáneo de respuesta enviada y resultado tras finalizar el tiempo.

---

## 🚀 Cómo Probarlo en tu Computadora (Modo Desarrollo)

1. Abrir una terminal en esta carpeta:
   ```bash
   npm run dev
   ```
2. Abrir dos pestañas en tu navegador para simular el juego:
   - **Pestaña 1 (Pantalla Gigante):** `http://localhost:5173/#host`
   - **Pestaña 2 (Jugador / Celular):** `http://localhost:5173/`

---

## 🌐 Cómo Desplegarlo en GitHub Pages (Gratis en 2 minutos)

1. Creá un repositorio nuevo en tu cuenta de GitHub (por ejemplo, `trivia-reunion`).
2. En tu terminal local dentro de esta carpeta, ejecutá:
   ```bash
   git init
   git add .
   git commit -m "Primer commit: Trivia grupal en tiempo real"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/trivia-reunion.git
   git push -u origin main
   ```
3. Generá la carpeta de producción:
   ```bash
   npm run build
   ```
4. Podés publicarlo automáticamente instalando `gh-pages`:
   ```bash
   npm install --save-dev gh-pages
   ```
   Y agregando este script en tu `package.json`:
   ```json
   "scripts": {
     "deploy": "vite build && gh-pages -d dist"
   }
   ```
   Luego corrés:
   ```bash
   npm run deploy
   ```
5. En GitHub, andá a **Settings > Pages** y asegurate de que la fuente sea la rama `gh-pages` (o `main` / carpeta `/docs`).

¡Listo! Vas a tener tu link público: `https://TU_USUARIO.github.io/trivia-reunion/`.

---

## 📝 Cómo Cambiar o Agregar Preguntas

Las preguntas se encuentran en el archivo:
📁 `src/data/preguntas.json`

Podés editarlo directamente. Cada pregunta tiene esta estructura:

```json
{
  "pregunta": "¿Cuál es la capital de Australia?",
  "opciones": ["Sídney", "Melbourne", "Canberra", "Brisbane"],
  "correcta": 2
}
```

_(El índice de `"correcta"` empieza en 0: 0 = primera opción, 1 = segunda, 2 = tercera, 3 = cuarta)._
