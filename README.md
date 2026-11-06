# Ruleta de Asientos

Juego de matemáticas para el salón. Una ruleta elige en secreto un asiento, una pista matemática dice cuál puede ser, y quien la resuelve gana puntos y puede intercambiar su puesto para no quedar en el asiento que va a caer.

Funciona en un servidor propio: un proceso Node sirve la página y comunica en tiempo real (WebSocket) la pantalla del profesor con los celulares de los estudiantes. No usa servicios externos ni CDNs: las fuentes van dentro del sitio.

## Páginas

| Dirección | Quién | Qué hace |
|---|---|---|
| `/` | Estudiantes | Se inscriben con su nombre (queda guardado en el celular hasta el final) y **eligen el asiento donde están sentados**. En cada ronda ven la pista, envían el resultado (número, lista o apuesta), pueden **no responder** o declararse **"¡Fui el primero!"**; lo enviado queda bloqueado. Durante el tiempo indican **a qué asiento se van a pasar**: el compañero de ese asiento acepta o rechaza en su celular y el cambio queda registrado. Ven sus puntos y el resultado de cada ronda. |
| `/#profesor` | Profesor (pide PIN) | Reglas de la partida, sala de inscripción con QR, asientos (corrige o asigna a quien no tiene celular), ruleta, solicitudes de cambio, respuestas calificadas automáticamente (se pueden corregir), marcador, deshacer ronda. |

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
- `DATA_DIR` (por defecto `./data`): PIN generado y, si no hay base de datos, `partida.json` y el historial en `partidas-jugadas/`.
- Las variables se pueden poner en un archivo `.env` (ver `.env.example`); `.env` no se sube al repositorio.

### Base de datos (PostgreSQL)

Si se define `DB_USERNAME` (o `DATABASE_URL`), la partida se guarda en PostgreSQL; si no, en un archivo JSON. Las tablas se crean solas al arrancar:

- `partida_actual`: estado completo de la partida en curso (una fila). Así sobrevive a reinicios del servidor.
- `partidas_jugadas`: una fila por partida terminada, con reglas, ranking, rondas y ganador.

```bash
createdb esquiva   # o: psql -c "create database esquiva"
```

Variables: `DB_HOST` (localhost), `DB_PORT` (5432), `DB_DATABASE` (esquiva), `DB_USERNAME`, `DB_PASSWORD`, `DB_SSL=true` para conexiones cifradas.

## Despliegue con nginx

nginx sirve la página compilada (`dist/`) y reenvía el WebSocket `/ws` al servidor Node, que escucha solo en `127.0.0.1:3000`. Los archivos están en [`deploy/`](deploy/):

| Archivo | Para qué |
|---|---|
| `deploy/nginx-esquiva.conf` | Sitio en un dominio o subdominio propio (`https://esquiva.tu-dominio.com/`). |
| `deploy/nginx-esquiva-subruta.conf` | Bloques para pegar en un sitio existente y publicarlo en `https://tu-dominio.com/esquiva/`. |
| `deploy/esquiva.service` | Servicio systemd que mantiene el servidor Node encendido. |

### Pasos (Debian/Ubuntu)

```bash
# 1. Usuario y código
sudo useradd --system --home /opt/esquiva --shell /usr/sbin/nologin esquiva
sudo git clone <url-del-repositorio> /opt/esquiva     # o copiar la carpeta
cd /opt/esquiva
sudo npm ci && sudo npm run build
sudo mkdir -p data && sudo chown -R esquiva:esquiva data

# 2. Configuración (PIN y base de datos)
sudo cp .env.example .env && sudo nano .env
sudo chown esquiva:esquiva .env && sudo chmod 600 .env

# 3. Servicio
sudo cp deploy/esquiva.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now esquiva
journalctl -u esquiva -n 20          # muestra el PIN si no se definió PROFESOR_PIN

# 4. nginx (cambiar server_name en el archivo)
sudo cp deploy/nginx-esquiva.conf /etc/nginx/sites-available/esquiva
sudo ln -s /etc/nginx/sites-available/esquiva /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# 5. HTTPS (recomendado)
sudo certbot --nginx -d esquiva.tu-dominio.com
```

Con HTTPS la página usa `wss://` automáticamente. Para actualizar: `git pull && npm ci && npm run build && sudo systemctl restart esquiva` (nginx no necesita reiniciarse).

Claves de la configuración de nginx:

- `proxy_set_header Upgrade` / `Connection`: sin ellas el WebSocket no conecta y los celulares quedan en "conectando…".
- `proxy_read_timeout 1h`: evita que nginx corte la conexión durante una ronda larga (por defecto son 60 s; el servidor además envía un ping cada 20 s).
- `try_files $uri /index.html`: cualquier ruta carga la página. El profesor entra por `/#profesor`.

## Desarrollo

```bash
npm run dev      # servidor del juego (:3000) + Vite (:5173) a la vez; abre http://localhost:5173/
npm start        # solo el servidor; sirve dist/ (necesita npm run build)
```

En desarrollo se entra por `http://localhost:5173/` (estudiante) y `http://localhost:5173/#profesor`. El servidor se reinicia solo al cambiar `server/` o `src/game/`; la página se recarga sola al cambiar `src/`.

## Estructura

```
server/index.js      servidor HTTP + WebSocket, PIN, vista filtrada para estudiantes
server/storage.js    guardado en PostgreSQL o en archivo JSON
src/game/clues.js    generador de pistas (4 niveles, exactas y que reducen)
src/game/engine.js   reglas del juego (lo usan el servidor y la pantalla del profesor)
src/TeacherApp.jsx   pantalla del profesor
src/StudentApp.jsx   página de los estudiantes
src/components/      Reglamento, Configuración, Inscripción, Juego, Ruleta, Marcador, Fin de partida
```
