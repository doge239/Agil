require("dotenv").config();

const express = require("express");
const cors = require("cors");

const pool = require("./config/database");
const usuariosRoutes = require("./routes/usuarios.routes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    mensaje: "Usuarios Service Banner-2 funcionando",
  });
});

app.get("/test-db", async (req, res) => {
  try {
    const resultado = await pool.query("SELECT NOW()");

    res.json({
      mensaje: "Conexión a usuarios_db correcta",
      fecha: resultado.rows[0].now,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      mensaje: "Error conectando a usuarios_db",
    });
  }
});

app.use("/usuarios", usuariosRoutes);

const PORT = process.env.PORT || 4002;

app.listen(PORT, () => {
  console.log(`Usuarios Service ejecutándose en puerto ${PORT}`);
});