import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
// Fuentes empaquetadas con la app: no se descarga nada de servidores externos.
import "@fontsource/bricolage-grotesque/600.css";
import "@fontsource/bricolage-grotesque/800.css";
import "@fontsource/atkinson-hyperlegible/400.css";
import "@fontsource/atkinson-hyperlegible/700.css";
import "@fontsource/caveat/600.css";
import "@fontsource/caveat/700.css";
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/jetbrains-mono/700.css";
import "./styles.css";
import TeacherApp from "./TeacherApp.jsx";
import StudentApp from "./StudentApp.jsx";
import { isTeacherPath, migrateHash } from "./paths.js";

migrateHash();

function Root() {
  const [teacher, setTeacher] = useState(isTeacherPath);
  useEffect(() => {
    const f = () => setTeacher(isTeacherPath());
    window.addEventListener("popstate", f);
    return () => window.removeEventListener("popstate", f);
  }, []);
  return teacher ? <TeacherApp /> : <StudentApp />;
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
