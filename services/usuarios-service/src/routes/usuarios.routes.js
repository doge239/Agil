const express = require("express");

const router = express.Router();

const verificarToken = require("../middlewares/auth.middleware");
const usuariosController = require("../controllers/usuarios.controller");

router.get(
  "/me",
  verificarToken,
  usuariosController.obtenerMiPerfil
);

router.get('/docente/cursos/:idCurso/estudiantes',verificarToken,usuariosController.obtenerEstudiantesDocente);
module.exports = router;
router.get('/unidad/estudiantes',verificarToken,usuariosController.buscarUnidad);
router.get('/unidad/docentes',verificarToken,usuariosController.buscarUnidad);
router.get('/general/estudiantes',verificarToken,usuariosController.buscarGeneral);
