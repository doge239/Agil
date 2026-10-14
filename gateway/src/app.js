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
    });

    return res.status(respuesta.status).json(respuesta.data);

  } catch (error) {
    if (error.response) {
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

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`API Gateway ejecutándose en puerto ${PORT}`);
});