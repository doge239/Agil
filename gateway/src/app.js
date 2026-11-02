require("dotenv").config();

const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    mensaje: "API Gateway Banner-2 funcionando",
  });
});

async function reenviarPeticion(req, res, urlDestino) {
  try {
    const respuesta = await axios({
      method: req.method,
      url: urlDestino,
      headers: {
        Authorization: req.headers.authorization || "",
      },
      data: req.body,
      params: req.query,
      timeout: 15000,
      responseType: /\/certificados\/[^/]+$/.test(req.path) ? 'arraybuffer' : 'json',
    });

    if (respuesta.headers['content-type']?.includes('application/pdf')) {
      res.set('Content-Type','application/pdf');
      res.set('Content-Disposition',respuesta.headers['content-disposition'] || 'attachment; filename="certificado.pdf"');
      res.set('Cache-Control','no-store');
      return res.status(respuesta.status).send(Buffer.from(respuesta.data));
    }
    return res.status(respuesta.status).json(respuesta.data);

  } catch (error) {
    if (error.response) {
      if (Buffer.isBuffer(error.response.data)) {
        try { error.response.data = JSON.parse(error.response.data.toString('utf8')); }
        catch { error.response.data = {mensaje:'Error descargando el documento'}; }
      }
      return res
        .status(error.response.status)
        .json(error.response.data);
    }

    console.error(error.message);

    return res.status(500).json({
      mensaje: "Error comunicándose con el microservicio",
    });
  }
}

/* AUTH */

app.post("/api/auth/login", (req, res) => {
  reenviarPeticion(
    req,
    res,
    `${process.env.AUTH_SERVICE_URL}/auth/login`
  );
});

app.get("/api/auth/me", (req, res) => {
  reenviarPeticion(
    req,
    res,
    `${process.env.AUTH_SERVICE_URL}/auth/me`
  );
});

/* USUARIOS */

app.get("/api/usuarios/me", (req, res) => {
  reenviarPeticion(
    req,
    res,
    `${process.env.USUARIOS_SERVICE_URL}/usuarios/me`
  );
});

/* CATALOGO */

app.get("/api/catalogo/carreras", (req, res) => {
  reenviarPeticion(
    req,
    res,
    `${process.env.CATALOGO_SERVICE_URL}/catalogo/carreras`
  );
});

app.get("/api/catalogo/asignaturas", (req, res) => {
  reenviarPeticion(
    req,
    res,
    `${process.env.CATALOGO_SERVICE_URL}/catalogo/asignaturas`
  );
});

app.get("/api/catalogo/carreras/:idCarrera/malla", (req, res) => {
  reenviarPeticion(
    req,
    res,
    `${process.env.CATALOGO_SERVICE_URL}/catalogo/carreras/${req.params.idCarrera}/malla`
  );
});

/* ACADEMICO */

app.get("/api/academico/asignaturas", (req, res) => {
  reenviarPeticion(
    req,
    res,
    `${process.env.ACADEMICO_SERVICE_URL}/academico/asignaturas`
  );
});

app.get("/api/academico/horario", (req, res) => {
  reenviarPeticion(
    req,
    res,
    `${process.env.ACADEMICO_SERVICE_URL}/academico/horario`
  );
});

app.get("/api/academico/notas", (req, res) => {
  reenviarPeticion(
    req,
    res,
    `${process.env.ACADEMICO_SERVICE_URL}/academico/notas`
  );
});

app.get("/api/academico/asistencia", (req, res) => {
  reenviarPeticion(
    req,
    res,
    `${process.env.ACADEMICO_SERVICE_URL}/academico/asistencia`
  );
});

// Lista explícita de nuevas operaciones; nunca se acepta una URL de destino del cliente.
for (const ruta of ['periodos','oferta','avance-curricular','restricciones','solicitudes','encuestas','certificados','certificados/:tipo','administracion/solicitudes']) {
  app.get(`/api/academico/${ruta}`,(req,res)=>reenviarPeticion(req,res,`${process.env.ACADEMICO_SERVICE_URL}${req.path.slice(4)}`));
}
for (const ruta of ['inscripciones','solicitudes','encuestas/:idEncuesta/respuestas','administracion/encuestas']) {
  app.post(`/api/academico/${ruta}`,(req,res)=>reenviarPeticion(req,res,`${process.env.ACADEMICO_SERVICE_URL}${req.path.slice(4)}`));
}
app.patch('/api/academico/administracion/solicitudes/:idSolicitud',(req,res)=>reenviarPeticion(req,res,`${process.env.ACADEMICO_SERVICE_URL}${req.path.slice(4)}`));
app.patch('/api/academico/administracion/periodos/:idPeriodo/inscripcion',(req,res)=>reenviarPeticion(req,res,`${process.env.ACADEMICO_SERVICE_URL}${req.path.slice(4)}`));
app.put('/api/academico/administracion/inscripciones/:idInscripcion/resultado',(req,res)=>reenviarPeticion(req,res,`${process.env.ACADEMICO_SERVICE_URL}${req.path.slice(4)}`));

const PORT = process.env.PORT || 4000;

if (require.main === module) app.listen(PORT, () => {
  console.log(`API Gateway ejecutándose en puerto ${PORT}`);
});
module.exports = app;
