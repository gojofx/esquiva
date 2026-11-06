import Icon, { SeatsIllustration } from "./Icons.jsx";

export default function Rules({ pts, onPlay }) {
  const s = (n) => (n > 0 ? `+${n}` : `${n}`);
  return (
    <>
      <header className="hero">
        <div className="wrap hero-grid">
          <div>
            <div className="kicker">Juego de matemáticas para el salón</div>
            <h1>
              Ruleta de <span className="gold">Asientos</span>
            </h1>
            <p className="lead">
              Una ruleta escoge un asiento antes de girar. Una pista matemática dice cuál puede ser. Quien la resuelve gana puntos y puede
              cambiarse de puesto para no quedar en el asiento que va a caer.
            </p>
            <div className="btn-row" style={{ marginTop: 24 }}>
              <button className="btn" type="button" onClick={onPlay}>
                <Icon name="play" size={18} /> Comenzar juego
              </button>
            </div>
            <div className="facts">
              <span className="chip">Se juega por <b>puntos</b></span>
              <span className="chip"><b>N rondas</b> definidas al inicio</span>
              <span className="chip">Todos empiezan con <b>{pts.start} puntos</b></span>
              <span className="chip">Gana quien tenga <b>más puntos</b></span>
            </div>
          </div>
          <SeatsIllustration />
        </div>
      </header>

      <div className="wrap">
        <div className="steps" aria-label="Pasos para jugar">
          <div className="step"><span className="n">1</span><span>Inscríbete con<br />tu nombre</span></div>
          <div className="step"><span className="n">2</span><span>Elige el asiento<br />donde estás</span></div>
          <div className="step"><span className="n">3</span><span>Resuelve la pista<br />y responde</span></div>
          <div className="step go"><span className="n"><Icon name="star" size={17} strokeWidth={2.2} /></span><span>¡A jugar!</span></div>
        </div>
      </div>

      <main className="wrap">
        <section id="preparacion">
          <div className="sec-head"><span className="sec-ico"><Icon name="users" size={26} /></span><h2>Antes de empezar</h2><span className="hand">lo que el profesor define una sola vez</span></div>
          <div className="cards">
            <div className="card">
              <span className="tag">ASIENTOS</span>
              <h3>Solo cuentan los ocupados</h3>
              <p>Se cuentan los estudiantes presentes y se numeran sus asientos. Los asientos vacíos salen de la ruleta. <b>Ningún asiento en juego puede quedar vacío.</b></p>
            </div>
            <div className="card">
              <span className="tag">RONDAS Y TIEMPO</span>
              <h3>N rondas, n segundos</h3>
              <p>Se define cuántas rondas tendrá la partida y cuántos segundos hay en cada ronda para resolver la pista e intercambiar asientos.</p>
            </div>
            <div className="card">
              <span className="tag">TENDENCIA</span>
              <h3>Probabilidad por número</h3>
              <p>Cada número de asiento puede tener más o menos probabilidad de salir. La tendencia va con el <b>asiento</b>, no con la persona: si alguien se cambia, deja atrás esa probabilidad.</p>
            </div>
            <div className="card">
              <span className="tag">INTERCAMBIOS</span>
              <h3>Límite por persona</h3>
              <p>Se fija cuántos intercambios puede hacer cada estudiante por ronda (por ejemplo, 1). Esto evita que los más rápidos muevan a todo el salón.</p>
            </div>
            <div className="card">
              <span className="tag">HOJA</span>
              <h3>Una hoja por estudiante</h3>
              <p>Cada uno anota sus respuestas en una hoja. Todos arrancan con <b className="mono">{pts.start}</b> puntos.</p>
            </div>
          </div>
        </section>

        <section id="ronda">
          <div className="sec-head"><span className="sec-ico"><Icon name="wheel" size={26} /></span><h2>Cómo es una ronda</h2><span className="hand">seis pasos que se repiten N veces</span></div>
          <ol className="timeline">
            <li><div>
              <span className="who">SISTEMA</span>
              <h3>Se elige el asiento en secreto</h3>
              <p>Antes de girar, el sistema escoge el asiento que va a caer, según la tendencia de cada número. Los asientos de jugadores que están fuera no pueden salir.</p>
            </div></li>
            <li><div>
              <span className="who">SISTEMA → SALÓN</span>
              <h3>Se muestra la pista y cuánto vale</h3>
              <p>La pista es una operación matemática. A veces dice el asiento exacto y a veces solo reduce las opciones. Junto a la pista se muestra cuántos puntos da acertarla.</p>
            </div></li>
            <li><div>
              <span className="who">ESTUDIANTES</span>
              <h3>Resolver, anotar e intercambiar</h3>
              <p>Cada uno resuelve la pista en su hoja. Quien crea que su asiento está en peligro puede proponer un intercambio. Quien termine puede declararse <b>"¡Primero!"</b> para jugarse el bono.</p>
              <span className="timer-note">Corre el tiempo: n segundos</span>
            </div></li>
            <li><div>
              <span className="who">PROFESOR</span>
              <h3>Se acaba el tiempo y todo se cierra</h3>
              <p>Las hojas y los intercambios se cierran <b>al mismo tiempo</b>. Desde ahí nadie puede cambiar lo que escribió ni moverse de asiento.</p>
            </div></li>
            <li><div>
              <span className="who">SISTEMA</span>
              <h3>La ruleta gira</h3>
              <p>La ruleta gira y se detiene en el asiento elegido en el paso 1. El giro es para el suspenso: el resultado ya estaba decidido.</p>
            </div></li>
            <li><div>
              <span className="who">PROFESOR</span>
              <h3>Se reparten los puntos</h3>
              <p>Suman los que acertaron, siempre que no estén en el asiento que cayó. Restan los que se equivocaron y quien está en el asiento que cayó. Luego se revisa quién queda fuera y quién vuelve a entrar.</p>
            </div></li>
          </ol>
        </section>

        <section id="pistas">
          <div className="sec-head"><span className="sec-ico gold"><Icon name="bulb" size={26} /></span><h2>Las pistas</h2><span className="hand">dos tipos, distinto riesgo · 5 niveles de dificultad</span></div>
          <div className="clue-row">
            <div className="chalk-box">
              <span className="pill y">PISTA EXACTA · {s(pts.exact)}</span>
              <div className="write">El asiento que cae es <em>6 × 3 − 4</em></div>
              <p>Dice un solo asiento. Es fácil saber cuál es, así que vale poco o se usa una operación más difícil.</p>
              <div className="solve">6 × 3 = 18 → 18 − 4 = <b style={{ color: "var(--yellow)" }}>14</b> · se anota: <b>14</b></div>
            </div>
            <div className="chalk-box">
              <span className="pill b">PISTA QUE REDUCE · {s(pts.list)} / {s(pts.bet)}</span>
              <div className="write">Es múltiplo de <em>3</em> y es mayor que <em>2 × 5</em></div>
              <p>Deja varios asientos posibles. Hay dos formas de responder:</p>
              <ul className="rules">
                <li><b>Lista exacta</b> de todos los posibles: <span className="pill g">{s(pts.list)}</span></li>
                <li><b>Apostar</b> por un solo asiento y acertar: <span className="pill g">{s(pts.bet)}</span></li>
                <li>Dejarla <b>en blanco</b>: <span className="pill o">0</span>, sin castigo</li>
              </ul>
              <div className="solve">2 × 5 = 10 → múltiplos de 3 mayores que 10 entre 1 y 24: <b style={{ color: "var(--yellow)" }}>12, 15, 18, 21, 24</b></div>
            </div>
          </div>
          <div className="levels" aria-label="Niveles de dificultad">
            <div className="level"><b>Nivel 1</b><br /><span className="mono">7 + 5</span> · <span className="mono">20 − 8</span></div>
            <div className="level"><b>Nivel 2</b><br /><span className="mono">4 × 6</span> · <span className="mono">36 ÷ 3</span></div>
            <div className="level"><b>Nivel 3</b><br /><span className="mono">(9 + 3) ÷ 2</span> · <span className="mono">5² − 7</span></div>
            <div className="level"><b>Nivel 4</b><br /><span className="mono">x + 8 = 21</span> · <span className="mono">3x = 27</span></div>
            <div className="level"><b>Nivel 5</b><br /><span className="mono">5x + 3 = 2x + 27</span> · <span className="mono">x/2 + x/3 = 10</span> · <span className="mono">3(x + 4) − 5 = 40</span></div>
          </div>
          <p className="muted" style={{ marginTop: 14 }}>El profesor puede cambiar la dificultad en medio de la partida, entre una ronda y otra. La pista solo puede dar como resultado asientos que sigan en juego. Si el asiento 7 es de alguien que está fuera, ninguna pista puede dar 7.</p>
        </section>

        <section id="intercambios">
          <div className="sec-head"><span className="sec-ico"><Icon name="swap" size={26} /></span><h2>Intercambios de asiento</h2><span className="hand">la defensa del que resolvió la pista</span></div>
          <div className="cards">
            <div className="card good"><span className="tag">SE PUEDE</span><h3>Intercambiar entre 2 o más</h3>
              <p>Dos estudiantes se cambian de puesto, o tres o más rotan entre ellos. Así ningún asiento queda vacío.</p></div>
            <div className="card good"><span className="tag">SE PUEDE</span><h3>Convencer a un compañero</h3>
              <p>Quien está en el asiento en peligro tiene que convencer a otro de cambiar. Solo aceptará quien no resolvió la pista o se equivocó: resolverla bien es la mejor defensa.</p></div>
            <div className="card warn"><span className="tag">NO SE PUEDE</span><h3>Dejar un asiento vacío</h3>
              <p>Nadie se puede levantar a un puesto libre ni quedarse de pie. Todo movimiento es un intercambio.</p></div>
            <div className="card warn"><span className="tag">NO SE PUEDE</span><h3>Pasar el límite</h3>
              <p>Cada persona tiene un número máximo de intercambios por ronda. Al cerrarse el tiempo, nadie se mueve más.</p></div>
            <div className="card warn"><span className="tag">NO SE PUEDE</span><h3>Mover a un jugador fuera</h3>
              <p>Quien está fuera del juego no puede moverse de su asiento, aunque sus compañeros quieran intercambiar con él.</p></div>
          </div>
        </section>

        <section id="hoja">
          <div className="sec-head"><span className="sec-ico"><Icon name="sheet" size={26} /></span><h2>La hoja de respuestas</h2><span className="hand">lo escrito queda escrito</span></div>
          <div className="clue-row">
            <div className="sheet" aria-label="Ejemplo de hoja de respuestas">
              <h3>Hoja de Valentina · asiento inicial 9</h3>
              <table>
                <thead><tr><th>Ronda</th><th>Respuesta</th><th>¿Primero?</th><th>Puntos</th></tr></thead>
                <tbody>
                  <tr><td>1</td><td className="h">14</td><td className="h">—</td><td className="mono">{s(pts.exact)} → {pts.start + pts.exact}</td></tr>
                  <tr><td>2</td><td className="h">12, 15, 18, 21, 24</td><td className="h">sí</td><td className="mono">{s(pts.list)} {s(pts.first)} → {pts.start + pts.exact + pts.list + pts.first}</td></tr>
                  <tr><td>3</td><td className="h">en blanco</td><td className="h">—</td><td className="mono">0 → {pts.start + pts.exact + pts.list + pts.first}</td></tr>
                  <tr><td>4</td><td className="h">5</td><td className="h">—</td><td className="mono">{s(-pts.wrong)} → {pts.start + pts.exact + pts.list + pts.first - pts.wrong}</td></tr>
                </tbody>
              </table>
              <p className="lock" style={{ marginTop: 8 }}>Al terminar el tiempo, la hoja se cierra: no se borra ni se corrige.</p>
            </div>
            <div className="card">
              <span className="tag">BONO POR SER PRIMERO</span>
              <h3>Declararse primero es una apuesta</h3>
              <p>Quien termina levanta la mano y dice "¡Primero!". El profesor anota el orden. Solo se juega el bono quien se declara:</p>
              <ul className="rules">
                <li>El primero en acertar: <span className="pill g">{s(pts.first)} extra</span></li>
                <li>Se equivoca: <span className="pill r">{s(-pts.firstFail)} extra</span></li>
              </ul>
              <p className="muted">Quien no está seguro puede esperar y responder sin arriesgar el bono.</p>
            </div>
          </div>
        </section>

        <section id="puntos">
          <div className="sec-head"><span className="sec-ico gold"><Icon name="trophy" size={26} /></span><h2>Tabla de puntos</h2><span className="hand">se ajustan al crear la partida</span></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Situación</th><th>Puntos</th><th>Nota</th></tr></thead>
              <tbody>
                <tr><td>Puntaje inicial</td><td className="pts info">{pts.start}</td><td className="muted">Todos arrancan igual</td></tr>
                <tr><td>Acierta una pista exacta</td><td className="pts plus">{s(pts.exact)}</td><td className="muted">Solo si la ruleta no cae en su asiento</td></tr>
                <tr><td>Acierta la lista exacta de una pista que reduce</td><td className="pts plus">{s(pts.list)}</td><td className="muted">Debe incluir todos los posibles, ni uno más ni uno menos</td></tr>
                <tr><td>Apuesta por un solo asiento y acierta</td><td className="pts plus">{s(pts.bet)}</td><td className="muted">Solo en pistas que reducen opciones</td></tr>
                <tr><td>Primero en acertar (declarado)</td><td className="pts plus">{s(pts.first)} extra</td><td className="muted">Se suma al acierto</td></tr>
                <tr><td>Deja la respuesta en blanco</td><td className="pts zero">0</td><td className="muted">No gana ni pierde</td></tr>
                <tr><td>Respuesta equivocada</td><td className="pts minus">{s(-pts.wrong)}</td><td className="muted">Incluye una apuesta que no acertó</td></tr>
                <tr><td>Se declara primero y se equivoca</td><td className="pts minus">{s(-pts.firstFail)} extra</td><td className="muted">Se suma al {s(-pts.wrong)} del error</td></tr>
                <tr><td>La ruleta cae en su asiento</td><td className="pts minus">{s(-pts.hit)}</td><td className="muted">Aunque haya acertado la pista</td></tr>
                <tr><td>Queda con menos de 0</td><td className="pts minus">fuera</td><td className="muted">Ver "Fuera del juego"</td></tr>
                <tr><td>{pts.returnHits} aciertos estando fuera</td><td className="pts info">vuelve con {pts.returnScore}</td><td className="muted">Su puntaje pasa a {pts.returnScore} al volver</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <section id="fuera">
          <div className="sec-head"><span className="sec-ico"><Icon name="door" size={26} /></span><h2>Fuera del juego y regreso</h2><span className="hand">nadie se queda sin jugar</span></div>
          <div className="flow">
            <div className="card warn"><span className="tag">1 · QUEDA FUERA</span><h3>Puntaje menor que 0</h3>
              <p>Sigue sentado en su asiento, pero ese número <b>sale de la ruleta</b>. No puede moverse ni intercambiar con nadie.</p></div>
            <div className="arrow" aria-hidden="true">→</div>
            <div className="card"><span className="tag">2 · SIGUE RESOLVIENDO</span><h3>Resuelve las pistas de cada ronda</h3>
              <p>Anota sus respuestas como todos. Estando fuera, <b>los errores no restan</b>, para que pueda recuperarse.</p></div>
            <div className="arrow" aria-hidden="true">→</div>
            <div className="card good"><span className="tag">3 · VUELVE</span><h3>{pts.returnHits} aciertos y regresa</h3>
              <p>Con {pts.returnHits} aciertos (en {pts.returnHits} rondas como mínimo) vuelve al juego con <b className="mono">{pts.returnScore}</b> puntos y su asiento <b>vuelve a la ruleta</b>.</p></div>
          </div>
        </section>

        <section id="especiales">
          <div className="sec-head"><span className="sec-ico gold"><Icon name="star" size={26} /></span><h2>Casos especiales</h2></div>
          <div className="cards">
            <div className="card"><span className="tag">POCOS ASIENTOS ACTIVOS</span><h3>Si quedan menos de 3 en la ruleta</h3>
              <p>Con 1 o 2 asientos activos el resultado se vuelve obvio. El profesor decide al inicio qué se hace en ese caso: <b>terminar la partida</b> o <b>reintegrar a todos</b> los que estén fuera con {pts.returnScore} puntos.</p></div>
            <div className="card"><span className="tag">EMPATE</span><h3>Pista final rápida</h3>
              <p>Si al terminar las N rondas hay empate en el primer lugar, se da una pista de desempate y gana el primero en resolverla bien.</p></div>
            <div className="card warn"><span className="tag">JUEGO LIMPIO</span><h3>No se sale de la página</h3>
              <p>Durante la partida el celular no puede salir del juego. Cambiar de aplicación (por ejemplo, a la calculadora), minimizar el navegador, cambiar de pestaña, bloquear la pantalla o usar pantalla dividida <b>cancela la participación</b> si dura más que la tolerancia (5 segundos por defecto): el asiento sale de la ruleta y no se puede volver a responder. Si fue un error, el profesor puede readmitir.</p></div>
            <div className="card"><span className="tag">ACIERTA Y LE CAE</span><h3>Acertó, pero estaba en el asiento</h3>
              <p>No recibe los puntos del acierto y pierde {pts.hit}. Si sabía que caía su asiento, debió intercambiar.</p></div>
          </div>
        </section>
      </main>
    </>
  );
}
