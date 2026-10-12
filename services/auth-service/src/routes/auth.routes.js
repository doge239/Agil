const express = require("express");

const router = express.Router();

const authController = require("../controllers/auth.controller");
const verificarToken = require("../middlewares/auth.middleware");
const requireRole = require("../middlewares/role.middleware");

router.post("/login", authController.login);

router.get("/me", verificarToken, (req, res) => {
  res.json({
    mensaje: "Token válido",
    usuario: req.usuario,
  });
});

router.get(
  "/solo-estudiante",
  verificarToken,
  requireRole("ESTUDIANTE"),
  (req, res) => {
    res.json({
      mensaje: "Acceso permitido para estudiante",
      usuario: req.usuario,
    });
  }
);

router.get(
  "/solo-docente",
  verificarToken,
  requireRole("DOCENTE"),
  (req, res) => {
    res.json({
      mensaje: "Acceso permitido para docente",
      usuario: req.usuario,
    });
  }
);

module.exports = router;