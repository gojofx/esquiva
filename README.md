# Ruleta de Asientos

Juego de matemáticas para el salón. Una ruleta elige en secreto un asiento, una pista matemática dice cuál puede ser, y quien la resuelve gana puntos y puede intercambiar su puesto para no quedar en el asiento que va a caer.

Funciona en un servidor propio: un proceso Node sirve la página y comunica en tiempo real (WebSocket) la pantalla del profesor con los celulares de los estudiantes. No usa servicios externos ni CDNs: las fuentes van dentro del sitio.

## Páginas

| Dirección | Quién | Qué hace |
|---|---|---|
| `/` | Estudiantes | Se inscriben con su nombre (queda guardado en el celular hasta el final). En cada ronda ven la pista, envían el resultado (número, lista o apuesta), pueden **no responder** o declararse **"¡Fui el primero!"**. Lo enviado queda bloqueado. Ven sus puntos y el resultado de cada ronda. |
| `/#profesor` | Profesor (pide PIN) | Reglas de la partida, sala de inscripción con QR, orden de asientos, ruleta, intercambios, respuestas calificadas automáticamente (se pueden corregir), marcador, deshacer ronda. |

El asiento elegido **no se envía a los celulares** hasta que la ruleta se detiene, y ningún estudiante recibe las respuestas de los demás.

Si un estudiante cambia de celular o borra el navegador, vuelve a escribir su mismo nombre y el profesor aprueba el nuevo dispositivo.

## Instalación en el servidor

Requiere Node.js 18 o superior.

```bash
npm ci
npm run build
PROFESOR_PIN=123456 PORT=3000 npm start
```

Variables de entorno:

- `PORT` (por defecto `3000`) y `HOST` (por defecto `0.0.0.0`).
- `PROFESOR_PIN`: PIN de la pantalla del profesor. Si no se define, se genera uno, se muestra al arrancar y se guarda en `data/pin.txt`.
- `DATA_DIR` (por defecto `./data`): donde se guarda `partida.json`. La partida sobrevive a reinicios del servidor.

### Detrás de nginx (HTTPS)

El WebSocket está en `/ws`; el proxy debe dejar pasar la actualización de conexión:

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_read_timeout 3600s;
}
```

### Como servicio (systemd)

```ini
[Unit]
Description=Ruleta de Asientos
After=network.target

[Service]
WorkingDirectory=/opt/ruleta-de-asientos
Environment=PORT=3000 PROFESOR_PIN=123456
ExecStart=/usr/bin/node server/index.js
Restart=always
User=www-data

[Install]
WantedBy=multi-user.target
```

## Desarrollo

```bash
npm start        # servidor en :3000 (necesita npm run build al menos una vez)
npm run dev      # Vite con recarga en caliente; reenvía /ws al servidor de :3000
```

## Estructura

```
server/index.js      servidor HTTP + WebSocket, PIN, persistencia, vista filtrada para estudiantes
src/game/clues.js    generador de pistas (4 niveles, exactas y que reducen)
src/game/engine.js   reglas del juego (lo usan el servidor y la pantalla del profesor)
src/TeacherApp.jsx   pantalla del profesor
src/StudentApp.jsx   página de los estudiantes
src/components/      Reglamento, Configuración, Inscripción, Juego, Ruleta, Marcador, Fin de partida
```
