const express = require("express");

const router = express.Router();

const verificarToken = require("../middlewares/auth.middleware");
const catalogoController = require("../controllers/catalogo.controller");
router.use('/general',verificarToken,require('./general.routes'));

router.get(
  "/carreras",
  verificarToken,
  catalogoController.obtenerCarreras
);

router.get(
  "/asignaturas",
  verificarToken,
  catalogoController.obtenerAsignaturas
);

router.get(
  "/carreras/:idCarrera/malla",
  verificarToken,
  catalogoController.obtenerMallaPorCarrera
);

module.exports = router;
