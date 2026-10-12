function requireRole(...rolesPermitidos) {
  return (req, res, next) => {
    const usuario = req.usuario;

    if (!usuario || !usuario.roles) {
      return res.status(403).json({
        mensaje: "No se pudo determinar el rol del usuario",
      });
    }

    const tienePermiso = usuario.roles.some((rol) =>
      rolesPermitidos.includes(rol)
    );

    if (!tienePermiso) {
      return res.status(403).json({
        mensaje: "No tienes permisos para acceder a esta ruta",
      });
    }

    next();
  };
}

module.exports = requireRole;