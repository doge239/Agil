const express = require("express");

const router = express.Router();

const verificarToken = require("../middlewares/auth.middleware");
const usuariosController = require("../controllers/usuarios.controller");

router.get(
  "/me",
  verificarToken,
  usuariosController.obtenerMiPerfil
);

module.exports = router;