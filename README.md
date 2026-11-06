# Ruleta de Asientos

Juego de matemáticas para el salón. Una ruleta elige en secreto un asiento, una pista matemática dice cuál puede ser, y quien la resuelve gana puntos y puede intercambiar su puesto para no quedar en el asiento que va a caer.

La aplicación está hecha con React + Vite y se publica como sitio estático en GitHub Pages. **No hace ninguna petición a servidores externos**: las fuentes tipográficas van empaquetadas dentro del sitio, así que funciona en redes que solo permiten `github.io`.

## Qué incluye

- **Reglamento**: las reglas completas; la tabla de puntos usa los valores configurados en la partida.
- **Jugar**:
  - configurar la partida (nombres, rondas, segundos, límite de intercambios, tipo y nivel de pista, valores de puntos);
  - por cada ronda: elegir asiento → pista → tiempo → intercambios → giro → marcar respuestas → aplicar puntos.
  - Entre rondas se ajusta la tendencia (×1, ×2, ×3) de cada asiento.
  - Se puede deshacer la última ronda.
- **Marcador**: posiciones e historial de cada ronda.
- La partida se guarda en el navegador (`localStorage`): si se recarga la página, continúa donde iba.

## Desarrollo local

```bash
npm install
npm run dev      # servidor de desarrollo
npm run build    # genera dist/
npm run preview  # sirve dist/ para probar el build
```

## Publicación

Cada `push` a `main` ejecuta el workflow `.github/workflows/deploy.yml`, que compila el proyecto y lo publica en GitHub Pages (Settings → Pages → Source: **GitHub Actions**).

## Estructura

```
src/
  game/clues.js      generador de pistas (4 niveles, exactas y que reducen)
  game/engine.js     reglas del juego: rondas, intercambios, puntos, fuera/regreso
  components/        Reglamento, Configuración, Juego, Ruleta, Marcador, Fin de partida
```
