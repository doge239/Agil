const express = require("express");

const router = express.Router();

const verificarToken = require("../middlewares/auth.middleware");
const academicoController = require("../controllers/academico.controller");

router.get(
  "/asignaturas",
  verificarToken,
  academicoController.obtenerAsignaturas
);

router.get(
  "/horario",
  verificarToken,
  academicoController.obtenerHorario
);

router.get(
  "/notas",
  verificarToken,
  academicoController.obtenerNotas
);

router.get(
  "/asistencia",
  verificarToken,
  academicoController.obtenerAsistencia
);

module.exports = router;