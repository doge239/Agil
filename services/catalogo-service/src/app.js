require("dotenv").config();

const express = require("express");
const cors = require("cors");

const pool = require("./config/database");
const catalogoRoutes = require("./routes/catalogo.routes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    mensaje: "Catalogo Service Banner-2 funcionando",
  });
});

app.get("/test-db", async (req, res) => {
  try {
    const resultado = await pool.query("SELECT NOW()");

    res.json({
      mensaje: "Conexión a catalogo_db correcta",
      fecha: resultado.rows[0].now,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      mensaje: "Error conectando a catalogo_db",
    });
  }
});

app.use("/catalogo", catalogoRoutes);

const PORT = process.env.PORT || 4003;

app.listen(PORT, () => {
  console.log(`Catalogo Service ejecutándose en puerto ${PORT}`);
});