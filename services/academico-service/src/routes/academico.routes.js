const express = require("express");

const router = express.Router();

const verificarToken = require("../middlewares/auth.middleware");
const academicoController = require("../controllers/estudiante.controller");

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

router.use(verificarToken);
router.use('/docente',require('./docente.routes'));
for (const [ruta,funcion] of Object.entries({periodos:'obtenerPeriodos',oferta:'obtenerOferta','avance-curricular':'obtenerAvance',restricciones:'obtenerRestricciones',solicitudes:'obtenerSolicitudes',encuestas:'obtenerEncuestas',certificados:'obtenerCertificados'})) router.get(`/${ruta}`,academicoController[funcion]);
router.post('/inscripciones',academicoController.inscribir);
router.post('/solicitudes',academicoController.crearSolicitud);
router.post('/encuestas/:idEncuesta/respuestas',academicoController.responderEncuesta);
router.get('/certificados/:tipo',academicoController.descargarCertificado);
router.get('/administracion/solicitudes',academicoController.listarSolicitudesAdmin);
router.patch('/administracion/solicitudes/:idSolicitud',academicoController.resolverSolicitud);
router.post('/administracion/encuestas',academicoController.crearEncuesta);
router.patch('/administracion/periodos/:idPeriodo/inscripcion',academicoController.configurarInscripcion);
router.put('/administracion/inscripciones/:idInscripcion/resultado',academicoController.registrarResultado);
module.exports = router;
